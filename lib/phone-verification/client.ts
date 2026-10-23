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

/** Own one modal session, including a POST that resolves after the modal closes. */
export function createTrialSession(
  client: VerificationClient,
  onChange: (snapshot: TrialSnapshot) => void,
  scheduler: Scheduler = { set: (callback, delay) => setTimeout(callback, delay), clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>) }
) {
  let current: TrialSnapshot = { challenge: null, status: null, busy: false, error: null };
  let disposed = false;
  let timer: unknown;
  let statusAbort: AbortController | undefined;

  function update(change: Partial<TrialSnapshot>) {
    current = { ...current, ...change };
    if (!disposed) onChange(current);
  }
  function stopPolling() {
    if (timer !== undefined) scheduler.clear(timer);
    timer = undefined;
  }
  function schedule() {
    stopPolling();
    if (!disposed && active(current.status?.state)) timer = scheduler.set(() => { void refresh(); }, 2000);
  }
  async function refresh() {
    stopPolling();
    if (disposed || statusAbort || !current.challenge || !active(current.status?.state)) return;
    const abort = new AbortController();
    statusAbort = abort;
    const timeout = setTimeout(() => abort.abort(), 10_000);
    abort.signal.addEventListener("abort", () => clearTimeout(timeout), { once: true });
    update({ busy: true, error: null });
    try {
      const status = await client.status(current.challenge.id, abort.signal);
      if (!disposed && !abort.signal.aborted) {
        update({ status, busy: false });
        schedule();
      } else if (!disposed && active(current.status?.state)) update({ busy: false, error: "status" });
    } catch {
      if (!disposed && active(current.status?.state)) update({ busy: false, error: "status" });
    } finally {
      clearTimeout(timeout);
      if (statusAbort === abort) statusAbort = undefined;
    }
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
    } catch {
      if (!disposed) update({ busy: false, error: "create" });
      // A lost response can leave a server row until its short expiry; it can
      // never grant registration or survive the server's expiry checks.
    }
  }
  async function reset() {
    if (disposed || current.busy) return;
    stopPolling();
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
    statusAbort?.abort();
    update({ status: { ...current.status, state: "expired" }, busy: false, error: null });
  }
  function dispose() {
    disposed = true;
    stopPolling();
    statusAbort?.abort();
    if (current.challenge) void client.cancel(current.challenge.id, true).catch(() => {
      // Cleanup is best effort during unload. Server expiry remains authoritative.
    });
  }
  return { start, refresh, reset, expire, dispose, snapshot: () => current };
}
