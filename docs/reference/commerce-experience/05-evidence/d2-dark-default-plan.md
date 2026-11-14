# D2 · Dark by default: change plan (Gate 1, waiting on the owner)

Pipeline: `orch-change-feature` (behaviour that works, changed to a new spec). Prepared 2026-11-15 while the
owner was away; stops here at Gate 1. Nothing is implemented. Decision: ADR 0002 (dark until the visitor
picks; the device setting doesn't count).

**Tier: small-to-medium.** One decision, but the site runs three theme initialisers, so the change touches
four files and needs new tests (none exist for theme today).

## What the code does today (read 2026-11-15)

| Where | What it does on first visit (nothing saved) | Storage key |
| --- | --- | --- |
| `src/lib/content/theme.ts:9-19` `themeBoot` (inline script in `src/app/(site)/layout.tsx:41`) | Uses `prefers-color-scheme`; light device → light | `sophomores-theme` |
| `src/providers/MiddleMan.tsx:146-154` (mounted via `Providers`) | `getImplicitPreference() ?? defaultTheme`, then `saveTheme(...)`; then applies it to `<html>` after mount | `__RP__THEME__` (`src/providers/Theme/shared.ts:3`) |
| `src/providers/Theme/index.tsx:46` `clearSave` | Falls back to `getImplicitPreference()` | — |
| `src/components/shell/site-theme.tsx:12` | Device fallback, and `applyTheme` *saves* it, so a first visit records a choice the visitor never made | `sophomores-theme` |
| Header toggle `src/components/shell/header-panels.tsx:172` | `applyTheme(nextTheme(...))` | `sophomores-theme` |
| `src/providers/Theme/ThemeSelector/types.ts:3` | (Hideaway port) | `__RP_THEME__` |

Findings:
1. Three keys for one setting (`sophomores-theme`, `__RP__THEME__`, `__RP_THEME__`). A pick made with the header
   toggle is stored under one key; the provider reads another and, after mount, can re-apply the device
   setting over it. Not verified live; a browser check in the TDD step settles it.
2. `site-theme.tsx` appears unmounted (no `<SiteTheme` found). If so it's dead code; if it is mounted, it
   saves an implicit choice.
3. `defaultTheme` is already `'dark'` (`src/providers/Theme/shared.ts:5`); only the device fallback overrides it.
4. With JavaScript off or before the boot script runs, `<html>` has no `data-theme`, and the stock shadcn
   `:root` values are light.

## Changed-test plan (tests first)

New `tests/theme/` (node test runner, jsdom as other UI tests use):
1. Boot, nothing saved, device prefers light → `data-theme="dark"`, `.dark` on `<html>`.
2. Boot, saved `light` → light; saved `dark` → dark.
3. Boot, `localStorage` throws → dark.
4. Provider initialisation, nothing saved, device light → theme `dark`, and nothing is written to storage.
5. One storage key: a pick through the header toggle is read back by the boot script and by the provider.
6. Server render of the site layout: `<html>` carries `data-theme="dark"` (first paint and no-JS are dark).

## Implementation (after the tests fail for the right reason)

- `theme.ts` boot: drop the `matchMedia` branch; default and `catch` both set dark.
- `MiddleMan.tsx` / `Theme/index.tsx`: replace `getImplicitPreference() ?? default` with `defaultTheme`; don't
  `saveTheme` an implicit value; read the one key.
- One storage key for the site (proposal: keep `sophomores-theme`; read the two `__RP_*` keys once as a fallback
  so nobody's saved choice is lost, then write only the new key).
- Layout: render `<html data-theme="dark" className="dark …">` so first paint is dark.
- `site-theme.tsx`: delete if confirmed unmounted.

Then: guarded typecheck and the new tests; a live check in both modes (AGENTS.md: live render + Santa review
for UI changes); `code-reviewer`; Gate 2 before commit.

## Questions at Gate 1

1. Approve the plan as written?
2. One storage key `sophomores-theme`, migrating the old two: OK?
3. Delete `site-theme.tsx` if it's unmounted, or leave it?
