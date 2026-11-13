# Handback — SPH-PAYLOAD-RELOCATION-20261114-01

**State: candidate (all gates met).** Not merged, pushed or archived.

- Path: `/Users/seanschoi/orca/workspaces/sphmrs/payload-relocation-20261114`
- Branch: `codex/payload-relocation-20261114` (renamed first action from the Orca-created `xnxchoi/payload-relocation-20261114`)
- Identity base: `d5a32e7` (main commit adding the spec). Clean tree at start.
- Code commit (the revision checked below): `7cc87fc8cc5c65627cae1bac3a616e933cc59735`. A following docs-only commit adds this file; `src/`, `tests/`, `scripts/` are identical between the two.
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
- Only `tsc` and the default suite were run; `next build`, the Payload CLI (`generate:importmap`/`migrate`) and DB-backed tests were not (provider-free assignment). Payload resolves `importMap` component paths against `baseDir` = `src`, so the `/payload/admin/…` keys should match a regenerated map; that was not regenerated here.
- `scripts/member-auth-preview.ts` symlinks a root `migrations` entry; unrelated (no root `migrations` dir) and left as is.
- Historical `docs/` files still mention the old paths by design (history); `AGENTS.md` mentions them only in the rule text.
- Checkout-local scratch (`.tmp-guard*`, untracked) removed; `node_modules` is a gitignored symlink to the main checkout per shared rules. No remaining processes.
