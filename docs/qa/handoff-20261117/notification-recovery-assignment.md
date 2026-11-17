# N-01: Recover the Assigned Notification Focus Correction

Main coordinator: `run:run_bbf9450ca334`. Recovery coordinator:
Undine `run:run_f7d117af78fa`. Implementation owner: one supported recovered
Hamlet worker; do not use the idle shell as its mailbox.

## Existing State

Undine's read-only ownership check `msg_c301c4bd235e` confirms no current Hamlet
agent/writer. Historical `task_3a13fd1eac9e` / `ctx_6a599957c0db` is abandoned with
terminal missing, not merely silent. Its original screenshot prompt is obsolete.
Checkout HEAD is `f96d5fa21726cbbb51192792b232ef543229ec0b`.
`artifacts/hamlet-notification/manifest.json` pins patch SHA-256
`a42aa676342df90b0c9a99e2ef82f496b0f262e6b1be087b36089ff91373265e`.
Source/tests/fixture and checkpoint WIP must remain intact.

## Scope

Recover through the current version-matched Orca recovery guide, under Undine's
Run. Verify terminal/assignment custody again before any launch; retain failure
history and do not bypass a circuit breaker or change hook trust. Reattach or
reopen the historical assignment only through supported recovery, not a duplicate
worker or manual terminal steering. Report the actual new dispatch/mailbox.

Own only the previously assigned minimal neutral keyboard-focus correction for
the notification trigger in `src/components/shell/header-actions.tsx`, its focused
root-tests regression, and the existing notification checkpoint/evidence.
The lowercase source path is independently verified against the frozen manifest:
SHA-256 `5b51b0ad4262fac4a19f2cc1d7688b83bd6cad578174bba0026ca3cf2728985d`.
Verify the actual path against the frozen manifest before editing; if it differs,
return the exact path for coordinator confirmation instead of widening scope.
Preserve unrelated pending `header-panels.tsx` and checkpoint changes, all prior
notification behavior, original patch and tests. Do not normalize, revert or
stage someone else's work. Inventory and hash the baseline first.

## Acceptance

1. Characterize the current missing neutral keyboard-focus indicator with a
   failing focused test, then make the minimal Tailwind-only correction.
2. Recheck notification open/close, keyboard focus visibility, Escape and focus
   return without triggering reading/navigation; no action semantics change.
3. Resource preflight must account for all live agent descendants plus outside
   browser/MCP survivors, using actual physical footprint as well as RSS, with
   15 GiB aggregate and 10 GiB system headroom. A free-memory percentage alone is
   not evidence. Report uncertainty and do not launch if limits are unproven.
4. Reserve the heavy/browser lane with main before running a guarded workload.
   One guarded job per checkout, one browser driver, check port 3000 immediately
   before preview and never stop another session's process. Prefer existing
   proven resource-accounting tools; do not build a new harness as a side task.
5. Run focused RED/GREEN and required guarded validation once on the final
   candidate. Inspect actual live render at 390 and 1280, keyboard-visible focus,
   then a concise harsh Santa review. Retain failed/unknown checks in evidence.
6. Return exact scoped diff and hashes, tests/receipts, resources, live evidence
   and unresolved gates. Do not describe source/PNG review as live acceptance.

## Holds

No new h5/h6, typography, palette, logo/wordmark, layout, motion-timing, copy or
mechanism changes. Menu interception, target size, contrast and lack of a visual
baseline remain separate recorded findings, not automatically added to this fix.
No installs, provider/DB actions, trust/credential changes, push, merge, deployment
or cleanup. UI commit waits for owner live review. A fresh person-only prompt is
a real gate: report it; do not bypass or repeatedly relaunch.

If safe recovery or scope cannot be proved, report a concrete blocker without
creating a competing writer or redoing the full notification implementation.
