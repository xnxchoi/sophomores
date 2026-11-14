# ADR-0006: Icons move to Phosphor

**Date**: 2026-11-15
**Status**: accepted
**Deciders**: the owner (D7 in the design requirements)

## Context

Phosphor, Lucide and Radix icons are all installed. The owner first picked Phosphor, then said to follow The
Hideaway (`~/WebstormProjects/thehideaway`, read 2026-11-15), which mostly uses Lucide (about 73 files), with
Phosphor (about 17) and Radix icons (about 12). Shown that, the owner settled on Phosphor (2026-11-15).

## Decision

We use Phosphor for interface icons. Lucide and Radix icons are not used for new work, and existing uses move
to Phosphor as their components are restyled.

## Alternatives considered

### Lucide, following The Hideaway
- **Pros**: The Hideaway's main set; shadcn components default to it.
- **Why not**: the owner chose Phosphor.

### Radix icons
- **Why not**: a small set, and Radix is being migrated away from (ADR-0005).

## Consequences

### Positive
- One icon set; Phosphor's weights give room to match the type.

### Negative
- shadcn components that import Lucide need their icons swapped.

### Risks
- Mixed sets until the swap is done. Mitigation: swap when a component is restyled.
