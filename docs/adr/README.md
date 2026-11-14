# Architecture Decision Records

Architectural choices and the reasons behind them. Each record is short and stays in place once written: a later record supersedes an earlier one rather than rewriting it.

**How status works.** The owner decides. An ADR is *proposed* until the owner accepts the matching decision in the Control Room (the decision card links to the ADR). It then becomes *accepted*, and the decision is added to the ledger in `docs/qa/auth-payment-nfc/consolidation.md`. Product and policy choices (names, refund windows, launch timing) go in the ledger only, not here.

ADRs are written on `codex/auth-payment-nfc` and reach `main` with that branch's merges.

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [0001](0001-member-wallet-safe-with-passkey-owner.md) | Member wallet is a Safe with a passkey owner | accepted | 2026-11-14 |
| [0002](0002-guest-keys-by-email.md) | Guest keys are delivered by email through Unlock, without a wallet | accepted | 2026-11-14 |
| [0003](0003-nfc-first-tap.md) | The NFC card's first tap activates; afterwards the card is the check-in credential | accepted | 2026-11-14 |
| [0004](0004-key-grant-outbox-at-settle.md) | Payment settlement records a key-grant intent; a separate worker grants the key | proposed | 2026-11-15 |
| [0005](0005-activate-on-website-after-payment.md) | Members activate on the website after payment; the card's first tap links the card | proposed | 2026-11-15 |
| [0006](0006-network-base.md) | Keys live on Base, tested on Base Sepolia | proposed | 2026-11-15 |
| [0007](0007-door-trusts-our-database.md) | The door checks our admissions list; guests show their email key, with an audited staff fallback | proposed | 2026-11-15 |
| [0008](0008-signer-custody-and-libraries.md) | A grant-only server signer, a separate cancel authority, and the Safe SDK with viem | proposed | 2026-11-15 |
| [0009](0009-refund-cancels-key.md) | A manual refund puts the admission on hold at once and cancels the key on chain afterwards | proposed | 2026-11-15 |
