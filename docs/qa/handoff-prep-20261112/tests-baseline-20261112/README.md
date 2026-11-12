# TESTS re-scope — full default baseline, 2026-11-12

Assignment SPH-HANDOFF-TESTS-20261112-01, re-scoped by the owner on 2026-11-12 to
allow the two provider-free loopback fixtures under local-check authority. The
custodian ran it directly on main; no new worker was dispatched.

## Run identity

- Source: main `c583fd455414b896651a3404b6ba74422d537465` in
  `/Users/seanschoi/.codex/worktrees/main-history-integration/sphmrs`. The tests under
  `tests/` are unchanged since the audit base `81af0af`.
- Command: `TMPDIR=<session scratchpad> python3 scripts/resource-guard.py --max-gib 2 --node-old-space-mib 1024 --min-headroom-gib 10 --timeout 1200 --log … -- node tests/run-unit.mjs`.
  This is the default suite: no `--functional`/`--styling`/`--database` flag, and
  the runner serializes files.
- Dependencies: the checkout's existing `node_modules` symlink to the original
  checkout's install. Nothing was installed, linked or copied.
- Environment: no `DATABASE_URI`, `MEMBER_AUTH_TEST_DATABASE_URL` or
  `COMMERCE_PAYLOAD_DATABASE_TESTS` set, and no `.env` in the checkout, so the
  database/provider suites took their skip paths. No provider, DB or email access.
- Admission ([census](census-pretests.json)): 48 GiB physical, 18.72 GiB available,
  12.83 GiB tool-accounted, no unreadable PIDs. That leaves about 2 GiB under the
  15 GiB aggregate ceiling, hence the 2 GiB job budget.
- Guard receipt ([metrics](default-baseline.metrics.json)): exit 1 from the tests
  themselves, peak 1.02 GB (0.95 GiB), 9 processes, 198 s, no remaining PIDs.
  The resource guard did not stop the run.

## Result — NOT green

2,631 tests: **2,587 pass, 5 fail, 39 skipped** (the existing opt-in skips), 0 cancelled.

| Failing test | Cause |
|---|---|
| `tests/authentication/authentication-chooser-layout.test.tsx` — desktop modal animation overrides | `src/styles/globals.css` imports `./sophomores-tailwind-v4.css`, which is absent |
| `tests/authentication/authentication-short-height.test.tsx` — short-modal spacing / scrollbar override | same missing import |
| `tests/preview/preview-tailwind.test.ts` — site Tailwind emits no auth-only utilities | same missing import |
| `tests/styling/deferred-article-grid.test.tsx` | owner-deferred CSS suite (known, non-blocking by contract) |
| `tests/styling/deferred-clock-delegation.test.ts` | owner-deferred CSS suite (known, non-blocking by contract) |

Both loopback fixture tests **passed**:
`ticket-selection-preview-http` ("isolated synthetic ticket fixture …", 319 ms) and
`review-preview-http` ("review visual fixture is isolated …", 279 ms).

## Root cause of the three functional failures

`src/styles/sophomores-tailwind-v4.css` holds the brand colour `@theme` tokens. The
first line of `.gitignore` has ignored it since commit `2a15c16` (2026-10-03), and it
has never been tracked. It exists only in the original checkout
(`/Users/seanschoi/Projects/sphmrs/src/styles/`, 4.8 KB, SHA256
`3aa00d30c0b4e5d84fe71c4d6ba4371d68ac5bcf51751800c39850017f6bf528`).

Consequence: any clean checkout, worktree, CI job or image built from Git cannot
compile `globals.css`. Earlier "0 fail" functional receipts presumably ran where the
ignored file existed. This is a **source-control defect and an image/build gate**,
not a test defect. The custodian did not copy the file in to turn this baseline
green.

## Cleanup consequence

The tests contract says a failed baseline blocks deletion and refactoring. Separately,
the original audit found no SAFE deletion candidate. The cleanup therefore remains
audit-only, with no test or artifact removed. The fix is to track the stylesheet and
remove its `.gitignore` entry. That is a source/config change routed as its own
assignment, not part of this test cleanup.

## Evidence files

- `default-baseline.log`: 460,405 B, SHA256 `382006b17304e2303041adc9d8b530bcf6515fa3ceaad015699cc304d91c3de3`.
  Kept local and untracked because of its size.
- `default-baseline.metrics.json`: SHA256 `3e1975da1d6e0bf7856e71b54bbc1575053e8247a29084fa500e2816cfd0826c`.
- `census-pretests.json`: SHA256 `b6ed329b31a710a230f218c9c5691b6527426dc8a9872b27a62e45cf4ff5875d`.
