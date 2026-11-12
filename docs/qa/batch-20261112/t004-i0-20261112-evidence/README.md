# T004-I0 evidence custody

These small committed receipts and [selected log excerpts](log-excerpts.md) retain failures as well as successful checks. They are provider-free query-client/synthetic evidence, not PostgreSQL, concurrency, restart, provider or financial-durability acceptance. The handback maps each run to its candidate stage and authorized resource budget.

## RED provenance — not interchangeable

- **Initial RED** exercised the pre-existing ordinary `inCommerceTransaction` helper: 3 pass / 5 fail, before the initial implementation. It did **not** execute a final `inPaymentTransaction` implementation on base.
- The final `inPaymentTransaction` / `inPaymentEndpoint` symbols do not exist on the original base; running final-seam imports there fails because the symbols are absent, not because those assertions have demonstrated base behavior. No such import failure is presented as behavioral RED.
- **Cycle 1 RED** ran on `78de6a1237e6b90148bf30666a933a5e9f61a56d` plus the new tests and the test-only unwrapped-confirm alias, before cycle 1 production edits: 6 pass / 10 fail. It directly reproduced official-response status collapse and unwrapped confirmation, using symbols that already existed on that candidate.

Two cycle-1 failures additionally assert an explicit `APIError` 503 at the helper seam for unacknowledged rollback. The earlier generic errors already mapped to 503 in the outer ecommerce catch; those two type assertions are not evidence that the previous HTTP boundary falsely reported a known outcome.

## Sanitization and scope

Only measured result/resource fields are retained in `*.metrics.json`; process command lines, argument lists and path-bearing fields are excluded. Excerpts omit stacks/full logs, replace checkout absolute paths with `<worktree>`, and redact any other absolute home path. Raw-log SHA-256 values and checkout-relative source names identify the local originals without committing them.

The historical 1024 MiB-heap typecheck OOM and the later successful authorized 2048 MiB-heap typechecks are both retained. Default receipts deliberately retain the two known deferred-styling failures; an exit-1 default run is not labeled an all-green suite. No full log, credential, provider payload or environment file is included.
