import type { Payload, PayloadRequest } from "payload";
import type { KeyGrantAdapter } from "./contracts";
import { polygonKeyGrantsLive } from "./unlock/polygon";
import { releaseInvalidatedSeatsSweep } from "../seat-release";
import { dispatchKeyGrants, logOverCap, reconcileKeyGrants, reconcileOwnerCancels, replaceStuckKeyGrants, type KeyStateReader } from "./worker";

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
 *    fair sweep). Its own transactions; a failure never fails the tick and the next tick retries. Failures are counted
 *    in the result (seatSweepFailures) and written as one fixed stderr line, {"event":"seat_sweep_failed","count":n},
 *    because the tick script silences the Payload logger.
 *
 * Off (KEY_GRANT_POLYGON_LIVE not "1") nothing runs and nothing is read. One tick at a time: `acquire` must take an
 * exclusive run lock (the tick script uses a PostgreSQL advisory lock) or return null, and a busy tick does nothing.
 */
export const KEY_GRANT_TICK_LIMIT = 10;
/**
 * A cooperative scheduling budget for the whole tick, not a hard bound: after this long no pass, work-list page, row
 * or hash starts, and unfinished work stays due for the next tick. Work already in flight may finish: the current
 * hash's reads (its walk gives up after WALK_BUDGET_MS, 2 min), and the nonce safety reads, which always read in full.
 * The unit's TimeoutStartSec=900 is systemd's start timeout, a hard kill reported via OnFailure as systemd_failed; it
 * is not a graceful bound.
 */
export const TICK_BUDGET_MS = 10 * 60_000;

export type KeyGrantTickResult =
  | Readonly<{ outcome: "off" | "busy" }>
  | Readonly<{ outcome: "ran"; reconciled: number; replaced: number; dispatched: number; cancelled: number; seatsReleased: number; seatSweepFailures: number; overCap: readonly string[];
      /** Present only on a first run limited to its allowlist: owner-cancel maintenance and the seat sweep did not run. */
      maintenance?: "skipped_allowlist" }>;

export type KeyGrantTick = {
  payload: Payload;
  /** The grant adapter; it also reads key state for the owner-cancel reconcile (reads only). */
  grant: KeyGrantAdapter & KeyStateReader;
  /** An exclusive run lock: its release, or null when another tick holds it. */
  acquire: () => Promise<(() => Promise<void>) | null>;
  env?: Readonly<Record<string, string | undefined>>;
  limit?: number;
  now?: () => Date;
  /** Where the fixed alert lines go (stderr by default; the tick script writes them synchronously and spools them). */
  log?: (line: string) => void;
  budgetMs?: number;
  /**
   * A supervised first run's exact intent IDs (keyGrantRunScope, VPS plan v4 H1). Every pass works only on these, and
   * owner-cancel maintenance and the seat sweep are skipped for the whole run.
   */
  scope?: ReadonlySet<string>;
};

export async function runKeyGrantTick({ payload, grant, acquire, env = process.env, limit = KEY_GRANT_TICK_LIMIT, now, log = (line) => console.error(line), budgetMs = TICK_BUDGET_MS, scope }: KeyGrantTick): Promise<KeyGrantTickResult> {
  if (!polygonKeyGrantsLive(env)) return { outcome: "off" };
  const release = await acquire();
  if (!release) return { outcome: "busy" };
  try {
    // Over-cap grants are alerted twice: the fixed stderr line, and their intent IDs in the result line, which the tick
    // script writes synchronously before it exits (Review-A, 25 Nov: an alert must not be lost at exit).
    const overCap: string[] = [];
    // One shared deadline (TICK_BUDGET_MS) across every pass (Review-A, 25 Nov).
    const clock = now ?? (() => new Date());
    const deadline = clock().getTime() + budgetMs;
    // Once the budget is spent, no later pass starts. Each pass also checks it before every work-list page, row and
    // hash; the nonce safety reads and the hash in flight may still finish (cooperative, not a hard stop).
    const spent = () => clock().getTime() > deadline;
    const reconciled = spent() ? 0 : await reconcileKeyGrants({ payload, adapter: grant, limit, now, deadline, scope, onOverCap: (intentID) => { overCap.push(intentID); logOverCap(intentID, log); } });
    const replaced = spent() ? 0 : await replaceStuckKeyGrants({ payload, adapter: grant, limit, now, log, deadline, scope });
    const dispatched = spent() ? 0 : await dispatchKeyGrants({ payload, adapter: grant, limit, now, log, deadline, scope });
    // A first run limited to its allowlist does no maintenance: owner cancels and seats touch other intents and orders.
    if (scope) return { outcome: "ran", reconciled, replaced, dispatched, cancelled: 0, seatsReleased: 0, seatSweepFailures: 0, overCap, maintenance: "skipped_allowlist" };
    const cancelled = spent() ? 0 : await reconcileOwnerCancels({ payload, reader: grant, limit, now, deadline });
    let seatsReleased = 0, seatSweepFailures = 0;
    // The seat sweep is the last step; it checks the deadline between orders and keeps its cursor when it stops.
    if (!spent()) try {
      const req = { payload, context: {} } as unknown as PayloadRequest;
      ({ released: seatsReleased, failed: seatSweepFailures } = await releaseInvalidatedSeatsSweep({ req, limit, now: clock().getTime(), stop: spent }));
    } catch {
      seatSweepFailures = 1;
    }
    if (seatSweepFailures) log(JSON.stringify({ event: "seat_sweep_failed", count: seatSweepFailures }));
    return { outcome: "ran", reconciled, replaced, dispatched, cancelled, seatsReleased, seatSweepFailures, overCap };
  } finally {
    await release();
  }
}
