# T004 I2 — cycle-3 (final) review rubric

**Candidate:** branch `codex/t004-i2-20261114`, HEAD `e8983be`, code `dc83d75`. It builds on cycle-2 candidate `61f5ceb` and merges main. Worktree: `orca/workspaces/sphmrs/t004-i2-20261114`.

**Contract:**
- `spec.md`, `amendment-1.md`, `rework-1.md` and **`rework-2.md`**;
- the I2 row and §C/§P of `docs/qa/t004-a-20261111/reconciliation-design.md`.

**Approved scope extensions:**
- the read-only `paymentTransactionOutcome` export (`_shared/transaction.ts`);
- `projectLocalResult` exported from `result.ts`;
- a typed completed-response error and text-then-JSON classification in `tickets/portone/runtime.ts`, with the request, deadline and headers unchanged;
- a bounded I1 order-address decoder repair in `result.ts`.

This is a read-only review: git and file reads only. No Node, Docker, database or edits. This is the last cycle, so report only real, evidenced defects.

PASS only if all of the following hold; otherwise FAIL, with file:line evidence for each finding.

1. **Every rework-2 item is fixed.** That means HIGH 1–2, MEDIUM 3–7 and LOW 8–12. Each fix needs a test that would fail without it; check what the test actually does, not its name.
2. **Rework-1 and cycle-1 guarantees still hold.**
   - Exactly one operation per attempt.
   - A durable debit is recorded before any dispatch.
   - Policy is server-owned and matches the spec table.
   - Placement is under `src/payload/`.
   - Nothing changes outside the payment `secureEndpoint` path apart from the approved extensions.
   - A crashed holder's reservation is kept until expiry.
   - Proven rejections are never recorded as unknown.
3. **No new defects.** Check specifically:
   - webhook acknowledgements: no retry loop, and no 2xx for an event that was never processed;
   - ledger pool sizing and busy handling;
   - the I1 decoder repair: it must not loosen the snapshot comparison on customer-entered fields, and must not leak unknown fields to the buyer;
   - `runtime.ts` must not put the body or credentials into errors.
4. **Hygiene.** Committed files contain no home paths, secrets, raw logs or host process audit.

**Report:** a verdict, then findings by severity (CRITICAL, HIGH, MEDIUM, LOW) with evidence. Under 700 words.
