# SPH-WALLET-ACTIVATION-20261116-01 — dispatch custody

- Owner direction (2026-11-16): activation has its own page; lost-passkey recovery is under discussion, so nothing is built for it; launch parallel tasks.
- Spec frozen at `codex/auth-payment-nfc` `4657dbb`.
- Run `run_8a16b71cf6a4`, Task `task_06b205fae748`, Dispatch `ctx_2ac43d73045b`. Claude worker, default model.
- Workspace branch was created as `xnxchoi/wallet-activation-20261116`; the worker was told to rename it to `codex/wallet-activation-20261116`.
- Admission: 48 GiB machine, about half free at start. Two workers run in parallel; the guest invite slice (`guest-invite-a-20261116`) starts when one of them reports, to stay under the 15 GiB aggregate ceiling.
