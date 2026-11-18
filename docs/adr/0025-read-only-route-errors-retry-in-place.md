# ADR-0025: Read-only site pages offer Try again in place (amends ADR-0021)

**Date**: 2026-11-18
**Status**: accepted for source; runtime verification pending
**Deciders**: Lane UI-Shell under owner-delegated UI decision authority (owner, 18 Nov 2026: "You would be effectively acting as like the decision maker alongside codex"); Codex and Antigravity advised

## Context

F11 asks that "an error offers Try again in place". ADR-0021 shipped navigation-only recovery for every
`(site)` route and deferred retry until route-specific evidence showed that re-running a page could not
repeat a consequential effect. Installed Next 16.5.0-canary.27 implements `retry()` as
`startTransition(() => { router.refresh(); reset(); })`, so it re-requests the current route's server
components and re-renders the failed segment; the fallback stays on screen until the transition commits.
The shared `(site)/error.tsx` also catches purchase, sign-in and account pages, which another lane owns.

## Decision

`(site)/error.tsx` offers Try again (Next `retry()`) only on an allowlist of pages that read published
content and start no purchase, sign-in or account work, and no customer session read: `/`, `/team`, `/help`, `/help/shipping`,
`/privacy`, `/refund`, `/terms`. Excluded on Codex's source read: `/essays`, `/essays/[slug]`, `/setlists/[slug]`
and `/music` call `currentUser()`, whose session read can refresh or delete a session; `/shop` and `/tickets`
mount account sync, checkout and pending-payment discovery. An unknown pathname fails closed.
Not a claim that the refresh touches no cookie at all: in guarded preview, the refresh request still passes
`src/proxy.ts` and verifies the preview-access cookie. That is a read-only preview guard, not a customer session.
Every other path keeps ADR-0021's navigation-only recovery unchanged. Home and Help links stay on every page.

## Alternatives Considered

### Retry on every page
- **Pros**: one behaviour everywhere; matches F11 literally.
- **Cons**: re-runs checkout, payment-return and account pages, whose effects and controllers belong to another lane; "Try again" there can read as permission to repeat a payment.
- **Why not**: the brand voice guide reserves "Try again" for operations that cannot duplicate a consequential effect.

### A denylist of purchase and account paths
- **Pros**: shorter list.
- **Cons**: every new purchase or account route would silently get retry.
- **Why not**: an allowlist fails closed.

### Per-segment `error.tsx` files
- **Pros**: no pathname matching.
- **Cons**: one file per segment group, plus restructuring routes into groups to share them; more surfaces to keep consistent.
- **Why not**: one shared fallback with a small, documented allowlist is less to maintain. Revisit if segment-specific recovery copy is needed.

### Arc ActionSwap for the control
- **Pros**: Arc-first; built-in working state.
- **Cons**: it cycles between toggle states and resolves on a promise; `retry()` returns void, and success unmounts the fallback.
- **Why not**: the existing Button with a `useTransition` pending label covers busy feedback without misusing a toggle.

## Consequences

### Positive
- Transient read failures on public pages recover without leaving the page.
- Purchase, sign-in and account pages keep their reviewed recovery.

### Negative
- The allowlist must be updated when a new read-only page is added; until then the page gets navigation-only recovery (safe default).

### Risks
- A failed retry remounts the fallback; focus returns to the heading, which re-announces it. There is no separate "still failed" message.
- `router.refresh()` refreshes the whole route, including layout server components. They are reads on these pages.
