# Payload relocation — cycle-1 review rubric

Candidate: branch `codex/payload-relocation-20261114`, HEAD `90c5cf6` (code `7cc87fc`), base `d5a32e7`, worktree `orca/workspaces/sphmrs/payload-relocation-20261114`. Spec: `docs/qa/payload-relocation-20261114/spec.md`. Owner rules: AGENTS.md "Payload code placement" (on main, including the root-file exception).

Read-only review. Run no Node workloads; use git and file reads only.

PASS only if all hold; otherwise FAIL with file:line evidence.
1. Pure move: `src/lib/payload/**` → `src/payload/**` and `src/lib/migrations/**` → `src/payload/migrations/**` via renames; renamed-file edits are import/path strings only; no slug, field, export, migration-content or behaviour change.
2. Complete: no remaining references to `lib/payload` or `lib/migrations` in src/, tests/, scripts/, config, importMap.js or CSS `@source` lines; Payload component path strings in config match importMap keys exactly; `migrationDir` resolves to the moved directory and migrations/index.ts imports still resolve.
3. Scope: nothing outside the spec's owned paths changed except the handback and deployment/README.md path text; `src/payload.config.ts`, `src/payload-types.ts` and `src/payload-generated-schema.ts` stay at src root; no new files besides the handback.
4. Risk: identify anything that would break at runtime but not under tsc or unit tests (for example dynamic string paths, Next/Payload alias resolution, generated importMap regeneration producing different keys, Dockerfile/deployment COPY paths, test discovery globs).
Report: verdict, findings by severity (CRITICAL/HIGH/MEDIUM/LOW), each with evidence.
