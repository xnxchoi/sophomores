# T004 I2 — cycle-2 review rubric

**Candidate:** branch `codex/t004-i2-20261114`, HEAD `61f5ceb` (code `7ecc6c7`). It merges main and builds on cycle-1 candidate `8dd7703`. Worktree: `orca/workspaces/sphmrs/t004-i2-20261114`.

**Contract:** `docs/qa/t004-i2-20261114/spec.md`, `amendment-1.md` and **`rework-1.md`**, plus the I2 row and §C/§P of `docs/qa/t004-a-20261111/reconciliation-design.md`. Approved scope extension: the read-only `paymentTransactionOutcome(req)` export in `src/lib/commerce/_shared/transaction.ts`.

**Read-only:** git and file reads only. No Node, Docker, DB or edits.

PASS only if all hold; otherwise FAIL with file:line evidence.

1. Every item in `rework-1.md` is fixed (HIGH 1–3, MEDIUM 4–9, LOW 10–14, hygiene). Each fix needs a test that would fail without it. Judge whether the tests really prove the behaviour; a name is not enough.
2. The cycle-1 rubric (`review-rubric-c1.md`) items 1–6 still hold. In particular:
   - one operation per attempt;
   - durable debit before dispatch;
   - server-owned policy matching the spec table;
   - placement under `src/payload/`;
   - no change outside the payment `secureEndpoint` path.
3. The fixes introduce no new defect. Check specifically:
   - a webhook non-2xx loop or retry storm;
   - a second connection still being taken while a settlement transaction is open;
   - a proven rejection releasing capacity or holds it shouldn't;
   - the custodian ruling (automatic-only cooldown and 30-min escalation) letting explicit operations bypass the budget, ceiling or lifetime;
   - early release of a crashed holder's reservation.
4. Hygiene: no home paths, secrets, raw logs or host process audit in committed files.

**Report:** verdict, then findings by severity (CRITICAL/HIGH/MEDIUM/LOW) with evidence, under 700 words.
