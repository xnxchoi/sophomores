import { performance } from "node:perf_hooks";

const HOUR_MS = 3_600_000;
const MAXIMUM_REQUESTS = 600;
type BudgetRequest = { type: "receiver:budget"; id: number };
export type ReceiverBudgetReply = {
  type: "receiver:budget-result"; id: number; allowed: boolean; retryAfterMs: number;
};
export type ReceiverBudgetChannel = {
  isConnected: () => boolean;
  send: (request: BudgetRequest, done: (error: Error | null) => void) => void;
  onMessage: (listener: (message: unknown) => void) => () => void;
  onDisconnect: (listener: () => void) => () => void;
};

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function validId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 2_147_483_647;
}

/** Owned by the preview supervisor, not a restarted child. No URLs or secrets cross IPC. */
export function createReceiverBudget(now: () => number = () => performance.now()) {
  let requests: number[] = [];
  let lastNow = 0;
  return {
    handle(message: unknown): ReceiverBudgetReply | null {
      if (!record(message) || Object.keys(message).sort().join(",") !== "id,type"
        || message.type !== "receiver:budget" || !validId(message.id)) return null;
      const clock = now();
      const result = (allowed: boolean, retryAfterMs: number): ReceiverBudgetReply => ({
        type: "receiver:budget-result", id: message.id as number, allowed, retryAfterMs
      });
      if (!Number.isFinite(clock) || clock < 0) return result(false, HOUR_MS);
      const current = Math.max(lastNow, clock);
      lastNow = current;
      requests = requests.filter((time) => time > current - HOUR_MS);
      if (requests.length >= MAXIMUM_REQUESTS)
        return result(false, Math.max(1, Math.ceil(requests[0] + HOUR_MS - current)));
      requests = [...requests, current];
      return result(true, 0);
    }
  };
}

export class ReceiverBudgetPause extends Error {
  constructor(readonly retryAfterMs: number) {
    super("Receiver request budget is temporarily unavailable");
    this.name = "ReceiverBudgetPause";
  }
}

/** A successful matching grant is required before each OAuth, metadata or MIME request. */
export function createReceiverBudgetClient(channel: ReceiverBudgetChannel) {
  let sequence = 0;
  return (signal: AbortSignal): Promise<void> => new Promise((resolve, reject) => {
    if (signal.aborted || !channel.isConnected()) { reject(new Error("Receiver budget unavailable")); return; }
    sequence = sequence === 2_147_483_647 ? 1 : sequence + 1;
    const id = sequence;
    let settled = false;
    let removeMessage = () => {};
    let removeDisconnect = () => {};
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", unavailable);
      removeMessage(); removeDisconnect();
      if (error) reject(error); else resolve();
    };
    const unavailable = () => finish(new Error("Receiver budget unavailable"));
    const timer = setTimeout(unavailable, 2000);
    removeMessage = channel.onMessage((message) => {
      if (!record(message) || Object.keys(message).sort().join(",") !== "allowed,id,retryAfterMs,type"
        || message.type !== "receiver:budget-result" || message.id !== id
        || typeof message.allowed !== "boolean" || typeof message.retryAfterMs !== "number"
        || !Number.isSafeInteger(message.retryAfterMs)) return;
      if (message.allowed && message.retryAfterMs === 0) finish();
      else if (!message.allowed && message.retryAfterMs > 0 && message.retryAfterMs <= HOUR_MS)
        finish(new ReceiverBudgetPause(message.retryAfterMs));
    });
    removeDisconnect = channel.onDisconnect(unavailable);
    signal.addEventListener("abort", unavailable, { once: true });
    try { channel.send({ type: "receiver:budget", id }, (error) => { if (error) unavailable(); }); }
    catch { unavailable(); }
  });
}

const requestBudget = createReceiverBudgetClient({
  isConnected: () => process.connected === true && typeof process.send === "function",
  send: (message, done) => { process.send!(message, (error) => done(error ?? null)); },
  onMessage: (listener) => { process.on("message", listener); return () => { process.off("message", listener); }; },
  onDisconnect: (listener) => { process.on("disconnect", listener); return () => { process.off("disconnect", listener); }; }
});

export function requestReceiverBudget(signal: AbortSignal): Promise<void> {
  return requestBudget(signal);
}
