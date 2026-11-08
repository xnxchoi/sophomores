# Tailwind component styling refactor — 2026-10-25

## Scope

Recorded the user policy in global `/Users/seanschoi/.codex/AGENTS.md` and the implementation repository `AGENTS.md`. Replaced interpolated className composition with inline `cn`, extracted reusable verification/account controls and a semantic `BrandMark`, and removed teaser utility-string arrays/constants in favor of components. This is a styling implementation refactor, not a visual redesign or authentication-flow change.

The new AST-based ESLint rule rejects direct interpolation/concatenation and stored local/imported class values, including common aliases/maps/arrays/composer calls. It allows component prop forwarding, necessary cva variants, generated font integration, and existing CSS-module member exports. It is a bounded syntax guard, not whole-program analysis of arbitrary helpers or prop spreads.

## Validation

- Canonical TypeScript: `pnpm exec tsc --noEmit --incremental false` passed.
- App/components and owned guard/test ESLint: no errors or policy findings; one unrelated unused className warning in `../../src/components`.
- Focused source/controller/render/policy tests: 174 passed.
- Guard coverage: 96.57% lines / 87.72% branches / 100% functions.
- Account primitive coverage: 98.31% lines / 94.74% branches / 100% functions.
- Canonical suite: 702 tests, 673 passed, 26 skipped, 3 failed. Remaining failures are the motion-policy scan of existing arc code, the older verification-study trigger expectation, and preview-auth build source expectations. Full suite is NOT green. Logs: `.output/tailwind-refactor-tests-final.log`.
- Fresh local Chromium smoke: 1280×900, 390×844, 319×560; chooser, email-first login, signup entry; zero page errors/API calls and no horizontal surface overflow. The browser test also compares pre-refactor and merged account-control computed colors; a merge-induced border change was corrected to preserve the old effective dark border.
- Parent inspected the actual live chooser/login and teaser in the in-app browser, and desktop/narrow screenshot captures. A preview-only stale Turbopack export cache after the `.ts`→`.tsx` brand module rename was resolved by restarting only the owned loopback preview; no source workaround or canonical cache clearing.

Browser harness: `tests/browser/tailwind-component-styling.spec.mjs`. Evidence: `artifacts/qa/verification-20261025/tailwind-components/`. Local preview remains `http://localhost:3217/studies/verification`.

## Explicit non-claims

No backend integration, provider actions, real authentication, physical haptics or Safari acceptance. The previously found tall-scrolled OTP→chooser reverse-scroll issue and revised Back/Cancel interaction model remain paused and are not accepted by this styling check. Other sessions' backend changes were not rewritten. No commit, push or deployment.

## Santa Method

One concise dual-independent Santa review completed: both reviewers PASS. Each independently inspected desktop/narrow captures and checked policy, component semantics, visual preservation, and bounded acceptance claims. No blockers. This verdict applies only to the styling refactor, not the paused authentication behavior.
