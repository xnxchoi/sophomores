# Request from the auth custodian: bring the live plan up to date (2026-11-16, evening)

From: the custodian session on `codex/auth-payment-nfc` (auth, payment, Unlock, NFC).
To: the session that owns the live plan doc (https://claude.ai/artifact/Bt65UugGE56CBfTSRnXKkf).
The owner asked me not to edit the live doc myself, and to route these changes through you.
Everything below is already decided by the owner or is factual status; nothing here needs a new owner decision.

## 1. History tab: three decisions not yet recorded (all 2026-11-16, source "Chat")

- Adding or using a passkey doesn't depend on phone verification. Phone verification still comes before ordering.
- Entry eligibility is the Ticket, never the Signet. Each member holds at most 1 + the guest cap in Tickets. Refunding the book cancels its Signet.
- Sign-in buttons stay monochrome except where a provider requires otherwise: Apple in its own black or white style, Google with its coloured G, and Kakao's yellow button shown only when Kakao is switched on.

(Already in History, for reference: the flow from zero; we control the wallet; social-only sign-up; secondary email out of scope; guest invites stay members-only; capacity is the owner's call; items 15–17.)

## 2. Plan tab: item 14 is overtaken; close it

Replace its four sub-points with one line, ticked:
"Settled 16 Nov by The flow from zero: holders get a free launch-event Ticket by airdrop; the NFC card is bound to the account (first tap opens the welcome page); a dead phone at the door is out of scope; Tickets can't be transferred. Door staff each need a wallet to be added as a verifier."
Keep the NFC thread (comment 0f81db2d) attached.

## 3. Plan tab: Your to-dos

- Tick "Fill in the sign-in provider fields in .env.local" (done; all entries checked well-formed, values not read).
- Add: "Approve creating our wallet owner key. It owns every member's Safe; it signs nothing at launch, but every wallet address is computed from it, so it must exist before the first live Signet and can't change afterwards. The custodian creates it like the grant signer (file in ~/.config/sphmrs, never printed)."

## 4. Plan tab: "Where we are" (replace the three bullets)

- **Merged into this branch (16 Nov):** the Unlock adapter with a Base Sepolia test lock, the paid guest invite (to be reworked for the new flow), key-grant hardening, and the checkout fix (also on main).
- **In review:** (a) the wallet created at payment plus the /welcome page, with passkeys no longer needing phone verification: fix round 5 done in code, waiting on memory to run its checks; (b) social-only sign-up (Apple, Google, Kakao behind a switch; email code signs in registered members only; provider-styled buttons): fix round 2 done in code, waiting on memory. Both then get a two-reviewer pass.
- **Next:** guest invites and Tickets (free launch Ticket per Signet holder; invite Tickets to the member, cap 2 as a setting; unused invites refundable; capacity counted by Tickets); then the NFC card; then refunds in the admin.
- **Dropped today:** our own door page (replaced by Unlock's EVENTS app).
- Polygon is still refused in code until the owner approves it.

## 5. Plan tab: Work order

- Remove the "By Sunday, 2026-11-15" block (past; items 1–3 are done) or mark it done.
- Rewrite step 8 ("Unlock keys"), which still says members get a Safe with a passkey owner, guests get keys by email, and the key is granted once the member activates:
  "**Unlock keys.** We control each member's Safe; it is created at payment and Signet is granted to it at once. Every Signet holder gets one free launch-event Ticket. Guest-invite Tickets go to the member who paid."
- Step 7 (guest invite): add "members-only; the member pays and receives every QR; cap is a setting (2 for now); unused invites refundable."

## 6. Plan tab: The flow from zero

- "Nothing has been built for it yet" → "Being built: wallet at payment and /welcome (in review), social-only sign-up (in review)."
- Branches: wallet activation is now "in review at 5d110c6 (round 5)", not "paused at a0bd38f"; add social sign-up `codex/social-signup-20261116`.
- "The structure map below still shows the old flow. I'll redraw it once 17 is answered." → "The structure map below still shows the old flow; it is redrawn when the wallet and sign-up slices merge."

## 7. Plan tab: How it all connects

The structure map, the journeys diagram and the "Gaps found walking the journeys (15 Nov)" table still show the old flow (passkey-owned wallet, our own door page against our admissions list, guest keys by email). Please mark them "superseded by The flow from zero (16 Nov); redrawn when the wallet and sign-up slices merge", or redraw them now from The flow from zero. The trailing "Correction: sign-up offers only email or Google…" paragraph is obsolete; remove it or mark it superseded.

## 8. Repo copy

After editing, please sync the repo copy (`docs/qa/auth-payment-nfc/consolidation.md` on `codex/auth-payment-nfc`, as you did in 8ba0022), and tell me in Orca when it's done.

ADRs touched today, for cross-reference (all on `codex/auth-payment-nfc`, docs/adr): 0012 (check-in on Events by Unlock), 0013 (wallet we control, social sign-up), 0014 (Tickets and guest invites), and status lines on 0001, 0002, 0003, 0005, 0007, 0009, 0011.
