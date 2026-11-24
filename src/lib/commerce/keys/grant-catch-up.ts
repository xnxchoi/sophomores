import type { Payload } from "payload";
import type { KeyCancelAdapter, KeyGrantAdapter } from "./contracts";
import { polygonKeyGrantsLive } from "./unlock/polygon";
import { cancelKeyGrants, dispatchKeyGrants, reconcileKeyGrants, replaceStuckKeyGrants } from "./worker";

/*
 * The automatic catch-up for owed keys (owner, 24 Nov: "automatic catchup it is"), and the runner for refund cancels
 * (ADR-0009; nothing executed cancelRequested before this). One tick runs the existing worker passes in a fixed order:
 *
 * 1. reconcile: settle what is already on chain (submitted or ambiguous hashes; reads only);
 * 2. replace: re-send or fee-raise this signer's stuck grants at their own nonce;
 * 3. dispatch: grant owed keys (pending, plus retryable ones whose backoff has passed). A submitted grant is never
 *    dispatched again, and an ambiguous one is never retried automatically: it stays for reconcile and a person;
 * 4. cancel: for granted keys with cancelRequested, with the separate lock-manager adapter. Skipped while no
 *    lock-manager signer is configured, so requests stay recorded and unexecuted.
 *
 * Off (KEY_GRANT_POLYGON_LIVE not "1") nothing runs and nothing is read. One tick at a time: `acquire` must take an
 * exclusive run lock (the tick script uses a PostgreSQL advisory lock) or return null, and a busy tick does nothing.
 */
export const KEY_GRANT_TICK_LIMIT = 10;

export type KeyGrantTickResult =
  | Readonly<{ outcome: "off" | "busy" }>
  | Readonly<{ outcome: "ran"; reconciled: number; replaced: number; dispatched: number; cancels: number | "unconfigured" }>;

export type KeyGrantTick = {
  payload: Payload;
  grant: KeyGrantAdapter;
  /** The lock-manager adapter; null while none is configured. */
  cancel: KeyCancelAdapter | null;
  /** An exclusive run lock: its release, or null when another tick holds it. */
  acquire: () => Promise<(() => Promise<void>) | null>;
  env?: Readonly<Record<string, string | undefined>>;
  limit?: number;
  now?: () => Date;
};

export async function runKeyGrantTick({ payload, grant, cancel, acquire, env = process.env, limit = KEY_GRANT_TICK_LIMIT, now }: KeyGrantTick): Promise<KeyGrantTickResult> {
  if (!polygonKeyGrantsLive(env)) return { outcome: "off" };
  const release = await acquire();
  if (!release) return { outcome: "busy" };
  try {
    const reconciled = await reconcileKeyGrants({ payload, adapter: grant, limit, now });
    const replaced = await replaceStuckKeyGrants({ payload, adapter: grant, limit, now });
    const dispatched = await dispatchKeyGrants({ payload, adapter: grant, limit, now });
    const cancels = cancel ? await cancelKeyGrants({ payload, adapter: cancel, limit, now }) : "unconfigured" as const;
    return { outcome: "ran", reconciled, replaced, dispatched, cancels };
  } finally {
    await release();
  }
}
