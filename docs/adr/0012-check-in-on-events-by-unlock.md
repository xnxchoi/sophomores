# ADR-0012: Check-in runs on Events by Unlock, with one event lock per event

**Date**: 2026-11-16
**Status**: direction accepted (owner, 2026-11-16, plan item 13); how holders get Tickets is now ADR-0014, and the NFC card binds to the account instead of opening the door; a dead-phone fallback is out of scope (plan item 17); to be confirmed on Base Sepolia before it is relied on
**Deciders**: owner
**Supersedes**: the door half of ADR-0007; the check-in half of ADR-0003

## Context

ADR-0007 had the door check our own admissions list through our own staff page, which needed a QR scanner in the browser. The owner pointed out that one entry per ticket is part of what Events by Unlock offers, and that only paid holders receive a ticket, so a ticket and an entry are one-to-one. Members also get a QR, and it is their main check-in.

Unlock's pages (checked 2026-11-16) say: any phone camera opens a ticket's QR; staff added as verifiers connect a wallet in the EVENTS app and check people in; a checked-in ticket is recorded as used and cannot be used again; ticket emails carry the QR. They don't say what a second scan shows.

## Decision

- **Each event gets its own event lock.** A check-in marks the key itself as used, so one membership key could only be used once. Signet (ADR-0011) stays the membership token and is not scanned at the door.
- **Each paid admission gets one ticket** on that event lock, granted through the key-grant queue (ADR-0004). Guests get it by email (ADR-0002). Members, as proposed in item 14, get it the same way.
- **Staff check in with Unlock's EVENTS app** as verifiers on the event lock, each with their own wallet. Unlock records the ticket as used.
- **A refund cancels the ticket on chain** (ADR-0009) before the doors open; until then its QR still admits.

## Alternatives Considered

### Our own door page against our admissions list (ADR-0007)
- **Pros**: works from our database, so refund holds apply at once; logs every attempt.
- **Cons**: needs a QR scanning package on iPhone, and one more staff surface to build and keep working.
- **Why not**: the owner chose Unlock's check-in (2026-11-16). The branch `codex/door-check-in-20261116` is not merged.

### One membership key scanned at every event
- **Why not**: a check-in marks that key used for good.

## Consequences

### Positive
- No door page, scanner package or door log to build; staff use a phone camera and Unlock's app.

### Negative
- The door depends on a network connection and Unlock's service.
- Refund cancels must run promptly; today they run only when called.
- Each event costs a lock deployment, plus one grant per ticket, in POL.
- Every door staff member needs a wallet.

## To confirm on Base Sepolia
- What the EVENTS app shows on a second scan of the same ticket.
- That a ticket granted to an email address on an event lock is emailed with its QR (to concierge@sophomores.co, plan item 11).

## Amendment (2026-11-20): Member and Guest ticket locks

**Superseded 24 Nov.** Owner, verbatim: "One lock + guest label at door". One Edition I lock per event, a distinct key per admission, and staff see guest or member at the scan. The two-lock text is kept as history.

**Owner, verbatim** (see the [20 Nov decision ledger entry](../qa/auth-payment-nfc/consolidation.md#member-and-guest-event-tickets-20-nov)):

> "I want to separate the 2 in price and benefit; one for the members, one for the guests. The guests are not  given gifts."

**Implementation note (ours):** This replaces the original single-lock and paid-only ticket assumptions. Each event has two Unlock ticket locks under one EVENTS event: Member (free, issued by the grant signer) and Guest (paid, price not yet set). Staff verify tickets from both locks under the same event. Neither lock is the Signet membership lock.

**Rollout gate (ours):** Unlock's documentation supports multiple locks under one event and shows that the scan result identifies the ticket title and lock. Before relying on this at the door, run a controlled Base Sepolia scan with one ticket from each lock under the same event. Confirm that staff can verify both, distinguish the ticket title and lock, and see that a second scan does not admit the same ticket again. The documentation is not a completed scan.
