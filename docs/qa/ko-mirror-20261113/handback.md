# SPH-I18N-KOMIRROR-20261113-01 — handback

## Progress / review panel

- **Review checkpoint — candidate complete:** Korean mirror, shared fallback and policy changes implemented; no merge/push/deployment.
- **Validated:** 175 original values unchanged; 1,027 new empty values; exact structure/order/string-leaf contract; English byte identity.
- **Validated:** final focused tests 12/12; full typecheck exit 0; default suite only the two known deferred-styling failures.
- **Validated:** [live screenshot](ko-fallback-live.png) from the real account component in the loopback fixture, with preserved Korean `언어` and English fallback; preview stopped with no remaining child PIDs.
- **Remaining:** coordinator re-review after rework cycle 1; the specialist passed and both independent Santa MEDIUM policy findings are addressed below. Owner acceptance/merge remains separate; no DB/provider/production acceptance claimed.

## Identity and scope

- Initial main identity: `32a30455f9ebf40c533d8474648f5349cb02bb0d` (assignment-adding commit).
- Checkout: `.` (this worktree).
- Initial branch: `xnxchoi/ko-mirror-20261113`, renamed before edits to `codex/ko-mirror-20261113`.
- Initial tracked status was clean. No dependencies installed; local node_modules symlinks to the approved existing installation.
- No database, provider, credentials, environment files or other checkouts accessed for runtime work. No push, merge or deployment.

## Library-first decision

Installed: lodash-es 4.18.1, next-intl 4.14.9, Next 16.5.0-canary.27. Read installed lodash-es `mergeWith.js` documentation and the installed Next `use-client.md` guide. Context7 is not exposed by this session. Existing `src/i18n/messages.ts` already owns the shared client/server catalogue; `src/i18n/request.ts` returns it directly.

- Existing `merge` preserves explicit blanks, so does not satisfy the activated fallback.
- Native next-intl missing-message fallback handles missing messages, not valid empty strings; it would not replace the shared catalogue merge.
- Installed `mergeWith` directly applies the one empty-source exception, preserving native next-intl diagnostics and ICU/rich handling. No new helper, wrapper, API, package or activation flag.

## Fragile final-pass checklist

1. English bytes unchanged and all 175 original Korean strings preserved.
2. Literal structure/order/string leaves match; new Korean leaves are empty, never auto-filled.
3. Shared client/server catalogue, ICU arguments, rich markup and missing-message diagnostics remain native.
4. Guarded full typecheck; default failures restricted to the two deferred styling tests.
5. Actual browser screenshot is synthetic loopback evidence only; no provider/backend acceptance.

## One-off Korean mirror regeneration (Python standard library)

Executed from this checkout; no regeneration tool was committed:

```python
from pathlib import Path
import json
p = Path("messages/ko.json")
en = json.loads(Path("messages/en.json").read_text())
ko = json.loads(p.read_text())
def mirror(english, korean):
    if isinstance(english, dict):
        return {
            key: mirror(value, korean.get(key, {} if isinstance(value, dict) else ""))
            for key, value in english.items()
        }
    assert isinstance(english, str) and isinstance(korean, str)
    return korean
p.write_text(json.dumps(mirror(en, ko), ensure_ascii=False, indent=2) + "\n")
```

Result: 1,202 string leaves, comprising 175 preserved values and 1,027 new empty
strings. English bytes equal the identity commit exactly; SHA-256:
`7078068f4ea5ae4d6437a4bce42cd80b16382d04270b73f3a2ac40873bab5be9`.
Baseline Korean source SHA-256:
`44d2db28c98fac07dab9fea96771546390cbe79988ff4cddb35a967c1cf7a2e8`.

## Resource boundaries

Actual physical RAM: 51,539,607,552 bytes (48 GiB). Before each guarded Node job,
read `sysctl hw.memsize` and `vm_stat`; snapshots showed more than 10 GiB of
free/inactive pages and the guard enforces its own minimum-headroom check.
The sandbox denies macOS inspection required by the supervisor; guarded jobs
therefore run with scoped escalation, not without the guard. Initial sandbox
attempt never launched Node and produced no receipt. Only one workload runs
at a time; no limit is raised following a resource stop.

## Live-render method and evidence

Reuse `tests/support/composition-preview.mjs --i18n` unchanged on disk. An
in-memory esbuild `onLoad` override changes only its existing synthetic fixture
controls: start in `ko` and obtain the Locale label from the real merged
`Common.language` message. The actual production `MemberAccountFlow` and its
catalogue are unchanged. This provides a visible Korean string (`언어`) beside
English-fallback account UI sourced from empty Korean `MemberAuth` values.
The existing fixture already uses an inert `MemberClient`, prevents navigation,
and serves only loopback assets. This is not a Next request lifecycle, DB or
provider acceptance check; server wiring is separately asserted in tests.

One-off runner (executed via guarded `node --input-type=module -- --i18n` with
the code below via `--eval` (the guard intentionally disables stdin); no extra fixture/script persisted):

```js
import { readFile } from "node:fs/promises";
const root = process.cwd();
let source = await readFile("tests/support/composition-preview.mjs", "utf8");
source = source
  .replace('const root = fileURLToPath(new URL("../../", import.meta.url));',
    `const root = ${JSON.stringify(root)};`)
  .replace('createRequire(import.meta.url)',
    `createRequire(${JSON.stringify(root + "/package.json")})`)
  .replace('<html lang="en">', '<html lang="ko">')
  .replace('plugins: [', `plugins: [{
    name: "korean-mirror-review-controls",
    setup(builder) {
      builder.onLoad({ filter: /i18n-preview\\.tsx$/ }, async ({ path }) => ({
        loader: "tsx", resolveDir: root + "/tests/fixtures",
        contents: (await readFile(path, "utf8"))
          .replace('useState<"en" | "ko">("en")', 'useState<"en" | "ko">("ko")')
          .replace('<label>Locale <select', '<label>{messagesByLocale[locale].Common.language} <select')
      }));
    }
  },`);
await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
```

## Checks and retained evidence

All Node commands used checkout-local TMPDIR, unset `DATABASE_URI`,
`MEMBER_AUTH_TEST_DATABASE_URL`, `COMMERCE_PAYLOAD_DATABASE_TESTS`, and ran via
`scripts/resource-guard.py --min-headroom-gib 10`. Tests/preview used
`--max-gib 1.5 --node-old-space-mib 1024 --timeout 1200`; typechecks used the
assignment's permitted `--max-gib 3.5 --node-old-space-mib 2048 --timeout 600`.
No build, install, dependency audit, database suite or deployment was run.

| Check | Actual result | Evidence |
|---|---|---|
| RED: `node --import tsx --test tests/i18n/catalog-contract.test.ts` | exit 1; 3 pass / 2 expected failures (shape and empty fallback) | [excerpt](evidence-summary.md#red) + `red.log.jl50hwuw.log.metrics.json` |
| Initial focused catalogue + next-intl tests | exit 0 | [excerpt](evidence-summary.md#focused) + `focused.log.ajpak8nt.log.metrics.json` |
| Default: `node tests/run-unit.mjs` | exit 1; 2,686 tests, 2,645 pass, 2 fail, 39 skipped | [excerpt](evidence-summary.md#default-suite) + `default-suite.log.rdw6nyaw.log.metrics.json` |
| Full typecheck, first allowed attempt | exit 2; test-only required `children` prop errors in the new React provider assertions; fixed directly | [excerpt](evidence-summary.md#typecheck) + `typecheck.log.h_kviqv0.log.metrics.json` |
| Full typecheck, second/final allowed attempt | exit 0 | [excerpt](evidence-summary.md#typecheck-final) + `typecheck-final.log.x1q7g59t.log.metrics.json` |
| Final focused catalogue + next-intl tests | exit 0; 12 pass, 0 fail | [excerpt](evidence-summary.md#focused-final) + `focused-final.log.yxk2_ye5.log.metrics.json` |
| Live browser | `lang=ko`, fixture locale `ko`, Korean visible, English fallback `Enter your email`, no empty accessible controls, no raw translation keys, no horizontal overflow | `ko-fallback-live.png`; [excerpt](evidence-summary.md#live) + `live.log.pd_cr7b7.log.metrics.json` |
| Final whitespace/scope | tracked implementation `git diff --check` exit 0; only owned paths changed | candidate diff |

Default suite's only failures:
1. `deferred styling: article grid preserves its columns and readable type`.
2. `deferred styling: verification loops, account indicators and toast avoid CSS clocks`.

The final focused run includes the test-only additions/fixes made after the full
suite began; production implementation did not change after that suite began.
No failed run or almost-failed acceptance case is omitted above.

### Concise harsh live review

**Bounded visual pass:** the actual account surface renders its heading, email
accessible label, Continue and Google actions and recovery link without blank
translation output or raw keys. Preserved Korean `Common.language` is visible in
the fixture control; the real account heading is English from an empty Korean
`MemberAuth.enterYourEmail`. The screenshot does not prove that the account
component itself contains Korean copy, nor does it validate a real Next request,
provider response, routing or authentication. These limitations are deliberate,
not hidden acceptance claims; independent Santa review belongs to the coordinator.

### Resource receipts

- `default-suite.log.rdw6nyaw.log.metrics.json`: exit 1; peak 1,035,392,656 bytes; remaining PIDs `[]`; cleanup uncertain `False`.
- `focused-final.log.yxk2_ye5.log.metrics.json`: exit 0; peak 284,033,024 bytes; remaining PIDs `[]`; cleanup uncertain `False`.
- `focused.log.ajpak8nt.log.metrics.json`: exit 0; peak 255,541,248 bytes; remaining PIDs `[]`; cleanup uncertain `False`.
- `live.log.pd_cr7b7.log.metrics.json`: exit 143; peak 566,575,104 bytes; remaining PIDs `[]`; cleanup uncertain `False`.
- `red.log.jl50hwuw.log.metrics.json`: exit 1; peak 261,832,704 bytes; remaining PIDs `[]`; cleanup uncertain `False`.
- `typecheck-final.log.x1q7g59t.log.metrics.json`: exit 0; peak 1,318,661,024 bytes; remaining PIDs `[]`; cleanup uncertain `False`.
- `typecheck.log.h_kviqv0.log.metrics.json`: exit 2; peak 2,326,118,400 bytes; remaining PIDs `[]`; cleanup uncertain `False`.

Preview exit 143 is the deliberate supervisor SIGTERM after browser review, not
a resource stop. The browser was navigated to `about:blank`; no preview or Node
check remains running. The reused browser MCP connection remains available; no
extra browser instance or child worker was created.

## Final scope/security review

Only owned catalogue/runtime/tests, the named AGENTS section and plan breakpoint,
and this assignment's QA evidence were changed. Historical plan status text is
left as historical evidence, with its supersession explained in the breakpoint.
No English catalogue, package/lock/config, provider/protocol, auth lookup or
credential implementation changed. No new production input boundary, network
operation, secret or dependency was introduced. Missing-message errors retain
`IntlErrorCode.MISSING_MESSAGE` and the native `Test.missing` fallback.

Implementation-only diff SHA-256 (six tracked implementation/rules paths,
before candidate commit):
`f1ea108b949facfd5724f68df7de7e054c6595f7529284e712e800cb87841196`.

The original candidate retained full stdout logs; the pre-review fix below
supersedes that evidence-custody choice. The initial combined stage/check/commit
command had stopped on native diagnostic whitespace before any commit; the
historical failures remain represented in the bounded excerpts.

## Committed candidate identity

- Implementation/evidence candidate HEAD: `7ed17625150ba0ebe02a538e1b15bb00cddc6531`.
- Branch: `codex/ko-mirror-20261113`; checkout path recorded above.
- Full binary candidate diff SHA-256 (`git diff --binary 32a30455f9ebf40c533d8474648f5349cb02bb0d 7ed17625150ba0ebe02a538e1b15bb00cddc6531`):
  `fc74179d38b15c462b3999fea2041a92acbc4665ff3da9a52c7351858085c016`.
- A documentation-only follow-up records this immutable candidate identity; the
  coordinator's worker completion includes the final handback commit HEAD.
- Candidate commit completed with the configured secret-scanning hook enabled.
- All workload receipts report no remaining child PIDs; loopback port 3085 has
  no listener. The only retained task-generated runtime setup is the approved
  ignored node_modules symlink. Checkout-local generated test caches were removed.

## Pre-review fix — 2026-11-13

- Starting candidate: `ea48182d9ebffd2821f6f1364753286dd1b854fe`.
- Removed the seven raw `*.log` stdout files; retained all seven
  `*.log.metrics.json` receipts byte-for-byte, plus the live screenshot.
- Added [bounded evidence excerpts](evidence-summary.md) for every run, including
  command, exit code, pass/fail/skip counts (N/A for non-test runs), named
  failures, the RED assertions and the initial typecheck errors.
- Replaced the handback's absolute checkout path with `.`; excerpt commands and
  source paths are relative to this worktree. No source, test, catalogue or rule
  file changed, and no Node workload was started for this fix.
- Validation: base-to-final-tree whitespace checks pass; after committing, verify
  `git diff --check 32a3045 HEAD` again. Receipt hashes were verified unchanged.
- Scope remains a candidate for coordinator review; this fix does not grant
  merge, push, deployment or production/provider acceptance.

## Rework cycle 1 — 2026-11-13

- Starting candidate: `305061e2fc3906793bb85a67a63538f237750cbf`.
- Review input: TypeScript/i18n specialist PASS (LOW only); independent Santa A
  and B each FAIL on one MEDIUM stale-policy contradiction.
- Restated the plan's live Owner contract as the mirror/preservation/active-fallback
  rule; its original Korean SHA-256 is explicitly historical, not a live hash gate.
- Updated only the brand-voice guide's Korean-catalogue/fallback policy wording;
  English-first authoring, all surrounding guidance and content ownership remain unchanged.
- Added one whole-catalogue test asserting that the actual `messagesByLocale.ko`
  has no empty string leaf, complementing the synthetic fallback assertions.
- Left `docs/reference/korean-copy-calibration.md:17` and
  `docs/reference/korean-copy-passes/05-coverage-findings-and-task.md:144`
  unchanged as historical records.
- **Review checkpoint:** all focused i18n tests pass (64/64, 0 fail/skip),
  including the new real-catalogue nonempty-leaf assertion; the single full
  typecheck exits 0 with no diagnostics. See the new
  [cycle 1 excerpts and receipts](evidence-summary.md#rework-cycle-1--2026-11-13).
- Guarded tests peaked at 263,110,656 bytes; typecheck at 1,320,463,408 bytes.
  Both receipts report no remaining child PIDs and no uncertain cleanup.
- Full-base whitespace validation is clean before committing; verify again with
  `git diff --check 32a3045 HEAD` after the new commit. No full suite or browser
  workload was repeated because this cycle changed only docs and one test.
- Raw cycle 1 logs were reduced to bounded excerpts and removed; all historical
  receipts remain byte-identical and the two new receipts are retained.
- Remaining gate: coordinator re-review; no additional runtime implementation,
  translation, owner acceptance, merge, push or deployment is inferred.

## Rework cycle 2 — 2026-11-13

- Starting candidate: `598f4a45f8ee3e3d31a121dca6f1bd23e352bbba`.
- Review input: specialist PASS; independent Santa A PASS with one LOW;
  independent Santa B FAIL with one MEDIUM on the same live-planning sentence.
- Changed only the assigned sentence in
  `docs/reference/ticket-account-planning-20261110.md`: next-intl rendering now
  requires the matching structural Korean catalogue change, with `""` for new
  keys, per AGENTS.md. All other bytes of that document remain unchanged.
- Left `docs/reference/korean-copy-passes/00-run.md:18`,
  `docs/reference/korean-copy-passes/05-coverage-findings-and-task.md:144` and
  `docs/reference/korean-copy-calibration.md:17` unchanged as historical records.
  The custodian owns the separate batch shared-rule update on main.
- Markdown-only: no Node workload, typecheck, test, browser, runtime, catalogue
  or rule change. Full-base whitespace checks pass before committing; verify
  `git diff --check 32a3045 HEAD` again after the new commit.
- Remaining gate: coordinator re-review; no merge, push or deployment performed.
