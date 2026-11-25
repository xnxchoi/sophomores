/*
 * Email alerts for the key-grant tick (owner, 25 Nov, verbatim: "email alerts via Zoho is fine"). The tick's journal
 * lines are fixed JSON (scripts/key-grant-tick.ts, grant-catch-up.ts, worker.ts); this turns the ones a person must
 * act on into at most one email per kind per hour, each listing what accumulated. Intent IDs and fixed codes only:
 * never an address, an order or customer data.
 */
export type TickAlertKind = "over_cap" | "parked" | "seat_sweep_failed" | "tick_failure";
export type TickAlert = Readonly<{ kind: TickAlertKind; detail: string }>;

const SAFE = /^[A-Za-z0-9_.:-]{1,80}$/;
const safe = (value: unknown): string => typeof value === "string" && SAFE.test(value) ? value : typeof value === "number" && Number.isSafeInteger(value) ? String(value) : "unreadable";

/** The alert in one journal line, or null for every other line (including non-JSON). */
export function tickAlertFromLine(line: string): TickAlert | null {
  let value: unknown;
  try { value = JSON.parse(line.trim()); } catch { return null; }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.event === "key_grant_over_cap") return { kind: "over_cap", detail: `intent ${safe(record.intent)}` };
  if (record.event === "key_grant_parked") return { kind: "parked", detail: `intent ${safe(record.intent)}: ${safe(record.code)}` };
  if (record.event === "seat_sweep_failed") return { kind: "seat_sweep_failed", detail: `count ${safe(record.count)}` };
  if (record.outcome === "failure") return { kind: "tick_failure", detail: `reason ${safe(record.reason)}` };
  return null;
}

const subjects: Record<TickAlertKind, string> = {
  over_cap: "Key grant past the 256-block limit",
  parked: "Key grant waiting for a person",
  seat_sweep_failed: "Seat release failed",
  tick_failure: "Key-grant tick failed",
};
const actions: Record<TickAlertKind, string> = {
  over_cap: "Turn live dispatch off and settle each one with the one-shot command (KEY-GRANTS.md, \"Over-cap alert and recovery\").",
  parked: "Check each intent's code in the admin and resolve it (KEY-GRANTS.md, \"Checks\").",
  seat_sweep_failed: "The next tick retries. If this repeats, check the seat sweep (KEY-GRANTS.md, \"Checks\").",
  tick_failure: "Fix the cause the code names (KEY-GRANTS.md, \"Checks\"). The tick changed nothing it cannot resume.",
};

export type TickAlertEmail = Readonly<{ subject: string; text: string }>;
export function tickAlertEmail(kind: TickAlertKind, details: readonly string[], host: string): TickAlertEmail {
  return {
    subject: `[Sophomores] ${subjects[kind]} (${details.length})`,
    text: [`${subjects[kind]} on ${safe(host)}:`, ...details.map((detail) => `- ${detail}`), "", actions[kind]].join("\n"),
  };
}

/**
 * Collects alerts and sends each kind at most once per `windowMs`: the first at once, later ones in one email when
 * the window has passed (`flush` runs on every push and on a timer). A failed send keeps its details for the next
 * flush. Repeated details (the same over-cap intent every 2 minutes) are listed once.
 */
export function createTickAlerter({ send, now = () => Date.now(), windowMs = 60 * 60_000, host }: {
  send: (email: TickAlertEmail) => Promise<void>; now?: () => number; windowMs?: number; host: string;
}) {
  const pending = new Map<TickAlertKind, Set<string>>();
  const lastSent = new Map<TickAlertKind, number>();
  let flushing: Promise<void> = Promise.resolve();
  const flushNow = async () => {
    for (const [kind, details] of [...pending]) {
      const last = lastSent.get(kind);
      if (!details.size || (last !== undefined && now() - last < windowMs)) continue;
      const batch = [...details];
      try {
        await send(tickAlertEmail(kind, batch, host));
        lastSent.set(kind, now());
        for (const detail of batch) details.delete(detail);
      } catch {
        // kept for the next flush
      }
    }
  };
  const flush = () => (flushing = flushing.then(flushNow));
  return {
    push(alert: TickAlert) {
      const details = pending.get(alert.kind) ?? new Set<string>();
      details.add(alert.detail);
      pending.set(alert.kind, details);
      return flush();
    },
    flush,
  };
}
