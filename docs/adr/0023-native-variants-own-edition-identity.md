# ADR-0023: Native variants own edition identity

**Date**: 2026-11-18
**Status**: accepted technical direction for scoped source design; not configuration, schema execution or purchase activation
**Deciders**: Coordinator under ADR-0015 delegated technical discretion; retained Auth source assessment; Main Maintenance ADR custody

## Context

The selected product direction includes a book-only edition, a printed personalized
cover edition and a premium concept that must not be detailed or launched now.
These directions do not establish published prices, assets, eligibility, benefits,
production terms or returns terms. The current implementation remains a single
offer with a one-unit account/release allowance, not a completed edition flow.

Installed `@payloadcms/plugin-ecommerce` 3.92.1 supplies native variant options,
SKU-specific pricing/inventory and cart identity `{ product, variant }`. Current
server and client configuration deliberately disable variants, cart and snapshot
creation reject them, and strict version-1 snapshots contain no edition identity.
Release identity currently equals product identity. Paid settlement grants the
same membership, admissions and key intents for every current purchase. A visual
selector cannot make this model edition-aware or change those benefits truthfully.

## Decision

1. Use the installed native variant model for edition/SKU identity. Do not install
   another package or build a parallel selector, cart or payment authority.
2. Separate parent product/release identity from selected variant identity. Retain
   the existing one-unit account/release rule until an explicit later product rule
   replaces it; separate product rows must not accidentally multiply allowances.
3. Derive selected-edition labels, price and inventory on the owning server from
   the native cart and validated parent/variant relationship. Before any new
   edition is purchasable, deliberately version its immutable purchase snapshot
   to retain the actual edition identity and authoritative purchase facts. Client
   labels, prices or selection state are never financial authority.
4. Preserve the exact legacy snapshot, reservation, settlement, paid-benefit and
   in-flight attempt paths. Do not reinterpret old receipts or silently alter old
   entitlements because the new product direction differs.
5. Do not assign universal legacy paid benefits to new editions by default.
   New-edition eligibility, benefits and fulfillment require explicit configured
   contracts. Undefined purchase-critical facts remain unavailable for purchase;
   no invented defaults, permanent-archive promises or automatic refund claims.
6. Premium stays concept-only. No transit, hardware, issuer, credential or premium
   checkout integration is authorized by this source-design decision.

This records the technical direction, not implementation or a new owner business
policy. It authorizes no configuration toggle, schema/migration execution, data
creation, database/provider operation or activation of purchasable variants.

## Alternatives Considered

### Client-only edition selector over the existing offer
- **Pros**: Small presentation change.
- **Cons**: No authoritative selected SKU, quote, stock reservation or immutable
  edition receipt; legacy paid benefits remain unchanged.
- **Why not**: It would present unsupported choices as a functional purchase flow.

### One ordinary product row per edition
- **Pros**: Reuses the current product relation.
- **Cons**: Unselected catalogue reads become ambiguous, the current release
  allowance splits by product and unconditional paid benefits remain.
- **Why not**: Three products are not a schema-free substitute for an edition
  contract and could multiply the current allowance unintentionally.

### Custom variant or payment subsystem
- **Pros**: Can express arbitrary domain behavior.
- **Cons**: Duplicates an installed SKU/cart capability and needlessly changes
  financial recovery and settlement ownership.
- **Why not**: Extend the native seam deliberately rather than replace it.

## Unresolved Product Contracts

- Approved purchasable editions and configured IDs, prices, stock, dispatch,
  shipping, sale windows and shared release/upgrade/account quantity rules.
- Edition-specific account eligibility, membership, admissions, token benefits
  and shared event-capacity semantics, including book-only eligibility.
- Printed personalization inputs, approval/edit deadlines and fulfillment;
  yearbook editorial approval, image rights, privacy, consent, retention and
  rejection remedies. Personalization is printing, not engraving.
- Variant-specific cancellation/returns disclosures and consent, including
  defect, damage and wrong-item remedies. Personalization-related owner intent
  is not a validated blanket no-returns policy or an exception for book-only.

Proposal prices and visual cards are not published business facts. These gaps
stay with their existing owners, not a new blanket approval loop or a reason to
freeze unrelated P5/P6 and site delivery. Do not elaborate the premium concept.

## Consequences And Next Bounded Slice

Auth owns the separately assigned native-edition blueprint and first coherent
read/identity slice; Hamlet owns the selected PDP and real asset/content
reconciliation; the existing Undine peer reviews the contract/source seam. Main
retains canonical ADR and source intake custody. No new executor or mechanism
owner follows from this record.

Separate displayable edition facts from purchase readiness. Identify necessary
native configuration/schema/type work without querying unregistered variant
collections or enabling runtime flags merely to make a selector appear usable.
A library-native, domain-owned typed read contract must be honest when edition
configuration is absent and leave current cart, quote, snapshot, reservation,
settlement, providers and legacy purchases unchanged. If a meaningful read slice
requires native registration, document that dependency and propose the smallest
coherent source-only registration/read-model slice rather than ship dead UI or a
fabricated helper. This ADR does not itself authorize that configuration change.

Native SKU support does not supply printing consent, editorial approval,
entitlements or shared event-capacity policy. Future owned purchase work must
reconcile those contracts and intentional snapshot compatibility; enabling two
booleans alone does not satisfy them. Keep the existing paid/in-flight paths exact.

DS05 remains incomplete until the selected-edition presentation, authoritative
purchase behavior and real configured content are delivered and verified. A
renamed legacy coin page, source assessment or ADR is not that completion.

## Evidence And Acceptance Boundaries

Retained Auth assessment:
`/Users/seanschoi/orca/workspaces/sphmrs/visible-auth-payment-nfc-20261118/.tmp/ds05-edition-contract-assessment-20261118/ASSESSMENT.md`
SHA-256 `436f0e0d66f95db4da29747909cc449e6a51d7129cc77e961eaff2a6d97c230f`.
Its sibling `evidence.json` SHA-256 is
`34291d0ba1d5a110d7ded2041138dcdf43a0cae54ee7b77a21fe26178192dd1f`.
The original assessment remains a read-only recommendation, not retroactively
an implementation or owner-approved business contract. Coordinator acceptance
is the later technical-direction decision recorded here.

All 20 recorded application and installed-package source pins match at this
documentation checkpoint. They cover `src/lib/commerce/{ecommerce,catalogue,
contracts,reservations,guests,membership}.ts`, key intents, the PortOne adapter,
checkout and exact installed native variant/cart/pricing source. The installed
3.92.1 source is decisive; retained Context7 results include older import/default
examples and are not copy-ready implementation instructions. The existing
product decision ledger remains `docs/qa/auth-payment-nfc/consolidation.md`.

Source evidence proves contracts and gaps, not CMS data, working purchase flows,
fulfillment, visual/Santa, provider or owner acceptance. No application imports,
tests/build/typecheck, preview/browser, dependency, schema or database operations
ran to record this decision. Any later change supersedes this ADR explicitly;
recording or reversing documentation never authorizes a data rollback or changes
to legacy orders, attempts or benefits.
