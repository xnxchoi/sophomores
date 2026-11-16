# SPH-DOOR-CHECK-IN-20261116-01 — dispatch custody

- Owner direction (2026-11-16): continue the mechanism work overnight; door check-in is first in the agreed order.
- Spec frozen at `codex/auth-payment-nfc` `b556dfa`. Run `run_8a16b71cf6a4`; first Task `task_13243434a461` (Dispatch `ctx_b7d7f87f48bd`), fix round Task `task_5a4b1837105a`. Claude worker.
- Candidate `be4a504` / `d3afa57`. Gates at `be4a504`: typecheck clean, DB proof 4/4 (6 concurrent scans, 1 admitted), suite with only the 2 known styling failures, diff check clean.
- Santa round 1 on `d3afa57`: Claude FAIL and Codex FAIL.
  - P1: the key lookup used tokenID alone, so it was wrong across locks; a stale event answer could show; admin check-ins went unlogged; a failed count or lost response turned an admitted guest away.
  - P2: layout jump; rem-based targets rendered at about 36 px; search failures read as "no match".
- Fix round, pushed on `codex/door-check-in-20261116` at `72c1e91` and later: all seven numbered items fixed tests first. Typecheck clean; focused tests 67/67.
- Open for the next session, before Santa round 2:
  1. Build `sameOrigin` from the configured origin, not `req.url`.
  2. Assert `waiting > 0` in the DB proof.
  3. Run all gates: the suite, the DB proof and diff check.
  4. Re-render every state in one seeded sequence at 390 and 1280.
- Owner question: item 13, jsqr 1.4.0 for iPhone camera scanning. Until then the door works with pasted or hardware-scanner links.
- Known limit: real guest QRs map to "Not found" until guest emailed keys (`guest_email` grants) ship. `UNLOCK_QR_SIGNERS` must be pinned for chains 137 and 84532.
- Not merged into `codex/auth-payment-nfc`.
