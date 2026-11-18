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
| [0015](0015-autonomous-page-first-ecommerce-delivery.md) | Autonomous page-first ecommerce delivery | accepted | 2026-11-18 |
| [0016](0016-public-help-uses-canonical-commerce-content.md) | Public Help uses canonical commerce content | accepted under delegated design authority | 2026-11-18 |
| [0017](0017-in-app-browser-guidance-not-redirects.md) | In-app browser guidance stays user-controlled | accepted under delegated design authority | 2026-11-18 |
| [0018](0018-cart-uses-existing-account-owned-provider.md) | Cart uses the existing account-owned provider | accepted under delegated design authority | 2026-11-18 |
| [0019](0019-order-pages-read-native-owner-filtered-records.md) | Order pages read native owner-filtered records | accepted | 2026-11-18 |
| [0020](0020-checkout-scaffold-aliases-existing-purchase.md) | Checkout scaffold aliases the existing purchase flow | accepted | 2026-11-18 |
| [0021](0021-site-route-errors-use-navigation-only-recovery.md) | Site route errors use navigation-only recovery | accepted | 2026-11-18 |
| [0022](0022-cart-drawer-composes-existing-account-owned-cart.md) | Cart drawer composes the existing account-owned cart | accepted | 2026-11-18 |
| [0023](0023-native-variants-own-edition-identity.md) | Native variants own edition identity | accepted technical direction; activation not authorized | 2026-11-18 |
| [0024](0024-book-presentation-consumes-authoritative-editions.md) | Book presentation consumes authoritative editions | accepted for presentation; runtime not verified | 2026-11-18 |
