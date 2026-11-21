# ADR-0015: Autonomous page-first ecommerce delivery

**Date**: 2026-11-18
**Status**: accepted; its UI-first ordering is replaced by ADR-0032 (2026-11-19: backend first). The other delivery rules stand
**Deciders**: Owner (direct operating-policy instruction), coordinator four-voice council (Architect, Skeptic, Pragmatist, Critic)

## Context
Granular RED/GREEN, suite/coverage gates, repeated approvals and blanket environment-isolation requirements have delayed showing the owner the site and finishing commerce journeys. The owner explicitly removes those requirements and directs autonomous choices through council and ADRs. The original full functional ecommerce programme and existing single-owner responsibilities remain; deployment does not replace unfinished functionality.

## Decision
We deliver coherent pages and complete customer journeys autonomously through existing owners, using established installed/native facilities. Failed, no-op or unrun tests do not halt progress or cause automatic retries: checks occur at completed-page/whole-flow milestones, with targeted granular diagnostics for unfamiliar/custom behavior. We remove blanket production-isolation and project-level approval holds; for decisions that would previously have been escalated for explicit owner approval, council is strongly recommended, not mandatory; choose the fitting direction, record consequential decisions once, and execute without another owner-approval loop. Council is not an all-the-time tool or a prerequisite for routine implementation, ordinary ambiguity, checks, fixes or retries. Earlier project testing/coverage/TDD and proposal-acceptance rules yield to this later explicit owner direction.

## Alternatives Considered
### Keep fine-grained proof gates and isolated temporary environment requirements
- **Pros**: More granular failure attribution and reduced incidental side effects.
- **Cons**: Proof-packet/preview setup overhead displaces useful pages; synthetic results dominate priorities.
- **Why not**: Explicitly superseded by owner and disproportionate to this delivery task.
### Unstructured execution with no observation or decision record
- **Pros**: Minimal ceremony.
- **Cons**: Hides unfinished journeys and ownership conflicts; loses consequential rationale.
- **Why not**: Owner requests council/ADR for fitting direction, not unsupported completion claims.

## Consequences
### Positive
- Owners implement familiar commerce patterns and show working or imperfect pages earlier.
- Tests provide information without controlling schedules; one preview and clear ownership reduce contention.
### Negative
- Some regressions may be discovered later during page/flow use rather than microtests.
- Automated scores no longer provide a release-readiness shorthand.
### Risks
- Distinguish implemented, visibly exercised and unresolved behavior honestly; actual broken journeys inform repairs without freezing unrelated work.
- Preserve48GiB actual-host accounting,15GiB project aggregate and10GiB host headroom. The former2GiB preview allocation is not an owner hard limit and may be replaced by a measured fitting allocation.
- Removing blanket isolation does not require touching production unnecessarily or executing real charges merely to view pages. Use the most fitting working environment. Higher-priority/platform action-time confirmation requirements remain only where concretely applicable; an ADR cannot manufacture consent or override them.
- Record historic failed/no-op/unrun evidence without deleting it or claiming PASS. Do not reopen settled product decisions or shrink the programme to a marketing launch.

## Authority And Clarification

Accepted from the direct owner operating-policy reset, relayed by the sole
coordinator in `msg_d3f32ec4ed98`; this is not another proposal awaiting a checkbox.
The completed Architect/Skeptic/Pragmatist/Critic council is supporting rationale,
not evidence of owner product preference or observed functionality. The later
owner clarification controls: council is strongly recommended, never mandatory,
only for choices that otherwise would have needed explicit owner approval; it
is not a prerequisite for routine work, ordinary ambiguity, checks or retries.

Prior ADRs and product decisions remain in place in their actual scope. This
record supersedes earlier delivery-process TDD/coverage/test, blanket isolation
and proposal-acceptance holds, not the existing product programme, single-owner
responsibilities or host/project resource limits. No deployment, provider effect
or actual working-flow acceptance is asserted by recording it.
