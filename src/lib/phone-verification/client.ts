import {
  challengeIdSchema, trialChallengeSchema, trialStatusSchema,
  type TrialChallenge, type TrialSnapshot, type TrialStatus
} from "./client-contracts";

const base = "/api/phone-verification/challenges";
const active = (state?: TrialStatus["state"]) => state === "pending" || state === "review";

class VerificationClientError extends Error {
  constructor(readonly code: string) {
    super("Verification request failed");
    this.name = "VerificationClientError";
  }
}

function failureKind<Kind extends "create" | "status" | "receiver">(error: unknown, fallback: Kind): "receiver" | Kind {
  return error instanceof VerificationClientError && error.code === "RECEIVER_UNAVAILABLE"
    ? "receiver" : fallback;
}

export function createVerificationClient(fetcher: typeof fetch = fetch) {
  async function request(path: string, init: RequestInit) {
    const response = await fetcher(path, { ...init, credentials: "same-origin", cache: "no-store" });
    if (response.ok && response.status === 204) return null;
    const result: unknown = await response.json();
    if (!response.ok || !result || typeof result !== "object" || !("success" in result) || result.success !== true) {
      const error = result && typeof result === "object" && "error" in result ? result.error : null;
      const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" && /^[A-Z_]{1,64}$/.test(error.code) ? error.code : "REQUEST_FAILED";
      throw new VerificationClientError(code);
    }
    if (!("data" in result)) throw new VerificationClientError("INVALID_RESPONSE");
    return result.data;
  }
  return {
    async create(phone: string, signal?: AbortSignal): Promise<TrialChallenge> {
      return trialChallengeSchema.parse(await request(base, {
        method: "POST", signal,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone })
      }));
    },
    async status(id: string, signal?: AbortSignal): Promise<TrialStatus> {
      const safeId = challengeIdSchema.parse(id);
      const status = trialStatusSchema.parse(await request(`${base}/${safeId}`, { method: "GET", signal }));
      if (status.id !== safeId) throw new VerificationClientError("INVALID_RESPONSE");
      return status;
    },
    async cancel(id: string, keepalive = false): Promise<void> {
      await request(`${base}/${challengeIdSchema.parse(id)}`, {
        method: "DELETE", keepalive, signal: AbortSignal.timeout(10_000)
      });
    }
  };
}

type VerificationClient = ReturnType<typeof createVerificationClient>;
type Scheduler = { set: (callback: () => void, delay: number) => unknown; clear: (handle: unknown) => void };
type StatusTiming = { now: () => number; delay: (ms: number, signal: AbortSignal) => Promise<void> };
const foregroundMinimumMs = 600;

function statusDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error("Status check cancelled")); return; }
    const abort = () => { clearTimeout(timer); reject(new Error("Status check cancelled")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}

/** Own one modal session, including a POST that resolves after the modal closes. */
export function createTrialSession(
  client: VerificationClient,
  onChange: (snapshot: TrialSnapshot) => void,
  scheduler: Scheduler = { set: (callback, delay) => setTimeout(callback, delay), clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>) },
  timing: StatusTiming = { now: Date.now, delay: statusDelay }
) {
  let current: TrialSnapshot = { challenge: null, status: null, busy: false, error: null };
  let disposed = false;
  let timer: unknown;
  let statusAbort: AbortController | undefined;
  let statusHoldAbort: AbortController | undefined;
  let statusPromise: Promise<void> | undefined;
  let foregroundStartedAt: number | undefined;

  function update(change: Partial<TrialSnapshot>) {
    current = { ...current, ...change };
    if (!disposed) onChange(current);
  }
  function stopPolling() {
    if (timer !== undefined) scheduler.clear(timer);
    timer = undefined;
  }
  function stopStatus() {
    const abort = statusAbort;
    const hold = statusHoldAbort;
    statusAbort = undefined;
    statusHoldAbort = undefined;
    statusPromise = undefined;
    foregroundStartedAt = undefined;
    abort?.abort();
    hold?.abort();
  }
  function schedule() {
    stopPolling();
    if (!disposed && active(current.status?.state)) timer = scheduler.set(() => { void refresh(true); }, 2000);
  }
  function ownsStatus(abort: AbortController, id: string) {
    return !disposed && statusAbort === abort && current.challenge?.id === id && active(current.status?.state);
  }
  async function holdStatus(ms: number) {
    const hold = new AbortController();
    statusHoldAbort = hold;
    try { await timing.delay(ms, hold.signal); }
    finally { if (statusHoldAbort === hold) statusHoldAbort = undefined; }
  }
  async function checkStatus(abort: AbortController, id: string) {
    let status: TrialStatus | undefined;
    let failure: "status" | "receiver" = current.error === "receiver" ? "receiver" : "status";
    const timeout = setTimeout(() => abort.abort(), 10_000);
    abort.signal.addEventListener("abort", () => clearTimeout(timeout), { once: true });
    try { status = await client.status(id, abort.signal); }
    catch (error) { failure = failureKind(error, failure); }
    finally { clearTimeout(timeout); }
    try {
      if (!ownsStatus(abort, id)) return;
      const remaining = foregroundStartedAt === undefined ? 0
        : Math.max(0, foregroundMinimumMs - (timing.now() - foregroundStartedAt));
      if (remaining) await holdStatus(remaining);
      if (!ownsStatus(abort, id)) return;
      if (status && !abort.signal.aborted) {
        update({ status, busy: false, error: null });
        schedule();
      } else update({ busy: false, error: failure });
    } catch {
      if (ownsStatus(abort, id)) update({ busy: false, error: failure });
    } finally {
      if (statusAbort === abort) {
        statusAbort = undefined;
        statusPromise = undefined;
        foregroundStartedAt = undefined;
      }
    }
  }
  function refresh(background = false): Promise<void> {
    stopPolling();
    if (disposed || !current.challenge || !active(current.status?.state)) return Promise.resolve();
    if (statusAbort) {
      if (!background && foregroundStartedAt === undefined) {
        foregroundStartedAt = timing.now();
        update({ busy: true, error: current.error === "receiver" ? "receiver" : null });
      }
      return statusPromise ?? Promise.resolve();
    }
    if (current.busy) return Promise.resolve();
    const abort = new AbortController();
    statusAbort = abort;
    foregroundStartedAt = background ? undefined : timing.now();
    if (!background) update({ busy: true, error: current.error === "receiver" ? "receiver" : null });
    statusPromise = checkStatus(abort, current.challenge.id);
    return statusPromise;
  }
  async function start(phone: string) {
    if (disposed || current.busy || current.challenge) return;
    update({ busy: true, error: null });
    try {
      // Do not abort this request on dismissal: its returned id is needed for
      // cleanup. Bound it independently so an unavailable server cannot hang it.
      const challenge = await client.create(phone, AbortSignal.timeout(10_000));
      if (disposed) { await client.cancel(challenge.id, true); return; }
      update({ challenge, busy: false, status: { id: challenge.id, state: "pending", expiresAt: challenge.expiresAt, mode: "trial" } });
      schedule();
    } catch (error) {
      if (!disposed) update({ busy: false, error: failureKind(error, "create") });
      // A lost response can leave a server row until its short expiry; it can
      // never grant registration or survive the server's expiry checks.
    }
  }
  async function reset() {
    if (disposed || (current.busy && !statusAbort)) return;
    stopPolling();
    stopStatus();
    if (current.challenge) {
      update({ busy: true, error: null });
      try { await client.cancel(current.challenge.id); }
      catch { update({ busy: false, error: "cancel" }); return; }
    }
    update({ challenge: null, status: null, busy: false, error: null });
  }
  function expire() {
    if (disposed || !current.status || !active(current.status.state)) return;
    stopPolling();
    stopStatus();
    update({ status: { ...current.status, state: "expired" }, busy: false, error: null });
  }
  function dispose() {
    disposed = true;
    stopPolling();
    stopStatus();
    if (current.challenge) void client.cancel(current.challenge.id, true).catch(() => {
      // Cleanup is best effort during unload. Server expiry remains authoritative.
    });
  }
  return { start, refresh, reset, expire, dispose, snapshot: () => current };
}
