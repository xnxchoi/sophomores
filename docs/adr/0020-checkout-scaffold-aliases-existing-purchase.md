# 0020: Checkout scaffold aliases the existing purchase flow

- Status: accepted under delegated design authority
- Date: 2026-11-18

## Context

The inherited `/shop/checkout` route renders only a heading. The actual account, selection, delivery and payment composition already lives in `/shop`, and the public offer has a focusable `offer-purchase` anchor. The real cart consequently continues to the shop instead of the empty checkout route. Leaving the older route as a heading creates an avoidable dead end.

## Decision

Use Next's temporary server redirect from `/shop/checkout` to `/shop#offer-purchase`. Preserve its existing metadata/no-index policy and do not forward arbitrary query or fragment data. This is a navigation alias, not a payment submission, an account redirect policy or a second checkout implementation. When no offer is available, the real shop retains its existing unavailable state.

## Alternatives

- Copy or move the existing purchase composition into another route: rejected because it would duplicate or relocate account/provider/session ownership without a mechanism-owner migration.
- Keep the heading-only route: rejected because it does not advance the customer's purchase task.
- Render an explanatory bridge with another button: possible, but it adds an unnecessary step before the already-supported destination.
- Make the redirect permanent: rejected because a future deliberate dedicated-checkout migration must remain reversible.

## Consequences And Reassessment

Known checkout links reach the one actual purchase composition. No cart, identity, provider, credentials, database or payment mechanism is modified, and no code is sent or payment made by the alias. Native Next redirect behavior and the actual destination/anchor were checked in installed source/docs; this is not runtime or keyboard/scroll acceptance.

The dedicated checkout/whole-purchase programme is not declared complete. Reassess with its mechanism owner if purchase presentation moves to a dedicated route, if a supported caller needs additional return-state handling, or if actual anchor navigation fails. Browser review must cover valid/unavailable offers, history/back behavior, same-account saved selection and no automatic financial action.

## Restore

Restore only the original checkout route scaffold from the saved preimage. The actual shop/purchase components and every financial or account state remain untouched.
