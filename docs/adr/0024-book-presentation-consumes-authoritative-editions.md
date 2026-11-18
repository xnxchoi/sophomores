# ADR-0024: Book presentation consumes authoritative editions

**Date**: 2026-11-18
**Status**: accepted for presentation; mechanism implementation remains Auth-owned
**Deciders**: Hamlet under owner-delegated design discretion

## Context

The newer selected product is a printed book, with book-only and personal edition
proposals. The old coin page and three-coin planning passages are not its final
definition. Main/Auth are preparing a native-variant display projection with
`purchaseReady: false`; canonical snapshot v1 cannot purchase those editions.

The Hideaway checks real actionable SKU identity and price before presenting a
purchase capability. The target already has a server Shop page and an owned
account/checkout flow. Its UI overlay does not establish whole canonical backend
parity: a read-only comparison found legacy release allowance three in Hamlet
versus one in canonical reservations. This is separate from quantity one per
purchase. No backend/schema replacement follows from that comparison.

## Decision

Build the book presentation against Auth's actual published edition projection
at the existing server Shop-page seam. Use real edition identity and supplied
facts, not local price/variant state or three invented product rows. A display-only
edition has no purchase action and cannot enter legacy coin checkout.

Use the selected book visual references. Keep premium concept-only and do not
detail unvalidated capabilities. Add the dynamic PDP route only when its owner
supplies published slug/lookup identity. Preserve the working legacy mechanism
until its owner explicitly replaces it; do not relabel it as book purchasing.

The actual read contract must distinguish true native absence from ambiguous
native configuration. Keep independent legacy presentation only for explicit
schema absence or zero published native parents. Ambiguity, invalid configuration,
unpublished editions and read failure do not fall through to an unrelated legacy
purchase action. This refinement follows the concrete consumer source-review
finding; it does not authorize a new financial flow or schema activation.

The detailed content/state boundaries are in
[the selected-book consumer contract](../reference/product-sales-page/07-selected-book-consumer-contract.md).
These are implementation decisions, not commercial publication, provider
acceptance, a price approval or visual acceptance.

## Alternatives considered

- Cosmetic edition selector on the coin checkout: quick but loses actual SKU,
  snapshot and benefit meaning. Rejected.
- Three product rows: appears schema-free but splits release allowance and leaves
  universal legacy benefits unchanged. Rejected without an owned mechanism design.
- Separate local checkout/store: duplicates financial/account authority. Rejected.
- Whole-programme hold: unnecessary; content, contract and independent source work
  continue while mechanism and runtime owners resolve their exact dependencies.

## Consequences

The page can honestly present published editions before purchasing is supported.
Owner proposal amounts are not fallback quotes; absent content stays absent.
The actual variant/snapshot/reservation/settlement implementation remains with
Auth. A source-only contract cannot establish runtime or browser/Santa acceptance.
Canonical ADR-0023, `0023-native-variants-own-edition-identity.md`, separately
records the native-variant technical direction; this record does not replace it.

## Restoration and reassessment

Keep the legacy loader/controller unchanged during the display-only addition.
Restore only exact owned consumer preimages if integration fails; never roll back
other owners' source or shared copy. Supersede this record when a reviewed real
purchase-ready edition contract changes these boundaries.
