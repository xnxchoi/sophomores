# SPH-WALLET-ACTIVATION-20261116-01 — dispatch custody

- Owner direction (2026-11-16): activation has its own page; lost-passkey recovery is under discussion, so nothing is built for it; launch parallel tasks.
- Spec frozen at `codex/auth-payment-nfc` `4657dbb`.
- Run `run_8a16b71cf6a4`, Task `task_06b205fae748`, Dispatch `ctx_2ac43d73045b`. Claude worker, default model.
- Workspace branch was created as `xnxchoi/wallet-activation-20261116`; the worker was told to rename it to `codex/wallet-activation-20261116`.
- Admission: 48 GiB machine, about half free at start. Two workers run in parallel; the guest invite slice (`guest-invite-a-20261116`) starts when one of them reports, to stay under the 15 GiB aggregate ceiling.

## Review status (custodian, 2026-11-16 06:5x KST, before shutdown)

- Security review of `31ddea3`: no critical or high findings. Seven fixes landed in `7fc6503`.
- Santa round 1 on `7fc6503`: Claude FAIL and Codex FAIL. The fixes landed in `2806a0e`. All four DB proofs pass there: 7/7, 4/4, 8/8, 8/8.
- Santa round 2 on `2806a0e`: Claude FAIL and Codex FAIL. The fixes so far are on `codex/wallet-activation-20261116` at `f9b05ef`: typecheck 0 errors, suite 3,012 with only the 2 known styling failures. The DB proof has not been rerun.
- Open for the next session, before round 3:
  1. Offer every compatible credential. The server's `bind/options` must accept several, so this is a mechanism change.
  2. Re-shoot every state from the final commit at 390 and 1280. The render PNGs are stale, and the handback's states table still reflects round 1.
  3. Then Santa round 3, the last before escalating to the owner.
- Not merged into `codex/auth-payment-nfc`. The custodian's local merge with regenerated migrations (identical SQL) is parked on `codex/integration-wallet-activation` (`90ed287`). The worker branch already contains it.
