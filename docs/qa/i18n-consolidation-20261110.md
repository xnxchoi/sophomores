# Canonical UI messages — acceptance and restart checkpoint

2026-11-10 · **Complete: local migration checkpoint, no deployment**

## Progress panel

| Work | Status / evidence |
|---|---|
| Before-scope checkpoint | `6c94674` committed and pushed to `origin/main`, including four prior functional/package/asset commits and approved owner WIP. |
| Canonical ownership | `messages/en.json`; 1,197 English leaves (175 baseline); root Korean bytes unchanged; duplicate phone catalogues retired. |
| Active UI | Auth/recovery, inline purchase registration, commerce/shipping/payment/guest controls, settings, navigation/reading, first-party staff/schema, shared controls and conditional Warp editor migrated. |
| Provider coverage | Main site unchanged; standalone auth/Payload supplied; nested phone provider retains locale switch and receives all canonical namespaces. |
| Review | Two independent final source and sampled visual Santa reviews PASS; separate pre-commit security review PASS with no new critical/high/actionable-medium finding. |
| Guarded compiler | Pass: `/tmp/sphmrs-typecheck.log.71rltjbg.log` (1.74 GiB peak, no remaining children). |
| Guarded tests | Final stable whole suite: **2,127 tests / 2,084 pass / 4 retained baseline failures / 39 existing opt-in skips**. Receipt `/tmp/sphmrs-tests.log.5s_je_hq.log`. No new failures or added skips; not a globally green suite. |
| ESLint | Final-scope snapshot: 187 changed/new files, 18 errors / 24 warnings, zero new file/rule/severity/headline diagnostics compared with baseline. Existing debt remains, not suppressed. |
| Live review | PASS for seven sampled synthetic screenshots at 1280×900 fine pointer and 393×852 coarse/touch; zero console warnings/errors or sampled horizontal overflow. No provider/database acceptance implied. |

The [reviewed-file matrix](i18n-file-inventory-20261110.md) names migrated, no-copy, CMS-owned, vendor, reference and inactive surfaces. Static tracing originally reached about 401 modules / 180 TSX files from 48 entrypoints; this is an inventory seed, not a claim every module has visible text.

## Language contract

- Author new copy in canonical English. Never automatically translate/fill/reformat Korean.
- Korean is a partial overlay on English. Missing keys fall back now; explicit blank Korean strings remain blank.
- Owner breakpoint: **Activate the Korean empty-output fallback breakpoint.** Only then implement/enable tested output-aware fallback; it never authorizes writing Korean JSON.
- Frozen Korean SHA-256: `44d2db28c98fac07dab9fea96771546390cbe79988ff4cddb35a967c1cf7a2e8`.
- Former local Korean auth/settings copy not present in the root Korean catalogue now displays English. Original local maps are recoverable from pushed baseline `6c94674`; this is not lossless Korean migration.
- Native next-intl renders runtime UI, including developer metadata/validation display. Static request-free Payload schema labels and page metadata read canonical English directly, preserving English-anchored names/titles without changing schema or rendering strategy.
- Landing narrative and stored CMS product/article/event/seller/policy content remain in existing ownership. Technical diagnostics, stored values, route keys and protocol tokens are not translated.

## Auto-review corrections

1. Retain the typed failure alongside retained feedback during ticket-entry refresh; timeout/network feedback must not become generic while pending.
2. Exact-number English singular branches work under Korean plural rules for missing-key fallback.
3. Preserve cursor `FOCUS`: it is an internal geometry/animation token, not rendered copy.
4. Native developer display keys permit future locale overrides; structured custom-validation params translate at render without changing diagnostic path/code/message or exported drafts.
5. Canonical unavailable-ticket accessible names preserve CMS labels through whole-message interpolation; missing selection has canonical fallback.
6. Complete all owner matrices and name unimported legacy study exclusions rather than claiming coverage from key counts.

## Retained nonblocking debt / acceptance boundaries

- Owner-deferred CSS assertions: brand/editorial type, tiny reading labels, legacy Spinner CSS motion.
- Existing component-source ownership snapshot/case mismatch; not silently widened or suppressed.
- Existing lint debt and dependency advisories are not remediated in this copy task.
- Synthetic previews do not validate actual Better Auth delivery, PortOne, Kakao postcode, Payload database integration, production runtime or deployment.
- New i18n preview suppresses external postcode script and framework navigation; actual auth/form UI stays mounted, with routing/transitions/prefetching explicitly outside that fixture.

## Restart checklist

1. Inspect current Git state/log and this report plus the [plan](../reference/i18n-consolidation-plan.md); preserve unrelated work.
2. Inspect guard receipts/markers before starting one guarded workload. Never clear a quarantine or terminate recycled PIDs blindly.
3. Preserve Korean hash and English-first authoring. Do not activate the future empty-output policy without the owner.
4. Resume only the exact remaining gate recorded at the final checkpoint below; no automatic database/provider/deployment follow-up.

## Final checkpoint

Local migration source/tests/docs are ready for the conventional commit `feat: consolidate UI copy in canonical next-intl messages`. This commit is the completed local checkpoint; only initial `6c94674` was pushed. No migration push or deployment is implied.

- Both guarded previews deliberately stopped: receipts have no remaining PIDs and cleanup is certain; ports 3084/3085 no longer listen. The owned review tab is blanked and desktop emulation restored; active tool connections/user apps were not killed.
- Final system snapshot: **48 GiB physical / 19.18 GiB available**, observed CLI descendant diagnostic 5.86 GiB RSS / 4.03 GiB footprint. That broader diagnostic is not claimed as exact exclusive ownership. Guarded workload peaks: compiler 1.74 GiB, suite 0.89 GiB, customer preview 0.51 GiB, staff preview 0.28 GiB. Workloads were sequential, within the 15 GiB ceiling and 10 GiB system headroom target.
- Sanitized receipts persist under `.deployment/i18n-local/receipts/` (ignored, machine-local); essential counts/dispositions persist in this committed report even if `/tmp` is cleared at reboot.
- Current dependency audit: **5 pre-existing advisories** (3 high, 1 moderate, 1 low; no critical); package/lock files unchanged. No remediation or install was performed.
- Exact next safe action after boot: inspect `git status` and this checkpoint. No unfinished i18n source batch or unmerged fragment remains. Owner may review English copy/explicitly choose the Korean empty-output breakpoint. Resume the separate commerce/PG launch plan only within its existing approval boundaries; do not infer database/provider/deployment permission from this checkpoint.

### Local visual evidence

Ignored machine-local screenshots (preserved across reboot, not published):
- `.deployment/i18n-local/desktop-account.png`
- `.deployment/i18n-local/mobile-account.png`
- `.deployment/i18n-local/mobile-code.png`
- `.deployment/i18n-local/mobile-shipping-ko.png`
- `.deployment/i18n-local/mobile-phone-ko.png`
- `.deployment/i18n-local/desktop-staff.png`
- `.deployment/i18n-local/mobile-staff.png`

Sampled customer and staff captions pass both independent visual reviewers. Below-fold staff content, developer live rendering, full checkout composition, motion quality, real authenticated Payload pages, physical devices and external services are **not** accepted by these screenshots. Developer locale behavior is covered by native-provider synthetic override DOM tests, not a claimed live editor review.
