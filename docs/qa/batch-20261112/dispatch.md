# Batch 2026-11-12 — dispatch custody

Run `run_dda339a408f6`; custodian `term_657cd5a3-8919-49a4-a057-e124be9e626e`. The owner directed "push and launch the items" on 2026-11-12. Main `66a36ea` was pushed and verified with `ls-remote` before launch. Contracts are frozen at main `6ee30d2`. Default model (none named by the owner); setup skipped; no installs.

| Assignment | Task / Dispatch | Worktree | Receipt state |
|---|---|---|---|
| SPH-T004-I0-20261112-01 | `task_407b4fbb24c2` / `ctx_8d2f6fc15a06` | `/Users/seanschoi/orca/workspaces/sphmrs/t004-i0-20261112` | `outcome_unknown` (turn start unobserved; do not resend) |
| SPH-T005-C-20261112-01 | `task_fe2d40f7e6ef` / `ctx_60f3cda359e9` | `/Users/seanschoi/orca/workspaces/sphmrs/t005-c-20261112` | `outcome_unknown` (turn start unobserved; do not resend) |
| Docs LOW wording pass | not dispatched | — | **queued**: a third Codex tree (~1.6 GiB) would exceed the 15 GiB aggregate. Admit after one worker settles |

_Update:_ the docs pass is dispatched under [docs-low-spec.md](docs-low-spec.md); its receipt is recorded below.

Prelaunch admission: 48 GiB physical, 20.68 GiB available, 10.56 GiB accounted, no unreadable PIDs.

**Scope correction:** T005 had no recorded implementation contract. The registry
requires custodian scoping first, so its item runs as design-only T005-C rather
than as outcome implementation. T004-I0 makes no real-PostgreSQL durability claim;
a schema or dependency remedy stops for owner approval.

## Start stall and owner-approved retry, 2026-11-12

Both original dispatches stalled before their first turn. Each Codex session (v0.167.1)
stayed idle at an empty composer, while Orca recorded the prompt as an unsent draft
("[Pasted Content … chars]"). Neither worktree changed: no commits, no edits, and the
branch was never renamed to `codex/`. The custodian pressed Enter twice in the T004
terminal, with no effect. The T005 terminal was not touched.

The owner approved stop and retry. Each retry runs serially, and T005 waits until T004's
first turn is seen to start.

| Step | Result |
|---|---|
| `worker-stop ctx_8d2f6fc15a06` | `stopped`, agent terminal closed |
| `worker-start --task task_407b4fbb24c2 --retry-of ctx_8d2f6fc15a06` (same worktree, default model) | `ctx_28e45bc4c471`, terminal `term_4f72fea7…`: **stalled the same way** (`start_unknown` / `turn_start_unobserved`, liveness `live`) |
| Codex startup warnings (F2, read-only) | Non-blocking: one skill file with no frontmatter, two ignored `mcp_servers.*.type` keys, embedded mode from CLI overrides, the unstable `chronicle` feature, and `context7` MCP failing to start |
| T005 `ctx_60f3cda359e9` | Not stopped and not retried. Held so that no second worker is spent on the same failure |

Diagnosis: Orca's prompt reaches Codex but is never submitted. No startup warning
explains the stall. The docs LOW pass stays queued.

**Resolved, 2026-11-12.** The owner confirmed that both prompts were in their composers.
In this Codex setup Enter inserts a new line and Cmd+Enter submits, so the custodian's
Enter presses never submitted anything. The owner then pressed Cmd+Enter in both
terminals, and both turns were already running before the custodian sent its own
Cmd+Enter sequence (`ESC[13;9u`) into each empty composer, where it had no effect.
Active attempts: T004 retry `ctx_28e45bc4c471` and T005 original `ctx_60f3cda359e9`.
For future launches, submit with Cmd+Enter, not Enter.

## T005-C review cycle 1, 2026-11-12

Candidate `250130dfe250900f97030354e475209972bbe09d` (full diff `6ee30d2..250130d`
SHA256 `355595543ac174290acc12d2ec3d664864fef687becbeed24c3630e65f28244a`):
deterministic custodian checks PASS (owned paths only, `src/`/`messages/`/`tests/`
unchanged, 33/33 anchors in range, all cited keys present). Source-fact specialist
PASS (7 LOW). Santa A FAIL (1 HIGH, 2 MEDIUM). Santa B FAIL (2 HIGH, 3 MEDIUM).
Corrections: [t005-c-rework-1.md](t005-c-rework-1.md), sent to `ctx_60f3cda359e9`.

## T005-C review cycle 2 — ACCEPTED and integrated, 2026-11-12

Candidate `28ee1a103fdb02f0a66566f7610859da9c5b867a` (rework diff SHA256
`7c461ac850b9695e95cc47d1994dce764ab2143154c115fa79b19207e1dca04f`; full
`6ee30d2..28ee1a1` SHA256 `633f11805c1d8a7c211c127bc6d9d0ae3627551807c120960b89690d3aae505d`).
Custodian deterministic checks PASS (3 owned files changed; `src/`/`messages/`/`tests/`
unchanged; diff check clean). Fresh specialist PASS (4 LOW), Santa C PASS (4 LOW), Santa
D PASS (5 LOW); neither Santa saw the other or cycle 1. Merged `--no-ff` into main at
`11b442e`. Design acceptance only: no implementation, owner wording approval or
parent T005 completion.

LOW items carried forward into any S1 implementation contract (not applied to the
merged design):

- Latch placement: the CLAIM_INVALID bearer-only latch must live in `InvitationClaim`
  (survives the identity remount); a CONSUMED latch in `ClaimInvitation` clears on any
  `identity.generation` bump, including provider-observed changes (`checkout.tsx:77-85`).
  An A→B→A switch permits one more POST that returns CONSUMED again; accepted, no
  per-account memory.
- The session-expiry test is not a distinct boundary (that path never remounts
  `ClaimInvitation`); keep it as a cheap regression only.
- Split S1 criteria into behaviour checks and a separate completion-gates list (owner
  wording approval, live desktop/touch render, Santa review); make "preserve held
  behaviour" concrete as the retained `guests-dom.test.tsx:116-160` generic-path
  assertions.
- Align matrix owner lists with registry routing (FRONT-03 add T005/T006; FRONT-06 add
  T009; FRONT-07 add T005); add the "no proof of no prior claim" fact to C03.
- Handback line 43 ("same-bearer") and line 10 are superseded by the rework section;
  matrix line 21 evidence-limit sentence is garbled; `checkInGuest` ends at `:171`;
  C01/C03 next actor reads better as "T005/T001 owner decision".

## T004-I0 candidate — pre-review deterministic FAIL, 2026-11-12

Candidate `b1b4985d74c317f6447f04a9c942486545494fcf`. Scope and diff hash match. The
custodian ran a full typecheck at 3.5 GiB / 2048 MiB old space: exit 2, 7 TS errors, all on
test lines this candidate added; peak 2.32 GB, remaining `[]`. The receipt is in the
custodian scratchpad. No review was started. Test-only fix sent to `ctx_28e45bc4c471`:
[t004-i0-prereview-fix.md](t004-i0-prereview-fix.md). The worker is granted at most two
full-typecheck runs at 3 GiB; admission at 11.32 GiB accounted leaves room for that one
workload.

## T004-I0 review cycle 1, and docs pass launch, 2026-11-12

The pre-review fix `78de6a1` passed the custodian's full typecheck (exit 0; peak 2.41 GB;
remaining `[]`). Review results:

- Silent-failure/security specialist: PASS with notes, LOW only.
- Santa A: FAIL, 1 MEDIUM. Official 4xx rejections collapse to 503.
- Santa B: PASS, LOW only. It raised the same status issue.

Corrections are in [t004-i0-rework-1.md](t004-i0-rework-1.md), sent to the T004 worker.

The docs LOW pass was launched on admission at 9.72 GiB accounted: `task_73f9eb8ec0a6` /
`ctx_bf17157d2f5c`, worktree `/Users/seanschoi/orca/workspaces/sphmrs/docs-low-20261112`,
base `ed9932a`. The custodian submitted the prompt with the Cmd+Enter sequence, and the
worker was observed running.

## Docs LOW review cycle 1, 2026-11-12

Candidate `c85cc37`. Custodian deterministic checks PASS:

- archives verbatim;
- financial hash present;
- task IDs intact;
- 0 link failures;
- byte gates 21.271% and 39.996%.

The custodian confirmed `8efbb0a` (7c) is an ancestor of pushed `fb4ca49`.

| Review | Result |
|---|---|
| Specialist | PASS (3 LOW) |
| Santa A | FAIL (1 MEDIUM: owner-approval framing) |
| Santa B | PASS (6 LOW) |

Corrections: [docs-low-rework-1.md](docs-low-rework-1.md).

## Docs LOW review cycle 2 — ACCEPTED and integrated, 2026-11-12

Candidate `b79718b5cd4e792253f4232b8e1978fb535a2953` (content `67bbb86`). Custodian checks
PASS (0 link failures; financial hash present; byte gates 21.289% / 39.9996%). Fresh
Santa C PASS (4 LOW) and Santa D PASS (4 LOW); neither saw the other or cycle 1. Merged
`--no-ff` at `e611abc`. Integration refresh (custodian state, not candidate content):
registry DOCS panel row and ledger :138 now state the accepted state, using the
reviewers' wording suggestion. The remaining LOWs (handback bookkeeping and the duplicate
T001 link) are left as is. Plan :38 is at its byte cap and is left as reviewed.

## T004-I0 review cycle 2 — ACCEPTED and integrated, 2026-11-12

Candidate `f592a813188324fcc227031c961d3e2ec9823c03` (src+tests diff from `6ee30d2`, SHA256
`2644421de5c8e33433e9466e2335184377b208bb057bb7820ba2a88be6f1e0ed`). Custodian checks:

- full typecheck at 3.5 GiB: exit 0, peak 2.41 GB, remaining `[]`;
- scope: `src/lib/commerce/**`, `tests/commerce/**` and the handback/evidence only;
- no schema, migration, dependency or `messages/` change;
- no suppression directives;
- evidence redacted.

Fresh reviews: security specialist PASS (5 LOW), Santa C PASS (3 LOW) and Santa D PASS
(2 LOW). Neither Santa saw the other or cycle 1. Merged `--no-ff` at `32ccc27`.

**Integration gate on main `32ccc27`:** default suite under the guard (2 GiB / 1024 MiB):
2,683 tests, 2,642 pass, 2 fail (the known deferred-styling suites only), 39 skipped,
0 cancelled. Peak 1.01 GB, remaining `[]`.

**Not accepted or claimed:** real PostgreSQL fault, concurrency or restart durability;
real settlement hooks; exactly-once behaviour; provider acceptance; release readiness.
Those need separate owner approval.

**LOW items carried into the next T004 slice** (not applied):

- No integration test through `secureEndpoint`. Missing coverage: a returned official
  response with a deferred-risk flush, a flush error replacing the response, and an
  unacknowledged rollback with deferred risk.
- A failed non-`PaymentReviewRequired` flush can retry `reviewPaymentEvidence` twice
  (`ecommerce.ts` about :216-221).
- The official `/initiate` 400 body carries a `cause` from products validation, as on
  base. Confirm it is benign, or scrub it.
- Precondition and configuration failures log the same `completion-unconfirmed` cause as
  a lost COMMIT. Add coarse cause codes.
- The `!response.ok` check treats 3xx as a rejection. Document this.
- The unwrapped-`confirmOrder` test should also assert zero native events and zero
  writes.
- The "rejected" log line comes before rollback acknowledgement.
- A rejected quarantine overwrites the request's `paymentEnds` token. This fails closed.
- From cycle 0: the facade guards function calls only, real hooks must take `{req}`, and
  risk lives only in request memory after a rejected rollback.
