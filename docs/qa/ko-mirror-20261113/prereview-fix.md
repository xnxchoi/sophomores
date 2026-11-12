# SPH-I18N-KOMIRROR-20261113-01 — pre-review fix, 2026-11-13

Candidate `ea48182d9ebffd2821f6f1364753286dd1b854fe`. The custodian independently
verified the substance:

- Key paths and order are identical to `en.json`.
- Every value is a string.
- All 175 previous values are byte-identical.
- 1,027 new keys are `""`.
- `en.json` is unchanged (`7078068f…`).
- Formatting matches: 2-space indent, no `\u` escapes, trailing newline.
- The fallback uses `mergeWith`.

**Deterministic check failed:** `git diff --check 32a3045 HEAD` reports trailing
whitespace in the committed raw logs (`default-suite.log.rdw6nyaw.log`, 395 KB, and
`red.log.jl50hwuw.log`). Committing whole logs also goes against the project's evidence
custody practice: receipts plus short excerpts, no full logs.

## Required

1. Remove the raw `*.log` files from the evidence folder and keep every
   `*.log.metrics.json` receipt. For each run, add a short excerpt with no trailing
   whitespace to the handback, or to one `evidence-summary.md`. Each excerpt gives the
   command, the exit code, the pass/fail/skip counts and the named failures. For the
   default suite, those are the 2 deferred-styling failures; for RED, the failing
   assertions.
2. Replace absolute home paths in the handback and excerpts with paths relative to the
   worktree.
3. Make `git diff --check 32a3045 HEAD` clean. Change nothing else: no source, test,
   catalogue or rule edits. Commit as a new commit with no amend, append a "Pre-review
   fix" section to the handback, and send one `worker_done`.
