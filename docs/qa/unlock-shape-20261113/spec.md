# SPH-T002-UNLOCK-SHAPE-20261113-01 — Unlock service and data shape (investigation)

Slug `unlock-shape-20261113`, branch `codex/unlock-shape-20261113`. Follow the
[batch shared rules](../batch-20261112/shared-rules.md), with these exceptions:

- Your identity base is **the main commit that adds this file**.
- This is a Markdown-only investigation. Do not run any Node workload.
- Persist your handback as `docs/qa/unlock-shape-20261113/handback.md`.

A parallel assignment, `unlock-auth-20261113`, owns custody, wallets and
authentication. Do not decide those. Where your design depends on them, name the
dependency.

**Why now:** the owner wants Unlock live and reliable within 3 weeks, by about
2026-12-04 (registry T002). The owner handles the token itself, meaning the lock
contract. Your question is the exact surface and shape of the service and data
around it.

**Read first:**
- [blueprint](../../reference/unlock-integration-blueprint.md) §§2, 4–6 and 8;
- the [T002-A model](../t002-a-20261113/model.md), including its P2b issuance contract;
- registry T002. Tokens are **typed**: a ticket is a subset of tokens. Each account
  may bind one token per type. Each event names its required type. Holders of the
  launch type attend the launch without buying.

**Research (public, read-only):** re-verify against current Unlock docs and source.
No hosted calls, credentials, wallets, signatures, installs or paid services.

## Deliverable: `docs/qa/unlock-shape-20261113/decision.md`

1. **Token type ↔ lock mapping.** Propose one PublicLock per token type, or an
   alternative. Cover:
   - which network (L2 options with current Unlock support, gas cost and finality);
   - lock settings: max keys per address, expiration, transferability, which must be
     non-transferable after activation, and public purchase disabled;
   - metadata, public versus private, with no PII.

   Map these to the P2a ledger records, adding a type dimension.
2. **Issuance pipeline.** Compare a hosted grant (locksmith dispatcher) with a
   direct issuer signer, using a KeyGranter role. For each, give the signer custody,
   gas funding, idempotency and unknown-outcome reconciliation (blueprint §4 and
   P2b), rate limits and failure modes. Recommend one for launch.
3. **Ledger ↔ chain reconciliation.** Specify:
   - the operation outbox;
   - how to confirm a mint (receipt, event decoding, indexer lag);
   - how a launch ledger token is minted later without re-purchase;
   - what is recorded where.
4. **Check-in and passes.** Confirm or update the G4 recommendation that our ledger is
   the admission authority. Assess whether native Apple/Google passes and QR fit the
   launch, or should be deferred.
5. **The data model to add**, as additive tables and fields. The owner has approved
   additive local migrations, with a schema freeze before production. Provide a 3-week
   build order that coordinates with the auth assignment.
6. **Owner decisions**: at most five, plain-language, ranked. **Smallest live
   proofs**, each with the approvals it needs and a stop rule.

## Acceptance

1. Every claim carries a D/S/U label and a source link. The network and issuer
   recommendation includes current cost, support facts and their sources.
2. The data model and build order can be implemented without inventing policy. Each
   dependency on the auth assignment is named.
3. The handback lists the sources consulted, any fetch failures, and a link check.
