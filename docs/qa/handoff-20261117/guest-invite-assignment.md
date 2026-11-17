# W-02: ADR-0014 Guest Invite Rework Contract

Owner: one Orca worker; coordinator: Codex custodian. Read-only assignment,
2026-11-17. Target: `codex/auth-payment-nfc`; resolve its full SHA first.

## Task

Turn the auth handoff's next guest-invite milestone into a bounded test-first
implementation contract. Do not implement it before the preceding wallet gate.
Read the branch's auth-custodian handoff, ADR-0014, the consolidation plan's
latest owner ledger and "The flow from zero (16 Nov)", and actual production
consumers of the merged invite code. Use local read-only Git from the coordinator
checkout; do not enter another session's worktree.

## Deliverable

Return via `worker_done`, with branch-qualified file/line evidence:

1. Current behavior versus each latest owner decision: free launch-event Ticket
   per Signet holder; members-only paid invites; every QR goes to the member;
   configurable cap (2 initially, arbitrary supported); unused invites refundable;
   capacity counted by Tickets at no more than 1 + cap per member.
2. The smallest coherent implementation slices, production paths each owns,
   actual mechanism dependencies, and compatibility with wallet work. Rework
   existing code rather than proposing a wholesale revert.
3. Characterization tests and failing-first cases for each change, including
   concurrent cap/capacity enforcement, repeat requests, refunds and QR ownership.
4. Unsupported workflow/content outcomes that genuinely need owner decisions;
   do not turn proposals in `copy-owner-items.md` into approved requirements.
5. Exact acceptance/merge gates for later execution, including guarded tests,
   proof isolation and any UI live-review requirement.

## Boundaries

- You are not alone in this checkout. Preserve all owner and agent changes.
  No file writes, stage/commit/merge/push operations, branch/worktree changes,
  tests, builds, previews, database access, credential reads, package installs,
  provider/RPC calls, remote actions or additional agents.
- No implementation, provider acceptance claims, policy publication, or changes
  to the handoff build order. The custodian persists your returned contract.
- Quote owner decisions exactly when assigning authority. Explain conflicts;
  agent suggestions yield to the latest explicit owner decision.
- A nonzero inspection command is diagnostic evidence, not an excuse to invent
  source facts. End with an executable scope, not a repeat release audit.
