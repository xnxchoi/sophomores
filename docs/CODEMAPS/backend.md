<!-- Generated: 2026-11-04 | Files scanned: 81 port files plus the app route listing; 332 app/components/lib TS files counted | Token estimate: ~220 -->

# Backend

## Payload

`../../src/payload.config.ts` collections:

```
Admins, Users, Orders, HomePage, AccountRecoveryRequests
+ contentCollections
```

`../../src/lib` slugs, admin group `Reading`:

```
tags, categories, media, posts, bookmarks, citations, albums, tracks, playlists, notifications
```

Staff write access uses `isCmsStaff`. Public read of posts is limited to `status = published`. Tags, heroes, and authors are plain values. No locker, commerce fields, or polymorphic uploads on these ten.

Payload REST for every collection is the existing catch-all:

```
/api/[...slug]  app/(payload)/api/[...slug]/route.ts
```

The reading page does not call it. `fromStoredPost` in `../../src/lib` is the document-to-slot mapper when a caller has a stored post.

## Other routes

```
POST/GET app/api/auth/[...all]                         Better Auth
GET      app/api/globals/home-page
POST     app/api/member/identify
POST     app/api/member/recovery
POST     app/api/member/recovery/[id]/review
GET      app/api/member/status
POST     app/api/phone-verification/bind
POST     app/api/phone-verification/challenges
GET      app/api/phone-verification/challenges/[id]
POST     app/api/phone-verification/webhook
GET      app/(auth)/api/session
POST     app/(auth)/api/session/verify
POST     app/(auth)/api/session/logout
```

Ported auth screens do not call these routes. `isSixDigitCode` only checks shape, then the screen calls `onSubmit`.

<!-- AUTO-GENERATED: portone-checkout-map BEGIN -->
## PortOne checkout slice — updated 2026-11-06

Generated from the payment route files, `../../src/lib`,
`../../src/lib`, and `package.json`.

Local integration; not live-ready. A separately approved local migration and real
adapter acceptance are recorded in the runbook, not provider/payment/deployment
acceptance. The historical port inventory
above is unchanged; these are the current checkout entry points:

| Entry | Owner / flow |
| --- | --- |
| `POST /api/payments/portone/prepare` | `{ quantity, attemptId: UUID }` → runtime → guarded existing/new order; response requires `recovered` |
| `POST /api/payments/portone/complete` | `../../src/app` → runtime → authoritative reconciliation |
| `POST /api/payments/portone/webhook` | `../../src/app` → raw-body signature verification → same reconciliation |
| `/tickets/payment` | `../../src/app` → `PortOnePaymentResult`; redirect parameters are not payment proof |

- `../../src/lib` owns validation, origin,
  session/verified-account eligibility, provider verification and atomic status
  transitions. Club approval is not purchase eligibility. Existing
  `../../src/lib` is reused; no new commerce framework.
- Prepare persists `prepareKey` (globally unique SHA-256 of the attempt UUID)
  and `prepareFingerprint` (owner, quantity, catalogue and store/channel context).
  Owner/fingerprint mismatches fail closed; concurrent create and interrupted
  create/bind paths recover only the identical durable row. Browser-retained
  attempts require a boolean `recovered`; recovered orders never replay the SDK.
- Reconciliation supports sticky `held` status for identity/amount-verified
  partial reversals and unsafe dispute snapshots. Signed
  `Transaction.DisputeCreated` / `Transaction.DisputeResolved` events use the
  same authoritative lookup. A fresh stored-order read after provider I/O plus
  guarded writes prevents stale paid snapshots clearing a concurrent hold;
  dispute-resolution or later paid events do not automatically release it.
- `../../src/lib/migrations` is registered in
  `../../src/lib/migrations`; Orders fields, `../../src/lib`, and
  `payload-generated-schema.ts` were updated offline. The migration was subsequently
  approved and applied to the existing local database; real PostgreSQL unique-index,
  retry/CAS and held-state races passed in `tests/payload/portone-payment-safety.test.ts`
  using synthetic provider facts. Rollback refuses durable retry/hold evidence.
- Official SDK pins: `@portone/browser-sdk` **0.1.13** and
  `@portone/server-sdk` **0.19.0** (`package.json`). Browser request → server
  completion; webhook uses the server SDK; payment lookup uses bounded REST fetch.
- `config.ts` reads `PORTONE_PAYMENT_MODE`, `PORTONE_ORIGIN`, `PORTONE_STORE_ID`,
  `PORTONE_CHANNEL_KEY`, `PORTONE_API_SECRET`, `PORTONE_WEBHOOK_SECRET`, and
  `PORTONE_TICKET_CATALOGUE_JSON`. Default mode is disabled; only `sandbox` loads.
  `reviewedTestChannel` remains `null`: an owner-approved, exact TEST store/channel
  pair is required; environment labels alone do not establish a test channel.
  Missing/mismatched runtime or origin fails closed; no production mode is accepted.
- `../../src/lib` supplies shared public seller/policy content;
  `publishedCommerceDisclosureSchema` gates checkout readiness and prepare.
  Owner-approved same-entity seller data and public mobile contact are populated,
  but the unchanged non-mobile phone requirement and `null` terms/privacy/refund
  policies still block that gate. The phone check is an implementation constraint,
  not a verified selected-PG/legal requirement; check the selected PG’s actual
  requirement before requesting another number or proposing a gate change.
  Completion/webhooks do not require current
  publication, provided the configured runtime remains available.
- Explicit same-ID resume now has bounded local implementation acceptance through
  `../../src/app` and the retained payment result UI.
  It never rotates the payment ID or automatically reopens the SDK; selected-PG
  acceptance remains outstanding. See the runbook for classifier and locking limits.
- Still blocked: real phone/public member runtime and shared ingress limits; approved offer and
  adapted/effective policies, verification of selected-PG contact requirements,
  PG review and public TLS.
  Payment status is not ticket issuance or admission; no complete payment journey
  or live-provider acceptance is established by these source changes.
- Synthetic actual-component fixture only: `rtk proxy node
  tests/support/composition-preview.mjs --checkout --check`; omit `--check` for
  loopback port **3082**. No provider/device proof. See
  [the local runbook](../deployment/member-auth.local.md#portone-checkout--current-source-scope-2026-11-06).
  The runbook owns the next-step plan; this map is current source inventory only.
<!-- AUTO-GENERATED: portone-checkout-map END -->
