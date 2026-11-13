# T004-I1 — provider-free candidate handback

**Assignment:** SPH-T004-I1-20261113-01. **State:** review checkpoint; implementation
candidate complete, not owner acceptance, durability proof or release approval.

## Identity and custody

- Branch: `codex/t004-i1-20261113`.
- Checkout: `/Users/seanschoi/orca/workspaces/sphmrs/t004-i1-20261113`.
- Initial HEAD: `1e3c78bd1b8bab219d83445f3a1aa09fab387092`; initial tracked tree clean.
- Assignment-introducing main ancestor: `a440c9942aed88a6583ca04d921f9c784d5cd267`.
  Orca started this checkout six subsequent documentation commits later; ancestry
  verified and the inherited tracked evidence/caches were not changed.
- Scope/ownership first commit: `78de42cc0384985fd6941ae271addfbb816b110c`.
- Validated source/test commit: `759f11c98abd4239647ceb070de02cf37bf269ea`.
- Source/test diff SHA256 against initial HEAD:
  `ef58dfe2688e397e75ab0c32dcb0daefda4800b787541f431a6138891805fd61`.
- A subsequent evidence-only commit completes this handback; worker_done carries
  the final HEAD. No source/test change follows the final typecheck.

## Changed surfaces

- `src/lib/commerce/portone/result.ts`: exact GET reader with same-origin/read
  membership authority, retained tuple binding, private missing/foreign projection,
  exact order backlink/cardinality, snapshot/hash/item/amount/currency checks,
  reservation/grant/cart/counter consistency and terminal/review distinctions.
- `src/lib/commerce/portone/outcome.ts`: typed local result and observation
  projections; all automatic continuation remains stopped without approved I2 policy.
- `src/lib/commerce/portone/confirm-transport.ts`: native response headers/body
  transport versus consumed JSON/schema/identity/status rejection; generation
  invalidation suppresses stale receipts. Matching receipts require local reread,
  not direct financial confirmation or disclosure.
- `src/lib/commerce/portone/proof.ts`: exact authoritative PAID/FAILED/typed absence/
  READY/unsupported classification. Existing PAID-only finalizer enforcement is
  unchanged; no inferred alias, automatic retirement, SDK launch or retry.
- Three new test files under `tests/commerce/portone/`: result, outcome and
  confirm-transport. No test discovery change.
- Coordinator extension `msg_d60ed9ddf3ca`: mount `/result` in `endpoints.ts` and
  add only the exact `/result` suffix bypass in `ecommerce.ts`. Existing `/pending`
  and `/webhooks` bypasses are preserved. Result enforces GET and its own authority.
- No UI, catalogue, schema, dependency, configuration or unrelated source changes.

## Checks and retained failures

Exact counts, coverage lines, log SHA256 values and guard receipts are in
[checks.json](checks.json). Raw logs remain unchanged beside it in this worktree;
only raw verbose logs and temporary caches are ignored. Receipts and summaries are
committed. No failure was deleted or presented as a pass.

| Check | Observed result |
|---|---|
| Behavior RED against empty implementations | 45 tests, 0 passed, 45 failed |
| Additional RED status and transport-projection cases | 1 failed each before implementation |
| Final focused tests plus existing proof regressions | 51 passed, 0 failed |
| Final native Node coverage | 100% lines in result, outcome, confirm-transport and proof; above the 80% changed-line requirement |
| Final full typecheck, incremental disabled | Exit 0; 3.5 GiB, 2048 MiB old space, 600-second guard |
| First default suite | 2,734 tests; 2,692 passed, 3 failed, 39 opt-in skipped |
| Isolated unrelated auth DOM suite | 37 passed, 0 failed |
| Unchanged full-suite repeat | 2,734 tests; 2,693 passed, only the 2 known styling failures, 39 opt-in skipped |
| Diff whitespace check | Clean |

The two known failures are `tests/styling/deferred-article-grid.test.tsx` and
`tests/styling/deferred-clock-delegation.test.ts`. The first default run also failed
`tests/member-auth/member-auth-ui-dom.test.tsx:575`, an immediate post-click absence
assertion. No auth code/test was edited; isolation and the full repeat passed that
case. It remains an observed intermittent regression risk, not a waiver or fix.

The full-repeat production source is identical to the final candidate. After that
run, only an unrelated extra-field test sentinel changed from a credential-like
field to a synthetic email field to satisfy the pre-commit scanner. The final
51-test focused run and full typecheck include that correction. No hook bypass.

Other retained failures: initial missing-module RED (3 failures, not counted as
behavioral RED); initial GREEN (48/49 passed because a source guard accidentally
matched providerPaymentId instead of providerPayment); guard invocation initially
rejected a relative log path before starting work. All were corrected within scope.

## Resource and security boundaries

- Physical RAM: 48 GiB, verified rather than assumed. Each Node workload checked
  current physical-memory headroom and ran alone through resource-guard with a
  checkout-local TMPDIR, at least 10 GiB headroom, and the required per-job caps.
- Focused/default checks used 1.5 GiB / 1024 MiB; final typecheck used the explicitly
  authorized 3.5 GiB / 2048 MiB limit. All receipts report no remaining workload
  PIDs and cleanup_uncertain=false. No resource-limit stop or unguarded retry.
- [process-census.json](process-census.json) records this worker's descendant tree;
  [final-process-census.json](final-process-census.json) records the final audit.
  Tool/MCP servers are distinguished from finished workloads; no unrelated process
  or user application was stopped. No preview, browser or service was started.
- Authorized existing node_modules symlink only. No install, DB, provider, PortOne,
  credential/environment-file access, push, merge, deployment or remote worker.
- Source security pass: strict tuple boundary, owner check before private shape,
  allowlisted disclosure, no-store response, read-only domain path, same-origin and
  membership authority reused, no response-HTTP financial inference. Existing
  process-local abuse limiter is not claimed to be distributed protection.
- Context7 was unavailable; installed Zod 4.6.7 source, PortOne 0.19.0 declarations
  and the installed Next route-handler guide were inspected. Fast-context was
  rejected for external source-disclosure risk; local search was used instead.
- Library/helper gate: Zod parsing, native Response body transport, existing snapshot
  hashing/transaction reader/relationship/counter utilities are reused. Installed
  SDK types cannot prove local ledger linkage or distinguish fetch transport phases.
  Feature-local bounded query helpers detect duplicate/tail rows that findCommerce's
  first-row API cannot. No general helper framework or alternate settlement engine.

## Remaining gates and prioritized final review

1. Coordinator specialist review and independent Santa reviews under shared rules;
   no nested workers were used. Independent agreement will not establish owner,
   provider or live authorization acceptance.
2. I0DB real PostgreSQL fault/concurrency/restart and data-link proof. `confirmed`
   carries `local-consistency` assurance only: the reader checks structural bounds
   and relationships, not historical exactly-once accounting or crash durability.
   The final transaction reread rejects observed transitions; it is not an atomic
   DB snapshot. Real endpoint authorization and data-link proof remain pending.
3. I2 admission/eligibility and I3 official reconciliation integration. The new
   proof classifier does not make today's PAID-only preflight accept FAILED, and
   the transport seam is not yet installed in UI callers (I4/I5 ownership).
4. I4 stale-generation/account readiness at all caller effects, I5 actual UI/device
   journeys and I6 operational catch-up remain separate. This backend-only slice
   makes no live-render or provider acceptance claim and chooses no timers/budgets.
5. Preserve the observed auth DOM intermittent failure in integration review.
   The two deferred styling failures remain failures, not visual acceptance.

No schema field was required. No unmet I1 implementation criterion is concealed;
remaining runtime/provider/durability and coordinator acceptance gates are explicit.
