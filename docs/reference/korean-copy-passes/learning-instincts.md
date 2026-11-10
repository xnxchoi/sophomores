---
id: ko-copy-shared-ready-state-is-not-new-registration
trigger: when writing Sophomores copy for a shared member-ready branch
confidence: 0.7
domain: ux-writing
source: session-observation
scope: project
project_id: 039441c45f40
project_name: sphmrs
---
# Shared readiness is not a new completion event

## Action
Check the transition as well as the state before announcing completed registration.
A shared member-ready branch reached by returning login is not evidence that
registration just finished. Restrict completion wording to a confirmed completion
event; otherwise choose a task-appropriate neutral result or hold the wording.

## Evidence
- Pass 1 A46/F09: fresh independent review found a new-registration announcement
  wrongly mapped to shared `status.member`; source also reaches it after login.
- Candidate applicability was narrowed and fresh dual review passed. This is a
  learned source-reading guard, not owner acceptance of a new Korean string.

---
id: ko-copy-fragment-recovery-distinguishes-refresh
trigger: when describing recovery of Sophomores invitations retained only in mounted memory
confidence: 0.7
domain: ux-writing
source: session-observation
scope: project
project_id: 039441c45f40
project_name: sphmrs
---
# Treat refresh and leaving as distinct recovery conditions

## Action
If the current flow strips a private fragment and keeps its token only while
mounted, account for both refreshing and leaving the page. Do not assume readers
understand refresh as leaving. Reopen the original received link before asking
for a replacement; do not imply a new token or successful claim is guaranteed.
Recheck actual retention behaviour before reusing this rule after T010 changes.

## Evidence
- Pass 4 D31/F49: one independent reviewer caught the omitted refresh case while
  the other passed it. The instruction was narrowed to the inspected current flow.
- The underlying resumable-claim design remains delegated, not solved by wording.
