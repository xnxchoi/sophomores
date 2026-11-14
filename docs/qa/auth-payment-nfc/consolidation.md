# Auth · Payment · Unlock/NFC — one branch, one plan

Live copy (canonical while it is being edited): https://claude.ai/artifact/Bt65UugGE56CBfTSRnXKkf · repo copy 2026-11-14, kept in sync by the custodian.

## The rule

One branch, `codex/auth-payment-nfc`, owns *how* sign-in, phone verification, payment, Unlock keys, NFC and guest invites work. Every other branch builds pages and never touches that. This document is that branch's single plan and replaces the earlier scattered ones, including the Commerce scope review.

- **Created** 2026-11-14 from `main` (`0770cf3`) and pushed. The rule is in AGENTS.md and the worker shared rules.
- **Owned paths:**
  - `src/lib/{member-auth, phone-verification, auth, commerce, tickets, invitation}`;
  - the commerce and order collections, and the sign-in and membership fields on users;
  - the auth, member and phone-verification API routes;
  - the purchase steps (`tickets/payment`, `shop/payment`, `shop/orders`, `shop/invitations`, `account/continue`);
  - `src/components/{Authentication, auth, commerce, tickets}`;
  - their tests.
- **Interface work is part of the branch.** Interface pieces that only exist because of a mechanism, such as the sign-in sheet, the checkout step and the key status, are edited here, not on page branches.
- **Flow:**
  - `main` is merged into this branch regularly.
  - Finished, reviewed slices merge back to `main`; I do that.
  - Any worker on this mechanism work starts from this branch.
  - Nothing lands on `main` directly.
- **Already in flight:**
  - The Sunday build's payment mode, one unit per purchase and membership-on-payment changes come here.
  - The production sign-in work comes here too.
  - The Sunday build's business-info global, policy pages and footer go straight to `main` as page work.

## What pages may depend on

Page branches only see the states below. However authentication or payment works underneath, a page needs only to know which state the visitor is in.

| Track | States a page can show | Where a page reads it |
| --- | --- | --- |
| Account | Signed out · signed in; membership: applicant, invited, approved, waitlist, suspended, staff | the existing session helper and `users.membershipStatus` |
| Purchase | Not purchased · pending · paid · failed | the order for this visitor |
| Key | No key · issued · activated (NFC) · checked in | the visitor's ticket or key record |
| Invite | No invite · invite to pay · paid invite · used | the invite record |

If a page needs a state that isn't listed, add it to the request list below instead of building it on the page branch.

**Requests from page work:** none yet.

## Branches, checked against git

All merged mechanism code is already on `main`. Code that is not on main sits on one branch, I3. Otherwise the older branches hold only plan documents and evidence. From now on, none of them is a base for new work. Checked 2026-11-14 against `main` at `0770cf3`.

| Branch | What it holds | Verdict |
| --- | --- | --- |
| `codex/t004-i3-20261114` | +25 lines: a payment-risk check, plus database tests | **Not merged.** Set aside: the simpler settle replaces it |
| `codex/t004-i2-20261114` | Reconciliation machinery | On main (squash `d3fbc71`). Slated for deletion once the simple settle exists |
| `codex/t004-i1-20261113` | PortOne confirm and result handling | On main, and since changed on main |
| `codex/t004-i0db-20261113` | Real-database payment tests | On main (merge `c998ddb`), since changed on main |
| `codex/t004-i0-20261112` | Payment guards | On main |
| `codex/t002-p2a-20261113` | Token allocation, activation and attendance kernel | On main (`13a29ee`) |
| `codex/unlock-launch-20261113` | Unlock launch attempt, carrying I1 | Owner reset it on 2026-11-13. Code is on main via I1; the rest is superseded |
| `codex/unlock-auth-20261113` | Plan only: `boundary.md`, `decision.md` | **Docs not on main.** Folded into the doc map below |
| `codex/unlock-shape-20261113` | Plan only: `boundary.md`, `decision.md` | **Docs not on main.** Folded into the doc map below |
| `codex/t005-c-20261112` | Guest claim scope | On main |
| `feature/product-production` | Old registry commits, including history from before the rewrite | Local only, stale. Never use it as a base or push it; delete only with your OK |
| `codex/sunday-launch-20261115` | In progress: Sunday build | Items 1–3 come here; item 4 goes to main |
| `codex/auth-production-20261115` | In progress: production sign-in | Comes here |

Retiring the stale branches (they are local only; GitHub holds just `main`, this branch and three unrelated ones) waits for your OK. Nothing is lost if they're deleted, because their code is on `main` and their documents are absorbed here.

## Document map

Only four documents still steer the work. They are folded into this one; the rest are history or evidence. On this branch, older documents are read as background, never as instructions.

| Document | Status | Why |
| --- | --- | --- |
| Commerce scope review (`commerce-scope-review-20261114/summary.md`) | Folded in here | Your 2026-11-14 decisions on checkout, one unit and membership on payment |
| Unlock × NFC reconciliation (`unlock-nfc-plan-20261114/reconciliation.md`) | Folded in here, from line 34 | Safe with a passkey owner; first tap activates, then the card is the check-in credential |
| Sunday and production sign-in specs | Current | The two Sunday slices |
| Unlock integrator report (`unlock-integrator-20261114/report.md`) | Reference | What Unlock actually returns |
| Frontend plan (`unlock-nfc-plan-20261114/plan-frontend-antigravity.md`) | Reference | The substance stands; its copy is placeholder |
| Backend plan (`plan-backend-codex.md`) | Partly superseded | Slices 2–5 are the old I3–I6 machinery |
| Commerce launch plan (`docs/reference/commerce-launch-plan.md`) | **Superseded**, though it still calls itself governing | Three per account, gifts, no guest checkout, and the product called a coin |
| Ticket account planning, T002 model, I3 spec | Superseded | Several units per buyer, gift claims |
| Uncharged-payment recovery note | Superseded | Reuses the old payment ID instead of a new one per attempt |
| Policy drafts (`commerce-policy-drafts.md`) | Superseded | Full refund until 3 Dec, and a Hideaway support address |
| Unlock blueprint, your original plan, integration spec | Background | Research; options already decided |
| Phone verification research | Background | Carrier facts; still valid |
| T004 I0–I2, T002-P2a, T005, Unlock auth/shape/launch, October auth notes | Evidence only | What was built and why |

Two plan files exist only on stale branches (`unlock-auth` and `unlock-shape`). Their decisions that still matter are listed under inconsistencies below.

## Inconsistencies

Nine conflicts, each resolved below. Two of them affect Sunday: the phone check, and the legacy ticket checkout the Sunday build edits.

| Topic | What the documents say | Resolved as |
| --- | --- | --- |
| Units per buyer | Commerce launch plan, To-Do T002, T002 model and I3 spec say three, with gifts; scope review, reconciliation and Sunday spec say one | **One.** The old documents are superseded |
| Refunds | Four rules: not refundable before activation (To-Do:320); returns only *while* the key is not activated, the opposite (reconciliation:38); full refund until 3 Dec (policy drafts); physical-goods rules (launch plan) | **Your call:** customised product, no refunds except by hand. Confirm below |
| Guests | Launch plan: guests must register, and admission is tied to an account. Scope review: guests use the email key or check out without an account | **Scope review.** Guest check-in at the door is still undefined |
| Membership gate | Launch plan: verify before taking part. Scope review: the guest invite skips the gate | **Scope review** |
| Wallet | Your original plan: Safe or Kernel. To-Do (13 Nov): address derived from email. Reconciliation (14 Nov): Safe with a passkey owner | **Safe with a passkey owner** |
| Payment ID on resume | The uncharged-recovery note and the I3 spec reuse the same attempt and forbid expiring it. The scope review wants one ID per attempt, with abandoned attempts expiring | **One ID per attempt**, reused only to resume that same attempt |
| Which checkout | The Sunday spec edits `src/lib/tickets/portone/config.ts`, but the scope review calls the old ticket checkout dead code | **Check at integration:** the live mode must sit on the checkout the shop actually uses |
| NFC order | The member already holds a key before the first tap (your plan) · the key is minted after activation (reconciliation:28) · activation happens at arrival (To-Do) · first tap activates, then the card checks in (reconciliation:37) | **First tap activates, then the card checks in.** Cards come after launch anyway |
| Network | Stale `unlock-shape` decision says Base; main assumes Polygon | **Your call:** listed below |

Other gaps still to settle:

- **Phone check on the web.** Research says a web page can't force an MMS (`phone-verification.md:105-108`). Before Sunday I test the real phone check once on sophomores.co. If it fails, registration falls back to email plus Google for the quiet launch.
- **Passkeys made on localhost** don't carry over to the real domain. No real users have them, so nothing is lost.
- **Support email.** The policy drafts use a Hideaway address; the To-Do uses `concierge@sophomores.co`. You set this in the new business-info page in the admin.
- **Stale-branch decisions still worth keeping:**
  - one Unlock lock per token type, because one key per address blocks holding two types;
  - our own lifetime cap on granted keys, because granting skips the supply cap;
  - a policy for stuck server transactions;
  - email-derived addresses can be guessed from an email list, which matters for the guest email key.
- **Same word, different things.** "Kernel" means both the unused token kernel and a wallet type. "Activation" means three different steps. "Product" means a coin, a magazine or a token. From here on: *wallet* for the Safe, *first tap* for NFC activation, *check-in* for the door. The reconciliation calls the product a magazine; confirm that name.

## Bloat and redundancy

Most of the code bloat is I2. It adds about 2,600 hand-written lines (code, tests and evidence), plus a generated 11,800-line migration snapshot, all for an edge case that the standard checkout covers far more simply. The documents restate one admission policy in four places.

**Code to delete, once its replacement works** (you approved deleting dead weight):

- **I2 reconciliation machinery.** 97 files in its squash commit: `src/lib/commerce/portone/{accounting, admission, ledger-transaction, policy}.ts`, the reconciliations collection and its migration, and the tests. Delete it after step 4.
- **Legacy ticket checkout** (`src/lib/tickets/portone`). The scope review calls it dead code. Confirm which checkout is live at the Sunday integration, then delete the other one.
- **Unused token kernel** (`src/lib/commerce/token-entitlements.ts`, 283 lines). Nothing calls it. Delete it, unless step 8 reuses it for key status.
- **The I3 branch.** Not merged; it can be dropped.

**Documents restating the same thing:**

- The admission and allocation policy appears in the commerce launch plan, the ticket account planning, the T002 model and the To-Do. All four are now superseded by this document.
- The payment financial brief is in three places (To-Do, backlog plan, T004-A design).
- The `boundary.md` files on the `unlock-auth` and `unlock-shape` branches are identical.
- Status lines in the To-Do contradict each other: one says I1–I6 haven't started, another that I2 is integrated. I'll replace the To-Do's mechanism sections with a pointer to this document.

**Branches:** 13 local branches are superseded or stale (see the inventory). Deleting them waits for your OK.

## Work order for this branch

Sunday needs only two slices here: sign-in on sophomores.co, and live card payment that grants membership. Everything else follows after launch, one slice at a time.

**By Sunday, 2026-11-15**

1. **Sign-in on the real domain.** Registration and login accept `https://sophomores.co`, with secure cookies and a hosted database. Local development is unchanged. A worker is on it now.
2. **Live card payment.**
   - Test or live mode comes from config.
   - One unit per purchase.
   - Membership is approved inside the same transaction as the order.
   - This is items 1–3 of the Sunday build, now in progress.
3. **Merge both to `main`** after a light review, so the deploy carries them.

**After launch**

4. **Standard checkout:**
   - one payment ID per attempt, reused when the buyer resumes;
   - the server re-reads the payment and checks the exact amount;
   - one order per payment;
   - a settle step that is safe to run twice;
   - the webhook only triggers that settle;
   - a periodic re-check job.
5. **Delete the dead weight** once step 4 works: the I2 reconciliation machinery and anything else listed under bloat below.
6. **Refunds.** Done manually from the admin through PortOne's cancel.
7. **Guest invite.** A separately paid invite that skips the membership gate. Unused invites are refunded, and offline corrections are made by hand.
8. **Unlock keys:**
   - members get a Safe account with a passkey owner;
   - guests get their key by email;
   - the key is granted when the order settles.
9. **NFC.** Activation first, then check-in at the door.
10. **Sandbox run.** Every path once, within the 30 test payments.

You file the PG application once production is confirmed, before Monday.

## Your decisions still open

None of these block Sunday. They come from the scope review and this consolidation.

- [ ] **Stale branches.** May I delete the local branches marked superseded or stale above, including `feature/product-production`?
- [ ] **Guest check-in.** How does a guest without a Safe account check in at the door: an email key on their phone, or a name on the list?
- [ ] **Card only at launch.** Bank transfer stays out of the PG route; confirm that it is out entirely for now.
- [ ] **Cancelling before shipping.** Since this is a customised product, is there any cancellation window before it ships?
- [ ] **If the event is cancelled.** Full refund through PortOne, or handled by hand?
- [ ] **Guest becoming a member.** After an invited guest attends, do they get an offer to create an account? The scope review proposed this, but it hasn't been approved.
- [ ] **Refund rule.** Confirm the single rule: customised product, so no refunds after purchase except by hand. This retires the four conflicting rules listed above.
- [ ] **Network for Unlock keys.** Polygon (what main assumes) or Base (a stale decision)?
