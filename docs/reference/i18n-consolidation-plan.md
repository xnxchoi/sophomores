# Canonical UI messages — autonomous consolidation

Updated 2026-11-10 (Asia/Seoul). Phase: complete / local migration checkpoint.

## Owner contract

- Canonical English UI copy belongs in `messages/en.json`; keep it exhaustively
  populated for migrated active surfaces. New captions/copy are English-only.
- **Do not modify `messages/ko.json`**, including empty strings, formatting or key
  ordering, without an explicit owner translation instruction. Its baseline SHA-256:
  `44d2db28c98fac07dab9fea96771546390cbe79988ff4cddb35a967c1cf7a2e8`.
- Korean may be partial. English is the missing-key fallback; names, titles and
  simple functional labels are not automatically translated. Never invent Korean.
- Exclude landing marketing/editorial content and Payload-owned product, event,
  seller, policy and article values. Shared interface controls remain UI. Native
  library/vendor translations, quarantined Hideaway/reference code and historical
  snapshots are not rewritten. First-party staff interfaces remain in scope.
- Preserve routes, auth/checkout/session state, protocol/error codes, stored values,
  identity, classes and motion. This is copy relocation, not redesign or rewriting.
  CSS remains owner-deferred/non-blocking.

## Explicit owner breakpoint — activated 2026-11-13

The owner activated **Korean empty-output fallback** on 2026-11-13. An empty
Korean string now displays the corresponding English message through the shared
native next-intl request catalogue, covering client hooks, server functions and
ICU/rich messages without changing missing-key diagnostics or protocol codes.

`messages/ko.json` mirrors the literal structure, key paths and key order of
`messages/en.json`; every leaf is a string. New untranslated keys contain `""`.
English key additions, renames and removals require the matching Korean structural
change in the same commit. Preserve all existing Korean text, including values
written in English; activation does not authorize translation, overwriting or
English auto-fill of Korean JSON. English-only authoring remains active.

The implementation uses installed lodash-es `mergeWith` directly to keep the
English value when the Korean source is `""`, without mutating either catalogue.
No translation wrapper, second API or permanent activation flag is introduced.
Historical pre-activation checkpoints below describe their original validation
state; this activation supersedes their inactive-breakpoint and raw-file-hash gates.

## Council decision

- **Architect, initial:** English consolidation and native missing-key fallback now;
  prepare an inactive empty-output policy. Reasons: frozen Korean, explicit owner
  control, independent verifiable batches. Risk: missing-versus-empty ambiguity.
- **Skeptic:** do not confuse English authoring with permission to erase local
  Korean behavior; a nonruntime archive does not preserve the current experience.
- **Pragmatist:** ship canonical English and native missing fallback; avoid a
  speculative wrapper while no current Korean entries are empty.
- **Critic:** reserve empty fallback for the owner, preserve explicit blanks and
  disclose visible local-Korean-to-English transitions.
- **Verdict:** no runtime activation flag/wrapper tonight (Pragmatist/Skeptic changed
  the initial design). Strongest dissent is the local-Korean behavior change. The
  canonical English-only consolidation wins over a competing legacy runtime
  catalogue, with that change explicitly disclosed and baseline source preserved.

## Autonomous execution loop

Sequential quality-gated batches, parallel disjoint source edits only. Root owns
all guarded workloads and the sole English catalogue writer; workers contribute
namespace fragments, never edit Korean or concurrently merge English JSON.

1. [x] Review and checkpoint existing owner WIP plus this plan/policy; push baseline
       **before runtime i18n implementation**. Never broad-stage private state.
2. [x] Inventory active imports/surfaces, local catalogues/maps and literals;
       classify each reviewed file as migrated, already canonical, CMS-owned,
       landing/editorial, vendor/reference or explicitly deferred.
3. [x] Test-first native message merging and provider coverage: main site,
       standalone auth, nested phone verification, first-party Payload controls.
       Retire identical feature-local phone catalogues without changing root KO.
4. [x] Migrate customer auth/recovery/phone copy; preserve typed failure semantics.
5. [x] Migrate commerce, account/settings, navigation and reading controls; never
       replace CMS values with translation keys.
6. [x] Migrate first-party staff/operator/schema labels and other reachable UI.
       Conditional developer tools come after customer/staff essentials.
7. [x] Merge English fragments atomically; validate English key/ICU completeness,
       frozen Korean bytes, missing-versus-empty behavior and message ownership.
8. [x] Run guarded compiler/lint/affected auth/commerce/i18n tests; repair regressions
       rather than suppressing tests. Auto-review code/TS/React/security as relevant.
9. [x] Review real representative desktop/mobile component renders using bounded
       synthetic previews; no real provider, auth, payment or DB actions. Report
       visual evidence separately from tests and mark any unverified surfaces.
10. [x] Commit reviewed batches locally, persist exact receipts and remaining file
        ownership, and leave a clean resumable handoff before the device shuts down.

Initial inventory seed: 48 App Router/proxy/Payload entries reach approximately
401 source modules / 180 TSX files by conservative static tracing. This is a seed,
not proof that every visible copy source has been reviewed. Coverage must use the
reviewed-file matrix, not catalog key growth or a grep count.

## Work ownership and checks

- Root: English catalogue, i18n/request/provider integration, integration tests,
  inventory/progress and all test/preview workloads.
- Worker A: active customer auth/account/recovery/phone presentation maps.
- Worker B: commerce/settings/navigation/reading and shared customer controls.
- Worker C: first-party staff/operator UI and schema labels; conditional tool UI.
- Handoffs/fragments: ignored `.deployment/i18n-local/`; no runtime imports from it.
- No new dependencies, database/provider calls, image builds, publication or
  deployment are authorized. Initial baseline push is authorized; reviewed migration
  commits are local checkpoints unless a further push is explicitly authorized.
- Retain at least 10 GiB system headroom, 15 GiB aggregate owned-work ceiling, one
  guarded workload/checkout. Do not run worker builds/tests or duplicate bundlers.
- English nonempty/key/ICU checks, immutable Korean hash, native provider contracts,
  original auth/payment regressions and independent review are release gates for
  each batch. Existing unrelated/deferred style failures stay visible/nonblocking.

## Shutdown-safe schedule and recovery

Start: **2026-11-10 04:25 KST** (2026-11-09 19:25 UTC). Device shutdown expected
about **08:25 KST**. Stop starting work by **07:45 KST**; stop/clean up owned jobs,
commit verified results and finish handoff by **08:05 KST**, leaving 20 minutes.
No background continuation is promised after shutdown.

At each meaningful milestone record completed files/keys, test/review receipts,
known failures, unmerged fragment locations and next exact safe action here. Before
shutdown stop all owned previews/jobs, check the full owned process tree and guard
receipts, and record any uncertain cleanup. On boot inspect Git and guard markers;
never clear a quarantine or kill recycled PIDs blindly. Do not redo verified work.

## Progress / resume panel

- Baseline: committed/pushed `6c94674` on main before runtime edits. Four prior local functional/package/asset checkpoints included. Existing owner edits preserved.
- Runtime: canonical messages/providers integrated; auth, commerce/settings/navigation/reading, staff/schema and residual customer controls migrated. English: 1,197 leaves (baseline 175); Korean: 175 unchanged. Conditional active Warp editor/control copy is included; inactive standalone tools are excluded explicitly.
- Korean invariant: frozen; no translation permission exists.
- Existing phone feature catalogues have 135 leaves and match the corresponding
  root Verification/VerificationTrial objects semantically in both languages.
- Main site has a next-intl provider; standalone auth/Payload layouts do not.
  Nested phone provider must retain its locale switch without hiding new namespaces.
- Fragile final pass: locale/provider boundaries; typed failure messages; ICU rich
  content and accessible labels; data-vs-interface separation; no accidental KO
  edits; source inventory completeness; shutdown-safe checkpoint and cleanup.

### Integration checkpoint — 2026-11-10 05:03 KST
- Root provider/catalogue test-first RED then GREEN: native deep overlay, ICU/rich
  output, Korean byte invariant and absent-versus-empty distinction. Identical
  local phone catalogues retired; nested phone locale controls use the full
  canonical catalogue rather than hiding new namespaces.
- Guarded compiler passed: `/tmp/sphmrs-typecheck.log.shnr2b1z.log`
  (peak 1.23 GiB, no remaining children). Catalogue/ICU/literal-key/interpolation
  contract tests: 13/13 passed in guarded receipt
  `/tmp/sphmrs-i18n-integrity.log.xxj_jt40.log`.
- First whole-suite run: 2,120 tests, 2,023 pass, 58 fail; failures included
  newly required isolated-test providers and obsolete local-Korean/source-literal
  expectations. These are being repaired, not suppressed. Second full run
  `/tmp/sphmrs-tests.log.nthuctk3.log` underway. Affected integration run reached
  252/253 pass; remaining seller fallback assertion corrected to canonical English.
- Auto-review: source reviews passed after fixes for retained auth failure feedback,
  exact-number English fallback plurals under Korean, and preserving FOCUS as an
  internal cursor protocol token (not displayed copy). Runtime tests/live review
  still required before claiming acceptance.
- Resource snapshot: actual RAM 48 GiB; available 20.09 GiB; CLI tree 85 processes,
  4.53 GiB RSS / 3.27 GiB physical footprint, plus separately owned browser.
  Single guarded workload rule retained. No preview currently running.
- Existing deferred CSS failures and ownership-layout snapshot remain visible. No
  dependency installation, DB/provider call, real auth/payment, publication or
  deployment performed. `pnpm audit --prod` reports five dependency advisories
  (three high); no unrelated remediation authorized.
- Next: finish guarded suite/context repairs, conditional developer UI, lint and
  desktop/mobile synthetic browser checks; dual final review; checkpoint locally.

### Completed checkpoint — 2026-11-10
- All ten bounded steps complete with acceptance boundaries recorded in
  [the QA/restart report](../qa/i18n-consolidation-20261110.md) and
  [path-level inventory](../qa/i18n-file-inventory-20261110.md).
- Final guarded compiler passes. Stable whole suite: 2,127 tests, 2,084 passes,
  four retained baseline CSS/ownership failures, 39 existing opt-in skips; no
  added skips or new failures. Final lint matches baseline (18 errors, 24
  warnings) with no new normalized file/rule/severity/headline diagnostics.
- Both independent reviewers pass source and seven sampled desktop/mobile
  screenshots. No full production, provider or physical-device acceptance claimed.
- All English fragments merged; no unfinished source owner remains. Root Korean
  hash unchanged. Empty-output breakpoint remains owner-controlled and inactive.
- Guards/previews stopped cleanly, no remaining children/listening fixture ports.
  At cleanup, 19.18 GiB system memory was available. Receipts/screenshots persist
  in ignored `.deployment/i18n-local/`; essential evidence and exact restart action
  are durable in the committed QA report. No background work continues.
- Local migration checkpoint only; initial baseline push remains the only push.
  On boot inspect Git/report; don't repeat verified migration or start unrelated
  DB/provider/deployment work without its specific approval.
