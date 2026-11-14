# Handback — SPH-PAYLOAD-RELOCATION-FOLLOWUP-20261114-01

**State: candidate; all acceptance met, with criterion 3 narrowed by the coordinator (see Criterion 3 narrowing).** Not merged, pushed or archived.

- Path: `orca/workspaces/sphmrs/payload-relocation-followup-20261114`
- Branch: `codex/payload-relocation-followup-20261114` (renamed first action from the Orca-created `xnxchoi/payload-relocation-followup-20261114`)
- Identity base: `7cb2574` (main commit adding the spec). Clean tree at start.
- Code/docs HEAD: `0cd5788a560b06a109ff63c7a5366600ef05062a` (this handback is a separate later commit).
- Commits: `039ec08` test: scan src/payload; `0cd5788` docs: living references.
- Diff identity (`git diff -M 7cb2574 0cd5788 | git patch-id --stable`): `c116d8953cbedea43b9b321e7543922f3ad8ba6a`.
- Changed files (6, +20/−20): `tests/motion/full-motion-policy.test.ts`, `docs/To-Do List.md` (line 421 only), `docs/reference/{commerce-launch-plan,commerce-policy-drafts,ticket-account-planning-20261110,unlock-integration-blueprint}.md`.

## Acceptance 1 — motion scan (met)
`"src/payload"` added to the scanned directory list. Pre-check: the motion regex has zero hits in the real `src/payload`. Probe `src/payload/zz-motion-probe.ts` (contained `prefers-reduced-motion`; never committed, deleted):
- (a) probe present, old list: **pass** — shows the blind spot.
- (b) probe present, new list: **fail**, `actual: [ 'src/payload/zz-motion-probe.ts' ]`.
- (c) probe removed, new list: **pass** on the real tree.
Each run under `resource-guard.py --max-gib 1.5 --node-old-space-mib 1024 --min-headroom-gib 10 --timeout 1200`, checkout-local `TMPDIR`; receipts `remaining=[]`.

## Acceptance 2 — living doc paths (met)
- `src/lib/payload/…` → `src/payload/…` (launch plan 201; ticket-account-planning 252, 254; blueprint 352, 354). `src/lib/migrations` → `src/payload/migrations` (policy drafts 104–111, 6 spans; To-Do 421).
- Blueprint: 18 absolute `<home>/Projects/sphmrs/…` links → repo-relative (`../../src/…`, `../To-Do%20List.md#…`).
- Scripted check of all 29 changed links/paths (anchors stripped, `%20` decoded, resolved from each doc's directory): 29 exist, 0 missing. Word-diff shows only path/link-target tokens changed; no wording.
- Not touched: bare `../../src/lib` spans in `commerce-policy-drafts.md` rows 104–111 (not `lib/payload`/`lib/migrations` references); `docs/To-Do List.md` lines 20, 46, 92 (historical absolute paths); `docs/qa/**`, `docs/archive/**`, `docs/.archived/**`.
- `git grep -nE "lib/payload|lib/migrations" -- docs/reference "docs/To-Do List.md"`: zero hits.

## Criterion 3 narrowing (coordinator decision, option A)
The coordinator accepted narrowing criterion 3 to: no `lib/payload` or `lib/migrations` in `docs/reference`, and no `/Users/` links in `unlock-integration-blueprint.md`. Both hold (0 hits each). The other external-checkout paths stay unedited; the custodian will raise them with the owner as a separate home-path cleanup.

Original finding: the literal grep
`git grep -nE "lib/payload|lib/migrations|/Users/" -- docs/reference` is not zero. Remaining `/Users/` hits are all external-checkout paths that no repo-relative link can resolve:
- non-owned: `benchmark-2026-10-03/local-source-inventory.md` (soph-co, ~44 lines), `integration-specification.md:7,525` (soph-co), `korean-copy-calibration.md:512` (`~/.codex/skills`);
- owned: `commerce-policy-drafts.md:78` (thehideaway checkout base path).
No `lib/payload`/`lib/migrations` hit remains. Left unedited pending coordinator decision.

## Checks
- Default suite `node tests/run-unit.mjs` (guard `--max-gib 1.5 --node-old-space-mib 1024 --timeout 1200`): 2888 tests, 2846 pass, 40 skipped, **2 fail** — the same two known owner-deferred suites (`deferred styling: article grid preserves its columns and readable type`, `deferred styling: verification loops, account indicators and toast avoid CSS clocks`). Receipt: exit=1, peak 997034688 bytes, `remaining=[]`.
- `git diff --check 7cb2574..HEAD`: clean.
- Remaining processes: none. Scratch (`.guard-tmp`, `node_modules` symlink) removed.
