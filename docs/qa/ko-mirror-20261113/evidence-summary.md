# Korean mirror — bounded validation evidence

Historical run excerpts from candidate `ea48182d9ebffd2821f6f1364753286dd1b854fe`.
No workloads were rerun for the pre-review fix. Full stdout logs were removed;
all seven original resource receipts remain byte-identical.

## Command envelope

Each command below ran in the worktree (`.`), with checkout-local
`TMPDIR=docs/qa/ko-mirror-20261113/tmp` and `DATABASE_URI`,
`MEMBER_AUTH_TEST_DATABASE_URL`, `COMMERCE_PAYLOAD_DATABASE_TESTS` unset, through:

```text
python3 scripts/resource-guard.py --min-headroom-gib 10 <limits> --log docs/qa/ko-mirror-20261113/<run>.log -- <command>
```

- Tests and preview: `--max-gib 1.5 --node-old-space-mib 1024 --timeout 1200`.
- Typechecks: `--max-gib 3.5 --node-old-space-mib 2048 --timeout 600`.
- Exact preview runner and synthetic-render limitations: [handback](handback.md#live-render-method-and-evidence).
- Counts marked N/A are not test counts: typechecks and the preview do not run a test suite.

## red

Command: `node --import tsx --test tests/i18n/catalog-contract.test.ts`.

Exit code: **1**. Counts: 5 tests / 3 pass / 2 fail / 0 skip.

Named failures and failing assertions (expected RED):

```text
✖ Korean catalogue exactly mirrors English structure, order and string leaves
✖ production merge falls back for empty plain, ICU and rich Korean messages
AssertionError [ERR_ASSERTION]: root
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
'' !== 'English'
ℹ tests 5
ℹ pass 3
ℹ fail 2
ℹ skipped 0
```

Receipt: [red.log.jl50hwuw.log.metrics.json](red.log.jl50hwuw.log.metrics.json); peak 261,832,704 bytes; remaining PIDs `[]`.

## focused

Command: `node --import tsx --test tests/i18n/catalog-contract.test.ts tests/i18n/next-intl.test.ts`.

Exit code: **0**. Counts: 12 tests / 12 pass / 0 fail / 0 skip.

Named failures: none.

```text
ℹ tests 12
ℹ pass 12
ℹ fail 0
ℹ skipped 0
```

Receipt: [focused.log.ajpak8nt.log.metrics.json](focused.log.ajpak8nt.log.metrics.json); peak 255,541,248 bytes; remaining PIDs `[]`.

## default-suite

Command: `node tests/run-unit.mjs`.

Exit code: **1**. Counts: 2686 tests / 2645 pass / 2 fail / 39 skip.

Named failures: the two previously deferred styling tests only.

```text
✖ deferred styling: article grid preserves its columns and readable type
✖ deferred styling: verification loops, account indicators and toast avoid CSS clocks
ℹ tests 2686
ℹ pass 2645
ℹ fail 2
ℹ skipped 39
```

Receipt: [default-suite.log.rdw6nyaw.log.metrics.json](default-suite.log.rdw6nyaw.log.metrics.json); peak 1,035,392,656 bytes; remaining PIDs `[]`.

## typecheck

Command: `node node_modules/typescript/bin/tsc --noEmit`.

Exit code: **2**. Counts: pass/fail/skip **N/A** (not a test suite).

Named failures: TS2769 in the two new provider assertions below; both omitted the required `children` prop, fixed before the final typecheck.

```text
tests/i18n/catalog-contract.test.ts(290,75): error TS2769: No overload matches this call.
tests/i18n/next-intl.test.ts(78,75): error TS2769: No overload matches this call.
```

Receipt: [typecheck.log.h_kviqv0.log.metrics.json](typecheck.log.h_kviqv0.log.metrics.json); peak 2,326,118,400 bytes; remaining PIDs `[]`.

## typecheck-final

Command: `node node_modules/typescript/bin/tsc --noEmit`.

Exit code: **0**. Counts: pass/fail/skip **N/A** (not a test suite).

Named failures: none.

```text
No compiler diagnostics; exit 0 (resource receipt).
```

Receipt: [typecheck-final.log.x1q7g59t.log.metrics.json](typecheck-final.log.x1q7g59t.log.metrics.json); peak 1,318,661,024 bytes; remaining PIDs `[]`.

## focused-final

Command: `node --import tsx --test tests/i18n/catalog-contract.test.ts tests/i18n/next-intl.test.ts`.

Exit code: **0**. Counts: 12 tests / 12 pass / 0 fail / 0 skip.

Named failures: none.

```text
ℹ tests 12
ℹ pass 12
ℹ fail 0
ℹ skipped 0
```

Receipt: [focused-final.log.yxk2_ye5.log.metrics.json](focused-final.log.yxk2_ye5.log.metrics.json); peak 284,033,024 bytes; remaining PIDs `[]`.

## live

Command: `node --input-type=module --eval "<in-memory runner in handback.md>" -- --i18n`.

Exit code: **143**. Counts: pass/fail/skip **N/A** (not a test suite).

Named failures: none; exit 143 is the deliberate SIGTERM after live review, not a resource stop.

```text
Composition fixture: http://127.0.0.1:3085
```

Receipt: [live.log.pd_cr7b7.log.metrics.json](live.log.pd_cr7b7.log.metrics.json); peak 566,575,104 bytes; remaining PIDs `[]`.
