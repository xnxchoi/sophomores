# Architecture Decision Records

Architectural choices and the reasons behind them. Each record is short and stays in place once written: a later record supersedes an earlier one rather than rewriting it.

**How status works.** The owner decides. An ADR stays *proposed* until the owner ticks its item in *Waiting for you* in the live plan (`docs/qa/auth-payment-nfc/consolidation.md`). It is then marked *accepted* and added to the plan's decision ledger. Product and policy choices (names, refund windows, launch timing) go in the ledger only, not here.

ADRs are written on `codex/auth-payment-nfc` and reach `main` with that branch's merges.

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
