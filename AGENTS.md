<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Hard rule: Tailwind-only UI styling

- Use Tailwind utility classes for all new or modified component and page styling.
- Do not create custom CSS classes/selectors, CSS Modules, CSS-in-JS, or handwritten component stylesheets. Existing custom CSS is legacy, not permission to add more.
- Use Tailwind arbitrary values and variants when standard utilities are insufficient. Compose utilities with existing `cn`/`cva` helpers rather than introducing custom class names.
- Shared design tokens, Tailwind theme configuration, and necessary global base styles belong in the existing global/theme layer; they must not become a workaround for custom component classes.
- When changing existing UI, express the changed styling in Tailwind rather than extending legacy custom CSS. Do not perform unrelated stylesheet migrations without approval.
- Exceptions require explicit user approval. This rule applies to every contributor and delegated agent.
