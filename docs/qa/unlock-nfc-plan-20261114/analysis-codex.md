# Unlock/NFC Backend Feasibility

**Review checkpoint — read-only.** No files changed, installs, tests, services, network/RPC or chain calls. Contract conclusions use supplied facts **F1–F6**, not verification of the deployed lock.

Source shorthand:
- **P:** `docs/qa/unlock-nfc-plan-20261114/owner-plan.original.md`
- **R:** `docs/qa/unlock-integrator-20261114/report.md`
- **S:** `docs/reference/ticket-account-planning-20261110.md`
- **M:** `docs/qa/t002-a-20261113/model.md`
- **T:** `docs/To-Do List.md`

## 1. Problem Analysis

The components are broadly feasible; **their proposed lifecycle conflicts with adopted policy**:

- P mints to the buyer’s smart account before NFC registration. Adopted policy allocates paid units immediately but preserves extra units as **unactivated gifts for eligible bearers**. Minting all units to the buyer also hits the default one-key/address limit. [P L99–118; S L69–93; M L37; F2]
- Membership is **perpetual, one/account, nontransferable after activation**. Event access remains separately purchased and capacity-controlled; membership validity alone cannot authorize entry. [M L35–48]
- The registry still pauses implementation and invalidates earlier candidates. This analysis does not resume them or ratify the new plan. [T L461–482]

## 2. Technical Evaluation

| Layer | Assessment |
|---|---|
| **0 — Chain/treasury** | **Feasible, deployment unverified.** Polygon is a candidate, not an established property of the already-deployed lock. Obtain its network/address, version, roles, hooks, supply, duration and purchase configuration before considering redeployment. Exchange fees, withdrawal rules, gas costs and hardware/vendor claims remain unverified; EVM compatibility does not prove identical smart-account/verifier availability. [P L39–68; R L623; F6] |
| **1 — Authentication/address** | **Possible, unnecessary launch expansion.** Counterfactual recipients work mechanically because grants omit receiver callbacks; this does not prove passkey recovery, smart-account deployment or signature validation. `userVerification: preferred` does not guarantee the UV flag required by the selected verifier. “$0/month” excludes hosting, RPC, recovery and later account execution. Mandatory passkey onboarding conflicts with existing email/Google authentication and the earlier email-derived-address basis—although that basis itself sits below the reset. [P L72–91; T L475–480; F1] |
| **2 — Payment/minting** | **Feasible after corrections.** Reuse PortOne and the official finalizer, not a new Toss/payment engine. Use **KeyGranter-only**, not Lock Manager, for online grants. Platform key management is useful, but **`expireAndRefundFor` requires Lock Manager**; `cancelAndRefund` uses Unlock’s calculated refund and cannot reverse KRW. Automatic refund→revocation conflates voluntary refunds, chargebacks and unresolved perpetual-token disposition; unactivated-token refunds are owner-disallowed, with enforcement awaiting legal/PG review. Disable public purchase on the free paid-membership lock: P’s parallel purchase otherwise bypasses payment/account provenance. Grants bypass supply caps but enforce one-key/address; perpetual membership needs explicit perpetual expiration, not routine renewal. Webhooks are lossy hints, not settlement authority. [P L99–104; M L194–204; R L292–320; F1–F5] |
| **3 — NFC** | **Feasible, different product.** P binds an already-held NFT to a reusable check-in card; adopted NFC opens bearer activation of an unactivated entitlement. Preserve that distinction or obtain explicit replacement approval. Static links are acceptable for activation—not authenticity. SDM authenticates tag messages; counters alone do not prevent stolen fresh-URL first-use/relay, prove holder identity or consume paid admission. Counter updates need atomic comparison; GET must not activate. Membership, active card and CMAC still omit event entitlement, holds and atomic check-in. [P L108–118; S L83–93, L203–219] |
| **4 — Passes** | **Feasible, separately gated.** QR-first versus phone-NFC separation is sensible. Apple/Google signing, issuer access, update delivery and native Unlock alternatives remain unproved here. A signed/copied QR is presentation, not rightful-holder or single-use proof. Resolve passes to the paid event entitlement; do not authorize through `token_id` alone. Keep card deactivation independent from membership/pass cancellation. [P L122–130; S L170–178] |

**Current implementation gap:** admissions enforce event/account uniqueness, not perpetual membership uniqueness; claims require expiry; check-in still accepts named admissions. These require deliberate integration, not schema relabeling.  
`src/lib/payload/collections/commerce-admissions/index.ts:6` · `src/lib/payload/collections/commerce-claims/index.ts:6` · `src/lib/commerce/guests.ts:165`

## 3. Options

| Approach | Trade-offs / custody |
|---|---|
| **A — Full plan, corrected** | Passkey accounts + automated grants + SDM cards + custom passes. Greatest recovery, credential and hardware scope. As written, online Lock Manager compromise exposes lock configuration, revocation and treasury authority—not merely issuance. |
| **B — Minimal controlled issuance** | Existing auth → verified paid allocation → explicit activation → grant to a frozen email-derived recipient; NFC/pass presentation later. Lowest integration change. Online KeyGranter compromise still permits arbitrary grants/managers and extensions; supply caps do **not** contain it. |
| **C — Manual dashboard issuance pilot** | Same allocation/activation ledger, operator-reviewed dashboard grants and recorded receipts. No online minter secret; slower fulfillment and greater operator-error/reconciliation burden. Offline dashboard Lock Manager remains highly privileged. |

## 4. Recommendation

**B, subject to explicit owner reconciliation.** Preserve gift-before-activation; immediate payment→grant is appropriate only for explicitly approved known-self issuance.

Use Unlock’s pinned `{lowercased email, lowercased lock}` derivation, frozen against the canonical verified account—not recalculated after email changes. It is a **keyless recipient, not a signable wallet or login identity**. Its public derivation permits email guessing; native walletless flows normally use Unlock’s manager, so platform-managed recovery/UX needs proof. [R L218–228]

Separate the online KeyGranter from offline platform key-management and lock-administration custody. Keep little gas online. Monitoring/application limits help operationally but cannot constrain a stolen signing key; containment requires role revocation and manager-led reconciliation.

## 5. Action Items

**Proposed Payload collections—not raw tables:** retain `users`, plugin orders/transactions, reservations, admissions and redemptions. Extend `commerce-claims` for versioned, nonexpiring activation capabilities. Add `membership-entitlements` per purchased unit, `account-memberships` with unique account and chain/lock/token identity, and `membership-issuance-operations` with immutable target, attempts, receipts and unknown/held states. Later add `nfc-cards` and `wallet-passes`, related to membership **and relevant event admission**. Store secret references, not AES/minter keys. Use owning-`req` Local API and reviewed migrations.

| Ordered Slice | Acceptance Criteria | Required Approvals / Inputs |
|---|---|---|
| **1. Reconcile architecture** | Approve NFC purpose, address source and issuance timing; retain unresolved refund/event-credential choices. | Owner resumes bounded Unlock work; supplies lock identity. No external action. |
| **2. Finish payment foundation** | I2 limits survive restart; I3 finalization/webhook replay creates one order/allocation. | Owner numeric limits; pending TEST keys; existing sandbox ceiling of 30 payments/webhook registration. |
| **3. Persist activation model** | Concurrent gifts yield one winner/account membership slot; late activation and code regeneration preserve original allocation. | Bounded implementation, Payload schema/migration/backfill and isolated-DB scope approval. |
| **4. Prove issuance** | Unknown submissions reconcile without blind regrant; receipts match recipient, perpetual expiration and manager. | Named dependency installs; RPC access; separate chain-write/configuration/gas approval; minter/manager custody and role approval. Verify purchase closure against existing supply. |
| **5. Close recovery/entry** | I4–I6 preserve identity and browser-independent recovery; concurrent scans consume one paid admission. | Operational actor, budgets, runtime/provider/device proofs; legal/PG refund disposition and merchant approval for live payments. |
| **6. Add physical/pass surfaces** | Activation secrets never admit; replacement/replay and real-device checks pass. | Separate hardware/provisioning purchase approval; AES custody; Apple certificates/APNs and Google issuer/service credentials; VAS/Smart Tap approvals only if selected. |

Deployment remains the final, separately approved commerce milestone—not a shortcut around authentication, payment, fulfillment or recovery acceptance. `docs/reference/commerce-launch-plan.md:24`



---
