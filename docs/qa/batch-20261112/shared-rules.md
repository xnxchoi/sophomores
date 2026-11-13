# Batch 2026-11-12 — shared executor rules

Applies to every assignment in this batch. The registry (`docs/To-Do List.md`) and
`docs/reference/backlog-execution-plan.md` govern. Custodian: Orca terminal
`term_657cd5a3-8919-49a4-a057-e124be9e626e`. Read the repo `AGENTS.md` first.

- **Identity:** start from the main commit that adds this file (child of pushed `66a36ea`), as created by
  Orca. If your branch is not already `codex/<assignment-slug>`, rename it to that as
  your first action. Record HEAD, branch, path and tracked status before editing.
- **Scope:** edit only your owned paths. No package, lockfile, config, script,
  migration/schema change. Any English key change makes the matching structural
  `messages/ko.json` change in the same commit (`""` for new keys); never alter
  existing Korean text (AGENTS.md, owner decision 2026-11-13). Never touch other checkouts. No
  force/reset/stash/clean. Commit your candidate on your branch, but do not merge,
  push, mark parents complete or archive.
- **Dependencies:** if you need Node, create a `node_modules` symlink to
  `/Users/seanschoi/Projects/sphmrs/node_modules`; main uses the same arrangement.
  Never install, `npx` or copy environments.
- **Data/providers:** no DB, provider, RPC, email, credentials or `.env`. Leave
  `DATABASE_URI`, `MEMBER_AUTH_TEST_DATABASE_URL` and `COMMERCE_PAYLOAD_DATABASE_TESTS`
  unset. No services except synthetic loopback test fixtures.
- **Payload-native DB only (owner rule, 2026-11-13; AGENTS.md "Database: Payload-native first").**
  Even when a DB is authorized, do not change any Payload-used table, row or schema
  directly until every Payload-native method has been tried and recorded. This also
  covers fixtures and seeds. New data shapes must be Payload collections or fields,
  added through Payload migrations.
- **Resources:** another worker runs concurrently. Before every Node workload, check
  `sysctl hw.memsize` / `vm_stat` headroom of at least 10 GiB. Run one workload at a
  time via `python3 scripts/resource-guard.py --max-gib 1.5 --node-old-space-mib 1024
  --min-headroom-gib 10 --timeout 1200 --log <checkout-local path> -- …`, with
  checkout-local `TMPDIR`. Never raise limits or retry unguarded after a stop; report it.
- **Reviews:** no nested agents. The custodian runs specialist review and two
  independent Santa reviews after your handback.
- **Handback** (via `worker_done`; questions via `ask`): assignment ID,
  candidate/blocked state, exact HEAD/branch/path, diff hash, changed files, checks
  with actual output and failures, unmet criteria, remaining processes. Persist it
  as `docs/qa/batch-20261112/<slug>-handback.md` in your worktree first. Report
  failures plainly; never manufacture a pass.
