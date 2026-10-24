<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

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
