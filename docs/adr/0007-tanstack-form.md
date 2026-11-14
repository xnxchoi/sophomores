# ADR-0007: Forms use TanStack Form

**Date**: 2026-11-15
**Status**: accepted
**Deciders**: the owner (D6 in the design requirements)

## Context

React Hook Form and TanStack Form are both installed. The owner first picked TanStack Form, then chose to
follow The Hideaway (`~/WebstormProjects/thehideaway`, read 2026-11-15), which turned out to use both in
nine files each: React Hook Form for sign-in and account forms, TanStack Form for the registration tour and
the auth form kit. The owner explained that React Hook Form was used there only where it had to be.

## Decision

We build forms with TanStack Form. React Hook Form is not used for new forms; existing uses here move to
TanStack Form when their forms are reworked.

## Alternatives considered

### React Hook Form
- **Pros**: familiar, quick to write, already behind some sign-in forms.
- **Cons**: the owner finds it less accommodating.
- **Why not**: the owner prefers TanStack Form and used React Hook Form only out of necessity.

## Consequences

### Positive
- One form library, the one the owner prefers.

### Negative
- A learning curve: TanStack Form is harder to pick up.

### Risks
- Two libraries side by side until existing forms are converted. Mitigation: convert a form when it is
  touched; sign-in keeps its existing contract (AGENTS.md) until then.
