# Proposal: NTAG 424 DNA SUN Verification, Prompted/Unprompted Taps, and Door Check-In Context

- **Date:** 2026-11-15
- **Source:** Antigravity (Gemini) session
- **Target slice:** `consolidation.md` → Work order Step 9 (**NFC**: activation/linking first, then check-in at the door)
- **Target branch:** `codex/auth-payment-nfc` (mechanism layer; zero impact on Sunday launch items 1–3)

---

## 1. Alignment with the Decision Ledger (`../consolidation.md`)

- **Post-launch scope & simulated stand-in:** Matches Work order Step 9 and `system-map.png` ("Hardware after launch; a simulated tap stands in until then").
- **First tap links chip to already-granted key (15 Nov Gap #1):** Aligns with Claude's gap analysis: member Safe wallet creation and Unlock key granting happen on the website after settlement (reusing the sign-in passkey public key already stored in DB). When the physical card arrives later, **the first NFC tap links the chip to that existing key** (`issued` → `activated (NFC)`), and subsequent taps handle door check-in (`activated (NFC)` → `checked in`).
- **Database-first door check:** Door verification checks our PostgreSQL ledger in an atomic transaction (`inCommerceTransaction` / `pg_advisory_xact_lock` pattern in `src/lib/commerce/_shared/transaction.ts`); Unlock on-chain remains the ownership record behind it.
- **Collection placement:** New Payload collections live under `src/payload/` (matching the 2026-11-14 placement rule).
- **Page contract unchanged:** Pages still only read the consolidated **Key** track (`No key · issued · activated (NFC) · checked in`).

---

## 2. Cryptographic & Replay Verification Contract (SUN)

Because NTAG 424 DNA Secure Unique NFC (SUN) uses symmetric AES-128 keys (`SDM` / AN12196), chip keys stay in server env/secrets and never go on-chain.

1. **Tag NDEF URL template:** `https://sophomores.co/welcome?picc=<encrypted_hex>&cmac=<mac_hex>` (plus clean local/staging origin).
2. **`GET /welcome` (or dedicated verification handler redirecting to `/welcome`):**
   - Requires Node runtime (`node:crypto` for AES-128-CBC `PICCData` decryption, SV2 session key derivation, and RFC 4493 CMAC truncation verification). No new external npm packages required for SUN crypto.
   - Inside an atomic PostgreSQL transaction (`pg_advisory_xact_lock` keyed on `chipHash`):
     - Verify MAC against the derived session key.
     - Enforce **strictly monotonic** `SDMReadCtr > chip.lastReadCtr` and persist the new counter immediately.
   - Issue a short-lived `HttpOnly; SameSite=Lax; Path=/` **`tapSession`** cookie bound to `{ chipHash, counter, verifiedAt }`.
   - `303` redirect to clean `/welcome` with `Cache-Control: private, no-store` and `Referrer-Policy: no-referrer` (matching `src/proxy.ts` `privateResponse` hygiene), stripping `picc`/`cmac` from the address bar so page reloads do not trigger false counter-replay errors.
3. **Security boundary (consistent with `docs/reference/unlock-integration-blueprint.md` §6):**
   - `GET` **never** binds a chip to a user/key, triggers minting/unlocking, or exposes member/buyer PII to unauthenticated visitors. Unauthenticated `/welcome` renders generic UI (`MemberBadge`) plus prompt to sign in or continue.
   - State-changing mutations (**link chip on first tap**, **staff door check-in**) happen only via explicit **`POST`** verified against both the `tapSession` cookie and canonical Better Auth session (`toMemberPrincipal` in `src/lib/member-auth/payload-runtime.ts`).

---

## 3. Data Additions (`src/payload/` & Postgres)

1. **`nfc-chips` collection (`src/payload/`):**
   - `chipHash` (unique text, deterministic server-salted hash of chip UID — raw UID/keys never exposed client-side)
   - `lastReadCtr` (integer, monotonic counter, updated atomically on verified tap)
   - `status` (`unassigned | linked | retired`)
   - `linkedUser` / `linkedKeyGrant` (relationship once first tap links the physical card)
   - `activatedAt`, `lastTappedAt`
2. **`nfc_tap_intents` table or collection (best-effort 15-minute TTL, modeled like `phone_login_intents` in `src/lib/member-auth/identifier.ts`):**
   - Stores `{ tokenHash, purpose: "link" | "checkin" | "verify", targetId?, userId?, guestHintHash?, status: "pending" | "verified" | "consumed", tapSessionId?, expiresAt }`.

---

## 4. Prompted vs. Unprompted Taps & Cross-Platform Behavior

OS NFC handlers launch `/welcome?picc=...&cmac=...` in a **new tab/window** rather than navigating the prompting tab, and chip URLs cannot carry per-user state. Rather than relying on brittle cross-tab storage, treat tap recognition as a **best-effort UX optimization** with automatic fallback:

- **Security vs. Convenience split:**
  - `tapSession` + `better-auth` + `POST` + atomic counter lock handle **all** security guarantees.
  - `nfc_tap_intents` + an optional `HttpOnly; SameSite=Lax` `guestHint` cookie (`Path=/`) only optimize UX (skipping generic intro steps or resuming the prompted action directly in the new tab). Missing cookies **never** cause an error — the server cleanly treats the request as a fresh **unprompted tap**.
- **Prompted flow (same default browser):**
  1. Page calls `POST /api/nfc/intents` before displaying *"Tap your card"*, binding a 15-minute intent to `userId` (if signed in) or `guestHint`.
  2. Using `SameSite=Lax` (matching existing auth cookies in `src/lib/member-auth/server.ts` and `identifier-http.ts`, **not** `Strict`) ensures cookies travel on external OS-initiated top-level `GET` navigations on iOS Safari → Safari and Android Chrome → Chrome.
  3. On verified `GET /welcome`, if a matching active intent exists, link it to `tapSession` and route the new tab directly to the prompted confirmation step (no tab-switching required on mobile).
- **Known cookie-boundary fallbacks (treated as fresh unprompted taps):**
  - **In-app WebViews (Instagram, KakaoTalk, X):** `inapp-spy` is already in `src/stores/Device/detectDevice.ts`. Warn users to *"Open in Safari/Chrome"* before prompted taps, or let the OS launch Safari/Chrome cleanly as a cold tap.
  - **Private mode / mismatched browser (e.g., Chrome-on-iOS when Safari is OS default):** Treated cleanly as a fresh unprompted tap.
  - **Desktop prompting a Phone tap:** Cookies cannot cross devices. Share state only if signed into the **same `userId`** on both (desktop polls/SSEs `/api/nfc/intents/[id]`); otherwise, the phone completes the flow directly on `/welcome`.

---

## 5. Additional Gap Flagged for Door Check-In

When Step 9 (door check-in) is scoped, `/welcome` (or the check-in handler) will encounter **two physical callers** with the same NDEF tap URL:
1. **Member / Guest tapping their own phone:** Wants badge view, status, or first-tap linking (`POST /api/nfc/link`).
2. **Door staff scanning a member's card on a staff device:** Authenticated as a staff/custodian session (`users.membershipStatus === "staff"`). Tapping a `linked` card should route straight to a fast staff check-in confirmation (`POST /api/nfc/check-in`) against PostgreSQL admissions/key grants without exposing member private account settings.

---

## 6. Impact Check for Custodian Review

- **Touches:** Post-launch Step 9 (`codex/auth-payment-nfc` owned paths only: `src/payload/`, NFC routes under `src/app/api/nfc/`, `/welcome` route/handler, and NFC mechanism UI).
- **Conflicts:** None with current `Your decisions so far` ledger in `consolidation.md`. Reinforces the 15 Nov gap resolution (first tap links card to an already-granted key rather than minting on tap).
- **Dependencies:** Still awaits the two existing owner decisions in `consolidation.md` before end-to-end key+NFC wiring: blockchain network (**Polygon** vs. **Base**) and guest door check-in method.
