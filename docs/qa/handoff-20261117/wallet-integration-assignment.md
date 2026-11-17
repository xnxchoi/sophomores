# W-01: Wallet Integration Manifest

Owner: one Orca worker; coordinator: Codex custodian. Read-only assignment,
2026-11-17. Target: `codex/auth-payment-nfc`; candidate:
`codex/wallet-activation-20261116`. Resolve both full SHAs before inspection.

## Task

Prepare an exact, reviewable integration manifest for the accepted wallet
mechanisms while keeping every rejected `/welcome` visual out of the candidate.
This is preparation, not permission to integrate, redesign, or change build order.

Read `AGENTS.md`, the auth-custodian and welcome-card handoffs on the auth branch,
the wallet branch's dispatch/handback, and the current consolidation plan.
Use `git show`, `git diff`, and other read-only local Git inspection from the
coordinator checkout; do not enter or modify another session's worktree.

## Deliverable

Return via `worker_done`, with branch-qualified paths and line references:

1. Exact source/target SHAs and unique commits for the accepted mechanisms.
2. Minimum coherent file/commit set for wallet-at-payment, catch-up, passkey
   eligibility/outcome checks, and the welcome read model; identify shared copy,
   account entry, route and visual dependencies that prevent clean isolation.
3. Compatibility analysis for `20261116_074049_member_wallets` against the
   target migration ledger/schema. Name collision, ordering, generated-schema,
   and data-preservation concerns; distinguish inspection from DB proof.
4. A concrete test-first worker scope, required red/green cases, guarded gates,
   and a unique proposed proof port after checking documented allocations.
5. A safe recommendation: hold the entire slice or prepare mechanisms separately.
   Do not presume the latter is approved, or invent missing owner decisions.

## Boundaries

- You are not alone in this checkout. Other agents and owner WIP are present.
  Make no filesystem changes, stage/commit/merge/push operations, or worktree
  changes. Report the manifest in your result; the custodian persists it.
- No tests, builds, previews, database access, credential reads, RPC/provider
  calls, package installs, remote actions or additional agents.
- Signet mark, color and label typeface remain owner decisions; no design edits.
- A nonzero inspection command is diagnostic evidence; report it rather than
  hiding it. Missing evidence means a held gate, not completion of integration.
- Finish with concrete implementation acceptance and blockers, not another
  broad production-readiness audit.
