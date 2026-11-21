# ADR-0029: NFC is built and tested for iPhone only, on our own NTAG 424 DNA metal card that lights up

**Date**: 2026-11-22 (decided 20–21 Nov)
**Status**: accepted (owner)
**Deciders**: owner; NFC and Sourcing lanes implement; written by Maintenance on coordinator dispatch

## Context

Members get a physical NFC card that is checked with NXP NTAG 424 DNA secure taps (ADR-0003). On 20–21 Nov the owner settled the device and the card. On devices: "we don't have an Android." The coordinator later recorded the owner's answer as iPhone only, and corrected an agent that asked again about borrowing an Android. On the chip: "We're going to use NFC N-tag DNA 424 per NXP's specs that have encrypted authentication methods." On the card: "we're trying to create our own version of a metal card with actual NFC authentication built in, and obviously light up as well." The owner's hardware list said "NTF44 DNA", which is read here as NTAG 424 DNA (NT4H2421), as in ADR-0003. On loss: "Upon losing the NFC card… revoke the key, basically issue another one and give it to them."

## Decision

- **iPhone only.** Provisioning, tap reading and testing target iPhone. No Android device is sourced or supported for launch.
- **Card.** Our own card: an NTAG 424 DNA inlay with encrypted (SUN) authentication, a metal plate, a printed PVC face with light windows and an NFC-powered LED that lights up on a tap.
- **Loss.** A lost card's key is revoked and a new card is issued.

## Alternatives Considered

### Tangem-style card
- **Why not**: the owner, verbatim: "Tangem style, just don't… We just have to go with what we have."

### Support Android too
- **Why not**: there is no Android device to build or test on.

## Consequences

### Positive
- One reading path to build and test before launch.

### Negative
- Android phones are not supported at launch.

### Risks
- Read range through the metal plate and the LED coil. The Sourcing lane tracks this.
