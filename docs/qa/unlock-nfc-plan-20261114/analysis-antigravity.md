# Technical Analysis: Unlock Protocol × NFC × Korea Fiat Pilot UX Feasibility

## 1. Summary
The owner’s architecture provides a robust 4-layer separation (Identity, PublicLock v14, NTAG 424 DNA, Wallet Pass), but its **Layer 1 Passkey (WebAuthn) default directly conflicts with repository authentication contracts** (passwordless email/Google inline Vaul sheet) and introduces severe failure modes in Korean in-app browsers (KakaoTalk/Naver). By moving the smart account behind existing auth (invisible abstraction) and scoping NFC check-in verification to pre-cached local states with asynchronous chain reconciliation, the ~50-person Seoul pilot can achieve zero-friction onboarding while maintaining strict cryptographic security.

---

## 2. Architecture Analysis

### Journey Evaluation (50-Person Seoul Pilot)

```
[Purchase: Web/Desktop/Mobile]
  → Inline Email/Google Auth (Vaul Sheet) → PortOne KRW PG → Settle & Allocate (Self/Gift)
[Physical Delivery & Tap]
  → Background NFC Read (NTAG 424 DNA) → Browser Opens (/tap?picc=...&cmac=...)
  → Session Check / Inline Auth Continuation → Explicit Activation Action
[Provisioning & Check-in]
  → Backend grantKeys (Platform keyManager) → Local Admission Active → Apple/Google QR Pass
  → Door Check-in: SUN CMAC + Monotonic Counter + Local DB Auth (Async RPC Sync)
```

1. **Passkey Smart Account Creation:**
   - *Friction:* In Korea, event/ticket links are predominantly shared via KakaoTalk or Naver. In-app webviews frequently block or poorly handle `navigator.credentials.create()`. Non-biometric desktops force Windows Hello PIN or external QR prompts, creating high checkout drop-off.
   - *Contract Mismatch:* Violates [AGENTS.md](AGENTS.md) requiring inline passwordless email or Google account lookup within the purchase flow.
2. **Korean PG Checkout:**
   - PortOne/Toss Payments aligns with domestic expectations (KakaoPay, Naver Pay, local cards). Deferred minting via backend `grantKeys` satisfies settled [D1/D2](docs/reference/ticket-account-planning-20261110.md) allocation.
3. **Card First-Tap Registration:**
   - Background iOS/Android NFC reading launches the default browser (Safari/Chrome). If the user bought on desktop or inside KakaoTalk, they arrive unauthenticated. The activation route must gracefully preserve the CMAC/counter capability during inline auth.
4. **Check-In Tap:**
   - Direct on-chain `getHasValidKey` calls at the door introduce 1–3 second RPC latencies and fail under spotty venue connectivity.
5. **Lost-Card Replacement:**
   - Deactivating `card_uid` in the DB while preserving on-chain `tokenId` cleanly avoids re-minting gas and preserves the user's permanent token.
6. **Wallet Pass:**
   - QR barcode (.pkpass / Google Wallet API) is immediate and zero-permission. NFC Apple VAS / Google Smart Tap requires specialized enterprise entitlements and certified POS readers.

---

## 3. Quality Assessment & Contract Contradictions

| Feature / Flow | Owner Plan Specification | Existing Repo Contract / Verified Source Fact | Severity & Impact |
| :--- | :--- | :--- | :--- |
| **Auth Flow** | Layer 1 Passkey (WebAuthn) as default | [AGENTS.md](AGENTS.md): Inline email/Google in Vaul sheet; no separate modal | **High**: High drop-off in KakaoTalk IAB; breaks UI rules |
| **Refund Revocation** | Backend calls `expireAndRefundFor` via `keyManager` | Pinned PublicLock v14: `expireAndRefundFor` is **Lock Manager only**; `cancelAndRefund` is key manager/approved | **Medium**: Reverts unless backend minter is Lock Manager |
| **Public Purchase** | Step 5 keeps on-chain `purchase` enabled | On a free lock, anyone can call `purchase` directly, bypassing PG and minting unallocated tokens | **Critical**: Exploitable capacity bypass |
| **Door Authority** | Synchronous RPC `getHasValidKey` per tap | [B5](docs/reference/unlock-integration-blueprint.md) / [R18](docs/qa/t002-a-20261113/model.md): One check-in authority; local DB ledger is source of truth | **High**: Door bottleneck & queue failure |
| **Webhooks** | Relies on Locksmith WebSub | Integrator report: 5-min polling cron, 1s timeout, silent drop on failure | **Medium**: Missed state events if relied upon |

---

## 4. Risk Matrix

| Risk ID | Risk Description | Severity | Likelihood | Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **R-01** | In-app browser (KakaoTalk/Naver) WebAuthn failure | **High** | High | Use Option 1 (invisible smart account tied to email/Google). |
| **R-02** | Free lock public front-running / bypass | **Critical** | High | Set `maxNumberOfKeys = 0` on PublicLock; use `grantKeys` exclusively. |
| **R-03** | Venue door latency / RPC outage | **High** | Medium | Check-in verifies CMAC + local DB admission; sync to chain out-of-band. |
| **R-04** | Auth context loss on NFC first-tap | **Medium** | High | Persist CMAC payload in URL/session storage through inline auth. |
| **R-05** | Incorrect revocation call reverts | **Medium** | Low | Ensure backend wallet holds `LOCK_MANAGER` role or calls `cancelAndRefund`. |

---

## 5. Recommendations

### Proposed UX Options

- **Option 1: Invisible Smart Account Behind Existing Auth (Recommended)**
  - *Pattern:* Maintain existing [AGENTS.md](AGENTS.md) passwordless email/Google login inside the Vaul sheet. The backend deterministically maps the user to a counterfactual smart account address. 
  - *Trade-off:* User experiences zero crypto ceremony and 100% KakaoTalk/desktop compatibility; true self-custody key management is deferred.
- **Option 2: Progressive Passkey Stepped Upgrade**
  - *Pattern:* Checkout uses email/Google. Upon physical card arrival (`/tap`), user is prompted with an optional "Bind Fast Passkey" step for 1-tap re-entry on supported mobile devices, with instant fallback to email OTP.
  - *Trade-off:* Introduces an extra setup step, but grants device-bound biometric auth without locking out desktop/IAB users.

### Screen & Copy Inventory (`messages/en.json` first, mirrored in `messages/ko.json`)

```
Activation
├── welcomeTitle: "Welcome to Sophomores"
├── welcomePrompt: "Hold your card to activate your membership."
├── authContinuation: "Sign in to complete activation"
├── activateButton: "Activate Membership"
├── activatingStatus: "Verifying card authenticity..."
├── successTitle: "Membership Activated"
├── successBody: "Your card is now bound to your account."
├── addToAppleWallet: "Add to Apple Wallet"
├── addToGoogleWallet: "Save to Google Wallet"
└── errors
    ├── invalidTag: "Invalid or unrecognized card."
    ├── replayDetected: "Security check failed. Please tap again."
    ├── alreadyBound: "This card has already been activated."
    └── openInBrowser: "Please open this page in Safari or Chrome to continue."
```

### Live Render Review Targets (Santa Method)
1. **Physical Card Tap Welcome (`/tap`):** Test on real mobile devices (iPhone Safari & Android Chrome) via actual NDEF background tag trigger; verify full-motion entrance and absence of layout jump.
2. **Inline Auth Continuation Sheet:** Verify Vaul bottom sheet maintains 44px+ hit targets on 390px mobile viewports and centers on desktop.
3. **Pass Reveal & Action Buttons:** Test Apple/Google Wallet CTA buttons in monochrome palette (no green) per brand voice. Confirm Santa review passes before marking UI complete.

---
