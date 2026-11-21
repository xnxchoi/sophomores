# ADR-0028: A stuck signer nonce is recovered by hold, then a same-nonce zero-value self-send that outbids by at least 10%

**Date**: 2026-11-22 (approved 20 Nov)
**Status**: accepted (owner approved the procedure; the full runbook is still a draft held by the Auth lane)
**Deciders**: owner; Auth lane drafted and implements; Codex Review-A and Review-B reviewed; written by Maintenance on coordinator dispatch

## Context

The grant signer (ADR-0008) sends transactions in nonce order. If a grant is held (for example a refund arrives while it is pending, ADR-0009) and its nonce is never used, later grants stall behind it. Review-B found there was no approved way to unpark such a nonce. The Auth lane drafted an operator runbook, `SIGNER-RECOVERY-DRAFT.md` (sha256 `0be645667cd12268511a438de56007794f394002281299a3c852ed24506b802e`), which lives in the Auth lane's worktree and is not yet in this repository. The owner asked "What's a zero-value transaction?" and then approved: "The recovery procedure is approved, I think. Is there something that I need to look at?" Review-B then asked for three additions (a resume path for the sticky held state; the outbid, ceiling, write-ahead and stopped-worker rules; operator key custody and logging). The approval came before those additions.

## Decision

The terms below are the runbook's, not the owner's words.
1. **Hold.** A held grant stays held (`grant_recovery_held` is sticky) until the owner, or the designated commerce authority, settles the order's financial and benefit outcome.
2. **Same-nonce zero-value self-send.** For a nonce that is permanently held and provably unused, send a zero-value transaction from the signer to itself, with empty data, at that exact nonce and chain.
3. **Outbid by at least 10%** on both the maximum fee and the priority fee of every send recorded at that nonce, rounded up, within the network fee ceiling and the USD 0.10 cap (ADR-0026).
4. Write the recovery's terms, nonce and hash to a dedicated write-ahead row before sending, stop the grant worker first, and sign only on the owner-controlled signer host.
5. Approval follows ADR-0027 (owner alone, in override mode, until a second approver exists).

## Alternatives Considered

### Edit the database to skip the nonce
- **Why not**: the chain would still be waiting on that nonce, and direct edits break the Payload-native rule.

### Re-send the original grant
- **Why not**: a held grant may belong to a refunded order; granting it would give a key that should not exist.

## Consequences

### Positive
- A stalled signer can be unblocked without granting a key nobody paid for.

### Negative
- Each recovery costs gas and needs an approval.

### Risks
- The runbook is still a draft. Bring it into the repository, with Review-B's additions, before live recovery is used.
