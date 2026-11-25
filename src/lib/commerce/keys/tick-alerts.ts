import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { open, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parkedCancelCodes, parkedGrantCodes } from "./contracts";
import { RPC_FILE_CODES } from "./unlock/rpc-check";

/*
 * Email alerts for the key-grant tick (owner, 25 Nov, verbatim: "email alerts via Zoho is fine"; Review-A, 25 Nov).
 * - Intake is durable: the tick (and the systemd OnFailure unit) writes each alert as one file into a spool directory.
 *   Nothing reads the journal.
 * - Every alert passes a per-event schema: intent IDs are UUIDs; codes and reasons come from fixed sets; counts are
 *   bounded integers. Anything else becomes "unrecognised", so nothing token-shaped reaches an email.
 * - A separate mailer (its own user, run once a minute) delivers the spool: at most one email per kind per hour, a
 *   file deleted only after its email is sent, failures retried with backoff, window and backoff kept on disk.
 */
export type TickAlertKind = "over_cap" | "parked" | "seat_sweep_failed" | "tick_failure";
export type TickAlert = Readonly<{ kind: TickAlertKind; detail: string }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PARK_CODES: ReadonlySet<string> = new Set([
  ...parkedGrantCodes, ...parkedCancelCodes.map((code) => `cancel_${code}`),
  "replacement_role_hook_set", "cancel_replacement_role_hook_set",
  "replacement_rebroadcast_role_hook_set", "cancel_replacement_rebroadcast_role_hook_set",
]);
const FAILURE_REASONS: ReadonlySet<string> = new Set([
  "rpc_url_in_env", ...RPC_FILE_CODES, "no_budget", "bad_event_locks", "signer_refused", "unexpected", "systemd_failed",
]);
const UNRECOGNISED = "unrecognised";
const uuid = (value: unknown) => typeof value === "string" && UUID.test(value) ? value : UNRECOGNISED;
const oneOf = (value: unknown, allowed: ReadonlySet<string>) => typeof value === "string" && allowed.has(value) ? value : UNRECOGNISED;

/** The alert in one tick line (JSON), or null for every line that is not one of the four alert shapes. */
export function tickAlertFromLine(line: string): TickAlert | null {
  if (line.length > 2_000) return null;
  let value: unknown;
  try { value = JSON.parse(line.trim()); } catch { return null; }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.event === "key_grant_over_cap") return { kind: "over_cap", detail: `intent ${uuid(record.intent)}` };
  if (record.event === "key_grant_parked") return { kind: "parked", detail: `intent ${uuid(record.intent)}: ${oneOf(record.code, PARK_CODES)}` };
  if (record.event === "seat_sweep_failed") {
    const count = Number.isSafeInteger(record.count) && (record.count as number) >= 1 && (record.count as number) <= 10_000 ? String(record.count) : UNRECOGNISED;
    return { kind: "seat_sweep_failed", detail: `count ${count}` };
  }
  if (record.outcome === "failure") return { kind: "tick_failure", detail: `reason ${oneOf(record.reason, FAILURE_REASONS)}` };
  return null;
}

/** Re-checks a spooled alert: only what tickAlertFromLine could have produced passes. */
function spooledAlert(value: unknown): TickAlert {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const detail = typeof record.detail === "string" ? record.detail : "";
  const patterns: Record<TickAlertKind, RegExp> = {
    over_cap: /^intent ([0-9a-f-]{36}|unrecognised)$/,
    parked: /^intent ([0-9a-f-]{36}|unrecognised): [a-z_]{1,60}$/,
    seat_sweep_failed: /^count ([0-9]{1,5}|unrecognised)$/,
    tick_failure: /^reason [a-z_]{1,60}$/,
  };
  const kind = record.kind as TickAlertKind;
  if (Object.hasOwn(patterns, kind) && patterns[kind].test(detail)) return { kind, detail };
  return { kind: "tick_failure", detail: `reason ${UNRECOGNISED}` };
}

/** Most alert files kept waiting; past it, one `overflow` marker stands for the dropped ones. */
export const SPOOL_MAX_FILES = 500;

/** Writes one alert into the spool atomically (temporary file, then rename). Never throws: the tick goes on. */
export async function spoolTickAlert(dir: string, alert: TickAlert, now = () => Date.now()): Promise<boolean> {
  try {
    const waiting = (await readdir(dir)).filter((name) => name.endsWith(".alert.json")).length;
    if (waiting >= SPOOL_MAX_FILES) {
      await writeFile(join(dir, "overflow"), "", { mode: 0o660 });
      return false;
    }
    const name = `${String(now()).padStart(15, "0")}-${randomBytes(6).toString("hex")}`;
    const temporary = join(dir, `.${name}.tmp`);
    const handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o660);
    try { await handle.writeFile(JSON.stringify(alert)); await handle.sync(); } finally { await handle.close(); }
    await rename(temporary, join(dir, `${name}.alert.json`));
    return true;
  } catch {
    return false;
  }
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
  tick_failure: "Fix the cause the reason names (KEY-GRANTS.md, \"Checks\"); systemd_failed means the run failed or timed out.",
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
  const names = (await readdir(dir)).filter((name) => name.endsWith(".alert.json")).sort().slice(0, SPOOL_MAX_FILES);
  const overflow = (await readdir(dir)).includes("overflow");
  if (now() < state.nextAttemptAt) return { sent: 0, waiting: names.length, backingOff: true };
  const byKind = new Map<TickAlertKind, { files: string[]; details: Set<string> }>();
  for (const name of names) {
    let alert: TickAlert;
    try { alert = spooledAlert(JSON.parse(await readFile(join(dir, name), "utf8"))); } catch { alert = spooledAlert(null); }
    const group = byKind.get(alert.kind) ?? { files: [], details: new Set<string>() };
    group.files.push(name);
    group.details.add(alert.detail);
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
  const waiting = (await readdir(dir)).filter((name) => name.endsWith(".alert.json")).length;
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
  const writes: Promise<boolean>[] = [];
  return {
    log(line: string) {
      writeLine(line);
      const alert = spoolDir ? tickAlertFromLine(line) : null;
      if (spoolDir && alert) writes.push(spoolTickAlert(spoolDir, alert));
    },
    settled: () => Promise.all(writes),
  };
}

/** The spool directory from the environment: an absolute path, or undefined when alerts are not spooled. */
export function alertSpoolDir(env: Readonly<Record<string, string | undefined>> = process.env): string | undefined {
  const dir = env.KEY_GRANT_ALERT_SPOOL;
  return dir && /^\/[A-Za-z0-9_./-]{1,200}$/.test(dir) && !dir.includes("..") ? dir : undefined;
}
