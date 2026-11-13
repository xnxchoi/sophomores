# SPH-PAYLOAD-RELOCATION-FOLLOWUP-20261114-01 — motion scan and living doc paths

Slug `payload-relocation-followup-20261114`, branch `codex/payload-relocation-followup-20261114`. Follow the
[batch shared rules](../batch-20261112/shared-rules.md). Your identity base is **the main commit that adds this file**. Persist your handback as `docs/qa/payload-relocation-followup-20261114/handback.md`. Provider-free; no DB, `.env` or installs.

Owner request (2026-11-14): fix both LOW items left by the Payload relocation (integrated at `00d8e5a`).

**Owned paths:** `tests/motion/full-motion-policy.test.ts`; `docs/reference/commerce-launch-plan.md`, `docs/reference/commerce-policy-drafts.md`, `docs/reference/ticket-account-planning-20261110.md`, `docs/reference/unlock-integration-blueprint.md`; the live (non-historical) path mention at `docs/To-Do List.md:421`; this folder.

## Acceptance

1. **Motion scan covers Payload code.** `full-motion-policy.test.ts` scans `src/payload` in addition to its current list. It must be RED-then-GREEN: show it detects a reduced-motion pattern placed in a temporary file under `src/payload` (do not commit that file), then passes on the real tree.
2. **Living reference docs use current paths.** In the owned docs, every `src/lib/payload…` and `src/lib/migrations…` reference names the file's current location under `src/payload/…`. Check each target exists. Change path text and link targets only, no wording. Also convert the absolute `/Users/…/sphmrs/…` links in `unlock-integration-blueprint.md` to repo-relative links that resolve.
3. **History is left alone.** Do not edit `docs/qa/**`, `docs/archive/**` or `docs/.archived/**`; those are frozen evidence. `git grep -nE "lib/payload|lib/migrations|/Users/" -- docs/reference` returns zero hits.

**Gates:** the focused motion test RED/GREEN, then the default suite showing only the 2 known failures (`--max-gib 1.5 --node-old-space-mib 1024 --timeout 1200`), and `git diff --check` clean. Commit as new commits, then send one `worker_done`.
