# Canonical UI messages — autonomous consolidation

Updated 2026-11-10 (Asia/Seoul). Phase: planning / initial checkpoint.

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

## Explicit owner breakpoint

Immediate English-only authoring is active now. **Empty-Korean-output fallback is
not automatically activated tonight.** Missing keys and empty strings are distinct.
Use next-intl's native English-base/unchanged-Korean-overlay request messages for
missing keys, preserving existing Korean empty strings verbatim before activation.

Owner activation phrase: **Activate the Korean empty-output fallback breakpoint.**
At that checkpoint: preserve raw Korean JSON, review blank/legacy Korean output,
then implement/enable the smallest tested output-aware fallback justified by the
installed next-intl API. It must cover hooks/server functions and ICU/rich output
without altering missing-key diagnostics or protocol codes. Activation does not
permit translating, resetting or filling Korean JSON. No speculative wrapper or
permanent activation flag is introduced before that owner decision.

Existing local Korean copies that do not exist in the frozen canonical Korean
catalogue may display English after consolidation. This is untranslated fallback,
not a lossless Korean migration or approved Korean rewrite. Their original source
is preserved in the pushed pre-migration checkpoint for later owner review; no
second runtime catalogue is created merely to retain obsolete local maps.

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

1. [ ] Review and checkpoint existing owner WIP plus this plan/policy; push baseline
       **before runtime i18n implementation**. Never broad-stage private state.
2. [ ] Inventory active imports/surfaces, local catalogues/maps and literals;
       classify each reviewed file as migrated, already canonical, CMS-owned,
       landing/editorial, vendor/reference or explicitly deferred.
3. [ ] Test-first native message merging and provider coverage: main site,
       standalone auth, nested phone verification, first-party Payload controls.
       Retire identical feature-local phone catalogues without changing root KO.
4. [ ] Migrate customer auth/recovery/phone copy; preserve typed failure semantics.
5. [ ] Migrate commerce, account/settings, navigation and reading controls; never
       replace CMS values with translation keys.
6. [ ] Migrate first-party staff/operator/schema labels and other reachable UI.
       Conditional developer tools come after customer/staff essentials.
7. [ ] Merge English fragments atomically; validate English key/ICU completeness,
       frozen Korean bytes, missing-versus-empty behavior and message ownership.
8. [ ] Run guarded compiler/lint/affected auth/commerce/i18n tests; repair regressions
       rather than suppressing tests. Auto-review code/TS/React/security as relevant.
9. [ ] Review real representative desktop/mobile component renders using bounded
       synthetic previews; no real provider, auth, payment or DB actions. Report
       visual evidence separately from tests and mark any unverified surfaces.
10. [ ] Commit reviewed batches locally, persist exact receipts and remaining file
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

- Planning: complete; baseline review passed, checkpoint/push pending.
- Runtime changes: none yet. Root English/Korean each have 175 leaves, no blanks.
- Korean invariant: frozen; no translation permission exists.
- Existing phone feature catalogues have 135 leaves and match the corresponding
  root Verification/VerificationTrial objects semantically in both languages.
- Main site has a next-intl provider; standalone auth/Payload layouts do not.
  Nested phone provider must retain its locale switch without hiding new namespaces.
- Fragile final pass: locale/provider boundaries; typed failure messages; ICU rich
  content and accessible labels; data-vs-interface separation; no accidental KO
  edits; source inventory completeness; shutdown-safe checkpoint and cleanup.
