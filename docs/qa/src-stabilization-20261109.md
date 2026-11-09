# Source stabilization — 2026-11-09

## Payload commerce implementation — current progress

**Updated 2026-11-10 · CHECKPOINT COMPLETE; approved asset copies done, handoff ready for compaction.** This is the current
commerce implementation checkpoint; historical checkpoints below remain evidence,
not post-change acceptance. Contract: [approved commerce plan](../reference/commerce-launch-plan.md).

### Compaction handoff — resume here

- **Stop requested after this pass:** the owner asked to compact after the approved
  copies. Do not automatically begin another readiness/build/provider phase.
- Checkout: `/Users/seanschoi/Projects/sphmrs`, branch `main`. Functional commits
  `dc0bd40`, `da3e818`, and packaging commit `6c28a97` are local, **not pushed**.
  The final asset/provenance checkpoint is the newest commit; verify `git log`.
- Preserve owner WIP: `.gitignore`, `.vscode/settings.json`,
  `src/app/(site)/not-found.tsx`, `src/components/reading/article-hero.tsx`,
  `src/components/reading/page-links.tsx`, and untracked `skills-lock.json`.
- Completed: provider-free real-homepage SSR tests, relocated font paths,
  `/essays` canonical with both legacy aliases, active auth links to `/account`,
  dual-layout safe packaging, Docker patch/path fixes, and 11 byte-identical local
  asset copies. **CSS/styles are owner-deferred, non-blocking.** No tests were
  deleted/skipped to manufacture a green repository.
- Latest evidence: canonical compiler/lint + 75 deployment feature tests;
  package coverage 100% lines / 80.11% branches / 87.50% functions. Post-copy
  independent hashes + 24 package cases pass. Earlier functional tests: 32/32.
  Last full working-tree sweep (before the last targeted deltas): 2,047 passed,
  four failed, 39 skipped; three deferred style assertions and one mixed ownership
  snapshot. Owner style edits continued, so this is not a frozen candidate.
- **Remaining gates:** actual source-content/secret review before any real snapshot;
  reviewed Payload build/runtime configuration injection; future image-test gate
  must honor nonblocking CSS while retaining functional/security checks; six
  dependency advisories (four high) need separately approved remediation; owner-
  approved physical product/price/shipping/seller/policy facts keep public sales
  closed; plugin-based sandbox/production/PG acceptance remains separate.
- No actual checkout snapshot/export, install, image build, DB/provider call,
  publication, push or deployment occurred in these packaging/asset passes.
- Resource rule: actual RAM 48 GiB; at most 15 GiB aggregate owned work, preserve
  10 GiB system headroom; one guarded workload per checkout. All jobs have ended
  with no surviving children. Do not start another job/phase during compaction.
- Read this current panel and the approved commerce plan below before resuming.
  Do not treat historical receipts farther down as acceptance of a new revision.

### Source-package compatibility — local contract accepted; asset-link block resolved

Owner separately approved source-layout packaging inspection/repairs, secret-free
fixture/package tests and runbook updates. **No installs, production image build,
database/provider call, publication, push or deployment** is included. Functional
checkpoints `dc0bd40` and `da3e818` are committed locally, not pushed; owner WIP is
preserved. CSS/styles remain explicitly deferred/non-blocking.

- Support the active src/app + src/proxy.ts layout while preserving legacy-root
  snapshot/fingerprint compatibility. Reject competing/missing application roots,
  wrong types and symlinks; do not rewrite old snapshots, journals or fingerprints.
- Include root locale messages and exact patches/payload.patch with shared source
  inputs. Keep the quarantined Hideaway reference tree without activating it.
- Correct Docker artifact source paths to builder WORKDIR /app; copy the required
  Payload patch before frozen dependency installation. No Docker command runs.
- Preserve secret-name/no-follow checks, destination exclusivity, byte/mode
  fingerprinting, source-change refusal and failed-snapshot cleanup.
- Use synthetic fixture roots only. Strengthen executable-mask coverage so its
  child process uses snapshot-owned aliases/cwd rather than accidentally importing
  code from the live checkout. Installed test dependencies may be reused; no install.
- Legacy fixture golden was captured before implementation under the guard:
  `/tmp/sphmrs-packaging-legacy-golden.log.faw4duea.log`. RED:
  `/tmp/sphmrs-src-package-contract-red.log.qt_s02r9.log` (11 pass / 10 new contract
  failures). Three intermediate failures were fixture path-identity errors caused
  by macOS /var→/private/var canonicalization; expectations and production guards
  were unchanged. Canonicalizing fixture roots fixed them.
- Final canonical compiler, scoped lint and **75/75 deployment feature tests pass**.
  Scoped package coverage: **100% lines / 80.11% branches / 87.50% functions**.
  Receipt: `/tmp/sphmrs-src-package-completed.log.p8hvgufk.log` and metrics,
  2,162,549,824-byte sampled peak, no survivors/cleanup uncertainty. Code, TypeScript
  and security reviews have no remaining scoped blockers. The isolated child uses
  explicit NODE_ENV=test only to satisfy its test environment type contract; this
  is not a production configuration-injection solution. Fresh audit remains six
  noncritical advisories: `/tmp/sphmrs-src-package-audit.json`.
- Read-only input inventory originally found **11 public asset symlinks** into
  the Hideaway checkout. The owner separately approved replacing exactly those
  links with byte-identical local files. All **11 copies / 5,437,757 bytes** are now
  independently SHA-256 verified against their unchanged originals. Public asset
  URLs and bytes are unchanged; zero public symlinks remain. Strict snapshot guards
  were not relaxed. No other Hideaway files were read/copied and no real checkout
  snapshot was created.
  Receipts: `/tmp/sphmrs-public-assets-materialize.log.b75zmh3g.log` and
  `/tmp/sphmrs-public-assets-verified.log.iwbg4vb0.log`; the latter also reruns all
  **24/24 package contract cases** successfully, sampled peak 300,072,960 bytes,
  no survivors/cleanup uncertainty. Private per-file provenance/hash evidence is
  `.deployment/public-assets-local/20261110-eec79ec36d69/verification.json` (ignored;
  never stage the deployment directory). This is not a content-based secret audit
  or frozen-candidate acceptance.
- Unresolved Payload build/runtime configuration injection, dependency advisories,
  production build/runtime/browser/PG acceptance remain separate gates. A future
  image-test gate must honor deferred non-blocking style review without disabling
  functional/security checks; this pass does not silently bypass the unit runner.

### Functional follow-through — local checkpoints, not styling

Owner instruction: **skip CSS/styles; defer them as non-blocking**. Preserve the
existing tests and report their failures honestly; do not skip/delete assertions,
change visuals or call an unfiltered red suite green. This does not waive security,
authentication, payment-safety, missing assets or broken navigation.

| Track | Status / next action |
| --- | --- |
| Operator and MapLibre checkpoints | Pushed to origin/main at the owner's request: `9b65e10`, `3bfdee8`. Unrelated .gitignore/skills-lock.json changes remain untouched. |
| Homepage SSR test imports | Test-only boundary repair now renders real Home/Warp and seller Suspense fallback without credentials, Payload initialization or network attempts. **27/27 combined SSR/asset tests pass**; compiler, scoped lint and independent code/React/TypeScript reviews pass. Final working-tree full sweep: 2,090 tests, 2,047 passed, 4 failed, 39 skipped: three owner-deferred styling assertions and one mixed ownership snapshot. No remaining canonical-route or homepage-import failure. This is shell/fallback coverage, not completed async CMS or browser acceptance. |
| Relocated local fonts | Corrected only two existing asset paths in the essays layout; src relocation had left them pointing at nonexistent src/public/fonts. Font files, typography settings and CSS remain unchanged. Missing build assets are not a styling waiver. |
| `/read` versus `/essays` | Owner approved /essays canonical. Both legacy aliases now redirect directly there, with suffix/query preservation and unchanged IE precedence. Generated reading links are canonical; stored CMS hrefs are preserved. Compiler, scoped lint and independent code/React/TypeScript/security reviews pass. Routing suites: 30 passed, one unchanged owner-deferred article-grid styling failure; not an all-green suite. |
| Brand mark, reading-card sizing and CSS spinner assertions | **DEFERRED / NON-BLOCKING styling review**, owner-directed. Keep assertions unchanged and preserve the approved mark/visuals. |
| Component ownership snapshot | Read-only audit found six actual React-hook files falsely classified by extension, legitimate private checkout schema and several visual/shader modules. Style/shader findings are deferred non-blocking. Remaining structural observations stay tracked, not silently waived or turned into a broad relocation phase; no allowlist expansion or source reshuffle in this functional pass. |
| Active account-entry links | Check In, Search Sign in and Search Create account now target the existing /account chooser. Exactly three href changes, no added flow/query parameters, callback logic, auth requests, CSS or dormant controls. Real-component SSR verifies the rendered anchors and zero action/network attempts. |
| Dormant account-menu placeholders | AccountPanel retains unfinished Profile/Settings/Tickets/Your Posts/Sign Out behavior. AccountButton has no production consumer and is not mounted by HeaderActions; do not activate it until its real features are wired. This is not silently treated as active, working member management. |
| External/security boundaries | Six unrelated dependency advisories remain open. No further dependency update, DB mutation, provider call, publication, deployment or push is authorized by the CSS deferral. |

Receipt: `/tmp/sphmrs-homepage-provider-free-green.log.9bh_l8po.log` and metrics:
22 passed, zero failed, sampled peak 382,648,320 bytes, no survivors/cleanup
uncertainty. The earlier exact-HEAD full sweep supplies RED evidence for the three
Payload-config import crashes. Combined SSR/asset receipt:
`/tmp/sphmrs-functional-followthrough-focused.log.uq86juvj.log`, 27/27 pass,
396,099,584-byte sampled peak, no survivors/cleanup uncertainty. Missing-font RED:
`/tmp/sphmrs-relocated-font-red.log.xofny1kr.log`. No production homepage, CSS or
design behavior changed; only the two existing font asset references were repaired.
Interim compiler/lint/full receipt: `/tmp/sphmrs-functional-followthrough-regression.log.hpr4nolg.log`
and metrics; 2,183,768,880-byte sampled peak, no survivors/cleanup uncertainty.
Fresh unchanged-lock audit remains six noncritical advisories:
`/tmp/sphmrs-functional-followthrough-audit.json`. Route RED:
`/tmp/sphmrs-essays-canonical-red.log.2qypxbd7.log` (nine canonical-contract failures
plus the unchanged style assertion); GREEN scope:
`/tmp/sphmrs-essays-canonical-green.log.e8g29nol.log` (30 passed, the sole style
assertion still failed). Final advertised `pnpm test:guarded` receipt:
`/tmp/sphmrs-tests.log.22cu_574.log` and metrics: 2,047 passed, four failed,
39 skipped; 934,771,384-byte sampled peak, no survivors/cleanup uncertainty.
No failing/skip assertions were removed. The three styling failures are non-blocking
by owner instruction; the mixed ownership manifest remains tracked rather than
receiving an expanded allowlist. This is not an all-green repository.
Concurrent owner WIP appeared in .vscode/settings.json, src/app/(site)/not-found.tsx
and src/components/reading/article-hero.tsx; preserve/exclude these alongside
.gitignore and skills-lock.json. Receipts describe the working tree, not a frozen
deployment candidate. No route HTTP/browser, production build/package or deployment
acceptance is claimed.

The SSR/asset/canonical-route checkpoint is committed locally as `dc0bd40`, not
pushed. Subsequent account-entry validation: **32/32 focused SSR/routing/asset
checks pass**, canonical compiler and scoped lint exit 0; lint retains one explicit
unused mock-argument warning in the notification-action fixture. Receipt:
`/tmp/sphmrs-auth-entry-functional-green.log.i00x9g7j.log` and metrics, sampled peak
2,203,906,952 bytes, no survivors/cleanup uncertainty. Code/TypeScript/React reviews
pass this destination-only delta. Genuine anchor RED:
`/tmp/sphmrs-auth-entry-links-red-final.log.rla1l8aq.log`; the earlier raw Node
server-action import/config error was only fixture bootstrap, not URL evidence.
The test replaces only NotificationInbox's direct action import, matching the
client-reference boundary; it does not execute or validate the real server action.
The last full sweep above predates these two new auth-anchor cases; do not fold
focused counts into a claimed fresh whole-repository run. The auth fix proves
anchor destinations, not live navigation, completed login or session return flows.
Owner WIP also includes src/components/reading/page-links.tsx; preserve it.


### MapLibre-only security remediation — local checkpoint complete

The owner separately approved updating MapLibre and its required lockfile changes,
necessary compatibility code, guarded checks and fresh audit. No other upgrades,
source removal, provider calls or deployment are authorized. The operator batch
below is committed as `9b65e10`; .gitignore and skills-lock.json remain excluded.

- Installed exact `maplibre-gl@6.4.1` with lifecycle scripts disabled. Manifest/
  lock changes are confined to MapLibre and its dependency closure. Official v6
  migration guidance requires a namespace/named import; the isolated wrapper now
  uses a namespace import, without other behavior changes or activation.
- Only runtime consumer is the currently isolated Hideaway map wrapper. Canonical
  TypeScript excludes src/hideaway, so a green global compiler alone will not
  establish wrapper compatibility. Add targeted API-contract coverage without
  importing/activating Hideaway from the active site.
- Real public AttributionControl regression reproduces unsafe adjacent attributes
  in the cached 5.24.0 shipped bundle; the same test passes both attribute orderings
  in 6.4.1 while preserving safe text/links and control/listener cleanup. No remote
  tiles, scripts or WebGL are used. An initial missing JSDOM Blob-URL fixture API
  was a bootstrap failure, not the vulnerability reproduction.
- Canonical compiler, all 13 referenced API exports and 26 focused tests pass.
  Fresh audit clears MapLibre and all critical findings; six unrelated advisories
  remain (4 high, 1 moderate, 1 low). Independent security/source review passes.
- Resource diagnosis: the default 1536 MiB V8 compiler heap aborted, with confirmed
  cleanup below 1.8 GiB aggregate. Excluding only the two new API test files in a
  temporary diagnostic config restored the baseline near the old heap limit. The
  full canonical check passes at 2048 MiB old-space, sampled aggregate 2.11 GiB.
  Only typecheck:guarded now receives that compiler-specific heap setting; its
  4 GiB aggregate cap, 10 GiB system floor, global guard defaults and all other
  workload limits are unchanged. The actual guarded entrypoint and broad sweep
  are validated below. No exclusions were added to the project configuration.
- Local receipts: `/tmp/sphmrs-maplibre-sanitizer-comparison-final.log.9qfy84wd.log`,
  `/tmp/sphmrs-maplibre-sanitizer-baseline-red.log`,
  `/tmp/sphmrs-maplibre-final-validation.log.azded5wf.log` and metrics, and
  `/tmp/sphmrs-maplibre-patched-audit.json`. Scoped ESLint passes in
  `/tmp/sphmrs-maplibre-final-regression.log.iqzi0o51.log`; final broad sweep
  records **2,068 tests: 2,020 passed, the same 9 failed, 39 skipped**. No new
  repository failure was introduced. Receipt: 1,018,859,016-byte sampled peak,
  no survivors or cleanup uncertainty. `pnpm typecheck:guarded --incremental false`
  also exits 0: `/tmp/sphmrs-typecheck.log.acisbtt3.log` and metrics, sampled peak
  2,131,878,400 bytes, no survivors or cleanup uncertainty. Code, TypeScript and
  security reviews have no remaining scoped blockers.
- Other dependency advisories and the nine repository failures remain separate
  open gates. The excluded Hideaway wrapper was not fully compiled or rendered;
  export/API inspection and synthetic attribution coverage are not browser/WebGL
  acceptance. No activation, provider call, deployment or push occurred.

### Prior operator-controls checkpoint

- Native Payload UI fields expose saved-order shipping/tracking, physical returns
  and irreversible stock disposition; admission check-in, drink/transfer redemption;
  and a bounded, paginated event manifest. Existing protected endpoints remain the
  authority. No schema, provider, dependency or staff-access change was made.
- Saved canonical operation snapshots do **not** silently reset native editor
  fields. Reload is explicit and blocked while dirty/pending. Redemption UUIDs
  survive remount per operator/admission/kind; uncertain responses keep exact retry
  in the mounted panel. UUID persistence is not a cross-remount global action lock.
- Final compiler and focused suite: **46/46 pass**. New operator coverage:
  **95.00% lines / 86.89% branches / 95.45% functions**; each operator module reaches
  80% branch coverage. These are scoped results, not whole-repository coverage.
- Actual browser review used installed Payload controls with synthetic contexts at
  1280×900 desktop and 390×844 touch/mobile. Shipping, partial physical return,
  final disposition, replay across reload, fourth-drink limit/transfer, dirty locks,
  paging and stable refresh were exercised without auth, DB or provider calls.
  Native select/buttons/text inputs and checkbox label targets measure at least
  **44 CSS px**; no horizontal overflow. Both independent Astra Santa reviewers
  pass the final screenshots/source. This is **not authenticated CMS integration**.
- Review found and repaired Payload's 12px-root/rem touch-target mismatch, a native
  select selector mismatch, stale used-benefit review after changing units, stalled
  manifest recovery and missing Previous after a later-page failure. Behavior
  fixes have RED/GREEN regressions; final target sizes were remeasured live.
- Mechanical source-path repairs preserve assertions. The sole semantic import
  exception permits exactly the already-shared browser visibility module; other
  aliases remain forbidden. FieldCanvas now supplies its existing server snapshot
  callback to useSyncExternalStore; client motion/shaders remain unchanged.
- Resource blockage is resolved after the owner freed memory. Physical RAM is
  48 GiB; pressure returned to normal. Checks peaked below 1.74 GiB and the synthetic
  preview below 0.27 GiB, excluding separately audited browser/tool overhead. The
  final CLI-tree sample accounted for about 6.8 GiB (max RSS/physical footprint),
  with 18.83 GiB system headroom; one process exited during sampling. Preserve
  the 15 GiB aggregate ceiling and 10 GiB system headroom. All previews are stopped. One explicit Ctrl-C shutdown
  coincided with an accounting-probe failure (CalledProcessError); the receipt confirmed no
  survivors/cleanup uncertainty and an independent process check found none.
- Final repository sweep: **2,065 tests, 2,017 passed, 9 failed, 39 skipped**.
  No operator test failed. Remaining failures are classified below; none is waived
  by this checkpoint. Do not call the repository green or weaken unrelated contracts
  to manufacture that result.
- At the operator checkpoint, an unchanged-lock dependency audit reported **7 advisories: 1 critical, 4 high,
  1 moderate, 1 low**. Independent security review passes this local source
  checkpoint, not production. MapLibre 5.24.0 is vulnerable; its only runtime import
  is currently in isolated Hideaway code, with no active outside imports found. If
  activated, its enabled attribution control reaches the vulnerable HTML sanitizer.
  This is not production-bundle proof or permission to ignore the advisory.
  The subsequent owner-approved MapLibre-only batch above clears that advisory
  at 6.4.1; remaining high advisories stay open. These findings were not in the November 8 audit; unchanged manifest/
  lockfile does not mean previously accepted security. No push is authorized.
  Preserve unrelated .gitignore and skills-lock.json work.

Current-batch receipts (ephemeral, local):
- `/tmp/sphmrs-operator-final-checks.log.4i0uvwsf.log` and metrics: compiler,
  46/46 focused tests, scoped coverage; no survivors/cleanup uncertainty.
- `/tmp/sphmrs-operator-broad-final.log.24zps94_.log`: intermediate full sweep
  (2,013 pass / 10 fail / 39 skipped), superseded by the final sweep below.
- `/tmp/sphmrs-operator-repository-final.log.olz5i5hf.log` and metrics: final
  2,017 pass / 9 fail / 39 skip, sampled peak 1,007,931,824 bytes, no survivors
  or cleanup uncertainty.
- `/tmp/sphmrs-operator-audit.json` and
  `/tmp/sphmrs-operator-audit.log.qz7otcre.log.metrics.json`: current dependency
  advisories; expected nonzero audit result, no survivors/cleanup uncertainty.
- `/tmp/sphmrs-operator-resilience-red.log.kfzjv4vj.log` and
  `/tmp/sphmrs-operator-pagination-red.log.a3hnu0c1.log`: reproduced review defects.
- Ignored local screenshots: `artifacts/commerce-operator-review/desktop.png`,
  `mobile.png`, `mobile-dirty.png`; synthetic fixture, not public/provider evidence.

### Repository failure classification — current styling deferral recorded above

| Surface | Demonstrated issue / next boundary |
| --- | --- |
| Brand mark render assertion | Existing hero/study selector no longer finds the expected mark. Compare the actual render and approved BrandMark; do not normalize the mark to satisfy a stale selector. |
| Component-module placement | Active tree contains pure modules outside the preserved scoped exceptions. Review actual consumers/ownership rather than broadening the allowlist. |
| Spinner motion source contract | Current spinner module retains a legacy CSS-animation implementation alongside Motion; assertion rejects the remaining CSS clock. Preserve active behavior before pruning. |
| Reading card fixture | Current article grid emits `text-[10px]`, which the fixture explicitly forbids. Requires an intentional UI/style decision and live review. |
| `/read` route contract | Owner now approved `/essays` canonical with both legacy aliases redirected; test/config/link reconciliation is in progress. No style change is implied. |
| Teaser/Warp SSR suites (three files) | Importing the page now reaches validated Payload config and exits without DATABASE_URI/PAYLOAD_SECRET. Introduce a deliberate provider-free fixture seam; do not load private credentials or connect a DB merely to make unit tests import. |

| Status | Evidence / next gate |
| --- | --- |
| Completed / approved | Owner approved Payload-owned physical commerce and exactly `@payloadcms/plugin-ecommerce@3.92.1` (official beta). Canonical Better Auth/users and existing roles must remain; legacy UUID/reference history stays read-only/discriminated, without automatic TEST-order entitlements. Historical local KPN TEST ₩1,000 PAID/local-paid result, 242 ticket tests and clean compiler run do not validate this revision. |
| Completed / source and regressions | Official plugin pinned to 3.92.1; generated types and admin import map refreshed. Full TypeScript check passes. Final affected commerce/auth/PortOne run: **579 tests, 561 passed, zero failed, 18 opt-in skipped**. Scoped commerce coverage: **85.24% lines / 79.29% branches / 89.22% functions**; not every module or branch reaches 80%. Canonical Better Auth/users remain; no anonymous checkout or second customer store. |
| Completed / local migration | Both `20261109_142834_payload_commerce` and additive `20261109_150000_commerce_resolution_conflicts` applied under separate SQL review/typecheck gates to the existing loopback database. Private pg_dump backups saved. Before/after and final post-test fingerprints match for all 6 existing users and 2 historical orders; orders remain legacy with original financial references. No reset, real provider request or new payment. |
| Completed / real adapter | Eleven real-Payload subcases pass: actual PortOne adapter with injected PAID proof, official finalization/replay and stock once; interrupted finalization automatic rollback/retry; ordinary cart hooks; saved product drafts and concurrent CMS event updates; stock/capacity/net-three races; held partial returns; rotated single-use guest claims, account-free named admission and idempotent redemption; verified failure retirement/replacement and late-PAID quarantine without reallocation. These use synthetic fixtures and blocked external transport, not sandbox/provider acceptance. |
| Completed / authority and review | `/shop` owns purchasing; `/tickets` forwards. Legacy static payment wrappers removed so they cannot shadow Payload `/resume`; legacy runtime ingress is permanently retired (410). Public seller/policy surfaces use validated published CMS disclosures without hardcoded fallbacks; teaser streams its CMS footer without blocking Warp. Code/security/TypeScript/React reviews have no remaining scoped blockers. Desktop/mobile live captures and both independent Santa visual reviewers pass the functional baseline only. |
| Current / remaining | Prior local commerce pass committed/pushed as `b7f42d9`; owner changes now at `4fcd76b` and fresh TypeScript preflight passes. Native Payload operator controls and scoped stale source-path repairs pass focused checks, scoped coverage, synthetic desktop/mobile dual-Santa review and independent local-source security review. Final broad sweep still has nine failures; MapLibre critical remediation is validated, while six other dependency advisories remain open. This batch is a local checkpoint only. No new database schema, provider calls, dependencies or staff grants. Production build/package validation, a separately approved plugin-based sandbox run and physical-device/address-provider checks remain; **not launch-ready**. |
| Blockers / boundaries | Owner approval is still required for actual product/photos/readiness, price, stock, Korean shipping fees/schedule, seller/contact, physical-goods policies and event conditions. Published purchasing remains closed. A broad repository sweep found unresolved old-path/source-contract and unrelated UI failures; it is not a green repository baseline. No production writes, payment activation, webhook registration or deployment occurred. The owner separately authorized committing this completed local pass before next steps; unrelated UI WIP remains excluded and no push is authorized. |

**Prioritized fragile final pass:** (1) concurrency across stock/account allowance,
admissions and claims; (2) duplicate/stale finalization and uncertain payment
recovery without double charge; (3) no legacy TEST entitlement or identity/role
regression; (4) one guest package/account/event—buyer registration never grants
others' four Part I drinks/shared I→II transport; lock buyer edits at claim/check-in,
review consumed-benefit returns; (5) publication fails closed on missing facts and
parallel quote/catalogue authorities remain retired. (6) Resolve functional regressions and preserve explicit reporting of owner-deferred
non-blocking visual/source-style checks; an unfiltered red suite is not green.
Exercise operator UI and adverse real gateway/device cases separately.

Use test-first RED/GREEN checks and one guarded workload at a time; stop the owned
preview before checks. Maintain 10 GiB system headroom and ≤15 GiB aggregate
agent-workload memory including browser/tool overhead.

Current local receipts (ephemeral; not production acceptance):
- `/tmp/sphmrs-commerce-final-acceptance.log.fthf26r8.log` and receipt:
  full typecheck, 561 passed / 18 skipped / zero failed, coverage and final
  historical-row fingerprint check; exit 0, 1,843,334,968-byte sampled peak,
  no remaining processes or cleanup uncertainty.
- `/tmp/sphmrs-commerce-admin-importmap.log.01nlz31u.log` and receipt:
  generated official PriceCell/PriceInput mappings and fresh typecheck, exit 0,
  no surviving processes. No other admin map entries removed.
- `/tmp/sphmrs-commerce-local-migration.log.42h1snkm.log` and receipt:
  first migration and historical fingerprints, exit 0, 435 MB sampled peak,
  no remaining processes. Private backup/evidence live in the ignored,
  restricted `.deployment/commerce-local/` directory; never publish them.
- `/tmp/sphmrs-commerce-conflict-local-acceptance.log.k7i1o29j.log`:
  additive conflict migration and intermediate 104/104 acceptance, since
  superseded by the final run above.
- `/tmp/sphmrs-commerce-full-regression.log._jdg2c7a.log`: broad sweep at an
  earlier checkpoint: 2,050 tests / 1,903 passed / 108 failed / 39 skipped.
  Later focused changes repaired the affected auth harness and retired-runtime
  assertions; the full suite has not been rerun. Remaining demonstrated stale
  paths include root `components/`, `app/` and `migrations/` references in
  architecture, teaser, reading, primitive and deployment tests. Do not silently
  skip/delete these tests or call the repository green.
- Live evidence: `artifacts/commerce-review/desktop.jpg`,
  `mobile-address.jpg`, `closed-shop-mobile.jpg`. Open checkout uses an explicitly
  labelled, private synthetic fixture with API mutations blocked; closed `/shop`
  is actual CMS state. True mobile emulation was 390×844 with touch, no horizontal
  overflow and 48px input/search controls. Existing global font/frame WIP is not
  brand-final approval; physical-device and live Kakao search remain untested.
- Preview is **stopped**. The 5 GiB watchdog stopped it during second-route
  compilation at a sampled 5,410,291,112 bytes; receipt
  `/tmp/sphmrs-commerce-ui-final-preview.log.tgs2q29f.log.metrics.json` records
  no remaining PIDs and no cleanup uncertainty. It was not restarted with a higher
  cap. Last full CLI descendant sample was 4.46 GiB with 17.11 GiB system headroom;
  individual job receipts are not whole-chat accounting.

Initial test-first RED receipts cover core/UI work, held returns, intent retirement
and manual-review rendering. The last locked late-PAID and route-ownership
extensions were test-first in source but did not capture a separate measured RED
while another guarded workload was active; their final GREEN is included above.

### Pre-commit dependency audit

`pnpm audit --json` reports one critical, four high, one moderate and one low
advisory in the existing dependency tree. Security review confirmed every reported
version already exists in `HEAD`'s lockfile; the commerce dependency delta introduces
none of these versions. This is **not a clean security audit** or deployment approval.

The critical MapLibre sanitizer advisory currently has imports only in the
reference-only `src/hideaway` tree, excluded from active source imports and the
TypeScript build. Other baseline advisories must not be dismissed as unreachable:
the phone verifier actively imports `mailauth`, and transitive `happy-dom`,
`follow-redirects`, `joi`, `deepmerge` and `minimatch` findings need a scoped
reachability/remediation pass. No unrelated dependency upgrade was authorized or
performed. Security review permits the commerce-only local checkpoint commit with
these findings recorded; remediation requires separate dependency approval.

Audit output remains private at `.deployment/commerce-local/precommit-audit.json`;
guard receipt `/tmp/sphmrs-commerce-precommit-audit.log.jbujkxnq.log.metrics.json`
records a normal audit nonzero exit, no surviving processes and no cleanup uncertainty.

## Scope

Restore a compiling, locally reviewable site after the `src/` move. Keep
`src/hideaway` as reference only: no incoming imports from application or tests.
Preserve concurrent user edits to the site layout and `/essays` routes.

No dependency upgrades, database reset/migrations, payment activation, provider
sends, credential changes, deployment or commits are included. The user separately
approved starting the existing local Postgres container with its data preserved.

## Active integration order — 1 → 3 → 4 → 2

**Executing, 2026-11-09:** owner approved auth/registration first, PortOne second,
public PG-review environment third, Apple/Kakao last. This is wiring and acceptance,
not another design pass. Historical UI-only scope above does not authorize provider
actions; current explicit approvals and remaining boundaries are below.

| Order | Current work / next checkpoint |
| --- | --- |
| 1. Auth → registration → tickets | **Local real end-to-end accepted:** fresh canonical sign-in → fresh physical SKT MMS → verified proof → successful bind HTTP 200 → fresh member/ticket selection. Owner confirmed “Registration completed — tickets appeared”; root independently verified bind 200 and zero receiver errors in the final real server log. Code/test and intercepted-API visual checks are separate evidence, not the basis of this real acceptance. |
| 3. PortOne | **Code-only local KPN pass complete; workflow PAUSED** for the owner’s desktop-client update. Final scoped validation: 865 tests, 827 passed, zero failed, 38 opt-in skipped; full TypeScript rerun zero errors after three reviewed test-type-only fixes. Backend coverage 96.88% lines / 88.37% branches / 92.11% functions; page 22 passed; code/TS/React/security reviews passed. Actual default-off 1280 × 800 browser/Santa review passed with only member status mocked, checkout disabled, no overflow, zero PortOne API requests—not enabled-gateway/payment acceptance. Active mode disabled, opt-in absent, staging catalogue blank. Preview stopped cleanly; port 3000 not listening. Resume only at owner direction; catalogue/operator activation and first real TEST calls need separate approval. |
| 4. Public PG-review environment | Follows payment integration. Public auth/verification remains intentionally disabled by local-only configuration. Confirm target, trusted ingress, provider callbacks and exact deployment scope before enabling or deploying. Five unrelated teaser type errors remain a build gate. |
| 2. Apple/Kakao | Last: share the same canonical account/session/linking model. No provider setup or dependency installation in this batch. |

### Phase 1 findings and approvals

**Historical setup checkpoints:** retained below in sequence; the current receiver
checkpoint after these notes supersedes their fixture/placeholder/no-request status.

- The current verifier is configured as `fixture`, not a working real-phone
  receiver. Its private Zoho receiver file was absent. A placeholder file has now
  been created from the existing example, with mode 0600 and verified Git-ignore
  coverage, and opened in the IDE for private credential entry. No OAuth token
  exchange or mailbox request has occurred.
- Owner separately approved setting up the existing read-only Zoho mailbox
  receiver, with OAuth consent/credentials entered privately. The API console
  requires user sign-in. Owner confirmed the test phone uses SKT. The existing
  local SKT/Zoho ARC policy is not universal phone verification.
- Owner confirmed `verify@sophomores.co` aliases `concierge@sophomores.co` and
  explicitly approved read-only message access to that entire parent mailbox.
  This does not authorize sending, deleting or managing mailbox contents.
  Private credentials are still placeholders; do not enable polling or exchange
  authorization until valid private credentials and owner-approved OAuth are supplied.
- Public MX records confirm Zoho hosts the domain's inbound mail. The API Console
  sign-in is complete. Reuse the existing Self Client dated 2026-10-23 rather
  than create/rotate a client. Its public client ID has been saved privately;
  the owner is copying the client secret and a fresh read-only message code into
  the mode-0600 receiver file. Code lifetime is ten minutes. No mailbox reads
  have begun. Approval is limited to read-only messages, not send, delete or
  mailbox-management access.
- Prior receiver notes record successful token refresh but HTTP 500 mailbox
  searches; that is historical evidence, not a current outage diagnosis. The
  previous private token is absent from known project artifact paths, so do not
  claim it was recovered. After private authorization, perform a bounded mailbox
  check before changing fixture/runtime configuration. Preserve message-only
  receiver authority; account-ID discovery uses the existing separate one-time
  lookup path if needed, never a broadened ongoing receiver token.
- Previous `dev` started Docker/Next but not the receiver. The supervised
  member preview also used removed pre-`src/` paths and a pilot-config gate.
  These source defects are repaired: normal `dev` now uses the existing supervisor
  in-place, while the isolated preview preserves the `src/` import graph and
  copied generated-file owners. Both use canonical Payload configuration, not a
  pilot issuer. In-place startup retains inherited heap limits and uses explicit
  webpack/literal loopback binding. Disabled membership remains Next-only;
  invalid enabled configuration fails closed. Receiver startup remains conditional
  on explicitly configured `zoho-poll`; current fixture mode starts no receiver.
- The first code request returned 200, but Fast Refresh reset the code page during
  startup edits before verification. No canonical session/member was established.
  Do not count this as registration acceptance or silently send another code.
  Source changes are now frozen for the next live attempt.
- Launcher/receiver/dev regression: 21/21 pass, no skips, including a RED/GREEN
  regression for retaining webpack and literal loopback binding. Fresh typecheck
  still reports only the five unrelated teaser errors. New supervised startup
  returns `/tickets` 200 and canonical `/api/member/status` 200/anonymous. This
  validates startup composition, not a running real receiver or completed auth.
- Earlier preview: `/tmp/sphmrs-integrated-auth-dev-final.log.6i7a7hua.log`,
  one guarded 5 GiB workload / 3 GiB Node heap / 10 GiB system-headroom floor.
  Earlier preview stop reported a fail-closed accounting-command error; its
  receipt recorded no surviving children or cleanup uncertainty.
- Receipts: `/tmp/sphmrs-auth-launcher-validation.log.bw2lixw4.log.metrics.json`,
  `/tmp/sphmrs-dev-bind-red.1qcbhyyd.log.metrics.json`,
  `/tmp/sphmrs-dev-bind-green.nafn010g.log.metrics.json`, and
  `/tmp/sphmrs-auth-launcher-typecheck.log.c_vzesaq.log.metrics.json`.
- No automatic resend, OTP capture, account promotion, mailbox polling, migration,
  payment call, commit/push or deployment has occurred in this integration batch.

#### Current receiver checkpoint — 2026-11-09

- Read-only `messages.READ` receiver authorization is complete in the private,
  mode-0600, Git-ignored credential file. A separate one-use `accounts.READ`
  lookup succeeded and discovered the genuine account ID (not reproduced here).
  Its authorization code was consumed; temporary lookup tokens were not retained,
  and the working message-only receiver credentials were unchanged.
- Bounded connection check: exactly two requests, token refresh HTTP 200 and an
  alias-filtered metadata search over the last five minutes HTTP 200. The search
  returned zero matching messages; no original messages were fetched. This proves
  the bounded connection, not receipt of a phone-verification message.
- Local `.env.local` now has the four actual receiver settings: recipient
  `verify@sophomores.co`, the discovered account ID, mode `zoho-poll`, and policy
  `local-skt-zoho-arc-v1`. At that checkpoint no legacy trust override was
  configured; the later explicitly approved local-only flag is recorded below.
  The account ID and credential values remain private.
- The first supervised receiver child failed closed: its sanitized environment
  omitted canonical local database context. `scripts/member-auth-receiver.ts`
  `receiverProcessEnvironment` now uses the existing validator and forwards only
  the explicit local marker and the same validated verification database URL;
  provider/login secret access was not broadened.
- Validation reproduced RED, then passed GREEN 13/13. Coverage: lines 96.71%,
  functions 93.94%, branches 76.92% (pre-existing supervisor gaps). No full
  typecheck was run. Independent code, TypeScript, and security reviews reported
  no blockers. Receipt:
  `/tmp/receiver-canonical-green.log.6gp07c72.log.metrics.json`.
- The existing Postgres container was stopped and was restarted under the prior
  approval, preserving its loopback port 4141 and data; no migration ran.
- The guarded supervised service ran in exec session `51891`, with log
  `/tmp/sphmrs-member-phone-live-20261109.log.f0y7aajs.log`, a 5 GiB workload
  limit, 3072 MiB Node old-space limit, and a finite 3600-second timeout. Its
  initial receiver scan completed with zero queued, processed, or invalid messages.
  After serial diagnostics, the strict-policy service restarted in guard
  session `13031`; Next became ready and two empty receiver scans succeeded.
  That preview has since stopped: receipt
  `/tmp/sphmrs-member-phone-strict-preview.log.cckjc91j.log.metrics.json`
  records no remaining processes (`remaining: []`).
- The owner explicitly approved the local exact-pinned 1024-bit exception, then
  directed local-only continuation and excluded further production discussion.
  Only `PHONE_VERIFICATION_ALLOW_LEGACY_ZOHO_ARC=1` was added to `.env.local`;
  exact pin, RSA-SHA256, full ARC/MIME, sender, and challenge checks are unchanged.
  The old review record was never promoted or replayed. Production is unchanged.
- The local pinned service became ready with two successful empty receiver
  scans: guard session `49892`, log
  `/tmp/sphmrs-member-phone-local-pinned.log.hd0nqlnr.log`, 5 GiB workload cap,
  3072 MiB Node old-space limit, and finite 3600-second timeout. The service is
  now stopped for serial tests; session `49892` cleanup recorded `remaining: []`.
  The approved local pinned configuration is retained.
- Actual browser navigation to `http://localhost:3000/tickets` succeeded: main
  content and the email input were present, with no observed error. These are
  bounded scan/browser observations, not completed phone or membership acceptance.
  A separate guarded health-check invocation was refused by the active checkout
  guard and performed no action.
- The owner completed a physical SKT MMS attempt. The receiver processed it,
  but the challenge entered `review` with `carrier-ingress-unreviewed-v1`: no
  proof, phone binding, or ticket unlock was issued.
- A bounded read-only diagnostic fetched one newest complete delivered original
  using two provider requests total, including token refresh. It parsed as SKT;
  strict `verifySktZohoArc` returned false while the exact pinned legacy
  diagnostic returned true on the same raw message. No `service.match`, write,
  or configuration change was performed. No phone, token, raw message, or private
  identifiers are reproduced here.
- A separate bounded public-DNS key check confirmed a 1024-bit RSA key matching
  the existing pilot fingerprint. At that diagnostic checkpoint the legacy
  exception remained disabled; its later local-only approval and activation are
  recorded above. Source and security review found no trust weakening made by
  the diagnostic work. Never promote or replay the old review record.
- Diagnostic evidence:
  `/tmp/sphmrs-carrier-evidence-diagnostic.log.9c95ghn9.log.metrics.json` and
  `/tmp/sphmrs-zoho-public-key-check.log.hk06ve_8.log.metrics.json`.
- A fresh physical SKT MMS was verified under the local SKT policy. However,
  Finish registration's bind POST returned HTTP 401, so the whole path is not
  accepted: successful phone verification did not establish binding or ticket
  access. A read-only diagnostic confirmed the latest challenge was `verified`;
  all recent canonical sessions were unexpired but older than the 15-minute
  freshness window (newest 24.3 minutes). No identifiers were stored. Receipt:
  `/tmp/sphmrs-registration-freshness-check.log.m822yax7.log.metrics.json`.
- The client flattened `FRESH_AUTH_REQUIRED` / `UNAUTHENTICATED` into a generic
  message; no split in the shared issuer was found. Bounded fixes are executing:
  server-authoritative `phoneBindingAuth` status and preflight before each new
  phone challenge, typed recovery errors, contextual reauthentication retaining
  the existing identity followed by a fresh challenge, and coherent finish/error
  composition. The same 15-minute freshness and session-before-proof security
  checks remain in place.
- Backend RED/GREEN validation passed 60/60; receipt
  `/tmp/sphmrs-readiness-backend-green-20261109.log.sfw0mk9n.log.metrics.json`.
  UI work is underway and not yet accepted. Atomic phone-proof binding and the
  refreshed authoritative member/ticket gate remain pending; this is progress,
  not completion or whole-path acceptance. No migration, payment call, commit,
  or deployment occurred at this checkpoint.
- Evidence: `/tmp/sphmrs-zoho-account-lookup-20261109.log.kzglpzrw.log.metrics.json`
  and `/tmp/sphmrs-zoho-mailbox-check-20261109.log.efh28_op.log.metrics.json`.

##### Earlier blocker — resolved by owner-approved restore

- Validation detected `phone-step.tsx` and `account-view.tsx` overwritten with
  pre-fix contents concurrently, both with timestamp `1794201340`. The parent
  execution made no production-source writes at this checkpoint; whether the
  broad test caused the change is being audited read-only. The owner was asked
  whether another editor/session is active; no answer has been received. No
  restoration was made over the uncertain edits.
- Current source copies are preserved at
  `/tmp/sphmrs-conflict-phone-step.tsx` and
  `/tmp/sphmrs-conflict-account-view.tsx`; reconstructed fixes are at
  `/tmp/sphmrs-registration-final-phone-step.tsx` and
  `/tmp/sphmrs-registration-final-account-view.tsx`.
- Backend validation remains 60 passed. Four UI checks passed before the final
  accessibility, Google, and focus additions. The final seven-check run failed
  because of the source conflict and is not accepted. The broad 92-check run
  had invalid bootstrap configuration (missing CSS hook / test TSX configuration)
  and is not regression acceptance; rerun correctly after the conflict is resolved.
- The service remains stopped for serial tests, with no heavy jobs running.
  Whole-path phone binding and the authoritative member/ticket gate remain
  pending. This is a blocker checkpoint, not completion.

##### Current review panel — local real end-to-end accepted

**Completed**
- **Local real end-to-end accepted:** fresh canonical sign-in → fresh physical
  SKT MMS → verified proof → successful binding → fresh member/ticket selection.
  The owner confirmed “Registration completed — tickets appeared”. Independent
  inspection of the final real server log confirmed
  `POST /api/phone-verification/bind` HTTP 200 in 876 ms, with zero receiver errors:
  `/tmp/sphmrs-registration-accepted-preview.log.8a0g2x_n.log`.
  This real owner/server acceptance is distinct from the code/test results and
  intercepted-API visual checks below.
- The owner confirmed editing the two conflicting files and explicitly approved
  restoration. The root execution verified the conflict copies were unchanged,
  restored the two preserved fixes, then corrected desktop/mobile alignment and
  redundant error presentation in the contextual reauthentication form. The
  preceding overwrite blocker is resolved. Source, code, TypeScript, and security
  reviews passed.
- Final combined validation across 92 scoped member-auth, phone, and ticket test
  files: 827 tests, 789 passed, zero failed, 38 opt-in skipped. Full TypeScript
  check exited 0 with zero errors. Receipt:
  `/tmp/sphmrs-registration-final-validation.log.u7ly6ysx.log.metrics.json`
  (peak 1,847,021,392 bytes; `remaining: []`). Stale test paths were repaired to
  actual `src/lib/migrations`, receiver-health code under `src/lib`, and
  `src/components`; archived snapshots were not changed. The earlier missing-
  artifact claim is withdrawn. The earlier active `FiveChapterId` type-error
  statement is stale: the current full check is clean; unrelated user WIP was
  fixed elsewhere and left untouched by this work.
- Actual browser review at desktop 1280 × 800 and touch mobile 390 × 844 passed
  the harsh Santa review for completion, bind-401 recovery, and explicit
  reauthentication form presentation. These used intercepted API visual fixtures,
  not real binding. Heading centered at desktop x=640; 24/30 typography consistent,
  touch primary target 48 px, no overflow. Stale preparation created zero
  challenges. Native captures appeared inline only; file exports were denied and
  no PNG files were created. Interception was removed and the browser returned to
  actual `/tickets` with `visualMocksActive: false`.

**Current — local KPN TEST accepted; TEST preview stopped**
- Owner confirmed the fresh TEST payment displayed “Payment confirmed”. Root
  independently observed that exact result in the live, unmocked IAB tab and
  verified the new local order is paid. No registration/eligibility bypass.
- Independent read-only PortOne lookup returned HTTP 200 and PAID. Exact provider
  reference, store, reviewed TEST channel, canonical owner and KRW currency match
  the local order; total/paid are ₩1,000, cancelled amount zero, disputes empty.
  All checks passed. Sanitized private acceptance receipt:
  `.deployment/portone-local/payment-acceptance.json` (ignored, mode 0600).
- The accepted preview logged one preparation, four completion requests and one
  local paid transition. Database observation found exactly two test orders:
  this paid attempt and the original manual-approval attempt still pending.
  The original READY record was not approved, cancelled, rebound or overwritten.
- Root cause of the first failure was verified in the authenticated console:
  manual approval was enabled on the exact `try-out` KPN V2 TEST channel, while
  this app uses automatic approval. Owner explicitly approved disabling manual
  approval on only that TEST channel and one fresh private test. Save persisted
  and was rechecked. No live channel, webhook URL or API credential changed.
- Strict UUID-derived hex32 provider references passed all 242 ticket tests;
  full TypeScript and independent Astra/code, security, TS and React reviews
  passed. Database adapter fixtures were updated but not re-executed in this pass.
  Earlier receipts and validation boundaries below remain historical evidence.
- Resource preflight required owner memory cleanup. The unneeded phone receiver
  was omitted; only the verified agent-owned QA Chrome profile was retired.
  User Chrome/IAB, other apps and active tool transports were preserved. The
  shared Codex app-server tree includes other chats, so its snapshot was used as
  a conservative aggregate rather than exclusive chat ownership proof.
- The successful preview used a 4.25 GiB sampled process-group cap after measured
  ~4.04 GiB startup peaks; user limits remained 15 GiB aggregate and 10 GiB system
  headroom. It was intentionally stopped after acceptance with SIGTERM (143),
  peak 3,944,267,776 bytes, no remaining PIDs and no cleanup uncertainty. Receipt:
  `/tmp/sphmrs-kpn-auto-test-preview.log.5tqoqam3.log.metrics.json`.
  Persistent private payment mode remains disabled; no TEST-enabled preview left.
- Local registration → ticket selection → KPN TEST card payment → authoritative
  paid reconciliation is accepted. This is not live/production or PG-inspection
  readiness. No webhook registration, live payment, deployment, migration,
  dependency installation, commit or push was performed in this bounded batch.

**Remaining / fragile final-pass gates — not included in this acceptance**
- The owner revised the intended sale to shipped physical collectible coins with
  an event-invitation ownership benefit and a maximum of three per person. The
  [current commerce launch plan](../reference/commerce-launch-plan.md) records the
  revised offer, address-search recommendation and queued payment branches.
  Current ticket-order TEST acceptance does not establish coin fulfillment,
  cumulative purchase limits or physical-goods returns readiness.
- Public seller/contact and actual terms/privacy/refund content still need their
  existing publication gates satisfied; local TEST bypass did not relax them.
- Webhook delivery, provider failures/abandonment and deployment/live activation
  need their separately approved acceptance scopes. No approval is implied here.
- Preserve the original pending TEST attempt as evidence until scoped cleanup.
- Nonblocking UI finding: an expired saved-selection notice can coexist with a
  valid selected test ticket. Payment-path acceptance is not full design approval.

**Prior code-only validation — activation approval is recorded above**
- Final scoped member-auth/phone/ticket/commerce run: 865 tests, 827 passed,
  zero failed, 38 opt-in skipped; receipt
  `/tmp/sphmrs-local-kpn-final-validation.log.tm8vlfiy.log.metrics.json`.
  Initial combined validation then encountered test-fixture type errors; three
  reviewed test-type-only fixes were followed by full TypeScript with zero errors:
  `/tmp/sphmrs-local-kpn-types-rerun.log.8y4zlwjk.log.metrics.json`
  (peak 1,834,636,216 bytes; `remaining: []`). Backend config/HTTP coverage is
  96.88% lines, 88.37% branches, 92.11% functions; page 22 passed. Code,
  TypeScript, React, and security reviews passed.
- Actual default-off 1280 × 800 browser/Santa review passed using only mocked
  member status: “Checkout unavailable” disabled, no overflow, zero PortOne API
  requests. Captures were inline only. This is not enabled-gateway/payment
  acceptance. See the [current local source scope](../deployment/member-auth.local.md).
- The reviewed KPN V2 TEST pair is populated in source; earlier null-pair records
  are history. Catalogue/operator activation and first real TEST calls remain
  untested and require separate approval after owner resume. No database writes,
  migrations, provider API calls, payments, installations, push, or commit occurred.
- Reauthentication requires a new challenge: the repository requires challenge
  creation at or after session creation. Never promote or replay the old proof.
  Preserve the 15-minute freshness, session-before-proof, contextual identity,
  and fresh authoritative member-status gates in subsequent work.
- No automatic OTP resend, migration/reset, payment call, provider-setting write,
  commit, or deployment occurred.

## Progress

| Work | Status / evidence |
| --- | --- |
| Rescan merged main | Complete at `eeef4f8`; source/type assessment, not runtime acceptance. |
| Relocation wiring | Complete, including the user's later move to `src/styles`; root fonts/messages retained. Proxy moved byte-for-byte. |
| Reference import boundary | Complete; regression guard passes for source, tests and scripts. Unadopted session code remains in reference. |
| Source/runtime repairs | Corrected provider ordering, missing visibility SSR snapshot, CSS syntax/local imports and broken home links. Cursor starts idle instead of permanently claiming loading. |
| Compiler | Canonical `tsc --noEmit --incremental false` exits 0, without a deprecation bypass or new source exclusions. Generated route types refreshed. |
| Regression | 473 checks pass across 49 selected suites; 98 additional member-auth checks and 2 cursor checks pass. Database opt-ins removed from test environment. Coverage percentage not measured. |
| Local browser | Home, account and ticket surfaces rendered; desktop centered auth and touch bottom sheet inspected. Anonymous member status returns 200 after Postgres start and a fresh dev restart. No sign-in/email/payment submitted. |
| Independent review | Source and scoped customer-image Santa reviews pass. Separate TypeScript source review passes. Developer-overlay clipping remains a follow-up below. |

## Active follow-through: cursor and ticket entry

**Current revision — scoped review passed:** registration belongs inline
inside ticket purchase, not in a separate modal, registration card or chooser.
The first step is email or Google; verification and any missing account setup
progress in place, then reveal ticket selection only after authoritative membership
confirmation. Verified accounts skip account entry. The earlier auto-Sign-up-modal
attempt is superseded and not accepted. The prior gate-screen review below is
historical evidence, not acceptance of this integrated flow. Preserve existing
ticket intent and provider/recovery boundaries. The user subsequently chose
**branch before verification**: a complete-email lookup offers sign-in for existing
addresses and account creation/Google for new addresses. This intentionally
discloses account existence, but no profile, role, membership or provider-link data.
Lookup is advisory only; authentication and creation still require the existing
OTP/Google proof and fresh server status. Neither typing nor lookup sends OTP:
each email path requires an explicit button press. The previous address's local
successful-send cooldown is scoped per address; genuine server Retry-After
limits remain enforced across address changes.

### Current pre-verification branch acceptance

**Follow-up — scoped review passed:** user rejected layout movement from conditional status
rows and the heading/field-label spacing. The revised layout uses explicit 24 px
heading-to-field spacing, 8 px label-to-input spacing, a persistent two-line
feedback slot, and a reserved in-field spinner/retry area. Continue/retry hands
keyboard focus to the stable email input before pending controls change.

The user additionally replaced typing-driven lookup with **explicit Continue**:
typing, blur, focus, status refresh and rerender perform no existence query.
Continue looks up the email; the resulting sign-in/create-account action still
requires a separate press to send OTP. Editing cancels stale lookup and returns
to Continue; lookup-throttle expiry never retries automatically. Google remains
usable. Apple/Kakao are requested future provider options, not configured or
represented as functioning integrations in this pass.

**Latest visibility refinement — scoped review passed:** configured Google is shown before
a complete valid email, and for exact case-insensitive `gmail.com`/`googlemail.com`
addresses. A complete non-Gmail address removes it; clearing or entering Gmail
restores it. This is a customer-entry UI rule, not an OAuth/backend restriction;
staff login and passkeys are unchanged. Local validation performs no lookup or
delivery. RED/GREEN tests and 196 affected UI regressions pass. Both independent
Santa reviews pass the four actual desktop/mobile Gmail/non-Gmail captures.
Input and Continue coordinates remain identical across empty/Gmail/non-Gmail;
the irrelevant Google row reclaims its space. Clearing restores Google. No
fixtures, OAuth action, code delivery or payment was used in this visual check.

Visibility receipts:
- `/tmp/sphmrs-ticket-google-domain-red.v64qi4v3.log.metrics.json`
- `/tmp/sphmrs-ticket-google-domain-green._oofsxug.log.metrics.json`
- `/tmp/sphmrs-google-visibility-final-tests.log.h84ym2rs.log.metrics.json`
  (196 pass, no skips, no surviving processes, sampled peak 536,903,680 bytes)
- `/tmp/sphmrs-google-visibility-geometry.json`
- `/tmp/sphmrs-google-desktop-nongmail.jpg`, `/tmp/sphmrs-google-desktop-gmail.jpg`,
  `/tmp/sphmrs-google-mobile-nongmail.jpg`, `/tmp/sphmrs-google-mobile-gmail.jpg`

Current guarded preview log: `/tmp/sphmrs-google-visibility-review.log.wbf19e_c.log`.
One idle-tool-server surge crossed the chat's 15 GiB workload ceiling at the start
of this follow-up; 82 verified idle agent tool-server processes were pruned and
the preview was stopped before serial tests. No user apps/containers were stopped.

**Animation repair — scoped review passed:** the prior visibility change unmounted Google
immediately. The configured provider shell now stays mounted and uses installed
Motion with existing timing tokens to collapse height and fade in one beat.
Its leading gap belongs inside the collapsing shell, avoiding an empty-row/end-gap
pop. When passkeys remain, Google’s grid column/gap fades and collapses while the
same passkey control reclaims the width. No scale or horizontal travel is applied
to the enclosing form. Hidden controls are immediately inert, aria-hidden and
disabled; unconfigured providers remain absent. Actual desktop/mobile frame
sampling confirms intermediate height/opacity values in both directions,
64 → 0 → 64 px provider-shell height, successful rapid reversal, retained input
focus and unchanged ticket email/Continue coordinates. The short desktop modal
preserves its 12 px action gap; the same passkey node expands and contracts as
Google’s column retires/restores. All these checks performed zero lookup/delivery
requests. Both independent Santa reviews pass the final source, six captures and
frame evidence; static screenshots alone were not used as motion acceptance.

Live review caught a runtime unit bug: numeric Motion `columnGap` closed to zero
but did not restore the 8 px gap. Explicit `8px`/`0px` targets fix it. A RED unit
regression and final live frame run prove gap 8 → 0 → 8 px and Google column
176.5 → 0 → 176.5 px, with constant provider-shell height when passkey remains.

Motion evidence:
- `/tmp/sphmrs-google-motion-final-gap-tests.log.yz5or5la.log.metrics.json`:
  248 affected tests pass, no skips or surviving processes; sampled peak
  557,334,528 bytes.
- `/tmp/sphmrs-ticket-google-motion-red.r3_f_t5z.log.metrics.json`,
  `/tmp/sphmrs-google-gap-red.wmegfqd9.log.metrics.json`: demonstrated RED cases.
- `/tmp/sphmrs-google-motion-frames.json`: native browser frame samples, including
  separately labeled pre-fix gap evidence, not a synthetic account/provider.
- Final captures: `/tmp/sphmrs-google-motion-mobile-open.jpg`,
  `/tmp/sphmrs-google-motion-mobile-closed.jpg`,
  `/tmp/sphmrs-google-motion-desktop-open.jpg`,
  `/tmp/sphmrs-google-motion-desktop-closed.jpg`,
  `/tmp/sphmrs-google-motion-short-modal-open.jpg`,
  `/tmp/sphmrs-google-motion-short-modal-closed.jpg`.
- Canonical typecheck still reports only the five unrelated teaser errors; motion
  changes introduce no additional diagnostics in that run. Legacy short-height
  tests now consume the existing real provider fixture and verify the new exact
  20 px/12 px spacing mechanism, without changing scrollbar/focus requirements.

Current guarded preview: `/tmp/sphmrs-google-motion-final-review.log.hkcs76vf.log`.
The temporary account-review tab was closed; ticket and Zoho tabs were preserved.

**Email-label cleanup — scoped review passed:** ticket entry keeps its heading,
with the associated field label changed to `sr-only` and no repeating placeholder.
Standalone login labels are unchanged. Desktop/mobile live review confirms one
visible instruction, preserved accessible field name, 24 px heading-to-input gap
and no overflow. Both independent Santa reviews and the scoped TypeScript review
pass. RED/GREEN ticket DOM receipt:
`/tmp/sphmrs-ticket-email-label-green.w1ulfryd.log.metrics.json` (63 pass, no skips
or surviving processes). Captures: `/tmp/sphmrs-ticket-label-mobile.jpg` and
`/tmp/sphmrs-ticket-label-desktop.jpg`.

Current restarted preview: `/tmp/sphmrs-auth-receiver-setup-preview.log.hrwgj_ry.log`,
one 5 GiB guarded job with 3 GiB Node heap. At session entry, accumulated idle tool
servers had exceeded the aggregate task budget and the preceding preview had
already failed closed on its own memory cap. Idle copies were pruned and tests
remained serial. The separate in-app computer-use bridge is unavailable after
cleanup; Chrome review works, but provider login/credential entry remains manual.

RED/GREEN tests cover permanent slots, keyboard focus and explicit lookup. Live
desktop/mobile review and both independent Santa reviews pass. Measured input,
primary and Google positions stay identical across idle, typing, pending, lookup
error/retry, existing/new classification, two-line delivery error and countdown.
Four state captures are explicitly offline fixtures; the mobile new-account
capture used actual anonymous status and an explicit successful lookup, no send.
A full-tree resource check exceeded the
strict 15 GiB workload ceiling; the preview was stopped and 92 verified idle agent
tool-server processes were terminated. User apps, browser and Postgres were preserved.

| Area | Result / boundary |
| --- | --- |
| Branching | Explicit **Continue** looks up the email and selects existing/new before proof. Existing addresses offer **Send sign-in code**; new addresses offer **Create account & send code**. Google remains available initially and in both branches. Typing never queries; Continue/lookup never sends OTP. |
| Discovery | Native installed Better Auth adapter returns only `existing`/`new`, without creating accounts/sessions or delivering mail. Advisory classification never grants purchase authority. Request body is bounded to 2,048 bytes / 5 seconds before SDK parsing. |
| Authority | Live review caught Next dev rewriting the URL to its loopback bind address. Route now supplies configured Better Auth origin; the existing local authority policy requires canonical Host and matching port. Host/Origin/forwarded-host spoofing stays rejected. RED/GREEN regressions cover the fix. |
| Abuse boundary | Database-backed shared ten-lookups/minute bucket is applied before SDK handling and cannot be multiplied with spoofed forwarding headers. This conservative local fallback is **not production trusted-ingress/distributed-abuse acceptance**. |
| Cooldowns | Successful-send deadlines are normalized-email scoped: B is usable after sending to A, returning to A retains its countdown. Genuine server 429 restrictions survive address changes. Expired/exhausted-code protection remains intact. |
| Regression | 457 affected checks pass, no skips, including local-authority, explicit Continue and stable-feedback/focus regressions. No database test opt-ins or provider calls. Coverage percentage was not remeasured for this revision. |
| Compiler | Current canonical `tsc --noEmit --incremental false` is **not green**: five unrelated `ChapterId` comparison errors remain in the concurrently edited `src/components/teaser/experience.tsx` (190, 301, 302, 325, 328). Auth test type errors were repaired; teaser edits were preserved. |
| Browser | Actual anonymous status and explicit new-email lookup return 200 on canonical localhost; typing produces zero lookup requests and no real send was submitted. Desktop/touch-mobile geometry remains anchored through pending/error/retry/classification/countdown, including a two-line error. Earlier offline checks also cover A→B→A cooldown retention and shared 429; Google stays usable. |
| Review | Independent code and React Santa reviews pass the same five latest captures and source; dedicated discovery security review remains valid. Heading/label spacing and retry focus findings are repaired and re-reviewed. |

Current evidence:
- `/tmp/sphmrs-explicit-feedback-final-tests.log.xm1pb7pd.log` and `.metrics.json`:
  457 checks, exit 0, sampled peak 502,415,360 bytes, no surviving processes.
- `/tmp/sphmrs-explicit-feedback-regression.log.1929bxzl.log`: latest canonical
  typecheck still reports only the five unrelated teaser errors listed above.
  Its one old-flow test expectation was updated to require explicit lookup and
  prohibit delivery; the subsequent 457-check run above passes.
- RED/GREEN receipts: `/tmp/sphmrs-ticket-feedback-red.vo8se0hh.log.metrics.json`,
  `/tmp/sphmrs-ticket-explicit-red.2yiy00_k.log.metrics.json`,
  `/tmp/sphmrs-ticket-retry-focus-red.htjgzpc6.log.metrics.json`,
  `/tmp/sphmrs-ticket-retry-focus-green.b_tp214d.log.metrics.json`.
- Geometry: `/tmp/sphmrs-explicit-feedback-geometry.json`.
- Latest live capture: `/tmp/sphmrs-explicit-feedback-mobile-new-live.jpg`.
- Latest offline captures: `/tmp/sphmrs-explicit-feedback-mobile-error-fixture.jpg`,
  `/tmp/sphmrs-explicit-feedback-mobile-delivery-error-fixture.jpg`,
  `/tmp/sphmrs-explicit-feedback-desktop-entry-fixture.jpg`,
  `/tmp/sphmrs-explicit-feedback-desktop-countdown-fixture.jpg`.

Earlier pre-verification evidence (superseded layout/automatic lookup):
- `/tmp/sphmrs-preproof-final-regression.log.mvy5s381.log` and `.metrics.json`:
  452 checks, exit 0, sampled aggregate peak 519,389,184 bytes, no surviving processes.
- `/tmp/sphmrs-preproof-final-types.log.nbp_su7c.log` and `.metrics.json`:
  five teaser compiler errors above; three local-authority checks pass; no surviving processes.
- `/tmp/sphmrs-email-entry-alias-red.y5tns7qo.log.metrics.json` and
  `/tmp/sphmrs-email-entry-alias-green.xkg847rd.log.metrics.json`: authority regression RED then 48 focused GREEN.
- Live desktop: `/tmp/sphmrs-preproof-desktop-new-live.jpg`.
- Explicit offline fixtures: `/tmp/sphmrs-preproof-desktop-existing-fixture.jpg`,
  `/tmp/sphmrs-preproof-mobile-existing-fixture.jpg`, `/tmp/sphmrs-preproof-mobile-new-fixture.jpg`.

Offline captures used browser-only fetch stubs and Chrome Offline mode; API
transport entries remained zero. No real OTP, Google login, account creation,
phone proof, payment or order submission was performed. Physical-device,
provider and production acceptance remain open. Fixture and offline state are
removed after capture; the review tab returns to bare `/tickets`.

One supervised webpack preview runs on `http://localhost:3000/tickets`, bound
to loopback with a 4.5 GiB aggregate cap, 3 GiB Node heap, 10 GiB system-headroom
floor and one-hour timeout. Receipt/log:
`/tmp/sphmrs-explicit-feedback-review.log.6lfz004m.log`. No commit, push or deployment.

### Prior verify-first inline acceptance (superseded branching)

| Area | Result / boundary |
| --- | --- |
| Integrated entry | Email + Google appear directly inside Tickets. No registration gateway, Welcome chooser, modal/sheet, Account ready or Done detour. Recovery remains inline and preserves the entered email. |
| Proof and branching | Same pre-proof step for existing/new emails. Existing Better Auth OTP verifies ownership before lookup/creation; only missing phone setup appears afterward. No new email-existence API. |
| Eligibility / context | Session owns status refresh; snapshots are parsed and busy/error/malformed/revoked states remain fail-closed. Auth and purchase states stay mounted. Known identity survives outages; focus transfers only when still owned by authentication, not after the user moves elsewhere. |
| Google continuation | Closed `ticket-checkout` client context pins Google success/error/new-user returns to `/tickets`. Both backend policies validate and rewrite coherently; duplicate-array queries rejected. Account, admin, magic-link and account-linking defaults preserved. |
| Compiler / regression | Canonical `tsc --noEmit --incremental false` and 407 affected Node checks pass, no skips. Six measured changed modules: 96.67% lines, 94.42% branches, 91.44% functions. |
| Live / visual | Real anonymous desktop 1280×900 and touch-mobile 390×844 entry inspected: no dialogs, horizontal overflow or purchase leakage. Typing an email produced zero delivery requests. Current OTP and missing-phone renders were inspected in an explicitly offline browser fixture, not a real verification session. |
| Independent review | Both independent Astra code/React Santa reviews pass the current source and all four current images; TypeScript and dedicated backend-security reviews also pass their scoped source checks. |

Current receipts:
- `/tmp/sphmrs-inline-checkout-validated.dgnovi_o.log` and `.metrics.json`:
  canonical compiler + 407 checks, exit 0, sampled aggregate peak 1,819,366,616
  bytes, no surviving processes and no cleanup uncertainty.
- `/tmp/sphmrs-inline-oauth-check.n_n2mahg.log` and `.metrics.json`:
  39 focused callback/client/policy checks, no database or provider calls.
- `/tmp/sphmrs-ticket-recovery-focus-green.nv5kowaa.log` and `.metrics.json`:
  117 focused inline/default-contract checks; the stale recovery-focus issue was
  reproduced RED and corrected before final acceptance.
- Real entry images: `/tmp/sphmrs-inline-checkout-desktop-entry.jpg`,
  `/tmp/sphmrs-inline-checkout-mobile-entry.jpg`.
- Synthetic phase images:
  `/tmp/sphmrs-inline-checkout-mobile-code-offline-fixture.jpg`,
  `/tmp/sphmrs-inline-checkout-mobile-phone-offline-fixture.jpg`.

The synthetic browser run intercepted one test OTP request and verification while
Chrome networking was explicitly offline; transport entries remained zero. All
other API mutations were blocked by that test fixture. It was removed afterward,
networking restored, and the real bare `/tickets` page confirmed anonymous with
unmocked fetch. No real email/SMS, Google login, account creation, payment, or order
submission occurred. Those remain separate acceptance gates.

The current preview uses a stricter **5 GiB process-tree cap**, 3 GiB Node old-space
and the unchanged 10 GiB system-headroom floor, with a one-hour timeout. Log:
`/tmp/sphmrs-inline-checkout-review.yoc3c2wo.log`. Completed-agent tool servers can
reappear on follow-up turns; the full-tree audit caught that overhead again and
verified idle copies were pruned after reviews finished. Latest full Codex CLI
tree sample: **12.03 GiB**, system available **21.3 GiB**. The active preview/browser,
user applications and existing Postgres were preserved. No commit/deployment ran.

### Previous gate-screen batch (superseded UX)

| Step | Status |
| --- | --- |
| Resource containment | Complete; fault tests and independent reviews below. All subsequent local workloads supervised, one heavy job at a time. |
| Button/link cursor coverage | Complete: enabled native/role buttons and links, late portals, explicit labels/DRAG, availability changes under a stationary pointer, disabled/touch cleanup. |
| Registration before purchase | Complete: only authoritative parsed `member=true` reveals purchase panels. Loading/error/incomplete states fail closed; saved intent and retained-payment ownership preserved. Club approval remains separate. |
| Focused regression / compiler | 295 affected Node checks pass and canonical `tsc --noEmit --incremental false` exits 0. Scoped coverage: cursor owner 85.42% lines / 94.44% branches; ticket selection 99.70% / 94.12%. No database/provider tests or real auth/payment submissions. |
| Desktop/mobile live review | Passed: desktop 1280×900, short desktop 1280×560, mobile touch 390×844. Native/portal button and anchor cursor states inspected; no purchase leakage or horizontal overflow. Mobile dismissal returns to `/tickets` and restores the visible opener. |
| Independent final pass | Both independent Astra Santa reviews pass source and all six images. Deferred completion focus and stationary availability issues were found, fixed with RED/GREEN regressions and re-reviewed. |

Current follow-through receipts:
- `/tmp/sphmrs-cursor-ticket-final-pass.zp30_v9f.log` and `.metrics.json`:
  295 Node checks plus typecheck, exit 0, sampled aggregate peak 1,833,965,336 bytes,
  no surviving processes and no cleanup uncertainty.
- `/tmp/sphmrs-cursor-ticket-validated.vzt6y4lr.log`: 25 bounded Python resource
  checks also pass. Later cursor-only availability changes were rechecked in the
  final Node/typecheck run above.
- `/tmp/sphmrs-cursor-ticket-desktop-gate.jpg`,
  `/tmp/sphmrs-cursor-ticket-desktop-login-final.jpg`,
  `/tmp/sphmrs-cursor-ticket-short-desktop.jpg`,
  `/tmp/sphmrs-cursor-ticket-mobile-gate.jpg`,
  `/tmp/sphmrs-cursor-ticket-mobile-chooser.jpg`,
  `/tmp/sphmrs-cursor-ticket-mobile-login.jpg`: actual local renders.

Live checks used an anonymous account. Registered completion, unavailable/malformed
status, retained-payment handling and deferred focus are synthetic test coverage,
not real-account/provider acceptance. A temporary DOM-only disabled/enabled toggle
verified cursor availability recovery without submitting authentication.

## Fragile final pass

1. **Follow-up:** developer-only Warp launcher labels are clipped by the page frame (`src/components/Warp/dev-controls.tsx:66`, `src/components/Warp/editor/sequence-editor.tsx:268`). Excluded from scoped customer-flow acceptance; not silently fixed by restyling the user's frame.
2. OTP delivery, Google/passkey authentication, recovery completion, physical-device gestures and payment-provider acceptance were not repeated here.
3. Production build, deployment packaging/image and deployment were not validated. The local dev render and typecheck are not production acceptance.
4. Preserve the user's staged essays/styles moves, global font/layout changes and custom Link edits. These were not reverted or staged by this batch.

## Review links and receipts

- Local preview: <http://localhost:3000/>, <http://localhost:3000/account>, <http://localhost:3000/tickets>.
- Typecheck: `/tmp/sphmrs-stabilization-final-typecheck-20261109.log`.
- Main regression: `/tmp/sphmrs-stabilization-final-regression-20261109.log` (473/473).
- Member fixture checks: `/tmp/sphmrs-member-final-fixtures.log` (98/98); subsequent supported render-option repairs revalidated in `/tmp/sphmrs-fixture-callsite-final.log` (114/114, overlaps main/member counts).
- Actual desktop/mobile screenshots: `/tmp/sphmrs-stabilization-*.jpg`; ephemeral local evidence, not a durable production acceptance archive.

## Initial resource/service checkpoint (historical)

**Initial resource containment repair was validated.** The user reported
another approximately 200 GB runaway and killed execution. That peak/cause is not
recoverable from the current process snapshot. The surviving orphaned preview and
launcher were stopped explicitly; no unrelated user processes were terminated.
The earlier temporary-monitor claim did not provide durable, verified containment.
Actual physical RAM is 48 GiB; this pass must retain at least 10 GiB of system
headroom and remain below the user's 15 GiB aggregate workload ceiling.
Postgres remains bound to `127.0.0.1:4141` with the existing volume preserved.

| Resource repair | Status / evidence |
| --- | --- |
| Persistent supervisor | `scripts/resource-guard.py`; 22 bounded checks pass under the supervisor itself. Counts aggregate RSS and macOS physical footprint, not V8 alone. Timeout, output bound, overlap refusal, parent/signal/orphan cleanup, headroom/accounting failures, nonzero exits and private evidence checked. |
| Fail-closed recovery | Durable prelaunch marker blocks new work after interruption or uncertain cleanup, even when creating the quarantine file fails. No automatic clearing of unknown descendants. |
| Local entrypoints | Guarded `dev`, `build:guarded`, `typecheck:guarded`, `test:guarded`. Next's automatic 80%-heap restart was observed at the conservative 1.5 GiB heap; the preview now explicitly allows 3 GiB old-space inside the unchanged 6 GiB aggregate cap and 10 GiB system-headroom floor. Checks retain the 1.5 GiB default; stricter inherited caps remain authoritative. Deployment's plain build/test/typecheck remain unchanged. |
| Concurrency and failure output | Serial Node test workers; unsafe ticket DOM equality diagnostics changed to boolean identity/absence assertions without changing assertion meaning. |
| Root-cause status | DOM/React failure formatting is a known hazard, not a demonstrated explanation of this reported peak. No heap profile or incident-time accounting survives. |
| Independent review | Astra source/safety and Python reviews have no remaining material findings; scoped JS review found no resource-edit errors. Not runtime/production acceptance of the site. |
| Original requested fixes | Cursor button/link hover and registration-before-purchase now pass the scoped regression, live review and dual Santa checks documented above. This is not PG or production approval. |

The preview at that earlier checkpoint was loopback-only at <http://localhost:3000/tickets>, supervised
with a one-hour timeout. Log prefix: `/tmp/sphmrs-cursor-ticket-review.dq_avww_.log`.
No duplicate bundler remains. The full CLI descendant audit found approximately
16.5 GiB from accumulated idle MCP servers despite the preview/browser being below
5 GiB. Verified idle Chrome/Playwright, Context7, Supabase and CUA repl instances
were pruned; active Chrome, preview, IDE, other user applications and Postgres were
preserved. The subsequent full chat process-tree sample was approximately 10.8 GiB,
with 22.5 GiB available system memory. This distinction is now explicit in
`AGENTS.md`; individual guarded-job receipts are not aggregate-chat accounting.

The watchdog is a sampled safety mechanism, not an instantaneous kernel quota.
External browser/MCP/container processes are not members of its child process
group and must still be accounted for separately. Do not start another browser,
service or test process to bypass the checkout lock. See `AGENTS.md` local workload
safety for the required execution path.

Acceptance receipts (ephemeral local files):
- `/tmp/sphmrs-resource-accepted.1swif_m7.log` and its `.metrics.json`: 22 checks,
  exit 0, sampled aggregate peak 72,450,048 bytes, no remaining PIDs and no cleanup
  uncertainty. Test allocations were intentionally small; no heavy build ran.
- `/tmp/sphmrs-resource-node-final.bkzapeb6.log` and its `.metrics.json`: real Node
  child preserves inherited 512 MiB old-space cap and other Node options, exit 0,
  no remaining PIDs. Old-space is not the entire V8/process memory allocation.

## Remaining PG gates (outside this batch)

Published offer/policies, public auth/verification configuration, reviewed PortOne
sandbox channel and provider acceptance remain separate gates. Deployment packaging
still needs its own source-layout update. Local checks cannot establish PG approval.
