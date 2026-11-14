# Handback — SPH-PAYLOAD-RELOCATION-20261114-01

**State: candidate (all gates met).** Not merged, pushed or archived.

- Path: `orca/workspaces/sphmrs/payload-relocation-20261114`
- Branch: `codex/payload-relocation-20261114` (renamed first action from the Orca-created `xnxchoi/payload-relocation-20261114`)
- Identity base: `d5a32e7` (main commit adding the spec). Clean tree at start.
- Initial code commit: `7cc87fc8cc5c65627cae1bac3a616e933cc59735` (original checks below). Rework 1 code commit: `caa5f8b52cae0fb7256657300a860e1a4d16f4b3` (checks in Rework 1). Docs-only commits add/update this file; `src/`, `tests/`, `scripts/` do not change in them.
- Diff identity (`git diff -M d5a32e7 7cc87fc | git patch-id --stable`): `da84608376bbd4d7de9b2cb3394e18dbf082e3a5`

## What changed
- `git mv src/lib/payload src/payload` and `git mv src/lib/migrations src/payload/migrations`; internal structure untouched.
- `src/payload.config.ts`: `migrationDir` → `./payload/migrations`, collection/plugin imports → `@/payload/…`.
- Updated imports (`@/lib/payload`, `@/lib/migrations`, relative forms) across `src/`, `tests/`, `scripts/` (two seed scripts).
- Relative specifiers inside moved files that climb out of the tree re-pointed by recomputing against the new location (19× `messages/en.json`, 1× `member-auth/recovery/contracts`).
- `src/app/(payload)/admin/importMap.js`: import lines and component-path keys (`/payload/admin/…`; `baseDir` is `src`). Component path strings in `staff-login-plugin.ts` and `account-recovery-requests/index.ts` updated to match.
- `src/styles/staff-login.css` `@source` entries re-pointed (Tailwind source discovery; path-only).
- Path-asserting tests updated (`tests/architecture/src-relocation.test.ts`, `source-ownership-core.test.ts`, plus path strings in commerce/i18n/member-auth/payload/tickets tests). One test title changed ("…under src/lib…" → "…under src/payload…").
- `deployment/README.md` line 168: path text only.
- Not touched: `src/payload.config.ts` location, `src/payload-types.ts`, `src/payload-generated-schema.ts`, `src/lib/commerce/**`, `tsconfig.json` (no alias needed), `package.json`, migration contents/names, collection slugs, export names.

## Acceptance
1. **Moved, not rewritten — met.** `git diff -M --name-status d5a32e7 HEAD`: 56 renames (34 at R100; 22 at R087–R099, each changed only by import/path strings), 66 modifications, **0 added, 0 deleted**.
2. **No stale references — met.** `git grep -nE "lib/payload|lib/migrations"` over `src/ tests/ scripts/`, `src/payload.config.ts`, `tsconfig.json`, `importMap.js` (and all other tracked non-docs files except `AGENTS.md`'s rule text and historical `docs/`): 0 hits. `src/lib/payload` and `src/lib/migrations` no longer exist.
3. **Builds and passes — met.** On the code commit, via `scripts/resource-guard.py`:
   - Typecheck `--max-gib 3.5 --node-old-space-mib 2048 --timeout 600 -- tsc --noEmit`: exit 0, peak 1.32 GiB, no remaining PIDs.
   - Default suite `node tests/run-unit.mjs`: 2885 tests, 2843 pass, 40 skipped, **2 fail** — both the known owner-deferred suites (`deferred styling: article grid preserves its columns and readable type`, `deferred styling: verification loops, account indicators and toast avoid CSS clocks`; baseline in `docs/qa/handoff-prep-20261112/tests-baseline-20261112/`).
   - A first run before the two path-asserting regex tests were updated showed 4 failures (the 2 above plus those 2 stale-path assertions); fixed and re-run as above.
- `git diff --check`: clean.

## Notes / not done
- Only `tsc` and the default suite were run; `next build`, the Payload CLI (`generate:importmap`/`migrate`) and DB-backed tests were not (provider-free assignment). The import map was edited by hand, not regenerated; its identifiers were corrected in Rework 1.
- `scripts/member-auth-preview.ts` symlinks a root `migrations` entry; unrelated (no root `migrations` dir) and left as is.
- Historical `docs/` files still mention the old paths by design (history); `AGENTS.md` mentions them only in the rule text.
- Checkout-local scratch (`.tmp-guard*`, untracked) removed; `node_modules` is a gitignored symlink to the main checkout per shared rules. No remaining processes.

## Rework 1 (review: 1 MEDIUM, 1 LOW) — commit `caa5f8b52cae0fb7256657300a860e1a4d16f4b3`
- **MEDIUM — import map identifiers.** `src/app/(payload)/admin/importMap.js` identifiers still carried md5 of the old component paths. Payload names them `exportName + "_" + md5(componentPath)` (`addPayloadComponentToImportMap.js`); the formula reproduced the three old suffixes exactly before recomputing. Renamed every identifier (import line and map value, 10 lines):
  - `@/payload/admin/commerce/fields` → `46effbc591fa0c531a7ccfee04875f68` (3 exports)
  - `/payload/admin/staff-login` → `9a39adf6add60930597911470526cb32`
  - `/payload/admin/recovery-review` → `7a8e88e8275437e48a4acdac971a3b0d`
  - Payload CLI not run.
- **Drift test:** `tests/payload/import-map-identifiers.test.ts` (auto-discovered) recomputes md5 of every key's component path and asserts the identifier suffix, that each identifier is imported exactly once under that name, and that no key references the retired `lib/payload`/`lib/migrations` location. 3 tests, pass (covers package-path entries too).
- **LOW — living docs** (path text only, `src/lib/migrations` → `src/payload/migrations`): `docs/CODEMAPS/backend.md`, `docs/CODEMAPS/data.md`, `docs/port-status.md`, `docs/deployment/member-auth.local.md`. Historical `docs/qa` and `docs/To-Do List.md` untouched. Other docs still naming the old paths and left alone as out of the stated list: `docs/reference/{commerce-launch-plan,commerce-policy-drafts,ticket-account-planning-20261110,unlock-integration-blueprint}.md`, `docs/archive/**`, `docs/.archived/plan.md`.
- **Checks on `caa5f8b`** (resource-guard, same limits): typecheck `--max-gib 3.5 --node-old-space-mib 2048 --timeout 600` exit 0, peak 1.32 GiB; default suite 2888 tests, 2846 pass, 40 skipped, **2 fail** — the same two known deferred-styling suites. `git diff --check` clean. No remaining processes; scratch removed.
