# Grant signer recovery (Polygon and Base Sepolia)

This is the operator runbook for a stalled key-grant signer. It is decided by ADR-0028 (hold, then a same-nonce zero-value self-send that outbids by at least 10%), ADR-0026 (USD 0.10 per transaction, ours), and ADR-0027 (the owner alone approves until a second approver exists). It folds in the reviewed draft from 20–21 Nov. Day-to-day running of grants is in [KEY-GRANTS.md](KEY-GRANTS.md).

**What exists today, and what doesn't:**
- **Exists:** the worker parks and holds, automatically.
- **Exists:** stopping the tick (the go-live switch).
- **Exists:** read-only reconciliation.
- **Not built:** a recovery self-send command.
- **Not built:** a recovery write-ahead record.
- **Not built:** an audited "resume" operation.
- **Not built:** approver roles and alerts in Payload.

Until they are built and reviewed, a stalled signer is **stopped and escalated to the owner**. Nobody hand-signs a recovery or edits the database (owner rule: Payload-native operations only).

## 1. Recognise a stall
One unresolved nonce blocks every later grant from that signer: the worker holds new grants in `pending` while a nonce is stopped for a person. Look for intents with any of these `lastErrorCode` values:
- `grant_broadcast_pending`, still there after about a minute;
- `grant_broadcast_suppressed`;
- `grant_recovery_held`;
- `replacement_exhausted`, `replacement_fee_ceiling` or `replacement_rebroadcast_refused`;
- `confirmation_overdue` (state `ambiguous`).

The tick keeps printing `{"outcome":"ran",...}` with `dispatched: 0` while owed keys wait. Customers see their key as pending, and no new payment is needed.

## 2. Stop and hold (anyone on call)
1. Stop new sends: unset `KEY_GRANT_POLYGON_LIVE` (or set it to anything but `1`). The next tick prints `{"outcome":"off"}`. Nothing else changes.
2. Leave every intent as it is. Do not edit rows, clear codes or "retry" by hand.
   - A missing receipt, a timeout or a pending nonce is **not** proof that a transaction did not run.
   - An `ambiguous` grant is never retried automatically, and must not be retried by hand.
3. Do not release a seat or refund a customer *because* the signer is stalled. Their order is paid; only the key is late.
4. Tell the owner, with the chain, the signer account (CAIP-10), the nonce, the intent IDs, every recorded hash for that nonce, how long it has been stuck, and how many grants are queued behind it. Never send raw transaction bytes, key material, env contents or a member's address.

## 3. Triage (owner, read-only)
- **Check every recorded hash** for the stuck nonce at the chain's depth: Polygon 256 blocks, Base Sepolia 10.
  - **If a grant mined:** turn the switch back on. The tick's reconcile settles it (`granted`) and the queue moves.
  - **If it reverted:** reconcile records it, and the intent goes back for a person, never automatically.
- **`grant_recovery_held` is sticky.** A hold placed because the order's money or benefits are in question (a refund in progress, say) stays until the owner, or the designated commerce authority, settles that order's outcome. An ambiguous or permanent refund is not a cleared hold. A held grant must never be sent: it may belong to a refunded order.
- **`grant_broadcast_suppressed`** has no stored transaction bytes. It cannot be resumed by rebuilding or editing the row. It is the owner's decision.
- **Prefer reconciling first.** If the node accepted a send before the hold, wait for reconcile before choosing recovery.

## 4. Same-nonce recovery self-send (owner-approved; tooling not built yet)
Use this only for a nonce that is permanently held and provably unused. It consumes the nonce without granting a key.
- **Approval:** the owner alone, in override mode (ADR-0027), until a second approver exists. Record the approval:
  - who approved, and when;
  - chain, signer and nonce;
  - every candidate hash at that nonce;
  - the cap in USD and in POL;
  - the reason, the mode, and the result.
  No self-double-approval.
- **Transaction:** a zero-value transaction from the grant signer to itself, with empty data, at exactly the stuck nonce, on the same chain. It never issues a key. The lock manager (the owner's wallet) never signs it.
- **Fees:**
  - Outbid every send recorded at that nonce by **at least 10% on both** the max fee and the priority fee, rounding up, within the per-gas ceiling (Polygon 3,000 gwei).
  - Worst case, gas limit × max fee, must be within **USD 0.10** converted to POL from a fresh quote at approval (the same conversion as `KEY_GRANT_POLYGON_MAX_COST_WEI`).
  - If either fee would pass a cap: stay parked and escalate. No automatic raise.
  - A self-send is about 21,000 gas: at 330 gwei with a 10% bump that is about 0.0076 POL (20 Nov quote).
- **Write-ahead, then send:**
  - Stop the tick first.
  - Write the approved terms, nonce and recovery hash to a dedicated recovery record before sending, never a fake grant hash. That record is not built yet: this is why recovery stays escalated tonight.
  - Recheck the nonce and the receipts immediately before signing.
  - Sign only on the owner-controlled signer host, as the owner of the signer file (0600, regular file, no symlink). Approvers are not automatically key holders.
  - Log who used the signer, when, the approval, the purpose and the public hash; never key material.
- **Settle at depth:**
  - **If the original grant won the nonce:** reconcile settles it. Route any needed cancel to the owner's wallet ([KEY-GRANTS.md](KEY-GRANTS.md), refund cancels).
  - **If the self-send won:** keep the original disputed hash on its intent, and settle the recovery record without granting a key.
  - An unknown competing transaction, or missing proof, keeps the signer parked.
- **Resume:** turn the switch back on. The tick resumes behind the cleared nonce.

## 5. Still to build before live recovery (not part of tonight's slices)
- An audited operator entrypoint for the self-send, with the recovery write-ahead record.
- The reviewed "resume" operation for a cleared hold: it re-checks payment, admission and intent under the existing lock order, and keeps the original attempt and nonce.
- Approvers and alerts in Payload: owner-only designee; alerts deduplicated by chain, signer and nonce, with no raw bytes or personal data; override-mode toggles audited.
