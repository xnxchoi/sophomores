# SPH-T004-I2-20261114-01 — amendment 1 (Payload placement)

Supersedes the spec's placement lines and the custodian's earlier scope answers.

- **Base:** merge main `0376179` (or later) into your branch first. Payload code now lives under `src/payload/` (AGENTS.md "Payload code placement"). `src/payload.config.ts`, `src/payload-types.ts` and `src/payload-generated-schema.ts` stay at the `src/` root.
- **Collections:** new collection(s) go under `src/payload/collections/<slug>/index.ts`. Register them beside the other commerce collections in `src/lib/commerce/domain.ts` (the one-line array edit at the commerce plugin), not in `payload.config.ts`.
- **Migration:** one additive migration plus its `.json` snapshot under `src/payload/migrations/`, registered in `src/payload/migrations/index.ts`.
- **`ecommerce.ts`:** the minimal wrapper you proposed is approved, inside the existing `secureEndpoint` path. Don't change the endpoint list, the merge filter, the `/pending` or `/payments/portone/result` bypasses, or any non-payment behaviour. Add RED tests showing those are unchanged.
- **Generated types:** regenerate `src/payload-types.ts` only through the repo's existing type-generation command, under resource-guard. If generation needs a database or credentials, stop and ask.
- Everything else in the spec stands, including the owner-approved numeric policy and acceptance criteria 1–3.
- Your earlier notes in `docs/qa/t004-i2-20261114/handback.md` are your starting brief.
