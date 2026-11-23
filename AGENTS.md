<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Hard rule: Tailwind-only UI styling

## Owner delivery policy (2026-11-18)

[ADR-0015](docs/adr/0015-autonomous-page-first-ecommerce-delivery.md) is accepted
from direct owner direction, relayed in `msg_d3f32ec4ed98`. It supersedes earlier
TDD/coverage/test-only, blanket isolation and project-level proposal-approval holds.

- Deliver coherent pages and complete customer journeys autonomously through
  existing owners, using established installed/native facilities. Show imperfect
  current work early; retain the entire functional site/commerce programme.
- Tests NEVER affect progress. Failed, no-op, partial or unrun tests do not halt
  implementation or force retries. Check at completed-page/whole-flow milestones;
  use granular diagnostics only where unfamiliar/custom behavior makes them
  useful. No synthetic RED-first, every-suite GREEN, coverage quota, test-only
  review or retry-until-green requirement applies.
- Councils are strongly recommended, NOT mandatory, only for choices that would
  otherwise have required explicit owner approval. They are not all-the-time
  tools or prerequisites for routine work, ordinary ambiguity, checks, fixes or
  retries. Choose the fitting direction, record consequential decisions once,
  and execute without another project-level owner draft-approval loop.
- Remove blanket production-isolation and project-level approval holds. Use the
  most fitting working environment; do not touch production or trigger real
  charges/messages/destructive actions merely to display a page. Apply any
  higher-priority/platform action-time confirmation only when concretely relevant;
  this ADR cannot manufacture consent or override those requirements.
- Preserve owner product/scope decisions, actual single-owner responsibilities,
  48 GiB host accounting, <=15 GiB project aggregate and >=10 GiB system headroom.
  Use a measured fitting allocation; a previous 2 GiB preview slot is not an
  owner hard limit. No competing preview or unowned process cleanup follows.
- Keep failed/no-op/unrun evidence and distinguish implemented, visibly exercised
  and unresolved behavior. Actual broken journeys inform repair without freezing
  unrelated work. Source review/council/ADR is not owner/live/provider acceptance.

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
  defaults are 4 GiB for checks, 6 GiB for dev and 8 GiB for builds, below the user's 15 GiB
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

## Database: Payload-native first for operations (owner rule, 2026-11-13)

- **Scope.** This rule applies at the operational level: one-off "tweak this quickly" changes to the data or tables Payload uses, such as editing, adding or deleting rows by hand, ad hoc table or column changes, or bolting on a table to get something working.
- **The rule.** Do not make such changes directly in the database. First exhaust every Payload-native method, workaround or temporary fix:
  - the Local API with the owning `req`;
  - admin or config changes;
  - hooks;
  - adapter options;
  - seed scripts.
- **Out of scope.** Deliberate schema-level design is fine: proposed tables, fields, migrations and the schema-freeze migration. Stable, consistent hooks are also fine.
- **Last resort.** If an operational direct change is still unavoidable, record every native attempt that failed and why, and the exact statement. Choose the fitting environment under ADR-0015 rather than imposing a blanket production-isolation or project-level approval hold; retain concretely applicable higher-priority/platform action-time requirements.

## Payload editing for business-supplied content (owner rule, 2026-11-19)

> all the stuff that must be provided by us - the business- should be wired to Payloadcms for convenient editing.

## Payload code placement (owner rule, 2026-11-14)

- Pure Payload code (collections, globals, access, admin components, Payload configuration helpers and migrations) lives under `src/payload/`, never under `src/lib/`.
- `src/lib/` holds domain and application logic. Domain modules may import Payload collections, but must not define them.
- New collections and migrations go under `src/payload/`. Do not add Payload files under `src/lib/payload` or `src/lib/migrations`.
- `src/payload.config.ts`, `src/payload-types.ts` and `src/payload-generated-schema.ts` stay at the `src/` root. They define Payload's shape and form, so they sit above `src/payload/`, not inside it.

## Auth, payment and token mechanisms: one owner (owner rule, 2026-11-14; branch retired 2026-11-23)

- **Mechanism work starts from `main`.** All work on *how* authentication, phone verification, payment/checkout, Unlock token keys, NFC activation/check-in and guest invites work starts from `main`, in its own worktree. The `codex/auth-payment-nfc` branch was retired on 2026-11-23 (owner). The plan is `docs/qa/auth-payment-nfc/consolidation.md` on `main`; that document supersedes the earlier scattered plans.
- **Owned paths.** `src/lib/{member-auth,phone-verification,auth,commerce,tickets,invitation}`, `src/lib/{authentication-entry,passwordless-login}.ts`; `src/payload/collections/{commerce-*,orders}` and the auth/membership fields of `users`, plus their migrations; `src/app/api/{auth,member,phone-verification}`, `src/app/(auth)`; the purchase steps `src/app/(site)/{tickets/payment,shop/payment,shop/orders,shop/invitations,account/continue}`; `src/components/{Authentication,auth,commerce,tickets}`; and the matching tests. The interface pieces that depend on a mechanism (sign-in sheet, checkout step, key status) are edited in that mechanism work too.
- **Every other branch builds pages, not mechanisms.** Pages depend only on states: signed out / signed in and membership status; not purchased / pending / paid / failed; no key / key issued / activated / checked in. Read them through the existing server helpers. Do not edit owned paths or call providers. If a page needs a new state, record it as a request in the consolidation document.
- **Flow.** Reviewed, finished mechanism slices land on `main` through its single writer (see "One writer per checkout").

## Branch lifecycle (owner rule, 2026-11-14)

- **Close a branch as soon as its scope is finished.** When the agent won't be recalled, review the branch, merge it into its target (`main`), then immediately delete the branch and its worktree. Archive any uncommitted files first. Report the merge and the deletion in the same update. No separate approval is needed; ask the owner only when the branch conflicts with one of their decisions.
- **Delete stale branches on sight**, after bundling them to an archive outside the repo. A branch is stale when it adds nothing to its target (`git merge-tree --write-tree <target> <branch>` returns the target's own tree), or when an owner decision has superseded it.
- **Leave active branches alone.** A branch is active when a live worker or owner session is using it.
- **Reconcile by content, not by age.** Compare each branch with the current target, not with other branches. Resolve conflicts against the owner's decision ledger in the consolidated plan:
    - an explicit owner decision wins;
    - between two explicit owner decisions, the later one wins;
    - anything an agent wrote yields to the owner's decision;
    - a conflict between claims the owner never decided goes to the owner.
- **Never merge a branch that carries history from before the 2026-11-14 rewrite.** Cherry-pick its unique commits onto the target instead.

## One writer per checkout (owner rule, 2026-11-16)

- **Claude writes; Codex reviews (owner rule, 2026-11-21).** Owner, verbatim: "all lanes, Claude only writes files". In every lane only Claude sessions write files. Codex sessions may read and review, and report by message only. Lanes use `/ecc:multi-workflow`: Antigravity advises on frontend, Codex advises on backend and reviews, and Claude writes (owner, 21 Nov, verbatim: "Okay, Claude writing with multi-workflow is better.").
- **`main` has one owner session.** `main`'s single writer is a Claude Maintenance session (owner, 2026-11-21). Only that session commits, merges and pushes `main` in `~/Projects/sphmrs`; the coordinator `run:run_bbf9450ca334` owns scheduling and cross-session decisions and remains read-only on main. Every other session sends it what it needs (a merge, a docs sync, a push) and does not commit to or push `main` itself. That session is also the only writer of the plan, `docs/qa/auth-payment-nfc/consolidation.md`; the live doc was retired on 2026-11-17.
- **One session per worktree.** A worktree belongs to the live session working in it. Another session that needs changes there asks that owner, or works in its own worktree. Never edit, commit in, or start or stop a preview in a worktree another live session owns.
- **Port 3000 and the browser are shared: take turns.** The preview's port comes from the sign-in origin (`scripts/member-auth-preview.ts`), so previews don't move to other ports. Before starting one, check who holds :3000 (`lsof -iTCP:3000 -sTCP:LISTEN`). If another session's preview holds it, ask that session; never stop it yourself. Only one session drives the DevTools browser at a time; close your pages when done.
- **Send requests to a durable mailbox.** Use `run:<id>` or `dispatch:<id>`, not a bare terminal handle; terminal mail is lost when the terminal closes. A request that reaches the wrong session is forwarded to its owner, and the sender is told.

## Canonical UI copy and Korean authoring policy

- New or relocated first-party interface copy belongs in `messages/en.json` and
  is consumed through next-intl. Do not add another local English copy catalogue.
- `messages/ko.json` mirrors `messages/en.json`: identical literal JSON structure,
  key paths and key order, with string values and `""` for untranslated keys.
- Any change that adds, renames or removes an English key makes the same structural
  change to `messages/ko.json` in the same commit, using `""` for new keys.
- Existing Korean text is never overwritten, auto-filled or translated without an
  owner translation request, including existing values written in English.
- An empty Korean string displays English through the shared next-intl catalogue.
  The owner activated this fallback on 2026-11-13; see
  `docs/reference/i18n-consolidation-plan.md`.
- Do not automatically translate names, titles or functional labels into Korean.
  Landing/editorial/Payload-managed content stays with its existing content owner.

## Brand voice and copy

- Before drafting or adapting Sophomores copy, read [the identity document](docs/design/identity.md) and [the working brand-voice guide](docs/design/brand-voice.md). The guide distinguishes its agreed core from proposed applications and examples. The [source analysis](docs/design/brand-voice-analysis.md) is supporting material, not the voice specification. These references do not approve changes to or publication of existing pages.

## Owner rule: backend priority and UI scope (2026-11-19)

> Let me be clear: - backend is what's important - frontend just needs to exist, prioritize being modular so that my edits don't cause cascading failure; in the same vein, make ui-related tests narrow in scope: 'does it work?' is all that matters. No screenreaders, no accessibility tests.

## Owner rule: design reference and implementation (2026-11-19)

> For visual design and interaction UX : The Hideaway is the default standard; however code implementation is always NextJS + other technical doc/official sources etc that wins if it collides.

Anything that is used only in The Hideaway's `/lostinseoul` route is excluded.

## User rules: motion and completion
- Full motion is the current default. Do not add reduced-motion preference gates, alternate reduced-motion paths, or motion opt-outs unless the user explicitly requests an exception or revisits this policy.
- For UI/styling work, smoke-check the affected flow in the live browser. Keep UI checks narrow and functional per the owner rule above; source checks alone do not establish live behavior.

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
  registration gateway, chooser, dialog or sheet. Sign-up is social only: Apple
  or Google, and Kakao when it is switched on (owner, 2026-11-16; ADR-0013).
  Registered members may also sign in with an email code sent to their primary
  email. A complete email may be looked up before a code is
  sent, to offer sign-in or point a new visitor to social sign-up (explicit
  user-approved account-existence disclosure). Return no profile, membership or
  role data; enforce server lookup rate limits. Sending a code always needs a
  separate explicit button press. Request only missing setup after proof, then
  reveal tickets after fresh authoritative member status. Never send codes while
  typing or looking up. Standalone account login and sign-up follow the same
  sign-up rule; staff surfaces keep their existing contracts.
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

## Arc UI is first-class for UI components (owner rule, 2026-11-18)

- **Owner, verbatim:** "arc-ui is now first-class for our ui components. Use as much as possible- and sessions working on ui should initialize their worktrees (current or future) with the library's mcp and skills installed."
- **Owner clarification, verbatim (2026-11-19):** “Im worried that you mistook "arcui is first-class" as "it wins over things The Hideaway has automatically". It's not; I want to use it in primitives, but not replace The Hideaway page-level designs. For example: the team page should have been taken from The Hideaway as previously agreed.”
- **Owner refinement, verbatim (2026-11-19):** "I'd like to use arc-ui mainly for primitive components, and functional components like forms. A uniquely designed layout or component should not be replaced by arc-ui."
- **Arc first for primitives and functional components (e.g. forms).** Search Arc ([uiarc.dev](https://uiarc.dev)) with the Arc MCP (`search_components`, then `get_component`) or `https://uiarc.dev/components/<id>/markdown` before building or restyling them. Use a fitting free `@uiarc` item instead of hand-building one. Keep or port uniquely designed layouts and components, including existing Hideaway page designs from `src/hideaway`. Do not migrate existing Base UI, Radix or shadcn usage wholesale; replace it only within a scoped change that has a reason.
- **Placement and styling.** Arc items live under `src/components/arc/<id>/` with their own CSS Modules. This is the existing approved Arc CSS Modules exception. Page and composition code around Arc items stays Tailwind-only. Never restyle Arc internals from outside; use only documented props.
- **Adding items.**
  - Take source from the `@uiarc` registry or the MCP (`components.json` already registers `@uiarc`).
  - Use `npx shadcn@latest add @uiarc/<id>` only in a checkout that has node_modules, and only when every npm dependency the item lists is already installed. A missing dependency is a package install and needs owner approval.
  - Arc Pro (`@uiarc-pro`) is paid and is not used without owner approval.
- **Tokens and theme.**
  - Do not import Arc's `arc-foundation` / `foundation.css` token layer wholesale.
  - Map Arc's semantic tokens onto the existing project tokens through the shared adapter in `src/components/arc/_shared/`.
  - Keep the current colours (the colour hold), the approved typography and `BrandMark`.
- **Precedence.** Where the Arc skill differs, the owner rules in this file win. In particular:
  - Uniquely designed layouts and components, including Hideaway page-level designs, win over Arc replacements; Arc may supply primitives and functional components inside them without replacing the bespoke design.
  - full motion with no reduced-motion branches, despite Arc's checklist;
  - Tailwind outside Arc;
  - the Sophomores brand voice and the ux-writing rules over Arc's `copy.md`;
  - the EN/KO catalogue rules.
- **Tooling for every UI session.**
  - Claude Code gets the Arc MCP from the tracked `.mcp.json` (`arc` → `https://uiarc.dev/api/mcp`) and the skill from the tracked `.claude/skills/arc/`.
  - Codex reads the same skill from `.agents/skills/arc/` and gets the MCP at launch with `-c 'mcp_servers.arc.url="https://uiarc.dev/api/mcp"'`.
  - The MCP needs a one-time owner OAuth sign-in with a free Arc account. Sessions without it fall back to the registry markdown pages.

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

React components, hooks, and framework-required entrypoints remain in their appropriate locations. Component-bound lifecycle/event closures remain local; extract their computations only when they meet the distinct-use-case rule above. Keep server-only helpers separated from browser utilities; avoid barrels that pull server or heavyweight graphics code into unrelated client bundles. Native GLSL built-ins such as `smoothstep` are already library/runtime reuse and must not be reimplemented in JavaScript. Preserve behavior through concrete source reasoning and live visual checks when refactoring animation or WebGL. Check completed pages/whole flows; granular characterization/parity diagnostics are useful only for unfamiliar/custom behavior and never affect progress or force retries.

### React module and test-file integrity
- Shared `src/utils` contains only non-React helpers/data modules (normally `.ts`), never components, hooks, or functions whose purpose is to return/render a `ReactNode`. Being non-React alone does not qualify code as shared: the distinct-use-case gate above still applies.
- Component directories should contain actual React-bound component code, not pure `.ts` helper/config/renderer modules. Collapse small single-owner logic into its real component, delete redundant code, or place cohesive feature-only modules at their actual nearest owning scope rather than falsely promoting them to shared utilities or funneling them into `src/lib`. Keep standalone hooks with their real owner; use a shared hooks scope only when actual consumers justify it. Retain a `.ts` file in a component directory only when an actual technical requirement makes it necessary; state that reason. Small sibling-shared pure modules may live in explicitly scoped feature-private folders such as `_shared/` when this avoids moving them above their actual owners or importing values through React component modules. This is a narrow documented exception, not a generic helper dump.
- A `.tsx` file must contain actual React-bound code: a component, hook integration, or equivalent React behavior. Do not cosmetically rename a pure `.ts` file, add a token React import, or manufacture a wrapper to satisfy this rule. Import library APIs directly instead of retaining unused re-export façades.
- All tests, test-only fixtures, snapshots, and mocks belong under repo-root `tests/`, grouped by feature/scope. Never colocate them with components or any production code. Update test discovery/imports when moving tests; do not silently stop running them. Do not rewrite archived deployment snapshots as active source.

### Modular directory structure
Use actual production import sites to choose the lowest sensible shared ownership scope (for example, callers at `a/b/c/d/qq.tsx` and `a/b/c/x/tt.tsx` suggest `a/b/c/`). Tests, mocks, and archived implementations do not pull production code toward the root. This is a general heuristic, not a rigid boundary: preserve cohesive modules, technical requirements, best practices, and current official framework guidance (including Next.js routing/colocation). Do not use `src/lib`, `src/utils`, `src/hooks`, or a renamed catch-all as a dumping ground. Check the import graph before moving code; prefer local ownership over artificial layers.

Group, position, and nest code by scope and use. Do not create single-depth catch-all directories mixing unrelated domains or dumping every helper/component into one flat list. Broad shared code stays at an appropriately broad level; feature-specific code, hooks, tests, and fixtures live in cohesive nested feature/domain directories. Prefer the repo's existing structure over introducing a competing hierarchy, and avoid meaningless single-file nesting or re-export chains.

## Skills: load before you start (owner-approved routing, 2026-11-23)

Load the listed skills before the first edit or draft in that area. Where a skill disagrees with an owner rule in this file, the owner rule wins. Claude loads them with the `Skill` tool; Codex reads project skills from `.agents/skills/<name>/SKILL.md` and checks plugin skills through the packet line below. For Claude only, project hooks in `.claude/settings.json` remind once per session per area and log each reminder (`reminded:<area>`) and each loaded skill to `.tmp/skills-used/<session-id>.log`, so a reminder with no matching skill shows as ignored. Codex has no such hook; its packet line is its attestation.

| When the task is… | Load first | Then, as needed |
|---|---|---|
| UI page or component (`src/app/(site)/**`, `src/components/**`, `src/hideaway/**`) | `better-ui`, `ecc:make-interfaces-feel-better`, `ecc:frontend-design-direction` | `improve-ui`; `arc` + Arc MCP for primitives and forms; `shadcn` |
| Interface copy (English) | `ux-writing` | `brand-copy-refinement` |
| `messages/en.json` / `messages/ko.json` | `sphmrs-catalogue-copy-pass`, `ux-writing` | `multi-model-catalogue-copy-pass`; never `ecc:i18n-sync` |
| Motion or animation | `ecc:motion-foundations` | `ecc:motion-patterns`, `ecc:motion-advanced`, `improve-animations`; drop any reduced-motion branch they suggest |
| Tailwind tokens, theme, fonts | `tailwind-design-system` | `next-font-variable-roles` |
| Payload collections, fields, hooks, access | `payload` | `ecc:backend-patterns` |
| Migrations or schema | `payload`, `ecc:database-migrations` | `ecc:postgres-patterns`; `ecc:database-reviewer` agent |
| Next.js routing, server/client boundary, caching | `ecc:nextjs-turbopack` + `node_modules/next/dist/docs/` | `ecc:react-patterns`, `ecc:react-performance`; Context7 |
| Route handlers, server actions | `ecc:api-design`, `ecc:error-handling` | `ecc:security-review` |
| Auth, phone verification, sessions; commerce, payment, orders, wallet, tickets, NFC, invites | `ecc:security-review`, `sphmrs-personal-data-pages` | `ecc:security-reviewer` agent; built-in `security-review` before the landing packet; `ecc:click-path-audit` for whole purchase flows |
| Any page or handler that shows personal data | `sphmrs-personal-data-pages`, `ecc:security-review` | — |
| Library or framework API | `ecc:documentation-lookup` (Context7 first) | `ecc:search-first` before writing a helper |
| Changing working behaviour / new capability / bug | `ecc:change-impact` → `ecc:orch-change-feature` / `ecc:orch-add-feature` or `ecc:multi-workflow` / `ecc:orch-fix-defect` | `ecc:plan-orchestrate`; `ecc:council` for owner-level choices |
| Orca multi-lane work | `orchestration`, `orca-cli` | `orca-resumed-session-mailbox-recovery`; `orca-worker-delivery-pitfalls` before `worker_done` |
| Live browser check | Chrome DevTools MCP | `ecc:browser-qa` without its axe or accessibility phase |
| Self-review before a packet | built-in `code-review` | `simplify`; `ecc:santa-method`; `ecc:astra-review` |
| Harness, settings or hooks | `update-config`, `ecc:hookify-rules` | `ecc:security-scan` |

**Packet line.** Every worker packet and `worker_done` ends with `Skills used: <comma list>`, attested per host: a Claude session adds `(log: .tmp/skills-used/<session-id>.log)` from its hooks; a Codex session gives the line alone. Reviewers compare it with the area rows above, and with the log where there is one. A missing skill or a missing log is a note, not a FAIL. What fails a packet is substance: a change that exposes personal data or alters its lifecycle without a safeguard from `sphmrs-personal-data-pages` that applies to it.

<!-- BEGIN:nextjs-agent-upgrade -->

## Next.js upgrade reminders

Upgrade reminders emitted by this project's installed Next.js CLI during `next dev` or `next build` are part of the `experimental.agentUpgrade` workflow. Follow these reminders' instructions while respecting user instructions declining upgrades.

<!-- END:nextjs-agent-upgrade -->
