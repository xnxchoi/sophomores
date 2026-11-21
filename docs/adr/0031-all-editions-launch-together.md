# ADR-0031: All editions launch together

**Date**: 2026-11-22 (decided 19 Nov)
**Status**: accepted (owner)
**Deciders**: owner; UI-Commerce and Auth lanes implement; written by Maintenance on coordinator dispatch

## Context

The book is sold in editions (ADR-0023, ADR-0024). An earlier note recorded "book only" for launch. On 19 Nov the owner listed "there are 3 variants: 1) book only 2) book + ticket + others 3) premium version of 2 …" and then corrected the launch scope: "Umm, no, all editions need to be there." The coordinator's ledger dates this 19 Nov; the plan's to-do list dates it 20 Nov, when it was found recorded only in a lane's state file. That every edition launches at the same time is the lanes' reading of the owner's words.

## Decision

Every edition is on sale from launch. No edition is held back for a later release.

## Alternatives Considered

### Book only at launch
- **Why not**: superseded by the owner's correction.

## Consequences

### Positive
- One launch, one set of product pages and checkout paths.

### Negative
- Every edition's content, price and fulfilment must be ready by launch.

### Risks
- A missing fact for one edition. Under ADR-0033 it does not block work: build as if it exists and note what changes.
