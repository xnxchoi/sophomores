# SPH-PAYLOAD-RELOCATION-20261114-01 — move Payload code out of src/lib

Slug `payload-relocation-20261114`, branch `codex/payload-relocation-20261114`. Follow the
[batch shared rules](../batch-20261112/shared-rules.md), with these exceptions:

- Your identity base is **the main commit that adds this file**.
- Persist your handback as `docs/qa/payload-relocation-20261114/handback.md`.
- **Config exception:** you may edit `src/payload.config.ts`, `tsconfig.json` (only if a
  path alias needs it), `src/app/(payload)/admin/importMap.js` and the two scripts under
  `scripts/` that import Payload, strictly to update paths.
- Provider-free. No database, no `.env`, no installs.

**Owner rule (AGENTS.md, "Payload code placement", 2026-11-14):** pure Payload code lives
under `src/payload/`, never under `src/lib/`.

**Contract — a pure move, no behaviour change:**
1. `git mv src/lib/payload src/payload` (keep its internal structure:
   `admin/`, `collections/`, `configuration.ts`, `index.ts`, `payload-types.ts`).
2. `git mv src/lib/migrations src/payload/migrations`, and point `migrationDir` in
   `src/payload.config.ts` at it.
3. Update every import and reference (`@/lib/payload…`, relative `lib/payload`,
   `lib/migrations`) across `src/`, `tests/`, `scripts/`, `importMap.js`. Do not change
   any other code, export names, collection slugs, fields, migration contents or
   migration file names.
4. Leave `src/payload.config.ts`, `src/payload-types.ts` and
   `src/payload-generated-schema.ts` where they are.
5. Do not move `src/lib/commerce/**` or other domain modules, even where they register
   collections.

**Owned paths:** `src/lib/payload/**` → `src/payload/**`, `src/lib/migrations/**` →
`src/payload/migrations/**`, import lines in any file, the config files named above,
`docs/qa/payload-relocation-20261114/`.

## Acceptance

1. **Moved, not rewritten.** `git diff -M --stat` against the base shows every moved file
   as a 100% rename (or a rename whose only changes are import paths). No file is
   deleted or added outside the move.
2. **No stale references.** `git grep -nE "lib/payload|lib/migrations"` over `src/`,
   `tests/`, `scripts/`, config files and `importMap.js` returns zero hits.
3. **Still builds and passes.** A full typecheck on the exact final revision
   (`--max-gib 3.5 --node-old-space-mib 2048 --timeout 600`) passes, and the default
   suite shows only the 2 known failures.

**Gates:** the three checks above plus `git diff --check` clean. Commit as new commits,
then send one `worker_done`.
