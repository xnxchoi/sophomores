# Batch 2026-11-12 — dispatch custody

Run `run_dda339a408f6`; custodian `term_657cd5a3-8919-49a4-a057-e124be9e626e`. The owner directed "push and launch the items" on 2026-11-12. Main `66a36ea` was pushed and verified with `ls-remote` before launch. Contracts are frozen at main `6ee30d2`. Default model (none named by the owner); setup skipped; no installs.

| Assignment | Task / Dispatch | Worktree | Receipt state |
|---|---|---|---|
| SPH-T004-I0-20261112-01 | `task_407b4fbb24c2` / `ctx_8d2f6fc15a06` | `/Users/seanschoi/orca/workspaces/sphmrs/t004-i0-20261112` | `outcome_unknown` (turn start unobserved; do not resend) |
| SPH-T005-C-20261112-01 | `task_fe2d40f7e6ef` / `ctx_60f3cda359e9` | `/Users/seanschoi/orca/workspaces/sphmrs/t005-c-20261112` | `outcome_unknown` (turn start unobserved; do not resend) |
| Docs LOW wording pass | not dispatched | — | **queued**: a third Codex tree (~1.6 GiB) would exceed the 15 GiB aggregate. Admit after one worker settles |

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
