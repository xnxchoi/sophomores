# SPH-T002-A-20261113-01 — dispatch custody

The owner set Unlock as the priority, with local work first, on 2026-11-13. Spec frozen at main
`38f9dfe`.

- Run `run_8a16b71cf6a4`, Task `task_6cd2b114a5e2`, Dispatch `ctx_aa60f81d34d1`.
- Worktree `/Users/seanschoi/orca/workspaces/sphmrs/t002-a-20261113`.
- Agent: Codex. Default model; setup skipped. Markdown-only, no Node.
- Prelaunch admission: 48 GiB physical, 14.69 GiB available, 9.64 GiB accounted, no
  unreadable PIDs.
- The prompt arrived as an unsent draft. The custodian submitted it with Cmd+Enter
  (`ESC[13;9u`); the screen then showed "Working".

## Review cycle 1, 2026-11-13

Candidate `581c2ab` (diff `4b7ee5e9…5309`). Custodian checks pass. Reviews:

- Specialist: FAIL, 1 HIGH (paid settlement could become a no-op) and 3 MEDIUM.
- Santa A: FAIL, 2 MEDIUM.
- Santa B: FAIL, 3 MEDIUM.

The Santa reviews were independent. Corrections are in [rework-1.md](rework-1.md),
committed at `8aa1476`. They were sent as follow-up Task `task_dcf1e35b7dae`, Dispatch
`ctx_27f5ebfd9eec`, and submitted with Cmd+Enter.

## Rework cycle 1 handback and owner-decision follow-up, 2026-11-13

The rework-1 candidate is `bd0a231` (diff `092950e3…5f25`). It was finished before the
owner's later T002 decisions reached the worker: name check-in removed, and cancelled
payments release their units (main `a8d18cc`). Those decisions arrived as follow-up
Task `task_af5f7e9f9853`, Dispatch `ctx_0e27792b9d8c`, submitted with Cmd+Enter. Review
of cycle 1 waits for that follow-up commit, because reviewing `bd0a231` now would only
be invalidated by it.

## Review cycle 2, 2026-11-13

Candidate `ba398cf`, full diff `76ad08ab…741e`. Reviews:

- Specialist: FAIL (2 MEDIUM).
- Santa A: FAIL (1 MEDIUM).
- Santa B: FAIL (1 MEDIUM).

The Santa reviews were independent. The shared MEDIUM is that used-unit cancellation
went beyond the owner's decision; the custodian ruled from the cited source lines. The
specialist also found that no kernel command owns attendance. Corrections are in
[rework-2.md](rework-2.md).

## Review cycle 3 and owner-authorized fourth fix, 2026-11-13

Candidate `6c8b1ae`, full diff `58e516d1…dd3a`. Reviews:

- Santa A: PASS, LOW only.
- Santa B: PASS, LOW only. The two Santa reviews were independent of each other.
- Specialist: FAIL, 1 MEDIUM: self activation has no current owner.

With three cycles used, the custodian escalated to the owner. The owner chose "one narrow 4th fix": the specialist re-checks only that gap, and acceptance follows if it passes. Corrections are in [fix-4-owner-authorized.md](fix-4-owner-authorized.md).

## Acceptance and integration, 2026-11-13

- **Fix-4 candidate:** `5c3f459`, full diff `bbd3486f…c32a`.
- **Specialist re-check:** questions 1–6 PASS. The specialist could not run git, so the custodian verified question 7: the delta touches only `model.md` and `handback.md`, exactly at the expected hunks. Result: PASS.
- **Santa reviews:** PASS/PASS on `6c8b1ae` in cycle 3. Fix 4 was the owner-authorized narrow exception.
- **Merge:** main `16a07eb`.
- **Integration gate:** shared with the Korean mirror. Typecheck exit 0; default suite with only the 2 known failures.
- **Runtime:** worker released, transcript captured, worktree retained.
