# SPH-UNLOCK-ADAPTER-20261116-01 — dispatch custody

- Owner direction (2026-11-16): activation has its own page; lost-passkey recovery is under discussion, so nothing is built for it; launch parallel tasks.
- Spec frozen at `codex/auth-payment-nfc` `4657dbb`.
- Run `run_8a16b71cf6a4`, Task `task_0c8fb051db16`, Dispatch `ctx_f04f0761c05c`. Claude worker, default model.
- Workspace branch was created as `xnxchoi/unlock-adapter-20261116`; the worker was told to rename it to `codex/unlock-adapter-20261116`.
- Admission: 48 GiB machine, about half free at start. Two workers run in parallel; the guest invite slice (`guest-invite-a-20261116`) starts when one of them reports, to stay under the 15 GiB aggregate ceiling.

## Integration (custodian, 2026-11-16)

- Review: the custodian's independent review of `f8d3d8d` found no double-grant path, plus five fixes (nonce collisions, hash not written ahead, existing-key recipients, refused chains looping, lookup and transport checks). The fix round, Task `task_6b2b28b1c0b9`, landed `3687188`. The contract change: `SubmitOutcome` became `PrepareOutcome` / `BroadcastOutcome` plus `parkedGrantCodes`; `KeyGrantTarget` and `parseKeyGrantTarget` are unchanged.
- On chain, verified read-only on Base Sepolia: lock `0xA1b38504fd4D8Fa696e9e4DEfFA8c0d484403A8c`, PublicLock v14. The grant signer holds KEY_GRANTER and is not a lock manager. The factory matches Unlock's published Base Sepolia address.
- Merged into `codex/auth-payment-nfc` as `db38a9e`. The custodian then set `keyGrantChains` to `[137, 84532]` (ADR-0010); the adapter still enables only 84532.
- Gates on the merged tree:
  - key tests: 51/51;
  - typecheck: clean;
  - default suite: stopped by the resource guard for system headroom while two workers ran, not a test failure. To be rerun when headroom returns. The worker's full suite on `3687188`: 2,924 tests, only the 2 known styling failures.
- Open follow-ups:
  - single-process signer serialisation only;
  - no fee bump or rebroadcast;
  - parked grants have no dedicated state;
  - the spend guard has no failing-first test;
  - Unlock's emailed guest keys and the cancel authority are untested.
