# SPH-T002-UNLOCK-SHAPE-20261113-01: fix 4, owner-authorized, 2026-11-13

**Context.** Resume in the existing worktree `orca/workspaces/sphmrs/unlock-shape-20261113`. The prior candidate is `222d85a` (diff `bf66335e…a486`), and its runtime has been released. The original spec, boundary and shared rules still apply, plus the owner's Payload-native DB rule (AGENTS.md "Database: Payload-native first"). Markdown only: run no Node workloads.

**Why this fix.** Cycle 3 failed: the specialist review, Santa A and Santa B all failed it, with no HIGH findings. **The owner authorized exactly one narrow fourth fix**, limited to the items below. Change nothing else.

## Required (MEDIUM findings)

1. **Validating signer: trust root, cap and build slot** (`decision.md:83,90,99,106,246-252,281`). All three reviewers raised this.
   - **Trust root.** Name the authority that produces "independently approved recipient/intent evidence", the credential it signs with, and where the signer reads it. That credential must be held outside the web app. Coordinate with auth's fix 4: auth's authorization service issues and owns a signed binding attestation, which is the natural candidate. Cite it as a boundary dependency; do not design auth's internals.
   - **Cumulative cap.** Add a cap tied to independently counted activations, on top of the 10/min rate cap. `grantKeys` bypasses `maxNumberOfKeys`.
   - **Residual exposure.** State plainly what a compromised app server can still do after isolation, and also what a compromised app plus a compromised attestation key can do. Put both in decision 2, in plain language.
   - **Build slot.** Give the signer policy and monitor build an owner and a date: calldata decoding, the rate and cumulative caps, the cancel envelope and nonce authority. Add an explicit fallback for when no suitable signer exists by the date.
   - **Nonce authority.** Name one side as the nonce allocator and the other as the validator. This resolves the LOW about `:83` versus `:99`.
2. **Launch-minimum cut** (`:158,162,177-179,250,283`). Raised by Santa B.
   - Choose one launch attendance and capacity owner. Recommended: the existing paid commands stay authoritative for Dec 4, and the new access tables are post-Dec-4 or are projections only.
   - Make the table list, the build order and Proof D consistent with that choice.
3. **Payload-native schema (owner rule).** Restate every proposed launch table (`:164-180`) as a Payload collection or field, added through Payload migrations, with its collection slug, owning access and relationship fields. Data that the external signer or the authorization service owns lives in that service's own store, not in raw tables in the Payload DB.

## LOW (apply)

- Add `activationRecordConsistent` (kernel `:121-122`, untyped membership count) to the P2a-T change list.
- Fix the cite at `:199`: the line is 178.
- Add `grantKeys` and `grantKeyExtension` to the recovery multisig's power list (`:88,92`), and say how that minting power is constrained.
- Reconcile "pre-activation return" (`:207`) with the owner's "unactivated tokens are non-refundable". A cancelled payment always releases its units. Any return other than a payment cancellation is an owner policy input, not a design assumption.
- Pin the `Mixin*` cites to the deployed v14 source, or label the exact differences from the master source.
- Replace jargon in decisions 2 and 3 ("KeyGranter", "dispatcher", "type slot") with plain language.

## Gates

- `boundary.md` stays byte-identical.
- The standard-library link and anchor check passes, with the actual output recorded.
- `git diff --check` is clean.
- Commit new commits, with no amend.
- Append a "Fix 4" section to the handback with the new diff hash.
- Send one `worker_done`.
