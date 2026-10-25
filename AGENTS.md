<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Hard rule: Tailwind-only UI styling

## User rules: motion and completion
- Full motion is the current default. Do not add reduced-motion preference gates, alternate reduced-motion paths, or motion opt-outs unless the user explicitly requests an exception or revisits this policy.
- For UI/styling work, inspect the actual live render in a browser at least once, then run one harsh but concise Santa Method review. Only report completion after the live review passes. Tests and source inspection alone are not visual acceptance.

## Styling implementation

### Brand and interaction direction
- All visual Sophomores brand marks use the dedicated `BrandMark` component and approved Helvetica typography. Apply the Brand wordmark integrity rules below; shared font alone does not establish visual consistency.
- Verification and login use a neutral monochrome palette, including focus, waiting, copy feedback and checkbox accents; no green.
- Prevent abrupt layout jumps, not intentional reflow: accordions must genuinely collapse and reclaim their space. Do not retain expanded-height empty slots. Use content-sized, anchored surfaces and ease intentional size changes; reserve only compact space for predictable label/validation swaps.
- Before redesigning, inspect concrete live references and their relevant interactions. Use the approved Family tray / Vaul direction for phone verification rather than inventing unrelated treatments.
- Authentication begins with a compact, dismissible Log in / Sign up chooser. Selecting a flow morphs the same Vaul surface into a slightly wider, centered, focused modal: no swipe, backdrop, Escape or close-button dismissal, and the handle fades away. Cancel reverses the morph into the compact chooser, which remains open and dismissible; cancelling a focused flow must not close the entire authentication surface. Keep customer login passwordless and distinct from preview-admin credentials; OTP/backend ownership is separate from shell styling.
- Flat design is welcome where the surface is meant to be flat. Floating or layered surfaces should communicate restrained depth consistently; avoid exaggerated dimensions or adding glass/blur everywhere.

- Use Tailwind utility classes for all new or modified component and page styling.
- Do not create custom CSS classes/selectors, CSS Modules, CSS-in-JS, or handwritten component stylesheets. Existing custom CSS is legacy, not permission to add more.
- Use Tailwind arbitrary values and variants when standard utilities are insufficient. Compose utilities with existing `cn`/`cva` helpers rather than introducing custom class names.
- Shared design tokens, Tailwind theme configuration, and necessary global base styles belong in the existing global/theme layer; they must not become a workaround for custom component classes.
- When changing existing UI, express the changed styling in Tailwind rather than extending legacy custom CSS. Do not perform unrelated stylesheet migrations without approval.
- Exceptions require explicit user approval. This rule applies to every contributor and delegated agent.

## React styling in Tailwind projects
- Never use `${}` template interpolation to construct `className` styles, including interpolation inside `cn`. Keep complete class names inline and compose conditional styles with `cn`.
- Never extract or store `className` strings, arrays, maps, or composed class values in variables/constants for reuse. Extract and reuse React components instead; component `className` props may be forwarded and merged inline with `cn`.
- Strongly prefer reusable components for shared styling and states. Use `cva` only when variants genuinely need it; it is not the default substitute for component composition.

## Brand wordmark integrity
- Never render the brand wordmark as ad hoc text. Use the existing dedicated wordmark component; if none exists, create one before using the mark.
- The wordmark must retain identical typography, layout, color, proportions, and spacing across uses. Variants must preserve that identity rather than introduce independent local styling.
- Before creating or modifying a wordmark/component/variant, compare it against the approved mark. If any visual characteristic would differ, explicitly confirm the difference with the user before proceeding. Do not silently normalize existing differing marks or invent a new canonical treatment.

## React/Next.js: library-first helpers (mandatory)

**NEVER MAKE WHAT ALREADY EXISTS.** This applies to every React/Next.js project, especially React animations and WebGL.

Before creating or extracting any reusable function, pass this gate in order:
1. Inspect the repo's installed packages and their actual versions. Look up the relevant current API documentation (Context7 first; installed package docs/source when needed). If a reputable, well-known installed library can achieve the result with less than 15% difference in output **and** efficiency, use it directly. Do not write a parallel implementation or a wrapper that merely renames it. Do not install another package without approval.
2. Search the existing utilities directory and relevant internal modules for an equivalent or sufficiently similar helper. Reuse or consolidate it instead of adding another copy.
3. Only if neither an installed library nor an internal helper can meet the requirement may a custom helper be created. Briefly record the checked candidates and the concrete output, performance, runtime, or boundary mismatch in the implementation notes/tests. Do not invent numerical parity or performance claims: use representative comparisons where the difference is uncertain.

**Placement is based on genuinely different use cases, not reuse count alone.** Custom helpers stay colocated with their owning feature/component by default. Move a custom helper into shared utilities only when it is actually used in multiple places serving completely different use cases. Multiple variants, studies, renderers, or implementations of the same feature do **not** qualify. Do not manufacture extra consumers to justify extraction.

For helpers that qualify, use `src/utils/` when the project actually uses `src/`; otherwise use repo-root `utils/`. Organize by scope: broadly applicable helpers near the root and granular helpers in nested directories. Before creating any helper, check installed packages/documentation and search existing utilities plus the owning feature for a similar implementation. Reuse library equivalents directly whether the use is local or shared.

React components, hooks, and framework-required entrypoints remain in their appropriate locations. Component-bound lifecycle/event closures remain local; extract their computations only when they meet the distinct-use-case rule above. Keep server-only helpers separated from browser utilities; avoid barrels that pull server or heavyweight graphics code into unrelated client bundles. Native GLSL built-ins such as `smoothstep` are already library/runtime reuse and must not be reimplemented in JavaScript. Preserve behavior with characterization/parity tests and live visual checks when refactoring animation or WebGL.

### React module and test-file integrity
- Shared `utils/` contains only non-React helpers/data modules (normally `.ts`), never components, hooks, or functions whose purpose is to return/render a `ReactNode`. Being non-React alone does not qualify code as shared: the distinct-use-case gate above still applies.
- Component directories should contain actual React-bound component code, not pure `.ts` helper/config/renderer modules. Collapse small single-owner logic into its real component, delete redundant code, or place cohesive feature-only modules at their actual nearest owning scope rather than falsely promoting them to shared utilities or funneling them into `lib/`. Keep standalone hooks with their real owner; use a shared hooks scope only when actual consumers justify it. Retain a `.ts` file in a component directory only when an actual technical requirement makes it necessary; state that reason. Small sibling-shared pure modules may live in explicitly scoped feature-private folders such as `_shared/` when this avoids moving them above their actual owners or importing values through React component modules. This is a narrow documented exception, not a generic helper dump.
- A `.tsx` file must contain actual React-bound code: a component, hook integration, or equivalent React behavior. Do not cosmetically rename a pure `.ts` file, add a token React import, or manufacture a wrapper to satisfy this rule. Import library APIs directly instead of retaining unused re-export façades.
- All tests, test-only fixtures, snapshots, and mocks belong under repo-root `tests/`, grouped by feature/scope. Never colocate them with components or any production code. Update test discovery/imports when moving tests; do not silently stop running them. Do not rewrite archived deployment snapshots as active source.

### Modular directory structure
Use actual production import sites to choose the lowest sensible shared ownership scope (for example, callers at `a/b/c/d/qq.tsx` and `a/b/c/x/tt.tsx` suggest `a/b/c/`). Tests, mocks, and archived implementations do not pull production code toward the root. This is a general heuristic, not a rigid boundary: preserve cohesive modules, technical requirements, best practices, and current official framework guidance (including Next.js routing/colocation). Do not use `lib/`, `utils/`, `hooks/`, or a renamed catch-all as a dumping ground. Check the import graph before moving code; prefer local ownership over artificial layers.

Group, position, and nest code by scope and use. Do not create single-depth catch-all directories mixing unrelated domains or dumping every helper/component into one flat list. Broad shared code stays at an appropriately broad level; feature-specific code, hooks, tests, and fixtures live in cohesive nested feature/domain directories. Prefer the repo's existing structure over introducing a competing hierarchy, and avoid meaningless single-file nesting or re-export chains.

<!-- BEGIN:nextjs-agent-upgrade -->

## Next.js upgrade reminders

Upgrade reminders emitted by this project's installed Next.js CLI during `next dev` or `next build` are part of the `experimental.agentUpgrade` workflow. Follow these reminders' instructions while respecting user instructions declining upgrades.

<!-- END:nextjs-agent-upgrade -->
