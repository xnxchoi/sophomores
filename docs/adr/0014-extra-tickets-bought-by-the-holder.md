# ADR-0014: Tickets are separate from Signet; holders get one free Ticket and may buy extras, with every QR sent to them

**Date**: 2026-11-16
**Status**: accepted (owner, 2026-11-16, in chat); capacity is open (plan item 15)
**Deciders**: owner
**Supersedes**: ADR-0002 (guest keys emailed to the named guest); the guest-invite design (plan items 8 and 8b)

## Context

Signet is the membership (ADR-0011). Tickets are the per-event entry (ADR-0012). The owner decoupled the two on 2026-11-16 and simplified guests: there is no named guest.

## Decision

- **Every Signet holder gets one free Ticket** for the launch event, airdropped through the key queue (ADR-0004). Later events are out of scope.
- **Each Signet holder can buy extra Tickets**, up to a cap of 2. The cap is a setting kept in our database, keyed by the Signet holder, so 1, 3 or any number works without a blockchain transaction.
- **The holder pays, and every QR goes to the holder.** The holder passes a QR on to their guest. No guest name or email is collected.
- **Event lock settings:**
  - self-serve purchase on Unlock's event page turned off, so only our grant signer issues Tickets;
  - Tickets non-transferable;
  - the per-wallet key limit set well above any cap we'd use.
- **The guest invite build is reworked, not reverted.**
  - Kept: the separate paid product, settlement that skips the membership grant, and admission against capacity.
  - Removed: the named guest, the guest-pays option, the 48-hour hold, and Unlock emailing the guest.

## Consequences

- Several Tickets sit in one wallet. On Base Sepolia, confirm two things before relying on this:
  - each Ticket gets its own QR;
  - Unlock emails the QR when the Ticket is granted to a wallet rather than to an email address.
- Each Signet can mean up to 1 + cap entries, so capacity must count them (plan item 15).
- Whether extra Tickets are refundable is open (plan item 17). The refund hold and on-chain cancel (ADR-0009) stay available for them.
