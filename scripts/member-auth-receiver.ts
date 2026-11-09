import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { loadPhoneVerificationConfig } from "../src/lib/phone-verification/server/config";
import { createReceiverBudget } from "./phone-receiver-budget";

type Environment = Readonly<Record<string, string | undefined>>;
type SpawnNode = (command: string, args: readonly string[], options: SpawnOptions) => ChildProcess;
type Log = (message: string) => void;
type ChildResult = { code: number | null; failedToSpawn: boolean };
const restartDelays = [1000, 5000, 15000] as const;
class OwnedChildShutdownError extends Error {
  constructor() { super("Owned preview child did not stop within its shutdown deadline"); }
}

/** No inbox OAuth, member, SMTP or Google authority is inherited by this child. */
export function receiverProcessEnvironment(env: Environment): NodeJS.ProcessEnv {
  let canonicalDatabase: NodeJS.ProcessEnv = {};
  try {
    if (env.MEMBER_AUTH_MODE === "local" && env.DATABASE_URI) {
      const config = loadPhoneVerificationConfig(env);
      if (config && new URL(env.DATABASE_URI).href === config.databaseUrl) {
        canonicalDatabase = { MEMBER_AUTH_MODE: "local", DATABASE_URI: config.databaseUrl };
      }
    }
  } catch { /* Leave invalid configuration rejected by the child's existing validation. */ }
  const allowed = new Set([
    "PATH", "HOME", "TMPDIR", "NODE_ENV", "PHONE_VERIFICATION_MODE", "PHONE_VERIFICATION_TRANSPORT",
    "PHONE_VERIFICATION_ORIGIN", "PHONE_VERIFICATION_DATABASE_URL", "PHONE_VERIFICATION_STATE_SECRET",
    "PHONE_VERIFICATION_RECIPIENT", "PHONE_VERIFICATION_ZOHO_ACCOUNT_ID",
    "PHONE_VERIFICATION_CARRIER_POLICY", "PHONE_VERIFICATION_ALLOW_LEGACY_ZOHO_ARC",
    "PHONE_VERIFICATION_RECEIVER_HEALTH_DIRECTORY"
  ]);
  return { ...Object.fromEntries(Object.entries(env).filter(([key, value]) => allowed.has(key) && value !== undefined)),
    ...canonicalDatabase,
    NODE_ENV: env.NODE_ENV === "test" ? "test" : env.NODE_ENV === "production" ? "production" : "development" };
}

/** Watches only this child object; no process search or process-group termination. */
function waitOwnedChild(child: ChildProcess, options: {
  signal: AbortSignal; shutdownMs: number; onSpawn?: () => void;
}): Promise<ChildResult> {
  return new Promise((resolve, reject) => {
    let done = false;
    let stopping = false;
    let grace: ReturnType<typeof setTimeout> | undefined;
    let force: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      clearTimeout(grace); clearTimeout(force);
      child.removeListener("exit", exited); child.removeListener("error", failed);
      child.removeListener("spawn", spawned); options.signal.removeEventListener("abort", stop);
    };
    const finish = (result?: ChildResult) => {
      if (done) return;
      done = true; cleanup();
      if (result) resolve(result);
      else reject(new OwnedChildShutdownError());
    };
    const exited = (code: number | null) => finish({ code, failedToSpawn: false });
    const stop = () => {
      if (done || stopping) return;
      stopping = true;
      // Kill failures are never evidence of exit. Remain attached until exit/deadline.
      try { child.kill("SIGTERM"); } catch { /* Escalate this owned child at the deadline. */ }
      if (done) return;
      grace = setTimeout(() => {
        try { child.kill("SIGKILL"); } catch { /* The final deadline reports failed cleanup. */ }
        if (!done) force = setTimeout(() => finish(), options.shutdownMs);
      }, options.shutdownMs);
    };
    const failed = () => {
      if (child.pid === undefined) finish({ code: null, failedToSpawn: true });
      else stop();
    };
    const spawned = () => options.onSpawn?.();
    child.once("exit", exited); child.on("error", failed); child.once("spawn", spawned);
    options.signal.addEventListener("abort", stop, { once: true });
    if (child.exitCode !== null || child.signalCode !== null) exited(child.exitCode);
    else if (options.signal.aborted) stop();
  });
}

/** One rolling-hour budget belongs to the preview, so child crashes cannot reset it. */
export async function superviseMemberReceiver(options: {
  root: string; env: Environment; signal: AbortSignal;
  spawn?: SpawnNode; sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
  log?: Log; shutdownMs?: number;
  budget?: Pick<ReturnType<typeof createReceiverBudget>, "handle">;
}): Promise<void> {
  const budget = options.budget ?? createReceiverBudget();
  const log = options.log ?? console.error;
  const launch = options.spawn ?? ((command, args, settings) => spawn(command, args, settings));
  let restarts = 0;
  while (!options.signal.aborted) {
    let result: ChildResult;
    try {
      const child = launch(process.execPath, ["--max-old-space-size=256", "--import", "tsx", join(options.root, "scripts/phone-verification-receive.ts"), "serve"], {
        cwd: options.root, env: receiverProcessEnvironment(options.env), stdio: ["ignore", "inherit", "inherit", "ipc"]
      });
      const message = (value: unknown) => {
        try {
          const reply = budget.handle(value);
          if (reply && child.connected) child.send(reply, () => { /* Child disconnect is handled by its exit monitor. */ });
        } catch { log("Local phone receiver budget channel is unavailable."); }
      };
      child.on("message", message);
      try { result = await waitOwnedChild(child, { signal: options.signal, shutdownMs: options.shutdownMs ?? 5000 }); }
      finally { child.removeListener("message", message); }
    } catch (error) {
      if (error instanceof OwnedChildShutdownError) throw error;
      if (options.signal.aborted) throw new Error("Local phone receiver cleanup could not be confirmed");
      result = { code: null, failedToSpawn: true };
    }
    if (options.signal.aborted) return;
    if (result.code === 78) { log("Local phone receiver needs configuration or another receiver owns this runtime; it will not restart."); return; }
    if (restarts >= restartDelays.length) { log("Local phone receiver restart limit reached. Phone verification remains unavailable until the preview is restarted."); return; }
    const delay = restartDelays[restarts++];
    log("Local phone receiver stopped unexpectedly; one bounded restart is scheduled.");
    try { await (options.sleep ?? ((ms, signal) => sleep(ms, undefined, { signal })))(delay, options.signal); }
    catch { if (!options.signal.aborted) throw new Error("Local phone receiver restart delay failed"); }
  }
}

/** The web preview owns the receiver lifetime, not a separate daemon or login service. */
export async function runMemberPreviewChildren(options: {
  next: ChildProcess; signal: AbortSignal; startReceiver: (signal: AbortSignal) => Promise<void>;
  shutdownMs?: number; log?: Log;
}): Promise<number> {
  const controller = new AbortController();
  const log = options.log ?? console.error;
  let receiver: Promise<void> | undefined;
  const stop = () => controller.abort();
  options.signal.addEventListener("abort", stop, { once: true });
  if (options.signal.aborted) stop();
  try {
    const result = await waitOwnedChild(options.next, {
      signal: controller.signal, shutdownMs: options.shutdownMs ?? 5000,
      onSpawn: () => {
        if (controller.signal.aborted) return;
        receiver = Promise.resolve().then(() => options.startReceiver(controller.signal)).catch(() => {
          log("Local phone receiver supervision failed. Phone verification is unavailable; the web preview remains open.");
        });
      }
    });
    if (result.failedToSpawn) throw new Error("Preview child could not start");
    return options.signal.aborted ? 0 : result.code ?? 1;
  } finally {
    stop();
    options.signal.removeEventListener("abort", stop);
    await receiver;
  }
}
