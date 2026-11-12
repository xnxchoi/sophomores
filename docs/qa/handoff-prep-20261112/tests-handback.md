# TESTS handback — audit-only, baseline blocked

Assignment **SPH-HANDOFF-TESTS-20261112-01** · Task `task_6d2a53643686` · Dispatch `ctx_081d84445c42`.

## Review checkpoint / progress panel

- **Done:** renamed only this new branch; inspected discovery, installed versions, provider/service boundaries, actual string/dynamic/filesystem references, and cache custody; captured original/final per-file hashes.
- **Current result:** audit-only handback; **no deletion/refactor candidate**. No original test, source, config, catalogue or evidence changed.
- **Blocked:** full default baseline is incompatible with this assignment's no-fixture-services boundary; independent final resource census also denies workload admission.
- **Remaining / next actor:** custodian decides any separately scoped baseline execution and resource remediation; then obtains required independent reviews. This is neither DOCS acceptance nor integration, parent completion, functionality or provider acceptance.
- **Prioritized fragile final pass:** (1) do not run default tests under this no-services authorization; (2) restore compliant aggregate resources without killing other owners; (3) preserve dynamic fixtures, runtime/database opt-ins and deferred-styling/default discovery; (4) do not infer unused from large size, missing imports, untracked status or `tmp` names.

## Identity and preserved scope

- Source/base/HEAD: `81af0af5af803045f6231cd2eedf157a13bbf327` (frozen dispatch base).
- Worktree: `/Users/seanschoi/orca/workspaces/sphmrs/handoff-tests-20261112`.
- Branch: `codex/handoff-tests-20261112`, renamed from `xnxchoi/handoff-tests-20261112`; destination was absent. Initial sandbox rename failed on shared Git reflog permissions; precisely scoped escalation succeeded. No other branch changed.
- Initial tracked/index status clean. Final original tracked test bytes/hashes unchanged; no tracked diff, commits, pushes, installs, services, database/provider calls, credentials or environments copied.
- DOCS candidate has arrived but remains unaccepted, per `dispatch.md` event reconciliation and `docs-intake.md`; older startup uncertainty is historical.
- Only additions: this report and `tests/.handoff-tests-20261112/` evidence. Empty `home/`, `tmp/`, `cache/`, `logs/` there were reserved for isolated checks, but no Node workload was launched. Preserve this evidence; no archive or cleanup performed.

## Baseline and exact blockers

**Full default suite: NOT RUN, not a substituted functional success or invented test failure.**

`tests/run-unit.mjs:33-45` discovers the two ordinary `.test.ts` suites below by default. Their tests have timeouts but no opt-in skip:

| Default test requiring a prohibited fixture service | Concrete source boundary |
|---|---|
| `tests/tickets/ticket-selection-preview-http.test.ts` | `:11-20`: unconditional test, loopback listener at `:13`, Node fixture spawn at `:20`; child is `tests/support/ticket-selection-preview.mjs`. |
| `tests/member-auth/recovery/review-preview-http.test.ts` | `:7-24`: unconditional test, loopback listener at `:11`, Node fixture spawn at `:18`; child is `tests/support/recovery-review-preview.mjs`. |

These are synthetic local services, **not evidence of external provider access**. Nevertheless the assignment explicitly forbids creating fixture services. Removing/skipping them, choosing `--functional`, intercepting listeners or modifying production would weaken/alter the required baseline and was not attempted. No runtime assertion failure is claimed; baseline/refactor acceptance is blocked before execution.

Provider isolation is also not unconditional: default discovery includes `tests/commerce/domain/real-payload-acceptance.test.ts:23-28` (database opt-in, `.env` loader inside the opted-in body) and PostgreSQL suites such as `tests/member-auth/member-auth-binding-postgres.test.ts:13-18,57` (environment-dependent pool/skip). The three explicit database suites and `tests/payload/portone-payment-safety.test.ts`, plus `tests/runtime/**`, are excluded by the runner; exclusions do not make other environment opt-ins disappear. No secret values were read or environment files loaded.

**Separate resource gate:** verified actual physical RAM **48 GiB**; final free/inactive/speculative headroom **15.530 GiB**, conservative broad tool footprint **15.153 GiB**, zero unreadable live workload PIDs, aggregate protected-login reserve **1 GiB**. Aggregate exceeds the **15 GiB** assignment ceiling: **DENIED**, no Node checks. See `resource-final.json` for exact time, process identities and method. Initial census failures/false-positive matching are retained in `preflight-failures.json`, `resource-admission.json`; final census corrected bounded tool-name matching, not the memory limit. No limit was raised and no stopped workload relaunched. The shell's configured Node resolves to `/opt/homebrew/bin/node`; its version was not executed.

**Dependency preflight:** no `node_modules` exists in this worktree. Canonical installed packages were read only: Next `16.5.0-canary.27`, React `19.3.1`, tsx `4.23.15`, TypeScript `6.0.3`, jsdom `28.0.0`; knip/depcheck/ts-prune and `@playwright/test` absent at their standard package paths. No analyzer, npx or installer was invoked. Canonical modules were neither executed nor linked/copied. A future run still needs an authorized read-only module-resolution arrangement and isolated writable paths; a shared installation alone is not proof of safe resolution.

## Leave-alone inventory — reference-backed classifications

| Tier | Paths / finding | Evidence and disposition |
|---|---|---|
| SAFE | **No original artifact proven safely deletable.** | No original worktree test cache/temp candidate found; a missing local cache does not grant ownership elsewhere. Baseline gate would block deletion even if a candidate were found. |
| CAUTION | `tests/tickets/ticket-selection-dom.test.tsx` — 95,639 B | Default glob consumer; explicit filesystem read in `tests/tooling/test_resource_entrypoints.py:36`; deployment runbook reference `docs/deployment/member-auth.local.md:614`. Retain. |
| CAUTION | `tests/member-auth/member-auth-ui-dom.test.tsx` — 60,794 B | Default glob; explicitly required by `tests/architecture/release-test-gates.test.ts:40`. Retain. |
| CAUTION | `tests/tickets/portone-browser.test.tsx` — 47,426 B | Default glob and deployment runbook `:614`; financial/provider boundary coverage is not stale because it is large. Retain. |
| CAUTION | `tests/support/`, `tests/fixtures/`, preview HTTP tests | Runtime subprocess string references, module hooks, source/filesystem reads and fixture imports appear in captured scans. These scans are reconnaissance, not a complete zero-consumer proof. Retain all. |
| DANGER | `tests/run-unit.mjs`, `tests/support/css-modules.mjs`, `tests/runtime/**`, Payload/PostgreSQL/provider suites | Entrypoint, native load-hook behavior, deliberate runtime exclusions, environment skip semantics and security/financial gates. Never delete/normalize to make this audit pass. |
| DANGER | Existing original-checkout cache/build evidence and all historical QA | Read-only canonical inventory found `.next/` and `tsconfig.tsbuildinfo`; no corresponding local candidate. Neither classified disposable nor touched; exact path/stat provenance in cache inventory. Coordinator original checkout had none of the named cache candidates. Untracked QA not copied into this worktree was not erased. |

## Checks, parity and reversible provenance

- **PASS static:** 376 original tracked files under `tests/`; 3,053,452 bytes before and after; every original per-file SHA256 identical. Three large-file source hashes are in baseline/final manifests.
- **Static discovery characterization only:** 288 default `.test.ts`/`.test.tsx` files, matching the runner's tracked-path glob/exclusion logic. Node `--list` was **not executed**; exact native glob and environment/runtime skip behavior remain unvalidated.
- Captured 592 broad boundary-reference rows, 113 harness/large-file reference rows and 2,296 default-suite import/dynamic/filesystem/environment-reference rows. Counts are search observations, **not coverage percentages or assertion execution totals**.
- **NOT RUN:** full default/functional/styling/database/runtime tests, typecheck, lint, coverage, builds, UI/browser/provider acceptance. No guard workload launched, so **no workload log or guard metrics receipt exists**; reserved log directory is not a receipt. No narrowed suite masquerades as full baseline.
- Original tracked diff SHA256 is the empty SHA256 (`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`); new report/evidence are untracked candidate additions, not included in that empty tracked-diff hash.
- `tests/.handoff-tests-20261112/artifact-manifest.json` records SHA256/bytes of every evidence file and this report, excluding the manifest itself. `source-hashes.json` pins contracts/harness/config inputs; `test-files-baseline.json` and `test-files-final.json` pin originals; `parity.json` records byte-level results. No original artifact moved/deleted; recovery is simply to retain frozen originals and review these additions separately.

## Remaining processes and custody

No application, preview, test, build, container, fixture service or background audit workload was started. Finite Python/shell census commands have completed; no child cleanup or user-process termination occurred. Codex worker PID `84325` and host-managed MCP/repl transports remain live for this handback; their captured descendant inventory is `worker-process-subtree.json` (1.609 GiB including the then-live census command). Active tool transports were not killed to manufacture headroom. Some host-configured transports have `npm exec` in their existing command line; this audit did not run an install or request a download. Final process-exit observation is recorded separately in `process-final-status.json`; census-time PIDs are not asserted still running.

**Custodian:** retain this as an audit-only blocked result, not accepted cleanup. Any future baseline must first resolve both service authorization and whole-tool-tree resources, then establish default green results before an atomic candidate and unchanged discovery/assertion/skip evidence. Existing independent-review requirements remain custodian-owned; no nested reviewer was started.
