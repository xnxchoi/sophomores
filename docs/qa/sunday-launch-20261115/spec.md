# SPH-SUNDAY-LAUNCH-20261115-01 — minimum build for the quiet live deploy

Slug `sunday-launch-20261115`, branch `codex/sunday-launch-20261115`. Follow the
[batch shared rules](../batch-20261112/shared-rules.md) and AGENTS.md:
- no pnpm, npm or yarn scripts;
- Payload code goes under `src/payload/`;
- Tailwind-only styling;
- copy lives in `messages/en.json`, with `messages/ko.json` mirrored using `""` for new keys.

Your identity base is **the main commit that adds this file**. Persist your handback as `docs/qa/sunday-launch-20261115/handback.md`. The work is provider-free: no `.env` reads, no PortOne calls.

**Context.** The owner wants the site live on its real URL by **Sunday 2026-11-15**. It runs quietly, unannounced, so the PG can review it while we test. This assignment builds only the minimum; deployment itself is separate. The governing scope is the owner-approved [commerce scope review](../commerce-scope-review-20261114/summary.md). Do **not** build anything from the old T004 I3–I6 plan.

## Scope (four items, nothing else)

1. **Live-mode config (owner: standard env-flag handling, no Santa review).**
   - `src/lib/tickets/portone/config.ts` and `src/lib/commerce/portone/adapter.ts` pin a single reviewed TEST channel.
   - `src/lib/commerce/portone/proof.ts` accepts only `type: 'TEST'`.
   - Replace this with a validated mode, `test | live`, read from the existing env schema. Use the existing `PORTONE_PAYMENT_MODE`, mapping its current `sandbox` value to `test`, or add a clearly named variable. In both modes the store ID and channel key come from env.
   - In live mode, missing keys fail fast at boot. Payment proofs must match the configured mode.
   - Disabled stays the default.
   - Card is the only method at launch. Don't add bank-transfer or virtual-account flows.
2. **One unit per purchase.**
   - Checkout and initiation accept quantity 1 only, and the shop UI shows no quantity picker.
   - Older stored orders and snapshots with quantity > 1 must still parse.
3. **Membership on payment.**
   - Inside the existing confirm/finalize transaction, set the buyer's `users.membershipStatus` to `approved` when it is `applicant`, `invited` or `waitlist`.
   - Never change `staff` or `suspended`.
   - Make it idempotent and part of the same transaction as the order, so a rollback undoes it.
4. **Business info and policy pages, editable by the owner.**
   - Add a Payload global under `src/payload/globals/` for legal and business facts:
     - trade name (상호), representative (대표자), business address, business registration number (사업자등록번호);
     - a 통신판매업 신고 field that allows "면제 (간이과세자)";
     - customer-service phone and email;
     - rich text for terms (이용약관), privacy (개인정보처리방침) and refund/shipping policy.
   - Register it in `src/payload.config.ts`. Add one additive migration under `src/payload/migrations/`.
   - Render the existing `(site)/terms`, `(site)/privacy` and `(site)/refund` routes from that global when it has content, otherwise keep their current content.
   - Add a site footer showing the business facts plus links to the three pages. Show it only once the required facts are filled.
   - Do not invent legal text or business facts. The owner fills them in the admin.

## Acceptance

Every behaviour change needs a test that fails first.

1. **Payment mode.** `test` and `live` each load their own channel. `live` with missing keys throws at boot. A proof of the wrong type is rejected.
2. **Quantity.** Initiating with quantity 2 is rejected, and existing quantity > 1 snapshots still parse.
3. **Membership grant.**
   - It sets `approved` on the first settle.
   - Replaying the settle changes nothing.
   - `staff` and `suspended` are untouched.
   - A rolled-back settle leaves the status unchanged. Prove this against real disposable PostgreSQL. A new loopback container is allowed; remove it afterwards.
4. **Pages.** The global's content renders on the policy pages and in the footer, and an empty global leaves the pages unchanged.
   - Do one live local render: a guarded dev server on a free port, viewed at a mobile and a desktop width, with screenshots summarized in the handback. Stop the server afterwards.

## Gates

Run each of these once, on the final revision:
- the full typecheck;
- the default suite, using the repo's standard invocation, showing only the 2 known failures;
- the DB proof;
- `git diff --check`, which must be clean.

Commit sanitized evidence only: no raw logs and no home paths. Then send one `worker_done`.

**Time:** this is on the critical path for Sunday. Keep it minimal.
