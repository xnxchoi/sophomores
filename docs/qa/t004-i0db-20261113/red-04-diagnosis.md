# RED-04 - unexpected operator-UI asynchronous failure in default discovery

## Observed result and stop

Remediation 4's sole local PostgreSQL matrix passed all seven scenarios (8/8
including its outer test), followed by a passing final core suite and one full
exact-final-source typecheck. The full default suite then exited 1 with **2833
tests: 2790 pass, 3 fail, 40 skipped, 0 cancelled**. This violates the required
gate of only the two known deferred styling failures.

The extra failure was `tests/commerce/admin/operator-ui-dom.test.tsx`, reported
as a file-level failure after its last named test had passed. Bounded output:

```text
PASS a failed later manifest page keeps Previous available
Test "a failed later manifest page keeps Previous available" generated asynchronous activity after the test ended.
This activity created the error "ReferenceError: window is not defined" and triggered an uncaughtException event.
FAIL tests/commerce/admin/operator-ui-dom.test.tsx
```

The other failures were exactly the prior known files:
`tests/styling/deferred-article-grid.test.tsx` and
`tests/styling/deferred-clock-delegation.test.ts`.

No test/code change, rerun, repeated DB probe, or second disposable instance was
performed after this finding. Scoped lint was already in flight before the
default summary was inspected; it finished successfully. The one new database
and dedicated volume had already been removed. Overall remediation acceptance
is **failed**, not a pass with this additional failure waived.

## Read-only source boundary and uncertainty

- The reported final test is at `operator-ui-dom.test.tsx:378`. It clicks
  Previous and waits for page text at lines 390-391.
- That file installs JSDOM globals at lines 35-39, runs UI cleanup in
  `afterEach` at line 45, then closes JSDOM and restores/deletes globals at
  lines 46-49.
- It does **not** import the modified `tests/support/payload-lifecycle.ts` or
  call `capturePayloadTestLifecycle`. Its source and UI implementation are
  outside this dispatch's owned paths and remain unchanged.

Late work outliving JSDOM teardown is consistent with the emitted diagnostic,
but the exact producer and root cause were not captured. This single run does
not establish flakiness, causality from remediation 4, or a production defect;
equally, it cannot be silently treated as one of the two known failures.

The custodian must classify the unexpected failure and scope any investigation,
fix or fresh default-suite rerun. There is no further local DB acceptance gap
demonstrated by this result and no authorization inferred for more DB runs.
