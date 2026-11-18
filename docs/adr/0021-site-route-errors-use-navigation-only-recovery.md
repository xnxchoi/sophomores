# ADR-0021: Site route errors use navigation-only recovery

**Date**: 2026-11-18
**Status**: accepted
**Deciders**: Hamlet under owner-delegated ordinary design discretion

## Context

F11 includes useful unexpected-error presentation. The site has no custom route
error boundary; The Hideaway has a not-found page but no equivalent generic
`error.tsx` or `global-error.tsx` in the inspected source. The existing site layout
owns internationalization, providers and page transitions. Expected authentication,
checkout, order and fulfillment errors retain their current owners.

Installed Next 16.5.0-canary.27 documents `error.tsx` as a client fallback for descendant
render failures, not failures in the owning layout or its providers. Its explicit
`retry()` re-fetches and re-renders children; `reset()` re-renders without a fetch.
Neither establishes that purchase initialization or other effects are safe on
remount, or that an interrupted payment succeeded or failed.

## Decision

Add a plain `src/app/(site)/error.tsx` below the existing layout, with canonical
neutral copy, heading focus and native Home/Help links. Native links attempt a
full-document escape without relying on the failed route's transition state.
Do not call retry/reset, automatically reload, expose/log the exception, invent
transaction status, or reproduce expected flow errors. The fallback does not add
another provider, animation shell, reporting service or custom boundary primitive.

## Alternatives considered

### Explicit Next retry
- **Pros**: May recover a transient read without leaving the route.
- **Cons**: Remount can rerun effects; this source batch does not establish every
  affected purchase/account route's remount safety.
- **Why not**: Useful navigation can ship now without implying safe transaction
  repetition. Reassess explicit retry with route-specific evidence, not an
  automatic programme-wide hold.

### Global error document
- **Pros**: Also catches root-layout failures.
- **Cons**: Replaces the document and loses the owning intl/theme/provider setup.
- **Why not**: It requires a separately specified fallback locale/theme contract;
  a site-segment view must not pretend to provide comprehensive recovery.

### Custom React boundary or reuse the full page frame
- **Pros**: More control or closer composition reuse.
- **Cons**: Additional failure dependencies and a parallel recovery mechanism.
- **Why not**: The installed framework boundary already owns capture. The minimal
  fallback needs neither the page frame's motion nor any new reusable helper.

## Consequences

### Positive
- Descendant render errors have real navigation and meaningful focused content.
- No error message, digest, personal data or payment outcome is rendered.
- Existing layout, providers and flow-specific mechanisms stay unchanged.

### Negative
- Recovery leaves the failed route; its local unsaved state may be lost.
- Home/Help are escape attempts, not guarantees if shared layout infrastructure fails.

### Risks
- A catalogue or layout failure still needs its existing upper-level recovery.
- Runtime focus, repeated failure, mobile composition and Santa acceptance remain
  pending the admitted serial browser lane; source review is not live acceptance.

## Reassessment and restoration

Reassess retry only after verifying affected effect and transaction ownership.
Global recovery requires its own provider-independent locale/theme design.
To restore the observed baseline, remove only this new site `error.tsx` and the
three new `System.routeError*` leaves, preserving all unrelated catalogue values.
Retain this record or explicitly supersede it rather than erasing the decision.
