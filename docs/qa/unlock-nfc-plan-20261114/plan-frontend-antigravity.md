# Frontend Architecture Plan: Unlock × Safe × NFC × Korea Fiat

## 1. Context Summary
Sophomores currently implements:
- Passwordless email/Google authentication via `VerificationTray` ([AGENTS.md](AGENTS.md), Vaul drawer on mobile, centered modal on desktop).
- Single/multi-unit commerce checkout with PortOne integration (`src/components/commerce/checkout.tsx`, `payment.tsx`).
- In-app browser detection via `InAppSpy` and `UAParser` (`src/stores/Device/detectDevice.ts`, `src/hideaway/components/UX/escapeInAppBrowser.tsx`).
- Fragment bearer claim pattern (`src/components/commerce/invitation-claim.tsx`).

Per the authoritative owner reconciliation ([reconciliation.md](docs/qa/unlock-nfc-plan-20261114/reconciliation.md)), this plan defines the frontend component and state architecture for: 1-unit magazine bundle purchase, inline auth, NFC first-tap activation with in-app browser (IAB) escape, WebAuthn passkey Safe creation, activation success, backup wallet addition, guest-invite lane with payer selection, and post-event refund choice.

---

## 2. Design: Screen/State Map & Component Architecture

```
[Shop Checkout]
  ├── Offer & Bundle Policy (Qty = 1 fixed; Magazine + Token)
  └── Inline Auth (Email/Google in Vaul Tray) → PortOne KRW
[Physical Delivery: Card Tap]
  └── /tap Landing (?picc=...&cmac=...)
        ├── IAB Detection: Escape Modal (Kakao/Naver/Instagram)
        ├── Auth Continuation (if session missing)
        ├── WebAuthn Passkey Creation (RP-ID domain; residentKey required)
        ├── Safe AA Derivation (toSafeSmartAccount)
        └── Activation Reveal & Pass Download (Apple/Google QR)
[Post-Activation & Guest Flows]
  ├── Settings: Add Optional Backup Wallet (Sponsored UserOp)
  ├── Guest Lane: Send Invite (Select Payer: Buyer vs Guest)
  └── Post-Event: Unused Invite Refund Choice (Card default vs Store credit)
```

---

### S1: One-Unit Magazine + Membership Bundle Purchase
- **Route & Component Owner:** `src/app/(site)/shop/page.tsx`, `src/components/commerce/offer.tsx`, `src/components/commerce/checkout.tsx`.
- **States:** `selecting` (locked to qty 1), `auth-required` (inline gate), `shipping-entry`, `payment-submitting`, `payment-settled`.
- **UX & Motion:** Tailwind-only; no quantity stepper; clear notice that physical magazine returns are accepted **only while token is unactivated**. Primary CTA triggers existing inline `CommerceAccountGate`.
- **Copy Keys (`messages/en.json`):**
  - `Shop.Bundle.title`: `"Sophomores Magazine Issue 01 + Membership"`
  - `Shop.Bundle.policyNotice`: `"Returns accepted only while membership card remains unactivated."`
  - `Shop.Quantity.locked`: `"Limited to one copy per attendee."`
- **Backend Dependencies:** PortOne T004 I2–I6 verification endpoints; Payload order settlement.

---

### S2: Inline Email / Google Authentication Gate
- **Route & Component Owner:** `src/components/commerce/checkout.tsx` (`CommerceAccountGate`), `src/components/Authentication/member-auth/account-study.tsx`.
- **States:** `email-input`, `otp-sent`, `verifying`, `google-redirect`, `authenticated`.
- **UX & Motion:** Preserves existing Vaul `VerificationTray` contract: horizontally anchored, 44px+ hit targets, monochrome palette (no green), left-aligned Cancel.
- **Copy Keys (`messages/en.json`):**
  - Reuses existing `MemberAuth.*` and `Customer.components_commerce_checkout.*`.

---

### S3: NFC First-Tap Landing (`/tap`) with In-App Browser Escape
- **Route & Component Owner:** `src/app/(site)/tap/page.tsx`, `src/components/activation/tap-landing.tsx`, `src/components/activation/iab-escape.tsx`.
- **URL Contract:** `/tap?picc=...&cmac=...` (query or fragment bearer retained in memory).
- **IAB Detection & Escape Strategy:**
  - *Detection:* `detectDevice()` (`browser.inApp === true`).
  - *Android (KakaoTalk/Naver):* Auto-redirect via intent scheme:  
    `intent://sophomores.co/tap?...#Intent;scheme=https;package=com.android.chrome;end;`
  - *iOS (KakaoTalk/Naver/Instagram):* Show non-dismissible Vaul sheet with 1-click clipboard copy + clear illustration pointing to the Safari menu (`...` -> "Open in Safari"). WebAuthn fails inside iOS webviews; do not display passkey prompts.
- **States:** `evaluating-env`, `iab-escape-prompt`, `auth-check`, `ready-to-activate`, `invalid-tag`.
- **Copy Keys (`messages/en.json`):**
  - `Activation.IAB.title`: `"Open in Browser to Activate"`
  - `Activation.IAB.description`: `"To securely register your hardware key, open this page in {browser}."`
  - `Activation.IAB.copyAction`: `"Copy Link"`
  - `Activation.IAB.copied`: `"Link Copied"`

---

### S4: Passkey Creation & Safe Smart Account Derivation
- **Route & Component Owner:** `src/components/activation/passkey-step.tsx`.
- **Options & Strategy:**
  - Call `createWebAuthnCredential` via `viem/account-abstraction`:
    `{ rp: { name: "Sophomores", id: window.location.hostname }, residentKey: "required", userVerification: "preferred" }`.
  - Omit `authenticatorAttachment` to support Windows Hello PIN, TouchID, and cross-device QR seamlessly.
  - Compute Safe address off-chain via `permissionless` (`toSafeSmartAccount`).
- **States:** `idle`, `prompting-biometrics`, `deriving-account`, `creation-rejected`, `unsupported-platform`.
- **UX & Motion:** Single-stage card entrance; clear spinner during counterfactual derivation; retry button on cancellation.
- **Copy Keys (`messages/en.json`):**
  - `Activation.Passkey.heading`: `"Create Your Key"`
  - `Activation.Passkey.subheading`: `"Use Face ID, Touch ID, or device passcode for permanent access."`
  - `Activation.Passkey.action`: `"Continue"`
  - `Activation.Passkey.retry`: `"Try Again"`
- **Backend Dependencies:** Verification endpoint accepting `(credentialId, publicKey, safeAddress, picc, cmac)`.

---

### S5: Activation Success & Pass Handoff
- **Route & Component Owner:** `src/components/activation/activation-success.tsx`.
- **States:** `submitting-activation`, `confirmed-active`, `queued-minting`, `error-replay`.
- **UX & Motion:** Restrained motion fade revealing permanent Token ID, bound chip status, and download buttons for Apple Wallet (`.pkpass` QR) and Google Wallet.
- **Copy Keys (`messages/en.json`):**
  - `Activation.Success.title`: `"Membership Bound"`
  - `Activation.Success.tokenLabel`: `"Token ID"`
  - `Activation.Success.appleWallet`: `"Add to Apple Wallet"`
  - `Activation.Success.googleWallet`: `"Save to Google Wallet"`
- **Backend Dependencies:** Server `grantKeys` execution; Apple/Google pass generation.

---

### S6: Optional Backup Wallet Addition
- **Route & Component Owner:** `src/components/settings/backup-wallet-drawer.tsx` (accessible from `/me/settings` or activation success).
- **States:** `drawer-closed`, `select-type` (Second Passkey vs External EOA), `awaiting-signature`, `sponsoring-userop`, `complete`.
- **UX & Motion:** Vaul drawer; communicates that Sophomores sponsors the network gas to add the second owner to the Safe.
- **Copy Keys (`messages/en.json`):**
  - `Settings.Backup.title`: `"Add Backup Signer"`
  - `Settings.Backup.description`: `"Add a secondary device or Ethereum wallet to prevent account lockout."`
  - `Settings.Backup.sponsoredNotice`: `"Network setup is sponsored by Sophomores."`
- **Backend Dependencies:** Paymaster/bundler service for `addOwnerWithThreshold` UserOp.

---

### S7: Guest Invite Lane (Payer Selection & Claim)
- **Route & Component Owner:** `src/app/(site)/shop/invitations/page.tsx`, `src/components/commerce/guest-invite.tsx`.
- **Buyer Setup States:** `select-payer` (Radio: "Buyer Pays Now" vs "Guest Pays on Entry"), `generating-invite`, `invite-ready` (Copyable link).
- **Guest Claim States:** `invite-received`, `free-claim-flow` (if buyer paid) vs `guest-discount-checkout` (if guest pays via PortOne), `proceed-to-activation`.
- **Copy Keys (`messages/en.json`):**
  - `Invite.Payer.buyerOption`: `"Pay now for your guest (₩{discountedPrice})"`
  - `Invite.Payer.guestOption`: `"Let guest pay upon accepting (₩{discountedPrice})"`
  - `Invite.Limit.reached`: `"Maximum 1 guest invite per member."`
- **Backend Dependencies:** Secondary lock/allocation ledger for discounted guest airdrop.

---

### S8: Post-Event Unused Invite Refund Prompt
- **Route & Component Owner:** `src/components/commerce/refund-choice-modal.tsx`, `src/app/(site)/me/page.tsx`.
- **States:** `prompt-available`, `choice-card` (Default: PortOne cancellation), `choice-credit` (Opt-in store credit), `submitting`, `processed`.
- **UX & Motion:** Centered alert modal. Default radio selection is original payment method refund (complying with KFTC fair trade rules); credit requires explicit checkbox acceptance with terms.
- **Copy Keys (`messages/en.json`):**
  - `Refund.Invite.heading`: `"Unused Guest Invite Refund"`
  - `Refund.Invite.cardDefault`: `"Refund to original payment card (Default)"`
  - `Refund.Invite.creditOptIn`: `"Receive Sophomores store credit (Valid for 1 year)"`
  - `Refund.Invite.confirm`: `"Confirm Refund"`
- **Backend Dependencies:** PortOne cancel API adapter.

---

## 3. Implementation Plan

```
Task 1: In-App Browser Escape Drawer
  └── File: src/components/activation/iab-escape.tsx
Task 2: One-Unit Magazine Bundle & Return Policy UI
  └── Files: src/components/commerce/offer.tsx, checkout.tsx
Task 3: /tap NFC Landing & State Machine
  └── Files: src/app/(site)/tap/page.tsx, src/components/activation/tap-landing.tsx
Task 4: WebAuthn Passkey Step & Safe Derivation
  └── File: src/components/activation/passkey-step.tsx
Task 5: Activation Success & Wallet Pass CTAs
  └── File: src/components/activation/activation-success.tsx
Task 6: Guest-Invite Lane Component
  └── File: src/components/commerce/guest-invite.tsx
Task 7: Post-Event Refund Choice Modal
  └── File: src/components/commerce/refund-choice-modal.tsx
Task 8: Canonical Copy Sync
  └── Files: messages/en.json (first), messages/ko.json (empty string mirror)
```

---

## 4. Risks & Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Passkey creation attempted in IAB** | Fatal JS exception / dropped prompt | `IABEscapeDialog` blocks render until user is in mobile Safari/Chrome. |
| **User closes browser during Safe derivation** | Orphaned activation intent | Derivation is deterministic off the WebAuthn public key; retry resumes seamlessly without duplicate mint. |
| **Desktop without biometric hardware** | User confusion | Omit `authenticatorAttachment`; permit OS PIN (Windows Hello) or cross-device phone QR passkey. |
| **PortOne refund window expiration** | Merchant funds locked | Automated cron initiates card refund immediately after event cutoff unless credit was selected. |

---

## 5. Validation Criteria

1. **Live Render Review (Mandatory Santa Method):**
   - Inspect on physical iOS Safari (390px) and Android Chrome.
   - Verify Vaul drawer ergonomics: 48px hit areas, no layout reflow, smooth 1-beat transitions.
   - Test IAB escape simulation by spoofing KakaoTalk/Naver UA strings.
2. **I18n Integrity:**
   - Run `pnpm test:guarded` to verify identical key parity between `messages/en.json` and `messages/ko.json`.
3. **DOM & Touch Testing:**
   - Execute test suites under `tests/commerce/ui/` with DOM identity assertions comparing booleans only.

---
