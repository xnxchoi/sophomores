# SPH-I18N-KOMIRROR-20261113-01 rework cycle 2 of 3, 2026-11-13

Candidate `598f4a45f8ee3e3d31a121dca6f1bd23e352bbba` (full diff from `32a3045`:
`b3853ca4…2766`). Reviews:

- Specialist: **PASS**.
- Santa A: **PASS**, with one LOW.
- Santa B: **FAIL**, 1 MEDIUM.

The two Santa reviews were independent. Both flagged the same line. Santa A rated it LOW
and Santa B rated it MEDIUM, because the file is a live planning document that is not
labelled historical.

## Required

1. `docs/reference/ticket-account-planning-20261110.md:323` still says "render through
   next-intl, and leave `messages/ko.json` unchanged". The custodian adds this file to
   your owned paths, for that sentence only. Reword it to: "render through next-intl,
   and make the matching structural `messages/ko.json` change (`""` for new keys) per
   AGENTS.md". Make no other edit to that document.

Leave `korean-copy-passes/00-run.md:18`, `05-coverage-findings-and-task.md:144` and
`korean-copy-calibration.md:17` unchanged as historical run records. The custodian is
separately updating the batch shared rules on main.

No Node workload is needed for this Markdown-only change. Run `git diff --check 32a3045 HEAD`.
Commit a new commit with no amend, append a "Rework cycle 2" section to the handback, and
send one `worker_done`.
