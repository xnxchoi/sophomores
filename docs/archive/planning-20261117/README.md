# Planning consolidation: frozen inputs

These are byte-exact captures of plan and navigation inputs before DOC-01 consolidation on
2026-11-17. They preserve requirements, owner decisions, failed reviews and dated
evidence. They are historical records, not additional active plans or execution
authority. Migration is still pending; until it lands, the original paths retain
their existing authority.

| Capture | Original path | Relative-link base |
| --- | --- | --- |
| [To-Do List](to-do-list.original.md) | `docs/To-Do List.md` | `docs/` |
| [Auth/payment/NFC plan](auth-payment-nfc.original.md) | `docs/qa/auth-payment-nfc/consolidation.md` | `docs/qa/auth-payment-nfc/` |
| [Root README](root-readme.original.md) | `README.md` | repository root |
| [Backlog execution contracts](backlog-execution-plan.original.md) | `docs/reference/backlog-execution-plan.md` | `docs/reference/` |
| [Commerce launch plan](commerce-launch-plan.original.md) | `docs/reference/commerce-launch-plan.md` | `docs/reference/` |

The [manifest](manifest.json) records exact byte counts and SHA-256 hashes.
Original bytes are not rewritten to repair archive-relative links: resolve links
inside a capture from its original relative-link base above, not this directory.
Dates, ownership, commands, approvals and completion claims inside captures remain
dated provenance and must not be treated as current instructions.

The consolidation must map every task, explicit owner decision, unfinished
requirement and financial safeguard to the new current plan or a clearly linked
historical record. Archival alone proves neither that mapping nor completion of
any task, review, workload, provider or production gate.
