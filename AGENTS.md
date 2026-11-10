<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Hard rule: Tailwind-only UI styling

## Local workload safety

- Agent-started dev servers, builds, typechecks and Node test runs must use
  `scripts/resource-guard.py`. Use `pnpm dev`, `pnpm build:guarded`,
  `pnpm typecheck:guarded`, `pnpm test:guarded`, or wrap a focused command directly.
  Never bypass a resource stop by relaunching the same work unguarded or raising
  its limit without diagnosing the stop. Plain build/typecheck/test entrypoints
  remain compatible with the separately constrained deployment container; they
  are not the local agent workflow.
- Only one guarded workload may run per checkout. Stop the owned preview before
  tests/typechecking. Keep at least 10 GiB of system headroom; current local
  defaults are 4 GiB for checks and 6 GiB for dev/build, below the user's 15 GiB
  aggregate ceiling. Browser/MCP/container memory is outside the child process
  group: account for it separately and do not start extra browser instances or
  concurrent agent workloads to bypass the lock.
- Completed agents can leave MCP/repl servers alive outside the job supervisor.
  Audit the full Codex CLI descendant tree after delegation, not just the preview
  and browser. Reuse agents where practical and retire only verified idle,
  agent-owned duplicates; preserve active tool connections and user applications.
  Follow-up turns can recreate tool clients even on a reused agent: budget for
  that overhead and re-audit after follow-ups, before launching the preview.
  A job's own receipt does not establish whole-chat memory compliance.
- The supervisor samples aggregate RSS and macOS physical footprint (including
  compressed memory), with timeout/output bounds and TERM/KILL cleanup. It is
  not a kernel-enforced quota; read its receipt, including remaining PIDs, after
  any failure. Never claim a heap limit or a successful launch proves safety.
- DOM identity/absence assertions must compare booleans, not pass DOM objects to
  equality diagnostics. Do not dump entire DOM, React, tool-result or process
  objects into failure logs or chat. Keep tool output bounded.

## Canonical UI copy and Korean authoring policy

- New or relocated first-party interface copy belongs in `messages/en.json` and
  is consumed through next-intl. Do not add another local English copy catalogue.
- Leave `messages/ko.json` byte-for-byte unchanged unless the owner explicitly
  requests translation. Never auto-fill, format, replace or overwrite its empty
  strings. Korean may be partial; missing Korean keys use English fallback.
- Do not automatically translate names, titles or functional labels into Korean.
  Landing/editorial/Payload-managed content stays with its existing content owner.
- Empty-Korean-output fallback is a separate owner-activated breakpoint, not an
  automatic migration step. See `docs/reference/i18n-consolidation-plan.md`.

## Brand voice and copy

- Before drafting or adapting Sophomores copy, read [the identity document](docs/design/identity.md) and [the working brand-voice guide](docs/design/brand-voice.md). The guide distinguishes its agreed core from proposed applications and examples. The [source analysis](docs/design/brand-voice-analysis.md) is supporting material, not the voice specification. These references do not approve changes to or publication of existing pages.

## User rules: motion and completion
- Full motion is the current default. Do not add reduced-motion preference gates, alternate reduced-motion paths, or motion opt-outs unless the user explicitly requests an exception or revisits this policy.
- For UI/styling work, inspect the actual live render in a browser at least once, then run one harsh but concise Santa Method review. Only report completion after the live review passes. Tests and source inspection alone are not visual acceptance.

## Styling implementation

### Shared interaction rules
- These are Sophomores design defaults, not claims of universal Apple rules. Judge the complete composition and test actual usability; deliberate exceptions must retain clear, usable controls.
- Prefer the left for close, cancel, and backward actions on mobile and desktop. When backward and forward actions share a row, place the forward action on the right. A full-width primary action can remain full-width; do not shrink it just to enforce that pairing.
- Design touch/coarse-pointer controls around generous hit areas: at least 44 × 44 CSS pixels, preferably 48 × 48. The visible icon may be smaller. Size and space the surrounding content around those targets; do not simply shrink desktop controls to fit a smaller viewport or scale controls inversely with viewport width.
- Adapt surface dimensions, silhouette, motion direction, and travel to both available space and input precision. A phone sheet is not merely a reduced desktop modal; narrow fine-pointer windows are not automatically touch layouts.
- Choose surfaces by task as well as device: alerts handle concise decisions, sheets or dialogs can host richer or multi-step work, and action sheets present a focused set of choices. Do not treat these as rigid desktop/mobile equivalents.
- Separate dismissing a surface from discarding work, signing out, or canceling the underlying task. Preserve relevant caller state and make reopening discoverable. Request confirmation for genuinely destructive or irreversible effects, including discarding unsaved work, not for routine nondestructive dismissal.
- A resumable sheet may collapse into a visible, nonblocking peek when its context remains relevant. The collapsed state must leave the caller usable, expose an understandable reopening control, and retire when its context ends. This is a context-dependent pattern, not a requirement for every sheet or permission to reopen it on every render.
- Do not assume every sheet needs both a grabber and an ×. If an explicit close control is present, prefer the left; remove it only after a complete dismissal/reopening alternative is usable by touch, keyboard, and assistive technology and has been tested. Keep the current authentication dismissal contract until that replacement is validated; do not infer an exact grabber position from unresolved feedback.
- Give each state change one coherent motion: use one beat for simple changes and up to two purposeful stages for larger changes as a choreography heuristic. Expansion reveals or deepens; contraction summarizes, returns, or closes. Coordinate changing axes without shrink–pause–grow sequences or transient empty collapse, and preserve the improved easing.
- Distinguish actions from navigation: in-place refresh/retry uses a button or refresh icon, not an underlined navigation-link treatment. Keep busy feedback in the same space, disable repeated requests while pending, and show the result inline without an extra modal or explanation. This is interaction direction, not evidence that backend behavior has been verified.
- Reserve compact, stable slots for predictable short status or label swaps and keep interaction targets anchored. Genuinely longer content may reflow through one coordinated transition; do not reserve a giant empty box, and let irrelevant sections collapse and reclaim their space.

### Brand and interaction direction

- Ticket purchasing is a contextual exception to the standalone auth surface:
  account entry and registration are inline steps of purchase, not a separate
  registration gateway, chooser, dialog or sheet. Start with email or Google;
  look up a complete email before verification and offer sign-in or account
  creation/Google accordingly (explicit user-approved account-existence
  disclosure). Return no profile, membership or role data; enforce server lookup
  rate limits. Sending a code always needs a separate explicit button press.
  Request only missing setup after proof, then reveal tickets after fresh
  authoritative member status. Never send codes while typing or looking up. Keep
  standalone account login/signup and staff surfaces' existing contracts.
- All visual Sophomores brand marks use the dedicated `BrandMark` component and approved Helvetica typography. Apply the Brand wordmark integrity rules below; shared font alone does not establish visual consistency.
- Verification and login use a neutral monochrome palette, including focus, waiting, copy feedback and checkbox accents; no green.
- Prevent abrupt layout jumps, not intentional reflow: accordions must genuinely collapse and reclaim their space. Do not retain expanded-height empty slots. Use content-sized, anchored surfaces and ease intentional size changes; reserve only compact space for predictable label/validation swaps.
- Before redesigning, inspect concrete live references and their relevant interactions. Use the approved Family tray / Vaul direction for phone verification rather than inventing unrelated treatments.
- Authentication begins with a compact, dismissible Log in / Sign up chooser. Selecting a flow keeps the same Vaul surface: horizontally anchored with constant width and radius on phone-sized touch viewports, and slightly wider and centered on desktop, including narrow fine-pointer windows. Mobile keeps its usable swipe handle; swipe down and the focused × dismiss directly to the caller without signing out or resetting the caller’s selection. Upward drag never confirms an action; explicit buttons confirm. Focused backdrop and Escape dismissal remain blocked. Focused desktop flows also block swipe and hide the handle; desktop Cancel returns anonymous or unknown users to the compact chooser, while a known signed-in account closes directly to its caller without an extra exit prompt or sign-out. Preserve caller selection and return focus. Vaul alone owns shell movement; mobile phases use restrained fades without stacked vertical/blur entrances. Keep customer login passwordless and distinct from preview-admin credentials; OTP/backend ownership is separate from shell styling.
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

For helpers that qualify, use `src/utils/` when the project actually uses `src/`; otherwise use repo-root `src/utils`. Organize by scope: broadly applicable helpers near the root and granular helpers in nested directories. Before creating any helper, check installed packages/documentation and search existing utilities plus the owning feature for a similar implementation. Reuse library equivalents directly whether the use is local or shared.

React components, hooks, and framework-required entrypoints remain in their appropriate locations. Component-bound lifecycle/event closures remain local; extract their computations only when they meet the distinct-use-case rule above. Keep server-only helpers separated from browser utilities; avoid barrels that pull server or heavyweight graphics code into unrelated client bundles. Native GLSL built-ins such as `smoothstep` are already library/runtime reuse and must not be reimplemented in JavaScript. Preserve behavior with characterization/parity tests and live visual checks when refactoring animation or WebGL.

### React module and test-file integrity
- Shared `src/utils` contains only non-React helpers/data modules (normally `.ts`), never components, hooks, or functions whose purpose is to return/render a `ReactNode`. Being non-React alone does not qualify code as shared: the distinct-use-case gate above still applies.
- Component directories should contain actual React-bound component code, not pure `.ts` helper/config/renderer modules. Collapse small single-owner logic into its real component, delete redundant code, or place cohesive feature-only modules at their actual nearest owning scope rather than falsely promoting them to shared utilities or funneling them into `src/lib`. Keep standalone hooks with their real owner; use a shared hooks scope only when actual consumers justify it. Retain a `.ts` file in a component directory only when an actual technical requirement makes it necessary; state that reason. Small sibling-shared pure modules may live in explicitly scoped feature-private folders such as `_shared/` when this avoids moving them above their actual owners or importing values through React component modules. This is a narrow documented exception, not a generic helper dump.
- A `.tsx` file must contain actual React-bound code: a component, hook integration, or equivalent React behavior. Do not cosmetically rename a pure `.ts` file, add a token React import, or manufacture a wrapper to satisfy this rule. Import library APIs directly instead of retaining unused re-export façades.
- All tests, test-only fixtures, snapshots, and mocks belong under repo-root `tests/`, grouped by feature/scope. Never colocate them with components or any production code. Update test discovery/imports when moving tests; do not silently stop running them. Do not rewrite archived deployment snapshots as active source.

### Modular directory structure
Use actual production import sites to choose the lowest sensible shared ownership scope (for example, callers at `a/b/c/d/qq.tsx` and `a/b/c/x/tt.tsx` suggest `a/b/c/`). Tests, mocks, and archived implementations do not pull production code toward the root. This is a general heuristic, not a rigid boundary: preserve cohesive modules, technical requirements, best practices, and current official framework guidance (including Next.js routing/colocation). Do not use `src/lib`, `src/utils`, `src/hooks`, or a renamed catch-all as a dumping ground. Check the import graph before moving code; prefer local ownership over artificial layers.

Group, position, and nest code by scope and use. Do not create single-depth catch-all directories mixing unrelated domains or dumping every helper/component into one flat list. Broad shared code stays at an appropriately broad level; feature-specific code, hooks, tests, and fixtures live in cohesive nested feature/domain directories. Prefer the repo's existing structure over introducing a competing hierarchy, and avoid meaningless single-file nesting or re-export chains.

<!-- BEGIN:nextjs-agent-upgrade -->

## Next.js upgrade reminders

Upgrade reminders emitted by this project's installed Next.js CLI during `next dev` or `next build` are part of the `experimental.agentUpgrade` workflow. Follow these reminders' instructions while respecting user instructions declining upgrades.

<!-- END:nextjs-agent-upgrade -->
