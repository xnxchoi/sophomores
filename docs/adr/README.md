# Architecture Decision Records

Architectural choices and the reasons behind them. Each record is short and stays in place once written: a later record supersedes an earlier one rather than rewriting it.

**How status works.** A direct owner decision is recorded as *accepted* without
another draft-approval or checkbox loop. ADR-0015 records the later delegated,
page-first operating policy and supersedes the old rule that every ADR must stay
proposed until an owner ticks *Waiting for you*. For choices that otherwise would
have required explicit owner approval, council is strongly recommended, not
mandatory; choose a fitting direction, record consequential decisions once, and
execute. Routine implementation, ordinary ambiguity, checks, fixes and retries
proceed without council ceremony. Genuinely undecided alternatives can remain
proposed; recording an ADR never invents owner product preference or observed
functionality. Product facts, names, refund windows and launch timing remain in
the canonical ledger with their actual decision status.

Write each ADR through its actual owning lane: cross-programme operating decisions
through Maintenance, mechanism architecture through Auth. Current successor
routing is in `docs/qa/auth-payment-nfc/consolidation.md`; original branches and
historical ADRs remain provenance, not automatic merge or ownership instructions.

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [0001](0001-member-wallet-safe-with-passkey-owner.md) | Member wallet is a Safe with a passkey owner | superseded by 0013 | 2026-11-14 |
| [0002](0002-guest-keys-by-email.md) | Guest keys are delivered by email through Unlock, without a wallet | superseded by 0014 | 2026-11-14 |
| [0003](0003-nfc-first-tap.md) | The NFC card's first tap activates; afterwards the card is the check-in credential | activation part superseded by 0005; check-in part by 0012 | 2026-11-14 |
| [0004](0004-key-grant-outbox-at-settle.md) | Payment settlement records a key-grant intent; a separate worker grants the key | accepted | 2026-11-15 |
| [0005](0005-activate-on-website-after-payment.md) | Members activate on the website after payment; the card's first tap links the card | superseded in part by 0013 (page kept as the welcome page) | 2026-11-15 |
| [0006](0006-network-base.md) | Keys live on Base, tested on Base Sepolia | live half superseded by 0010 | 2026-11-15 |
| [0007](0007-door-trusts-our-database.md) | The door checks our admissions list; guests show the QR key Unlock emails them, with an audited staff fallback | door half superseded by 0012 | 2026-11-15 |
| [0008](0008-signer-custody-and-libraries.md) | A grant-only server signer, a separate cancel authority, and the Safe SDK with viem | accepted | 2026-11-15 |
| [0009](0009-refund-cancels-key.md) | A manual refund puts the admission on hold at once and cancels the key on chain afterwards | accepted | 2026-11-15 |
| [0010](0010-live-on-polygon.md) | Live keys run on Polygon; testing stays on Base Sepolia | accepted | 2026-11-16 |
| [0011](0011-signet-members-lock.md) | The members token is Signet: one non-expiring, non-transferable key per member | accepted | 2026-11-16 |
| [0012](0012-check-in-on-events-by-unlock.md) | Check-in runs on Events by Unlock, with one event lock per event | direction accepted; tickets per 0014 | 2026-11-16 |
| [0013](0013-wallet-we-control-created-at-payment.md) | Sign-up is social; we control each member's wallet, created when payment is confirmed | accepted | 2026-11-16 |
| [0014](0014-extra-tickets-bought-by-the-holder.md) | Tickets are separate from Signet; holders get one free Ticket and may buy extras, with every QR sent to them | accepted | 2026-11-16 |
| [0015](0015-autonomous-page-first-ecommerce-delivery.md) | Autonomous page-first ecommerce delivery | accepted; UI-first ordering replaced by 0032 | 2026-11-18 |
| [0016](0016-public-help-uses-canonical-commerce-content.md) | Public Help uses canonical commerce content | accepted under delegated design authority | 2026-11-18 |
| [0017](0017-in-app-browser-guidance-not-redirects.md) | In-app browser guidance stays user-controlled | accepted under delegated design authority | 2026-11-18 |
| [0018](0018-cart-uses-existing-account-owned-provider.md) | Cart uses the existing account-owned provider | accepted under delegated design authority | 2026-11-18 |
| [0019](0019-order-pages-read-native-owner-filtered-records.md) | Order pages read native owner-filtered records | accepted | 2026-11-18 |
| [0020](0020-checkout-scaffold-aliases-existing-purchase.md) | Checkout scaffold aliases the existing purchase flow | accepted | 2026-11-18 |
| [0021](0021-site-route-errors-use-navigation-only-recovery.md) | Site route errors use navigation-only recovery | accepted | 2026-11-18 |
| [0022](0022-cart-drawer-composes-existing-account-owned-cart.md) | Cart drawer composes the existing account-owned cart | accepted | 2026-11-18 |
| [0023](0023-native-variants-own-edition-identity.md) | Native variants own edition identity | accepted technical direction; activation not authorized | 2026-11-18 |
| [0024](0024-book-presentation-consumes-authoritative-editions.md) | Book presentation consumes authoritative editions | accepted for presentation; runtime not verified | 2026-11-18 |
| [0025](0025-read-only-route-errors-retry-in-place.md) | Read-only site pages offer Try again in place | accepted for source; amends 0021 | 2026-11-18 |
| [0026](0026-grant-fee-cap-usd-010.md) | Each on-chain grant or recovery transaction is capped at USD 0.10 in fees, paid by us | accepted | 2026-11-22 |
| [0027](0027-owner-only-override-until-second-approver.md) | The owner alone approves signer recovery (override mode) until a second approver is added | accepted | 2026-11-22 |
| [0028](0028-signer-recovery-runbook.md) | A stuck signer nonce is recovered by hold, then a same-nonce zero-value self-send that outbids by at least 10% | accepted; runbook still a draft | 2026-11-22 |
| [0029](0029-nfc-iphone-only-ntag-424-light-up-card.md) | NFC is built and tested for iPhone only, on our own NTAG 424 DNA metal card that lights up | accepted | 2026-11-22 |
| [0030](0030-hideaway-template-arc-primitives.md) | The Hideaway is the template for look and interaction; Arc supplies primitives and forms only | accepted | 2026-11-22 |
| [0031](0031-all-editions-launch-together.md) | All editions launch together | accepted | 2026-11-22 |
| [0032](0032-backend-first.md) | Backend first; the frontend just needs to exist and stay modular | accepted; amends 0015 | 2026-11-22 |
| [0033](0033-no-blocking-gates-assume-it-works.md) | Nothing blocks on a missing fact: assume it works and note what changes when it is real | accepted | 2026-11-22 |
| [0034](0034-no-legacy-orders-forward-compatible-rules.md) | No compatibility with past orders; new orders record the rule version they were made under | accepted direction; implementation in review | 2026-11-22 |
| [0035](0035-single-membership-token-per-account.md) | Single membership token per account | accepted scope; enforcement in review | 2026-11-22 |
| [0036](0036-record-architecture-decisions.md) | Record architecture decisions (design; was design ADR 0001 on feature/product-production) | accepted | 2026-11-15 |
| [0037](0037-colour-mode-follows-the-hideaway.md) | The colour mode is set the way The Hideaway sets it (design; was design ADR 0002 on feature/product-production) | accepted | 2026-11-15 |
| [0038](0038-motion-library-split.md) | Motion leads; Lenis scrolls; Tailwind handles colour and opacity (design; was design ADR 0003 on feature/product-production) | accepted | 2026-11-15 |
| [0039](0039-page-change-next-transition-router.md) | Page changes run through next-transition-router (design; was design ADR 0004 on feature/product-production) | accepted | 2026-11-15 |
| [0040](0040-base-ui-primitives-vaul-sheets.md) | Base UI for primitives; Vaul for drawers and sheets (design; was design ADR 0005 on feature/product-production) | accepted | 2026-11-15 |
| [0041](0041-icon-set-phosphor.md) | Icons move to Phosphor (design; was design ADR 0006 on feature/product-production) | accepted | 2026-11-15 |
| [0042](0042-tanstack-form.md) | Forms use TanStack Form (design; was design ADR 0007 on feature/product-production) | accepted | 2026-11-15 |
| [0043](0043-type-setup-follows-the-hideaway.md) | The type setup follows The Hideaway, on a 16px root (design; was design ADR 0008 on feature/product-production) | accepted | 2026-11-15 |
| [0044](0044-three-layer-colour-tokens.md) | Colour tokens in three layers, under The Hideaway's names (design; was design ADR 0009 on feature/product-production) | accepted | 2026-11-15 |
| [0045](0045-amber-means-refuse-at-the-door.md) | Amber means refuse at the door | accepted; live verification pending | 2026-11-25 |
| [0046](0046-separate-guest-lock-behind-an-off-switch.md) | A separate Guest lock, built behind an off switch | accepted build only; activation off | 2026-11-25 |
