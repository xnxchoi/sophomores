import type { Payload, PayloadRequest } from "payload";
import type { KeyGrantAdapter } from "./contracts";
import { polygonKeyGrantsLive } from "./unlock/polygon";
import { releaseInvalidatedSeatsSweep } from "../seat-release";
import { dispatchKeyGrants, reconcileKeyGrants, reconcileOwnerCancels, replaceStuckKeyGrants, type KeyStateReader } from "./worker";

/*
 * The automatic catch-up for owed keys (owner, 24 Nov: "automatic catchup it is"), and the runner for refund cancels
 * (ADR-0009). One tick runs the existing worker passes in a fixed order:
 *
 * 1. reconcile: settle what is already on chain (submitted or ambiguous hashes; reads only);
 * 2. replace: re-send or fee-raise this signer's stuck grants at their own nonce;
 * 3. dispatch: grant owed keys (pending, plus retryable ones whose backoff has passed). A submitted grant is never
 *    dispatched again, and an ambiguous one is never retried automatically: it stays for reconcile and a person;
 * 4. owner cancels: refunded keys are cancelled by the owner's own wallet, the lock manager (ADR-0008, ADR-0011: no
 *    cancel key on our host; scripts/key-cancel-export.ts lists them for him). Nothing here signs a cancel: the tick
 *    marks each granted intent with cancelRequested cancelled once the chain shows its key no longer valid.
 *
 * 5. seats: refunded Unlock event seats whose keys are now all invalid are released (seat-release.ts, a durable,
 *    fair sweep). Its own transactions; a failure is logged, never fails the tick, and the next tick retries.
 *
 * Off (KEY_GRANT_POLYGON_LIVE not "1") nothing runs and nothing is read. One tick at a time: `acquire` must take an
 * exclusive run lock (the tick script uses a PostgreSQL advisory lock) or return null, and a busy tick does nothing.
 */
export const KEY_GRANT_TICK_LIMIT = 10;

export type KeyGrantTickResult =
  | Readonly<{ outcome: "off" | "busy" }>
  | Readonly<{ outcome: "ran"; reconciled: number; replaced: number; dispatched: number; cancelled: number; seatsReleased: number }>;

export type KeyGrantTick = {
  payload: Payload;
  /** The grant adapter; it also reads key state for the owner-cancel reconcile (reads only). */
  grant: KeyGrantAdapter & KeyStateReader;
  /** An exclusive run lock: its release, or null when another tick holds it. */
  acquire: () => Promise<(() => Promise<void>) | null>;
  env?: Readonly<Record<string, string | undefined>>;
  limit?: number;
  now?: () => Date;
};

export async function runKeyGrantTick({ payload, grant, acquire, env = process.env, limit = KEY_GRANT_TICK_LIMIT, now }: KeyGrantTick): Promise<KeyGrantTickResult> {
  if (!polygonKeyGrantsLive(env)) return { outcome: "off" };
  const release = await acquire();
  if (!release) return { outcome: "busy" };
  try {
    const reconciled = await reconcileKeyGrants({ payload, adapter: grant, limit, now });
    const replaced = await replaceStuckKeyGrants({ payload, adapter: grant, limit, now });
    const dispatched = await dispatchKeyGrants({ payload, adapter: grant, limit, now });
    const cancelled = await reconcileOwnerCancels({ payload, reader: grant, limit, now });
    let seatsReleased = 0;
    try {
      const req = { payload, context: {} } as unknown as PayloadRequest;
      seatsReleased = await releaseInvalidatedSeatsSweep({ req, limit, now: (now?.() ?? new Date()).getTime() });
    } catch {
      payload.logger?.error({ msg: "Key grant tick: seat release sweep failed; the next tick retries" });
    }
    return { outcome: "ran", reconciled, replaced, dispatched, cancelled, seatsReleased };
  } finally {
    await release();
  }
}
