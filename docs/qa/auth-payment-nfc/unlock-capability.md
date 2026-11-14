# Capability: Unlock keys from payment to door

This contract applies to `codex/auth-payment-nfc`. Its decisions are recorded in the ADRs at [docs/adr/](../../adr/README.md). Its open questions are items 0 to 7 under *Waiting for you* in the plan. It adds no second plan: the work order stays in [consolidation.md](consolidation.md).

## Capability

- **Primary actors:** the paying member; the guest invited through a paid invite; door staff; the owner, for refunds.
- **Outcome after ship:** every paid entitlement ends up as exactly one Unlock key, held by the member's Safe or delivered to the guest by email. The key admits its holder at the door exactly once per event.
- **Success signal:** on Base Sepolia, a test purchase goes all the way through: settle, recipient, confirmed key, one admission. The same proof runs with a failure and with a refund.

## Constraints

**Fixed by the owner, in the ledger:**
- Safe with a passkey owner (ADR-0001).
- Guests email-only (ADR-0002).
- One unit per buyer.
- Payment grants membership.
- The guest invite is a separate paid product that skips the membership gate.
- Customised product: refunds only by hand.
- Mechanisms live on this branch; pages read states only.

**Invariants:**
- A payment stays paid whatever the chain is doing.
- One paid entitlement gets at most one key, so a repeated settle never grants twice.
- A key counts as "issued" only once the grant is confirmed on chain.
- An admission is used up atomically, once.
- Never invent a placeholder recipient address.

**Trust boundaries:**
- The grant signer can only grant (ADR-0008).
- Cancelling uses a separate authority.
- Door staff are identified by `isCmsStaff`.
- A sign-in passkey approval is never replayed as a wallet signature (ADR-0005).

**Repo rules:** Payload collections and migrations go under `src/payload/`; no runtime DDL; library-first; tests under `tests/`; resource-guarded runs.

**Approvals still separate:** installing packages, creating or funding a signer, any RPC or provider call, mainnet, deployment.

## Actors and surfaces

| Actor | Surface | State they see or change |
| --- | --- | --- |
| Member | Member page: "Activate your membership" | no key → activated (wallet fixed) → key issued |
| Guest | QR key emailed by Unlock (we send no guest email) | key issued → checked in |
| Door staff | Check-in screen (CMS staff sign-in) | admission → checked in, with staff fallback logged |
| Owner | Admin: refund | paid → refunded; admission on hold; key cancelled |
| Worker | Background job | intent `awaiting_wallet → pending → submitted → granted`, plus failed-retryable, ambiguous and cancelled |

## States pages may read

Pages read these states and nothing else: no key, key pending, key issued, activated, checked in, on hold. They read them through server helpers on this branch. Pages never read chain state directly.

## Data implications

- **New collections:** key-grant intents (ADR-0004); member wallets (Safe address, chain, passkey credential ID).
- **Extended:** admissions, with key and token identity, hold and check-in method.
- **Later:** NFC chips and tap intents.
- **Fix first:** the cumulative reservation allowance of 3 (`src/lib/commerce/reservations.ts:68`), which should be 1. The current guest code requires an account (`src/lib/commerce/guests.ts:116`), which contradicts ADR-0002.

## Non-goals

- NFC card hardware, chip programming and SUN verification are post-launch (Gemini proposal, taken in).
- Mainnet funding and deployment.
- Changes to the KRW payment flow itself.
- Page design. Pages consume the states above.

## Decisions

Items 0 to 7 were accepted on 2026-11-15 and are in the plan's ledger; ADR-0004 to 0009 are accepted. The guest key is the QR code Unlock emails.

Still open: lost-passkey reissue, and the door fallback when the database or network is down.

## Handoff

- **Ready to build now** (it doesn't depend on items 1 to 7): the key-grant intent collection and worker skeleton (ADR-0004), the buyer-limit fix, and offline tests. It needs no install and no network.
- **Next, after item 0:** activation (ADR-0005), Safe and Unlock adapters on Base Sepolia (ADR-0006, 0008; packages shown to the owner before install), the door and the paid guest path (ADR-0007), cancellation (ADR-0009).
- **Lane:** Codex-led backend (multi-backend), following plan → build → Codex review. Antigravity reviews the activation and key-status screens once item 1 is answered.
