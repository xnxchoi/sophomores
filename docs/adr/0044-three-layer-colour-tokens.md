# ADR-0044: Colour tokens in three layers, under The Hideaway's names

**Date**: 2026-11-15
**Status**: accepted
**Deciders**: the owner (D1, batch 2 of the design requirements)

## Context

167 files read shadcn's colour names (background, foreground, muted-foreground, border…), whose values here are
shadcn's stock neutral set; the owner wants those values gone (2026-11-14). The Sophomores palette is declared but
nothing reads it. The Hideaway uses the same shadcn names with its own values, as slots: background and
foreground with opaque, muted, off and faded variants, a button background, border, signature, accent and error,
dark as the base and light as an override. The owner: The Hideaway's colour variables are slots, filled with our
own colours; Mersi's palette is the basis (accepted 2026-11-15), with deep green tuned to it and split into a
background green and a lighter foreground green.

## Decision

Colour tokens come in three layers:
1. **Primitives**: raw colours with no meaning (the neutral scale, Mersi's set, the green family #213627 /
   #405646 / #657B69 / #8AA791, and registered colours with no role yet).
2. **Semantic tokens** under The Hideaway's names, each with a dark value in the base layer and a light value
   under `data-theme="light"`.
3. **Aliases**: shadcn's names point at the semantic tokens, so the 167 files keep working with no class-name
   change.

The teaser set stays apart; it serves the home page, which is out of scope.

## Alternatives considered

### Fold everything into one flat set
- **Pros**: fewer names.
- **Cons**: every one of the 167 files changes class names; raw colours and their jobs get mixed.
- **Why not**: aliases give the same result with no churn.

### Keep shadcn's names as the semantic layer
- **Pros**: no new names.
- **Cons**: shadcn has no slots for signature, accent or The Hideaway's variants.
- **Why not**: the owner chose The Hideaway's slots.

## Consequences

### Positive
- Values change in one place; every page follows. A colour's job is readable from its name.

### Negative
- Every page changes look at once, so the change lands with a live check of the main pages in both modes.

### Risks
- `src/styles/teaser.css` hard-codes `html` and `body` to `#000` and is imported by the site layout, so light mode
  keeps a black page (seen in the D2 live check, 2026-11-15). The token change must scope that rule to the teaser
  pages or move it onto the token.
