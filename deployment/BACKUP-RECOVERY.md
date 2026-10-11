# Hideaway backup and recovery checkpoint

This is a guarded, manual workflow for the existing shared Hideaway/LOST VPS.
It does not deploy Sophomores, stop the application, restore production, change
DNS, configure email, or schedule backups. Run stages separately and inspect
each result. Never replay a failed mutation automatically.

## Captured backup — 2026-10-11 UTC

Run ID: `20261011T010105Z`.

- VPS ciphertext: `/var/lib/hideaway-backups/20261011T010105Z`.
- Mac ciphertext: `/Users/seanschoi/Backups/Hideaway/20261011T010105Z`.
- Local age identity:
  `/Users/seanschoi/.config/sophomores-backup/identities/hideaway-20261011.agekey`.
- Private directories are mode 0700; identity and local ciphertext mode 0600.
- Six artifacts passed SHA-256/size verification and full age authentication on
  the Mac. No plaintext dump or archive was transferred from the VPS.
- Capture contains a custom-format PostgreSQL dump, role globals, aggregate
  source database evidence, uploaded media and asset binds, protected service
  configuration/TLS recovery material, and the otherwise-local Nginx image.
- The config archive includes credentials and private keys. Never extract it
  into a checkout or print its contents. Keep private diagnostic journals out of
  Git, issue reports, and shared logs.

**Consistency limit:** the logical database dump has its own consistent
snapshot. Media capture was online, with matching pre/post inventories; it is
not a coordinated database/media point-in-time snapshot. Source row counts are
a separate observation. No service was stopped or restarted for capture.

**Key custody is not finished.** Store a protected copy of the age identity off
this Mac, such as in your password manager, and verify that copy separately.
Do not send it in chat or store it beside the ciphertext. The current off-server
backup and only confirmed decryption key share the Mac's failure domain.
No retention policy, recurring capture, provider snapshot, or independent
off-device backup destination has been established.

## Modules and stop/resume rules

### 1. Capture on the VPS

`ops/backup-hideaway.sh` is a root-only, target-specific capture tool. Review its
fixed paths and container identities before using it on a different host.

Stages: `init RUN_ID RECIPIENT_FILE`, then `db RUN_ID`, `media RUN_ID`,
`config RUN_ID`, `finalize RUN_ID`, and `check RUN_ID`.

Use a fresh UTC run ID and only the public recipient on the server. `init`
validates the recipient before capture. A lock excludes concurrent captures;
attempted/completed markers and immutable output names make failures visible.
Encryption happens on the VPS. Finalization checks ciphertext and deletes only
the run-owned plaintext metadata scratch. A failed stage requires inspection
and a **new run**, not marker deletion or an in-place replay.

The completed run used supervised transient systemd stages, so an SSH drop did
not kill capture. Its private execution log is
`/var/lib/sophomores-ops/backup-tools/20261011T010105Z.log`; do not publish it.

### 2. Transfer and authenticate

Transfer only the six manifest-listed ciphertext files and the manifest, using
strict host-key checking. Write exclusive `.partial` files, compare byte counts
and SHA-256, and fully decrypt each to a discard sink before publishing final
filenames. Publish the local manifest last. Never copy plaintext server scratch.

The initial local transfer stopped at a Python-version incompatibility before
publishing any file. Recovery verified the existing partial against the unchanged
server manifest, authenticated it, and continued without overwriting it. There
are no remaining transfer partials. This transfer was supervised, not a committed
general-purpose transfer automation.

### 3. Isolated local database restoration

`ops/restore-hideaway-local.sh STAGE ABSOLUTE_BACKUP_DIR ABSOLUTE_AGE_IDENTITY`
supports `validate`, `start`, `database`, `verify`, `cleanup`, in that order.

- Uses only `unix:///var/run/docker.sock`, never the selected remote context.
- Requires FileVault On and the backup on the macOS startup Data volume.
- Pins the production PostgreSQL 18.4 AMD64 platform image by digest, with
  explicit architecture/OS/repository identity checks. Docker Desktop's manifest
  image ID differs from the VPS's config ID; both are checked against known pins.
- Creates only its labeled, identity-recorded container and owned bind scratch;
  no network, published ports, application, production roles, mail or payments.
- Restores transactionally with no owners, ACLs or tablespaces. This deliberately
  does **not** prove production-role or complete application recovery.
- A failed stage leaves private diagnostic evidence and stops. Do not remove
  stage markers to retry. Cleanup verifies container ownership/isolation and
  remains usable even if the backup or key is later unavailable.
- Cleanup stops the exact owned container, removes only its plaintext database
  scratch, then removes that container. No broad Docker prune is used. Private
  metadata and logs remain in `.restore-journal` on the protected Data volume.

Initial Docker Desktop index-only image metadata was insufficient to pass
preflight. Pulling the exact AMD64 platform manifest resolved it; the script
does not accept missing architecture metadata or fall back to an unpinned tag.

### 4. Read-only archive verification

Run `python3 -I deployment/ops/verify-hideaway-archives.py --help` for its
arguments. The verifier rehashes and authenticates all six artifacts before
streaming archive inspection. It never extracts files, executes archived code,
loads an image, or follows config symlinks. It checks member paths/types and
compares every media inventory entry, including regular-file sizes and hashes,
with both captured inventories. The proof is atomically published without
overwriting an existing result.

## Actual recovery evidence

The isolated restore and cleanup completed on 2026-10-11 UTC:

- PostgreSQL logical restore succeeded: 158 tables, matching `plpgsql` and
  `pgcrypto` extensions, zero missing/extra tables and zero observed row-count
  differences. This is actual restore evidence, not a mocked-test result.
- Archive inspection passed: 170 config entries, 39 Nginx-image entries and
  16 media entries. All 8 regular media files (2,864,368 bytes) match both
  inventories. This does not prove image loading or restored file permissions.
- The restored schema's filename columns contained zero non-null references
  across current upload collections, track versions, imports and exports. No
  missing reference was found, but this is **not a populated-media-reference
  recovery test**. The eight archived files are still preserved and verified.
- The exact owned local container and plaintext database scratch were removed.
  Only ciphertext, aggregate proof and protected diagnostic metadata remain.
- Post-capture checks found all three production container IDs/start times
  unchanged. Public TLS remained trusted for all four Hideaway/LOST names;
  Hideaway completed HTTP 200, while the pre-existing LOST redirect-chain
  HTTP 404 remained unchanged.

Proofs in the private Mac backup folder: `restore-evidence.json`,
`archive-proof.json`, `media-reference-proof.json`, and
`restore-cleanup-evidence.json`. The database proof's media flag deliberately
remains false: separate archive evidence covers media integrity, not application
recovery. Do not interpret one module's result as proof of another module.

Validation commands: `rtk pnpm run test:backup`,
`rtk pnpm run test:backup:archives`, `rtk pnpm run test:tls-hook`,
`rtk pnpm run test:coverage`, `rtk pnpm run test:deployment:coverage`,
`rtk pnpm run lint`, and `rtk pnpm run typecheck`. Shell tests use mocked
subprocesses; they are not quantitative Bash branch-coverage evidence. Archive
tests include real age/zstd fixtures and measured 93.8% executable-line coverage,
not branch coverage.

## Preserved Hideaway TLS source

The unrelated original checkout remains untouched. Scoped repair files and
regression tests are preserved in the isolated worktree
`/Users/seanschoi/Projects/worktrees/hideaway-tls-repair-20261010`, branch
`codex/preserve-nginx-tls-repair-20261010`, and adjacent `.patch` file.

They are **not committed or pushed**: the local Hideaway lockfile audit found
6 critical, 19 high, 21 moderate and 7 low advisories. This is not an inventory
of the deployed image. No unapproved dependency upgrade was attempted. The live
server still has three scoped tracked TLS modifications that must be reconciled
before its next pull/release. Its shared app/database were not redeployed.

Sophomores' separate audit remains 3 high and 3 moderate findings, no critical
findings. These are a release gate, not resolved by backup tooling.

## Remaining release gates

1. Independent recovery-key custody, backup retention/off-device destination,
   provider-console/recovery access, and a recurring backup policy.
2. Coordinated database/media recovery policy and an isolated full application
   rehearsal, including roles/configuration/uploads. Never test these against
   production or enable outbound mail/payments incidentally.
3. Clear the dependency advisories and preserve/reconcile the TLS source repair.
4. Continue the separate Sophomores packaging and reviewed VPS deployment profile.
   No Sophomores virtual host, certificate, Payload migration or `rp` admin
   exposure was added by this pass.
