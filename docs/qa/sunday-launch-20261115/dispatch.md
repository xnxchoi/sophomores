# SPH-SUNDAY-LAUNCH-20261115-01 — dispatch custody

- Owner direction (2026-11-14): deploy quietly to the live URL by Sunday 2026-11-15 for the PG review while testing. Not announced.
- Spec frozen at main `307c19b`.
- Run `run_8a16b71cf6a4`, Task `task_fb9b73bb91e6`, Dispatch `ctx_82957542ff51`, terminal `term_17a013f8-8d5e-4b52-9cd7-a47c15c2d05a`.
- Claude worker, default model, chosen to spare the low Codex budget.
- Admission: 12.0 GiB accounted and 13.7 GiB available.
- The deployment itself (VPS, database, secrets, route) is separate. It needs the owner's answers and an explicit go.
