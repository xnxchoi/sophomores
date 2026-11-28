# Carried-state collector fixture

`carried-collector.py` is an offline draft for review. It has no CLI or
host collector. It accepts a temporary fixture tree marked
`carried-state-fixture-v1`, not a VPS deployment path. No Docker, systemd,
network, admission write, or receipt publication is implemented.

- The test driver supplies a reference envelope and its digest separately
  from the observation. The fixture collector enumerates old tokens and pin
  files, checks both historical intent files against hashes in the envelope,
  hashes the manifest and v4 bytes, checks the v4 file identity, and
  enumerates destination tokens, intents, and unexpected top-level entries.
  Runtime evidence is explicitly synthetic; missing fixture data is not
  treated as an empty result.
- The collector acquires two distinct existing filesystem locks in
  preview/TLS order, then repeats the scan under the same held descriptors.
  Both scans must pass the comparator, and the lock path identities must
  still match. The attempt ID is newly generated in that lock scope, and the
  second scan must end within the attempt's monotonic time budget.
- Advisory locks cover cooperating writers only. These scans are neither an
  atomic filesystem snapshot nor a fence against a stale or uncooperative process.
- The return value is only `offline-collector-fixture-only`. The second scan
  models the pre-publication check; no publication occurs. Nothing returned
  here can prove trusted freshness after the locks close.

A live slice still needs the independently approved reference, read-only
Linux adapters for actual route/service/bridge/activity observations, proof
that old shells and units cannot act, and durable publication while both real
locks are held. It must not use a runtime JSON report as liveness evidence.
