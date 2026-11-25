import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { link, open, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parkedCancelCodes, parkedGrantCodes } from "./contracts";
import { RPC_FILE_CODES } from "./unlock/rpc-check";

/*
 * Email alerts for the key-grant tick (owner, 25 Nov, verbatim: "email alerts via Zoho is fine"; Review-A, 25 Nov).
 * - Intake is durable: the tick (and the systemd OnFailure unit) writes each alert's canonical fields into one of 500
 *   exclusive slot files in a spool directory. Nothing reads the journal.
 * - Every alert passes a per-event schema: intent IDs are UUIDs; codes and reasons come from fixed sets; counts are
 *   bounded integers. Anything else becomes "unrecognised". The spool is a trust boundary: delivery re-validates every
 *   field and renders only canonical fields, so nothing token-shaped reaches an email.
 * - A separate mailer (its own user, run once a minute) delivers the spool: at most one email per kind per hour, a
 *   file deleted only after its email is sent, failures retried with backoff, window and backoff kept on disk.
 */
export type TickAlertKind = "over_cap" | "parked" | "seat_sweep_failed" | "tick_failure" | "fence";
/** Structured, canonical fields only; `unrecognised` stands for any value outside the allowlists. */
export type TickAlert =
  | Readonly<{ kind: "over_cap"; intent: string }>
  | Readonly<{ kind: "parked"; intent: string; code: string }>
  | Readonly<{ kind: "seat_sweep_failed"; count: string }>
  | Readonly<{ kind: "tick_failure"; reason: string }>
  | Readonly<{ kind: "fence"; reason: string }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PARK_CODES: ReadonlySet<string> = new Set([
  ...parkedGrantCodes, ...parkedCancelCodes.map((code) => `cancel_${code}`),
  "replacement_role_hook_set", "cancel_replacement_role_hook_set",
  "replacement_rebroadcast_role_hook_set", "cancel_replacement_rebroadcast_role_hook_set",
]);
const FAILURE_REASONS: ReadonlySet<string> = new Set([
  "mode_invalid", "allowlist_invalid", "allowlist_in_scheduled",
  "rpc_url_in_env", ...RPC_FILE_CODES, "no_budget", "bad_event_locks", "signer_refused", "unexpected", "systemd_failed",
]);
/**
 * Why the host guard (deployment/ops/kj-guard.sh) fenced the key job's egress (VPS plan v6). The guard writes these
 * slots itself, in shell, because the Docker daemon may be what is stuck.
 */
export const FENCE_REASONS: readonly string[] = Object.freeze([
  "fence_unknown_quiescence", "fence_query_failed", "fence_stop_hung", "fence_live_permit_left",
  "fence_install_failed", "fence_verify_failed", "fence_marker_failed",
]);
const FENCE_REASON_SET: ReadonlySet<string> = new Set(FENCE_REASONS);
const UNRECOGNISED = "unrecognised";
const uuid = (value: unknown) => typeof value === "string" && UUID.test(value) ? value : UNRECOGNISED;
const oneOf = (value: unknown, allowed: ReadonlySet<string>) => typeof value === "string" && allowed.has(value) ? value : UNRECOGNISED;
const count = (value: unknown) => {
  const number = typeof value === "string" && /^[0-9]{1,5}$/.test(value) ? Number(value) : value;
  return Number.isSafeInteger(number) && (number as number) >= 1 && (number as number) <= 10_000 ? String(number) : UNRECOGNISED;
};

/**
 * The one validator for every alert, from a tick line or from the spool (a trust boundary, Review-A, 25 Nov): each
 * field through its allowlist or bounded check, unknown fields dropped, an unknown kind a failure "unrecognised".
 */
export function canonicalAlert(value: unknown): TickAlert {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  switch (record.kind) {
    case "over_cap": return { kind: "over_cap", intent: uuid(record.intent) };
    case "parked": return { kind: "parked", intent: uuid(record.intent), code: oneOf(record.code, PARK_CODES) };
    case "seat_sweep_failed": return { kind: "seat_sweep_failed", count: count(record.count) };
    case "tick_failure": return { kind: "tick_failure", reason: oneOf(record.reason, FAILURE_REASONS) };
    case "fence": return { kind: "fence", reason: oneOf(record.reason, FENCE_REASON_SET) };
    default: return { kind: "tick_failure", reason: UNRECOGNISED };
  }
}

/** The mail line for an alert, rendered only from its canonical fields. */
export function alertDetail(alert: TickAlert): string {
  const canonical = canonicalAlert(alert);
  switch (canonical.kind) {
    case "over_cap": return `intent ${canonical.intent}`;
    case "parked": return `intent ${canonical.intent}: ${canonical.code}`;
    case "seat_sweep_failed": return `count ${canonical.count}`;
    case "tick_failure": return `reason ${canonical.reason}`;
    case "fence": return `reason ${canonical.reason}`;
  }
}

/** The alert in one tick line (JSON), or null for every line that is not one of the four alert shapes. */
export function tickAlertFromLine(line: string): TickAlert | null {
  if (line.length > 2_000) return null;
  let value: unknown;
  try { value = JSON.parse(line.trim()); } catch { return null; }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.event === "key_grant_over_cap") return canonicalAlert({ kind: "over_cap", intent: record.intent });
  if (record.event === "key_grant_parked") return canonicalAlert({ kind: "parked", intent: record.intent, code: record.code });
  if (record.event === "seat_sweep_failed") return canonicalAlert({ kind: "seat_sweep_failed", count: record.count });
  if (record.outcome === "failure") return canonicalAlert({ kind: "tick_failure", reason: record.reason });
  return null;
}

/** Alert slots: at most this many alerts wait; the cap holds across concurrent writers (exclusive slot names). */
export const SPOOL_MAX_FILES = 500;
const SLOT = /^slot-[0-4][0-9]{2}\.alert\.json$/; // slots 000-499 only
const slotName = (index: number) => `slot-${String(index).padStart(3, "0")}.alert.json`;
const MAX_ALERT_BYTES = 512;
export type SpoolResult = "written" | "full" | "io_failed";

/**
 * Writes one alert's canonical fields into a free slot: a private temporary file, fsync, then link() to a slot name,
 * which fails if the slot is taken, so concurrent producers never exceed SPOOL_MAX_FILES. All slots taken: an
 * `overflow` marker instead ("full"). Any other error: "io_failed". Never throws.
 */
export async function spoolTickAlert(dir: string, alert: TickAlert): Promise<SpoolResult> {
  const temporary = join(dir, `.${randomBytes(8).toString("hex")}.tmp`);
  try {
    const handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o660);
    try { await handle.writeFile(JSON.stringify(canonicalAlert(alert))); await handle.sync(); } finally { await handle.close(); }
    const start = randomBytes(2).readUInt16BE() % SPOOL_MAX_FILES;
    for (let step = 0; step < SPOOL_MAX_FILES; step++) {
      try { await link(temporary, join(dir, slotName((start + step) % SPOOL_MAX_FILES))); return "written"; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") return "io_failed"; }
    }
    await writeFile(join(dir, "overflow"), "", { mode: 0o660 });
    return "full";
  } catch {
    return "io_failed";
  } finally {
    await rm(temporary, { force: true }).catch(() => {});
  }
}

/** One spooled alert: a regular file only (no symlink is followed), at most MAX_ALERT_BYTES, through canonicalAlert. */
async function readSpooled(path: string): Promise<TickAlert> {
  let handle;
  try { handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); } catch { return canonicalAlert(null); }
  try {
    if (!(await handle.stat()).isFile()) return canonicalAlert(null);
    // At most MAX_ALERT_BYTES + 1 bytes into a fixed buffer: one byte more means oversize (never read to EOF).
    const buffer = Buffer.alloc(MAX_ALERT_BYTES + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > MAX_ALERT_BYTES) return canonicalAlert(null);
    return canonicalAlert(JSON.parse(buffer.subarray(0, bytesRead).toString("utf8")));
  } catch { return canonicalAlert(null); } finally { await handle.close(); }
}

const subjects: Record<TickAlertKind, string> = {
  over_cap: "Key grant past the 256-block limit",
  parked: "Key grant waiting for a person",
  seat_sweep_failed: "Seat release failed",
  tick_failure: "Key-grant tick failed",
  fence: "Key job fenced: its network is cut",
};
const actions: Record<TickAlertKind, string> = {
  over_cap: "Turn live dispatch off and settle each one with the one-shot command (KEY-GRANTS.md, \"Over-cap alert and recovery\").",
  parked: "Check each intent's code in the admin and resolve it (KEY-GRANTS.md, \"Checks\").",
  seat_sweep_failed: "The next tick retries. If this repeats, check the seat sweep (KEY-GRANTS.md, \"Checks\").",
  tick_failure: "Fix the cause the reason names (KEY-GRANTS.md, \"Checks\"); systemd_failed means the run failed or timed out.",
  fence: "No key job can start until the fence is released by hand (KEY-GRANTS.md, \"Emergency stop and the egress fence\").",
};

export type TickAlertEmail = Readonly<{ subject: string; text: string }>;
export function tickAlertEmail(kind: TickAlertKind, details: readonly string[]): TickAlertEmail {
  return {
    subject: `[Sophomores] ${subjects[kind]} (${details.length})`,
    text: [`${subjects[kind]}:`, ...details.map((detail) => `- ${detail}`), "", actions[kind]].join("\n"),
  };
}

type MailerState = { lastSent: Partial<Record<TickAlertKind, number>>; failures: number; nextAttemptAt: number };
const BACKOFF_BASE_MS = 60_000;
const BACKOFF_MAX_MS = 60 * 60_000;

async function readState(path: string): Promise<MailerState> {
  try {
    const value = JSON.parse(await readFile(path, "utf8")) as MailerState;
    return { lastSent: value.lastSent ?? {}, failures: Number(value.failures) || 0, nextAttemptAt: Number(value.nextAttemptAt) || 0 };
  } catch { return { lastSent: {}, failures: 0, nextAttemptAt: 0 }; }
}
async function writeState(path: string, state: MailerState): Promise<void> {
  const temporary = `${path}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(temporary, JSON.stringify(state), { mode: 0o600 });
  await rename(temporary, path);
}

export type DeliveryResult = Readonly<{ sent: number; waiting: number; backingOff: boolean }>;

/**
 * One delivery pass over the spool. Each kind whose hour has passed gets one email listing its distinct details; its
 * files are deleted only after the send succeeds. A failed send keeps every file and backs off (1 min, doubling, at
 * most 1 h). Window and backoff live in `statePath`, so a restart loses nothing.
 */
export async function deliverTickAlerts({ dir, statePath, send, now = () => Date.now(), windowMs = 60 * 60_000 }: {
  dir: string; statePath: string; send: (email: TickAlertEmail) => Promise<void>; now?: () => number; windowMs?: number;
}): Promise<DeliveryResult> {
  const state = await readState(statePath);
  const entries = await readdir(dir);
  const names = entries.filter((name) => SLOT.test(name)).sort();
  const overflow = entries.includes("overflow");
  if (now() < state.nextAttemptAt) return { sent: 0, waiting: names.length, backingOff: true };
  const byKind = new Map<TickAlertKind, { files: string[]; details: Set<string> }>();
  for (const name of names) {
    const alert = await readSpooled(join(dir, name));
    const group = byKind.get(alert.kind) ?? { files: [], details: new Set<string>() };
    group.files.push(name);
    group.details.add(alertDetail(alert));
    byKind.set(alert.kind, group);
  }
  if (overflow) {
    const group = byKind.get("tick_failure") ?? { files: [], details: new Set<string>() };
    group.details.add("reason alert_backlog_full");
    byKind.set("tick_failure", group);
  }
  let sent = 0;
  for (const [kind, group] of byKind) {
    const last = state.lastSent[kind];
    if (last !== undefined && now() - last < windowMs) continue;
    try {
      await send(tickAlertEmail(kind, [...group.details]));
    } catch {
      state.failures += 1;
      state.nextAttemptAt = now() + Math.min(BACKOFF_BASE_MS * 2 ** (state.failures - 1), BACKOFF_MAX_MS);
      await writeState(statePath, state);
      return { sent, waiting: names.length, backingOff: true };
    }
    state.lastSent[kind] = now();
    state.failures = 0;
    state.nextAttemptAt = 0;
    await writeState(statePath, state);
    for (const name of group.files) await rm(join(dir, name), { force: true });
    if (kind === "tick_failure" && overflow) await rm(join(dir, "overflow"), { force: true });
    sent += 1;
  }
  const waiting = (await readdir(dir)).filter((name) => SLOT.test(name)).length;
  return { sent, waiting, backingOff: false };
}

/** Rejects a send that has not finished in `ms` (the SMTP settings bound each step; this bounds the whole). */
export function boundedSend<T>(sending: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("send timed out")), ms); });
  return Promise.race([sending, timeout]).finally(() => clearTimeout(timer));
}

/**
 * The tick's alert log: each fixed line goes to stderr synchronously and, when `spoolDir` is set, into the spool.
 * `settled()` waits for the spool writes; the tick awaits it before it prints its result and exits.
 */
export function createTickAlertLog(spoolDir: string | undefined, writeLine: (line: string) => void) {
  const writes: Promise<void>[] = [];
  return {
    log(line: string) {
      writeLine(line);
      const alert = spoolDir ? tickAlertFromLine(line) : null;
      if (spoolDir && alert) writes.push(spoolTickAlert(spoolDir, alert).then((result) => reportSpool(result, writeLine)));
    },
    settled: () => Promise.all(writes),
  };
}

/** A spool write that did not land is never silent: one fixed stderr line, overflow and I/O failure kept distinct. */
export function reportSpool(result: SpoolResult, writeLine: (line: string) => void): void {
  if (result === "full") writeLine(JSON.stringify({ event: "alert_spool_full" }));
  if (result === "io_failed") writeLine(JSON.stringify({ event: "alert_spool_failed" }));
}

/** The spool directory from the environment: an absolute path, or undefined when alerts are not spooled. */
export function alertSpoolDir(env: Readonly<Record<string, string | undefined>> = process.env): string | undefined {
  const dir = env.KEY_GRANT_ALERT_SPOOL;
  return dir && /^\/[A-Za-z0-9_./-]{1,200}$/.test(dir) && !dir.includes("..") ? dir : undefined;
}
