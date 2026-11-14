# ADR-0005: Base UI for primitives; Vaul for drawers and sheets

**Date**: 2026-11-15
**Status**: accepted
**Deciders**: the owner (D5 in the design requirements)

## Context

Base UI and Radix are both installed. The owner chose Base UI, with anything on Radix migrated to it using
shadcn's migration skill, and drawers and sheets following The Hideaway (`~/WebstormProjects/thehideaway`, read 2026-11-15). The Hideaway builds its drawers and sheets
on Vaul through its own wrapper (`components/ui/vaul`), with Motion inside. This site already uses Vaul for
sign-in.

## Decision

We build primitives (dialogs, menus, accordions, fields) on Base UI and migrate Radix uses to it. Drawers
and sheets, including the cart drawer, use Vaul, as The Hideaway does.

## Alternatives considered

### Radix
- **Why not**: the owner chose Base UI; Radix is being migrated away from.

### Base UI's own dialog for drawers
- **Why not**: Vaul is what The Hideaway and the sign-in tray already use, with drag to dismiss.

## Consequences

### Positive
- One primitive library; drawers behave like the existing sign-in tray.

### Negative
- A migration pass for current Radix uses.

### Risks
- Mixed primitives until the migration ends. Mitigation: migrate a component when it is restyled.
