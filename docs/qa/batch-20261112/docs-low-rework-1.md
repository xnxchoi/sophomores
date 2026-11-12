# SPH-DOCS-LOW-20261112-01 rework cycle 1 of 3, 2026-11-12

Candidate `c85cc3735581604f5689be2b399ef6c386eda639`. Custodian checks: PASS. Reviews:

- Fact-accuracy specialist: PASS, LOW only.
- Santa A: **FAIL**, 1 MEDIUM.
- Santa B: PASS, LOW only.

The two Santa reviewers did not see each other's work. The custodian verified that
`8efbb0a` (Batch 7c, "align component source ownership") is an ancestor of the pushed
`fb4ca49`, and that `e7e8fdd` is in main. Spec and owned paths are unchanged.

## Required

1. **Owner-approval framing (MEDIUM; A F1, B F5).** At
   `docs-rework-custodian.md:42-45`, write the owner's approval with its real terms
   only, followed by the run fact as its own sentence. For example: "…subject to
   resource admission. The runs used the existing `node_modules` symlink to the
   original install; nothing was installed or copied."

## LOW items, apply

2. T001 (`To-Do List.md:204`): restore the archive's words "are explicit but not launch
   dependencies" (archive :707).
3. Plan :38: keep "candidates" and keep reviews visibly required, within the 40% cap.
   For example: "Markdown-only candidates: stdlib/link/git checks replace app checks,
   not required reviews." Record the new byte count and ratio.
4. In `docs-rework-custodian.md`, put a label such as "Recorded findings (as at
   `914ce48`):" before the follow-up bullets (:140-146). That way the bullets read as
   history.
5. Handback: say that the T001 link targets the archived T001 section, not an
   owner-clarification anchor. Base the 7c claim on the custodian's ancestry check
   above, not on your own checker output.
6. Optional: label the proposals "Split/merge, orchestration and external-model
   proposals" (`To-Do List.md:164`).

Do not change the panel row :51 again. The custodian refreshes the review-state
wording there, and in the ledger's "requires … reviews" sentence, at integration.

Rerun your standard-library checker: links, byte gates, task IDs, the financial hash
and `diff --check`. Commit new commits with no amend, append a "Rework cycle 1" section
to the handback, and send one `worker_done`.
