# Wallet catch-up one-shot (not enabled)

This candidate does not install a timer or change live data. Run it only after
review, an isolated rehearsal, and separate activation approval. It attaches
eligible recorded wallet targets; it does not call a chain or payment provider.

## Runtime and custody

- Use one designated Linux host and one service account for both manual and
  scheduled entry. The host's `/var/lib/sphmrs/wallet-catch-up` must be an
  existing directory owned by that account, mode 0700. All release versions
  must use that same host directory and lock inode. Do not unlink the lock to
  recover it. A container must mount that host directory, not a private copy.
- Run from a verified, immutable release checkout with Python 3, the pinned
  Node runtime, and frozen-lockfile dependencies including `tsx`. The standalone
  web image is not this runtime. Pin and rehearse the runner artifact separately.
  Verify the release externally; the supplied full SHA labels the receipt.
- Provide `DATABASE_URI`, the expected `SPHMRS_WALLET_DB_NAME` and
  `SPHMRS_WALLET_DB_ROLE`, `SPHMRS_WALLET_RELEASE`, and the existing required
  Payload and wallet configuration through the private service environment.
  The runner checks the connected database name and role before queue work.
  Keep automatic Payload jobs and schema application disabled for the runner.

## Invocation and recovery

The scheduler, if separately authorized, runs `python3 scripts/wallet-catch-up-runner.py scheduled`
once per minute. Manual recovery uses the same command with `manual` on that host.
Overlap and sub-minute invocations skip without enqueuing. A tick runs at most
one job ID, at most 20 rows, and never backfills skipped ticks. The worker has a
45-second deadline. An ambiguous enqueue is not retried in the same tick. A
later tick reuses a provably unstarted job; a stale processing job is cancelled
through Payload Local API after the host lock and checkpoint fence. That tick
does not run a page; a subsequent tick resumes from the committed checkpoint.
Ambiguous job state stops execution rather than deleting history.

Use `python3 scripts/wallet-catch-up-runner.py health` from an independent
monitor to detect missed ticks even when the runner is not invoked. It also
reports backlog with no checkpoint progress and repeated conflicts. Logs are
aggregate only. These are operating signals, not eligibility timestamps: the
target is attachment within 60 minutes in healthy operation for continuously
eligible work, assuming at most 520 candidates per sweep. No alert delivery or
monitor is installed here.

Before host transfer or rollback, stop scheduling and verify the old supervisor
and worker group have exited. Preserve the database checkpoint, job history and
host evidence. Do not run migration DOWN once progress exists. No multi-host
failover is supported; do not activate if single-host custody cannot be enforced.
