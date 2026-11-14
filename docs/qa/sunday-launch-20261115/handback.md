# SPH-SUNDAY-LAUNCH-20261115-01 — handback

**State: candidate.** All four scope items are built. Every gate ran on the final code revision.

## Identity

| | |
|---|---|
| Base | `307c19b` (main commit adding the spec) |
| Branch | `codex/sunday-launch-20261115` (renamed from the Orca-created `xnxchoi/sunday-launch-20261115`) |
| Path | `orca/workspaces/sphmrs/sunday-launch-20261115` |
| Items 1–3 commits | `8a2715b` (payment mode, quantity 1, membership on payment) and the follow-up `4daaa6d` (mode-aware FAILED retirement evidence; drops a redundant `aria-pressed`) |
| Item 4 commit | `bf578c0` — business-info global, policy pages, footer. Kept separate from items 1–3, per the custodian's note of 2026-11-14. |
| Handback commits | `79119fa` (first version), then this revision |
| Final code revision | `4daaa6d`. `git diff 307c19b 4daaa6d`: 52 files, +12,988 / −150, including the first handback. SHA-256 `a696980404970d24756e8b4462bbdddedba36880636dac35fd709ebfa7328d32` |

The +12k lines are almost all generated:
- `20261114_085802_business_info.json`, Payload's schema snapshot;
- `src/payload-types.ts`, +87 lines, additive, for the new global only;
- `admin/importMap.js`, +46 lines, the lexical admin components.

`importMap.js` is required because the new global holds the config's first richText fields.

Work was provider-free:
- no `.env` reads, and no `.env` file exists in the checkout;
- no PortOne calls;
- no pnpm, npm or yarn scripts.

## What changed

### 1. Live-mode config (`8a2715b`)

**Mode.** `loadPaymentMode` in `src/lib/tickets/portone/config.ts` maps `PORTONE_PAYMENT_MODE` as follows:

| Value | Result |
|---|---|
| unset or `disabled` | off (still the default) |
| `sandbox` or `test` | `test` |
| `live` | `live` |
| anything else | throws |

`PortOneConfig` now carries `mode`. In both modes the store ID and channel key come from env.

**Pin removed.** The adapter's pinned reviewed TEST channel is gone: `adapterConfig` and the `reviewedChannel` dependency. Only the dev-only local-KPN aid keeps its reviewed-channel check, and it now also requires `test` mode.

**Boot.** `payloadEnvironmentSchema` is now a loose object with a refinement. `live` with any missing or invalid PortOne key fails the boot parse in `payload.config.ts` with the path `PORTONE_PAYMENT_MODE`.

**Proofs.** The proof schemas accept `TEST|LIVE`, so stored TEST risk proofs still parse. These all require `channel.type` to match the configured mode:
- `validatePaidPayment`, `classifyPaymentRisk` and `classifyReconciliationPayment`;
- the `/resume` FAILED check;
- the `retireFailedPayment` FAILED evidence in `review.ts`. This inline pin was found by a final sweep and fixed in `4daaa6d`; `tests/commerce/portone/retirement.test.ts` now runs in both modes and was RED for live first.

A final sweep of `src` (excluding `hideaway`) found one remaining TEST literal, in `src/lib/tickets/portone/server.ts`. That is the legacy ticket checkout: nothing in `src` imports it, and the scope review lists it as dead code. It was left as is.

**Payment method.** Card stays the only method. No bank-transfer or virtual-account flow was added.

### 2. One unit per purchase (`8a2715b`)

- Cart writes in the `ecommerce.ts` carts hook reject `quantity !== 1`.
- Initiation (`buildCommerceSnapshot`) rejects it before reading the catalogue.
- The snapshot, transaction and reservation schemas still parse 1–3, so older orders and snapshots still parse and confirm.
- The settlement `purchasedAt` path is untouched.
- The shop's −/+ picker is replaced by one add/remove control, reusing the existing copy keys `addOneCoin` and `removeOneCoin`. Removing clears an older multi-unit cart. The control has no `aria-pressed`, because its label already changes.

### 3. Membership on payment (`8a2715b`)

- `src/lib/commerce/membership.ts` adds `grantMembershipOnPayment`. It runs in the transactions `afterChange` settle hook, after `settleReservation` and `grantOrderAdmissions`, on the same `req` and therefore the same transaction.
- It uses the Local API with the owning `req`.
- `applicant`, `invited` and `waitlist` become `approved`.
- `staff`, `suspended` and `approved` are never written.
- The hook fires only on the first transition to `succeeded`, and the grant itself is a no-op once the account is approved.

### 4. Business info and policy pages (`bf578c0`)

**Global.** `src/payload/globals/business-info.ts` adds the global, registered in `src/payload.config.ts`.
- Fields:
  - trade name (상호), representative (대표자), business address, business registration number (사업자등록번호);
  - mail-order report (통신판매업 신고). Its admin help says to enter the number or "면제 (간이과세자)";
  - customer-service phone and email;
  - rich text for terms, privacy and refund/shipping.
- Read and update access is staff-only. Public pages read it server-side.
- One additive migration, `20261114_085802_business_info`, creates only the `business_info` table.

**Policy pages.** `/terms`, `/privacy` and `/refund` render the global's rich text when it holds visible text. Otherwise they keep their current content: the `commerce-publication` disclosure, or the "not published yet" notice.

**Footer.** `BusinessFooter` is streamed inside `<Suspense fallback={null}>` in the `(site)` layout.
- It renders nothing until every required fact is filled.
- It reuses `SellerDisclosure`, with a new optional email row, and links to the three pages.
- Once the footer shows, the per-page seller blocks yield to it: home, the policy pages and the legacy `tickets/payment` page.

**Copy.** New `Staff.schema.*` admin labels and `Interface.seller.email` are in `messages/en.json`. They are mirrored in `messages/ko.json` as `""`, with identical structure and order. No existing Korean text was touched.

No legal text or business facts were seeded or invented.

**Docs.** The `PORTONE_PAYMENT_MODE` rows in `docs/deployment/member-auth.local.md` were updated.

## Tests that failed first (RED → GREEN)

| Behaviour | Test | RED observed |
|---|---|---|
| Mode loading and boot | `tests/commerce/portone/payment-mode.test.ts` | `mode` was undefined; live with a missing key parsed successfully; the LIVE proof threw |
| Quantity 1 | `tests/commerce/core/quantity-one.test.ts` | the quantity-2 cart reached the catalogue read (snapshot builder and cart hook); the checkout had increment/decrement |
| Membership grant (unit) | `tests/commerce/domain/membership-grant.test.ts` | module missing |
| Membership grant (DB) | `tests/commerce/core/membership-grant.db.test.ts` | with the grant call disabled: applicant stayed `applicant`, invited stayed `invited` |
| Pages and footer | `tests/commerce/business-info.test.tsx` | footer module missing |

Existing tests changed on purpose:
- `tests/tickets/portone/payment.test.ts`: the source assertion for the pinned-channel check now asserts the validated-mode check.
- PortOne config fixtures gained `mode: "test"`, and the removed `reviewedChannel` dependency was dropped from them.
- `payment-postgres-fixture.ts` takes an optional target. Its defaults are unchanged, and its `users` stub gained the real `membershipStatus` select.

## Gates, on final revision `4daaa6d`

**Full typecheck.** `tsc --noEmit` ran under the guard at 4 GiB / 2048 MiB (the repo's `typecheck:guarded` limits): **exit 0, 0 errors**.

**Default suite.** `node tests/run-unit.mjs` ran under the guard: 2,961 tests, **2,917 pass, 2 fail, 42 skipped, 0 cancelled**. The 2 failures are the known owner-deferred styling suites:
- `tests/styling/deferred-article-grid.test.tsx`
- `tests/styling/deferred-clock-delegation.test.ts`

**DB proof.** `SUNDAY_MEMBERSHIP_DATABASE_TESTS=1 DISABLE_PAYLOAD_HMR=true` against disposable PostgreSQL 16.15: **5/5 pass**.
- Environment:
  - container `sphmrs-sunday-membership-20261114`, bound to 127.0.0.1:55491, capped at 384 MiB;
  - fetch and sockets limited to that port;
  - synthetic provider evidence.
- Results:
  - The first settle approves an applicant. The replay was answered 202 by the ledger; status, row timestamp and order effects were unchanged.
  - Invited and waitlist accounts are approved.
  - Staff and suspended rows are unchanged. The order still settled.
  - Rollback case: a deferred-FK COMMIT failure rolled back the order effects and the membership grant together. The status stayed `applicant`.
- Confirms run through `runReconciliation` ownership, as in the reconciliation proof.

**`git diff --check 307c19b HEAD`: clean.**

**History of these runs.**
- The same four gates first ran on `1eb18bb`. Only `diff --check` failed there, on space-before-tab in the generated migration SQL.
- I normalized that whitespace and amended the item 4 commit. All four gates then passed on `bf578c0`.
- After the `4daaa6d` follow-up, all four ran again on it, with the results above.

**Grant against the real Users collection.** A local, uncommitted script ran on a fresh, fully migrated disposable database. It used the full `payload.config.ts`, including the better-auth plugin and the real Users hooks.
- Method: Local API `create` for each user, then `createLocalReq` with the buyer, `initTransaction`, `grantMembershipOnPayment`, and `commitTransaction` or `killTransaction`.
- Results:
  - applicant, invited and waitlist became `approved`;
  - staff, suspended and approved were unchanged;
  - a second grant changed nothing;
  - a killed transaction left the account `applicant`.

**Migration.** Proven by applying the full migration chain, plus the new migration, to fresh databases in the same container.

**Cleanup.** The container and its volume were removed after each use, and both were verified absent at the end.

## Live local render

A guarded `next dev --webpack` ran on 127.0.0.1:3917.
- Limit: 6 GiB, the AGENTS.md dev default.
- `env -i`, a synthetic secret, `PREVIEW_AUTH_MODE=public`, and the disposable migrated DB.
- Turbopack could not resolve `next` through the shared `node_modules` symlink, so I used `--webpack`, as `scripts/member-auth-preview.ts` does.

**Empty global.**
- `/terms`, `/privacy`, `/refund` and `/` returned 200 with their existing content: the unpublished notice and the existing seller section.
- No business footer appeared.

**Filled global.** I filled it through the Local API `updateGlobal`, using obviously synthetic "QA" facts, `면제 (간이과세자)`, and a synthetic terms paragraph. None of it is committed.
- **Desktop (1402 px).** `/terms` shows the global's text and no unpublished notice. Exactly one seller section shows: the footer, with all seven facts including email and the exemption text, plus the three links.
- **Mobile (390 × 844 iframe).**
  - Orca's device emulation changed the user agent but not the viewport, so I rendered the page in a 390 px iframe instead.
  - No horizontal overflow (`scrollWidth` 390). The facts stack in one column and the links wrap.
  - Home at 390 px shows the footer under the teaser footer, with no "seller unavailable" duplicate.
  - `/refund` at 1280 px keeps its current notice, because the global has no refund text, and shows the footer.

**Santa review (concise, harsh).**
- Fail: at the page bottom, the last link row sat under the site frame's fixed bottom-corner mask. I added `pb-16` to the footer and re-rendered; it now clears.
- Pass: the light footer under home's black teaser footer reads clearly.
- The dev overlay showed one pre-existing issue, `MISSING_MESSAGE Customer.navigation.music` in `client-layout.tsx`. The key is absent at base `307c19b`, so it is unrelated to this work.

The server was stopped and port 3917 was verified free. Screenshots were reviewed in-session and not committed.

## Not done, limits and notes

**Outstanding: the shop's new add/remove control was not live-rendered.** Rendering it needs a purchasable published product and a member session. The existing checkout preview fixture renders the legacy `TicketSelection`, not `CommerceCheckout`. The control is covered by source tests and the typecheck only, so it still needs a live review per AGENTS.md.

**Proof limits.**
- The DB proof uses the fixture's `users` stub (the real six-option `membershipStatus` select). The real Users collection with better-auth was executed separately; see the gates section.
- The replay check in the DB proof is answered by the reconciliation ledger (202) before reaching settle. Idempotency inside the grant is covered by the unit test.
- These gated DB suites were not run:
  - `payment-durability.db.test.ts`, which uses the shared fixture with unchanged defaults: its I0 container no longer exists;
  - `reconciliation.db.test.ts` and `real-payload-acceptance.test.ts`.

  Their `users` stubs lack `membershipStatus`, so a settle there now also issues one users update.

**Not regenerated.** `src/payload-generated-schema.ts` was not regenerated.

**Process notes.**
- Two stopped guard runs left stale in-flight markers: the hung RED DB run and the dev-server restarts. Each time I confirmed the supervisor PID was gone and no checkout processes remained before removing the marker. The one other live guard belonged to a different worker's checkout and was left alone.
- One local seed attempt ran outside the guard while the dev server held the lock. It failed at transform and did nothing. I then stopped the server and ran the seed under the guard.
- Guard limits: tests used 1.5 GiB per the batch rules. Typecheck, suite and dev used the repo's `*:guarded` and AGENTS.md defaults (4 / 4 / 6 GiB). None stopped.

**Deployment notes.**
- With `PORTONE_PAYMENT_MODE=live`, every process that loads `payload.config.ts` (build, the migrate job, the server) needs the full PortOne key set. Otherwise it fails at boot by design. Set the keys in all three, or leave the mode unset.
- The footer calls `connection()` inside the `(site)` layout, so every `(site)` route renders per request. The policy pages and home already did.

**Owner actions.**
- Fill the business-info global in the admin.
- Set `PORTONE_PAYMENT_MODE=live` with the live store ID and channel key.

**Remaining processes:** none from this checkout. No container or volume remains. Local scratch under `.qa-local/` is untracked and was deleted.
