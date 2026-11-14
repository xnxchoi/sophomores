# T004-I1 review rubric, cycle 2

**Candidate.** Worktree `orca/workspaces/sphmrs/t004-i1-20261113`, HEAD `805b12d`, source commit `80ab32c`. The base is `1e3c78b` and the prior candidate is `c5cb02f`. The cumulative source/test diff from base hashes to `c0635a3e…6a744`.

**Inputs.**
- [spec.md](spec.md)
- [review-rubric-c1.md](review-rubric-c1.md): every cycle-1 item still applies.
- [rework-1.md](rework-1.md): the corrections required in this cycle.
- The design at `../t004-a-20261111/reconciliation-design.md`, §§1–4 and §6 I1.

**Rules.** Review read-only: run no Node workloads, use no DB and call no providers. Cite every finding as `file:line`. PASS means no HIGH and no MEDIUM.

1. **Rework-1 items resolved.**
   - A terminal row returns `local-terminal` only when it has no order, a clean non-settled reservation and no admissions. Any contradiction returns `review-required`, and corruption remains `integrity-stop`. The tests cover both sides, and the old contradictory fixture is corrected.
   - A generic 404 is a distinct observation. It is never aliased to typed not-found or to integrity, and it never retries or retires. `unavailable` is tested or removed, and the projector has an explicit return type.
   - The bypass is an exact path plus GET. The `/pending` and `/webhooks` clauses are byte-identical. The behavioural tests prove that non-GET or other `/result` endpoints hit the mutation guard.
   - A non-envelope 5xx is completion-unknown, while invalid JSON or schema on a 2xx stays receipt-integrity. Missing `req.url` returns 400. The handback contains no absolute home path.
2. **No regression of cycle-1 items 1–5.** Re-verify GET has no side effects, the authority order, foreign and missing results being indistinguishable, and `no-store`. Check specifically that the new 400 for missing `req.url`, returned before authorization, leaks nothing and mutates nothing.
3. **Scope and honesty.**
   - The diff touches only owned and extended paths.
   - Prior receipts and failures are preserved.
   - RED precedes GREEN, with evidence.
   - Coverage is at least 80% of changed lines.
   - No durability claim is made.
   - The known LOW findings (rate limiter, snapshot disclosure, capacity coupling) are recorded, not silently changed.
