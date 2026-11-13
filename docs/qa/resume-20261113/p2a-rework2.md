# Resume: SPH-T002-P2A-20261113-01 rework cycle 2 of 3 (retry after a lost terminal)

Your previous session's terminal closed while you were waiting for an answer. Nothing
you did was lost. Your worktree still holds your **uncommitted cycle-2 work** on top
of `1f8d31c`: changes to `token-entitlements.ts`, the test, the contract and the
handback. Inspect it, keep it, and continue from it. Do not reset it and do not
discard it.

**The custodian has answered your pending question:** you are approved. Add the
`: never` return annotation to the throwing entitlement getter and make no other
change. Keep the failed typecheck receipt and the default-suite evidence. Rerun the
focused final coverage, then exactly one more full typecheck on the resulting exact
source (`--max-gib 3.5 --node-old-space-mib 2048 --min-headroom-gib 10 --timeout 600`).
That typecheck is the last run. If it fails, stop and report. Record the annotation
and the custodian's approval of the extra run in the handback.

Then finish rework cycle 2 as specified in
`docs/qa/t002-p2a-20261113/rework-2.md` (main `bdc362c`):
- commit new commits, with no amend;
- append a "Rework cycle 2" section to the handback;
- send one `worker_done`.
