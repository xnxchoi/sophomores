# Handoff preparation — bounded single pass, 2026-11-12

Owner request: compact active backlog documentation for a successor orchestrator; safely clean stale test/Markdown/cache/temp artifacts. No feature implementation or deployment.

Custodian: current Orca terminal `term_50862586-31e0-4a84-a0da-8c9a99a5f6e2`, checkout `/Users/seanschoi/.codex/worktrees/main-history-integration/sphmrs`. Report using the Task/Dispatch worker_done route supplied at launch; questions use ask. No polling. Parent tasks T001–T012 retain their actual states. Only custodian accepts/integrates results.

Source base before this administrative commit: `701b1b86a01833c77e4bb10777cc2b3b6e0f84a8`. New worktrees must start at the dispatch-intent maintenance commit on main, and record exact HEAD, branch/path, tracked dirtiness and owned-file hashes. Current tracked tree/index clean. Existing untracked delivery QA in original/canonical checkouts is NOT copied by worktrees and is NOT disposable. Do not edit either other checkout. Accepted G1/T005-B/S1 source is reachable from base. Main is checked out HERE, not in the canonical checkout (now preservation branch).

## Boundaries
- You are not alone: other worker owns disjoint paths. Last-read content checks before writes; never revert others. No production/config/scripts/package/lockfile/catalogue changes; tests and `.md` only, plus explicitly inventoried disposable cache/temp directories. No environments/credentials copied, no installers/npx downloads, provider/DB/email/remote agents, global memory/skills/hooks, destructive bulk cleanup, force/reset/stash/clean, pushes or deployment. No worktree/chat retirement until acceptance, integration, durable evidence and learning gates.
- Use relevant local AGENTS.md and owner's source-command-update-docs/refactor-clean skills. Installed plan-orchestrate is a generative scoped router only; no implicit command execution. Archive historical captures/evidence rather than erase them. Frozen old specs are historical, not routing policy. Do not treat test agreement as functionality/PG approval.
- Local heavy/Node checks use scripts/resource-guard.py, one workload per checkout; >=10 GiB real system headroom and <=15 GiB aggregate agent tools/reviewers/workloads. Initial admission is below; recheck before checks and after tool clients spawn. No services/Docker/ports. Keep all mutable logs, temp/cache/fixtures checkout-local. Shared dependencies may only be read from existing installation if safe without shared writes; never install or copy writable environments. If unavailable, report exact dependency block.
- No nested agents/reviewers in this initial candidate phase. Custodian will arrange required code/type/security and two independent Santa reviews after deterministic evidence, same original spec/output/rubric, maximum three cycles. No UI/live render required unless you unexpectedly change UI (stop instead).
- Handback: assignment ID; candidate/blocked/interrupted; exact source/base/path/branch and diff hashes; changes + durable evidence; checks with actual failures/limits; unmet criteria/next actor; remaining processes. Do not mark parent complete, integrate, archive yourself or broaden scope. Preserve failed approaches.

## Resource admission
```json
{"physical_gib": 48.0, "available_gib": 16.766, "conservative_tool_accounted_gib": 9.315, "unreadable_live_workload_pids": [], "protected_OS_login_wrappers": [16948, 20022, 15454, 45168, 60559, 38158, 46033], "wrapper_reserve_gib": 1.0, "method": "max(RSS, physical footprint), broad tool trees; protected /usr/bin/login wrappers only receive 1 GiB aggregate conservative reserve; all descendant workloads measured", "no_app_workloads_started": true}
```
No app workload admitted yet. Two lightweight local candidates only; test workload requires fresh admission, <=2 GiB job budget and <=1 GiB Node heap initially, no competing preview. Protected OS login wrappers were the sole unreadable physical-footprint PIDs; reserve is conservative, not permission to ignore unknown workload PIDs.

## Dependency-aware routing
1. DOCS independent of TESTS inventory, both from dispatch base. Routing: docs skill manually scoped by docs-spec.md (no fabricated scoped `/update-docs` invocation).
2. TESTS baseline/inventory precedes every deletion or behavior-preserving test refactor. Routing: `/orch-refine-code` conceptual scope in tests-spec.md; never executes from the router. Unknown references/failed baseline => report, no deletion.
3. Candidate deterministic evidence -> existing required independent reviews -> serialized integration preserving concurrent main -> scoped commits and gated push. Do not promise successor takeover until records and identities are durable.

## Assignments
- SPH-HANDOFF-DOCS-20261112-01: start_unknown; see [dispatch custody](dispatch.md); contract [docs-spec](docs-spec.md).
- SPH-HANDOFF-TESTS-20261112-01: ready, not dispatched; contract [tests-spec](tests-spec.md).

Model: inherit configured local Codex. Orca's installed skill permits explicit model override only when the owner names a model; no guessed provider ID. Narrow briefs and no nested fleets minimize token use without changing host configuration.
