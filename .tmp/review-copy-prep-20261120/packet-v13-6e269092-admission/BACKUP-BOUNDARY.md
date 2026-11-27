# Fresh backup and interrupted u3: offline design

This is a review draft, not permission to run a command on the VPS. It is
bound to source `6e269092` and the locally reviewed artifacts. Keep the
admitted `fd49dc0b` packet and its backup immutable. The approved u3 source
delta is `7a121071`; its FK check covers the known name, source and target
columns, delete/update actions and validation. It does not prove full schema
equivalence, deferral, match type, or trigger state.

## Ordering

1. Import the reverified post-n3 infrastructure into the new generation;
   do not copy historical step tokens into the active generation. Fresh u1
   and Auth K1 must match the new artifact IDs.
2. Run fresh, read-only u3 before entering maintenance, through a new-generation
   transition requiring the carried-state receipt, fresh u1 and Auth K1, but
   no u2 token. The current generic chain requires u2 before u3 and must not
   be used for this transition. Do not import or mint a stand-in u2 token.
   u3 verifies the pinned runner's exact 33-entry registry and expected baseline
   32. Recheck the live schema when migration starts.
3. On a separate go, establish a preview-only maintenance fence, verify it live,
   and drain old-schema readers and database/media writers. The owner no-edit
   window alone is not a writer fence. Inventory app containers, jobs, and DB
   sessions; the approved fence must prevent new writers as well as drain
   existing ones. Preserve the shared Hideaway routes.
4. On an explicit combined backup-plus-migration go, the migration unit holds
   both locks from the last fence/baseline check through backup, verification,
   intent, Payload up and the post-up check. Fresh u2 is an internal backup
   stage of this unit, not a historical token or an independently skippable
   backup. Review-B and Cordy must approve this combined scope explicitly;
   otherwise the executor stays disabled. Do not unlock and later reuse a
   backup as "just before up."

## What the unit must prove

- Before starting backup, prove active manifest and runner identities, schema
  32, original route/inode, exact generation-bound review-pg identity and
  mounts, and active exclusion. Bind the attempt to the exact maintenance and
  u3 evidence. Create a unique, root-private attempt directory in this
  generation; fsync its parent before proceeding. Never append to or replace
  an older backup.
- Stream a bounded DB dump and read-only media archive of the intended volumes.
  Treat failure on either side of a pipeline as a failure. Fully decode the
  dump and check media archive entries, count and ownership against the
  fenced source. Counts and a WAL LSN are boundary metadata, not independent
  evidence that writers are quiescent. Protect all artifacts and diagnostics
  from disclosure.
- Only after both artifacts pass, fsync their contents and the directories
  containing their finalized names. Publish the final receipt without overwrite
  and fsync both the receipt and its directory. Bind it to the manifest,
  runner, pg ID and generation, run ID, fence and u3 evidence, capture interval,
  and both artifact hashes. A boundary record, a filename, a partial receipt,
  or an old u2 token is not backup success.
- Immediately before intent and DDL, recheck both locks, the live exclusion,
  pin generation, exact schema 32, and the completed receipt for *this* run,
  including recomputing both bound artifact hashes. If anything changed, stop
  while fenced. Publish up intent without overwrite; fsync the intent and its
  directory before starting the Payload executor. Do not publish up proof until
  the exact committed 33 and dedicated batch are observed.
- This is verification of psql/pg_restore readability and scoped archive
  checks, not a recovery rehearsal. Restoration, if needed, remains a separate
  approved disaster recovery, not part of the normal paired-down route rollback.

## Interruption

Maintenance and writer exclusion must fail closed across unit, daemon, and
host interruption: neither unit exit nor reboot can authorize reopening.
Before executing DDL, the implementation must bind an unambiguous recovery
identity to the migration unit and its PostgreSQL session/transaction, without
logging credentials. Reconciliation must prove the old executor is gone and its
identified backend and transaction have ended. If either proof is unavailable,
hold; even a repeatable-read observation of schema 32 is unsafe while an old
executor can still commit.

- **u3 started, parent token absent:** hold. Confirm both locks and the actual
  Linux u3 unit/job state before inspecting retained output. A success line in
  an output file does not authorize a later step. No `update_reconcile u3`
  exists in the reviewed helper. Do not delete the started marker, promote
  stdout to a token, or rerun in place. Seek a separately reviewed, read-only
  reconciliation that re-proves the exact runner and baseline, binds the result
  to that generation and attempt, and records an immutable outcome. If the
  original unit might still be running, reconcile nothing.
- **Backup started, no verified receipt:** do not attempt up. Retain partial
  evidence privately. Any later backup needs fresh authorization/attempt and
  renewed exclusion checks.
- **Verified backup, no durable up intent:** do not reuse the backup after
  interruption. Re-establish exclusion and seek a fresh attempt. Verify the
  schema/ledger first if there is any uncertainty that intent is absent.
- **Up intent present:** no retry, route change, or receipt by hand. Reconcile
  committed catalog and ledger under renewed exclusion and both locks before
  deciding next steps. If exact state cannot be established, keep maintenance.

Exercise interruption immediately before intent is durable, immediately after
intent is durable, and at commit with no executor response. In each case verify
that the fence remains active, no stale backup can authorize DDL, and the
reconciler refuses classification while the identified executor or transaction
can still commit. These are test requirements, not evidence from this draft.

Still open: executable writer-fence verifier, combined unit and receipt publisher,
real Payload up/down, live Linux unit limits and interruption proof, carried-state
activation, private FD7, and schema-33 review-pg replacement. No artifact was
transferred, no new manifest admitted and no live operation was attempted.
