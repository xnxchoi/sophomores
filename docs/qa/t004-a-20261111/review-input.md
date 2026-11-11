# Identical independent review input — T004-A

You are a fresh independent Santa **design** reviewer. Do not see or request any
other review/assessment. Do not read progress/handback/review-result files. Your
job is to find objective defects, not approve by default. Read only the files named
below and the source anchors/package source they identify. Do not edit anything,
run app/Node/test/build/browser/service/DB/provider/hardware workloads, inspect
environment/credentials, fetch network docs, or start another agent. Native source
reads and bounded hashes are permitted. Use rtk-prefixed shell commands.

## Original spec and output (identical for both reviewers)

- `original-spec.md`: exact authoritative original three-criterion T004-A spec,
  assignment contract, preserved financial brief and governing commerce worklist.
- `reconciliation-design.md`, `source-map.md`, `source-anchors.json`, `routing.md`.
- `candidate-1-manifest.json` and `candidate-1-checks.json`: frozen identity and
  deterministic checks completed BEFORE review. Verify identity before reasoning.
- Applicable AGENTS.md in the checkout and user-provided project instructions;
  the assignment is docs-only, not implementation or whole-backlog permission.

All listed files live under `/Users/seanschoi/Projects/sphmrs/docs/qa/t004-a-20261111/`.
The supplied manifest's candidate file list is the output under review. Reports
are separate evidence, not part of the candidate identity. No candidate is delivered
as working payment recovery. Future design decisions must remain explicitly gated.

## Rubric — every criterion must pass; no averaging

1. **Source accuracy and architecture:** discovery, both browser branches, explicit
   resume/retire, verified signed dispatch, official finalizer, effect hooks and
   actual installed transaction-end/native completion are precisely mapped. No
   source-only exactly-once/durability or current provider API claim.
2. **Three operations and security:** local GET reads cannot cause provider/domain
   mutations; C is bounded/server-owned and shares settlement authority; P remains
   explicit. Exact account/attempt/cart/snapshot/store/channel and privacy/CSRF,
   holds, idempotency and lock ownership survive all paths. No new access grants.
3. **Actors/actions/disclosure:** known causes and supported next actor/actions
   distinguish true uncertainty; visible controls are not approval. No forced
   identical customer retry, invented support power, notification or persistence
   promise; no polished copy approval inferred from a design.
4. **All callers and branches:** active shop/recovery/current-cart/no-cart, return/
   restoration, webhook, explicit payment and non-claim transaction regressions are
   accounted for, including relevant fulfillment/admission/stock/allowance effects.
5. **Failure/unknown boundaries:** headers vs consumed body; malformed receipt vs
   transport; native commit/rollback vs API resolution; changed identity vs stale
   completions; timeout vs server in-flight; typed not-found vs generic404/READY/
   unsupported statuses; held/terminal/rate/budget/selection/catch-up cases. No
   not-found=no-charge inference, automatic charge/SDK/retire/release or hold reset.
6. **Acceptance coverage and dependency order:** full original three criteria and
   financial brief covered; test-first implementation slices have 1–3 verifiable
   criteria each, affected callers and fault crosswalk, explicit owner/DB/runtime/
   provider/device gates. RED/GREEN and live proof are not fabricated for docs.
7. **Safety and unresolved policy:** no timing/budget/retention/queue/operational
   authority defaults; financial brief untouched; all external/dependency/service/
   hardware/credential/commit/publication/readiness/deployment exclusions preserved.
   Governing commerce plan and final deployment milestone remain intact.
8. **Internal coherence and bounded delivery:** proposals versus current source are
   explicit; durable catch-up is required but not invented as working; no circular
   authority/deadlock/unsafe lease expiry hidden in the design; frozen scope is
   reviewable and only custodian can accept/close/change registry.

Return one structured JSON object: {"verdict":"PASS|FAIL", "candidate":"candidate-1",
"manifest_sha256":"...", "checks":[{"criterion":"1 ...", "result":"PASS|FAIL",
"detail":"evidence/precise defect"}], "critical_issues":[{"id":"...",
"location":"path/section/source anchor", "defect":"...", "required_fix":"..."}],
"suggestions":["non-blocking only"], "scope_attestation":"read-only; no forbidden work"}.
A FAIL identifies an actionable assignment defect, not a request to implement a
gated policy or expand scope. PASS requires all eight checks pass. Do not invent
execution evidence. Return JSON to the parent only; parent persists it.
