# 03 — Flows and scenarios

Working draft · 2026-11-13 · Level 2 of the [commerce experience plan](README.md).
Each branch of the [journey map](02-journey-map.md) is broken into its normal path
and the full range of cases it has to handle. Code and registry references are under
[Sources](#sources).

## The rule this version follows

**Owner decision, 2026-11-13: each account may buy once, for itself. Buying on behalf
of others is removed.** Gift links, bearer activation, the gift recipient's journey and
the three-coin allowance are gone. Decisions C-13 to C-17 at the end cover what the rule
still leaves open. What it changes elsewhere is listed in the
[README](README.md#what-the-single-purchase-rule-changes).

## Owner answers folded in (2026-11-13)

- **No Korean phone.** Not supported by the automated process; support handles each case
  individually.
- **Under 14.** Out of scope: they cannot sign up.
- **Messaging-app browsers.** Detect them and offer a single button that leaves for the
  phone's own browser. The Hideaway's `EscapeInAppBrowser` is the reference, though it is
  old and not well built [s1].

## Terms used

- **Token:** the membership the coin carries, recorded against an account.
- **Unlock:** the outside service that will also record each membership on a public
  blockchain (the "on-chain record"). Holders get it without buying again.
- **Token model:** the design document that sets the token's rules (T002).
- **Eligibility check:** the server's check that an account may still buy.

## How to read a scenario

Each scenario has an ID, what happens, and **one** status, followed by its owner.

| Status | Meaning |
| --- | --- |
| **Settled** | An owner decision or accepted contract says what happens. It describes the decision, not working software |
| **Proposal** | Designed or recommended, not yet accepted. Includes anything that rests on an open C- decision that already has a recommendation |
| **HOLD** | The owner has decided what should happen, but something open blocks it |
| **Blocked** | Depends on work that is not live yet |
| **Gap** | Nothing decides it yet, and no recommendation exists |

When more than one applies, the most restrictive is shown: Blocked, then HOLD, then
Proposal. A scenario with no owning task says "none".

Facts are cited as `R-xx` from the [requisites register](../product-sales-page/02-requisite-information.md).
The single-purchase rule changes several of them (R-E3, R-E4, R-E6, R-E7, R-E9).

---

## A. Sale window and publication (before stage 1)

- **A1 · On sale.** Product page with Buy. *Settled · T003*
- **A2 · Before the sale opens, or after it closes.** Today the page says only
  "Purchasing is not open" [s2]. The PG reviewer needs more than that. *Gap · R-G1*
- **A3 · Publication check fails** (for example a missing policy, or the mobile seller
  phone in R-B1). The whole page falls back to "not open"; there is no partial page.
  *Settled · launch plan step 4*
- **A4 · Sold out.** The story stays; the purchase area shows the sold-out state, with
  no restock or waitlist promise. *Proposal · T003*
- **A5 · After the launch evening.** The evening copy moves to the past tense, or is
  removed. *Gap · owner (related to P8)*
- **A6 · Two products published at once.** The page cannot choose between them (R-F5).
  *Proposal · C-1*

## B. Evaluate and decide (stages 2–3)

- **B1 · Visitor reads and leaves.** Nothing is stored about them. *Settled · none*
- **B2 · Visitor wants to know what the token is.** Plain words, no crypto language.
  *Gap · P6*
- **B3 · Signed-in visitor who has already bought.** The purchase area says they have
  theirs and links to their order. Which order states count as "already bought" is
  C-15. *Proposal · C-15; copy in T003*
- **B4 · Visitor wants to buy one for someone else.** Not possible. The page says each
  account buys its own, and offers to share the page. *Settled · copy: T003*
- **B5 · Visitor asks a question first.** concierge@sophomores.co (R-B7). Hours and
  response target are not set. *Gap · owner fact*
- **B6 · Visitor abroad.** Ships within South Korea only; the page says so before
  checkout. *Settled · copy in T003*
- **B7 · Under the drinking age.** Who may receive the Part I drinks, and how age is
  checked (R-B9). *Gap · owner + legal*
- **B8 · Page opened inside KakaoTalk, Instagram or another app's browser.** Google
  sign-in and payment windows can fail there. The page detects it and offers one button
  that opens the same address in the phone's browser. Where an app allows no direct
  hand-off, copying the link is the fallback. Which apps allow what must be tested on real
  phones. *Settled · owner direction; build in T003*

## C. Buy: account, eligibility, agreement, address (stage 4, before payment)

*Parked (owner, 2026-11-14): checkout and payment are set aside for now. The scenarios below stay as written; they are not being worked on.*

- **C1 · New customer.** Email or Google, inline on the page. The email is looked up;
  a code is sent only when they press the button; then only missing setup is asked for
  (AGENTS.md purchase rules). *Settled · T003, T009*
- **C2 · Returning customer.** The same inline path offers sign-in instead.
  *Settled · T003*
- **C3 · Phone not verified.** Buying needs a verified email and phone (R-E5). Public
  phone verification is not live, so no public account can be approved today.
  *Blocked · critical-path item 4, launch plan step 6*
- **C4 · No Korean phone.** The automated path doesn't support it. The page sends them
  to support, which handles it individually. *Settled · copy: T003*
- **C5 · Already bought this release.** The same as B3. *Proposal · C-15*
- **C6 · Purchase started in two tabs or on two devices.** Only one order can result.
  *Settled · T004 (launch plan payment table)*
- **C7 · Address outside Korea, or incomplete.** Rejected at the address step, with the
  reason. *Settled · copy in T003*
- **C8 · Jeju or other remote areas (도서산간).** Couriers usually charge extra. Whether
  the price absorbs it or the fee is added is not decided. *Gap · owner (R-B5)*
- **C9 · Leaves mid-checkout and comes back.** Picks up where they were, without new
  codes being sent. *Proposal · T010*
- **C10 · Agreement and consent before payment.** Korean checkouts normally ask the buyer
  to confirm the purchase terms (구매조건 확인 및 결제 동의). They also ask for consent to
  collect personal data (개인정보 수집·이용). Handing the name, phone and address to the
  courier is usually treated as outsourcing (처리위탁), disclosed in the privacy policy,
  rather than third-party provision (제3자 제공) that needs consent; legal decides which. Since the 2023 amendment to the personal-data law, data
  needed to fulfil the contract may need only a notice rather than consent; legal decides
  which applies. Required and optional items are always shown separately. PG reviewers
  check for both. *Gap · legal (R-B6, R-B11); placement in T003*

## D. Pay (stage 4, PortOne)

*Parked (owner, 2026-11-14): checkout and payment are set aside for now. The scenarios below stay as written; they are not being worked on.*

**Where payment stands, in plain terms:** the core of payment handling is built, but a
test against a real database on 2026-11-13 showed it isn't yet safe to take payments.
A fix has been sent out. Separate work on how payment results are read and classified is in
review and doesn't lift the block. *(Details under [Sources](#sources).)*

- **D1 · Payment succeeds.** On a phone, PortOne sends the customer back to
  `/shop/payment`, where the server confirms the payment. On a desktop, the window closes
  and confirmation happens on `/shop` [s3]. Either way the order page follows.
  *Blocked · the database fix; real-provider acceptance in launch plan step 8*
- **D2 · Customer closes or backs out of the PortOne window.** Account, address and order
  details are kept. That attempt is checked with PortOne before another starts, and no
  new payment opens by itself. The reserved coin is released only after a verified
  cancellation or failure. *Settled · T004 (launch plan payment table)*
- **D3 · Payment declined.** A retry or another method is offered once the failed attempt
  is resolved. Inputs are kept. *Settled · T004; copy in T005*
- **D4 · Result unknown** (timeout, lost connection, delayed approval). Shown as "we're
  confirming your payment", never as failed or paid, until PortOne's record settles it.
  The customer is never charged twice. *Settled · T004*
- **D5 · Duplicate, late or out-of-order confirmations from PortOne.** One order; a paid
  or refunded order never moves backwards. *Settled · T004*
- **D6 · Amount or order mismatch.** Rejected; no order is created [s4]. *Settled · T004*
- **D7 · Payment methods.** Card only today [s5]. Not yet chosen:
  - easy-pay (KakaoPay, NaverPay, Toss Pay), which Korean buyers expect and each of which
    may need its own PG approval;
  - bank transfer or virtual account, which needs a purchase-safety service (R-B12).

  *Gap · owner + PG*
- **D8 · Paid, but stock ran out meanwhile.** Shouldn't happen while the reservation
  holds the coin. If it does: an automatic refund, and the customer is told. *Proposal · T004*
- **D9 · Refresh, reopened tab, mobile redirect or blocked popup.** Identity and the
  attempt are restored; payment doesn't reopen automatically. *Settled · T004, T010*
- **D10 · Session expires, or the customer switches account mid-payment.** They sign in
  again without losing context. The attempt never attaches to a different account, and
  never shows that account the address. *Settled · T004 (launch plan payment table)*

## E. Receive and fulfil (stage 5)

- **E1 · Order confirmed.** The order page shows the coin, the delivery state and how to
  reach support. Notices beyond that are C-3. *Proposal · T003, T013*
- **E2 · Dispatched.** Courier and tracking link (R-B5). The data fields exist; the values
  and copy don't. *Gap · owner*
- **E3 · Delivery is weeks after the sale.** Korean e-commerce rules generally require the
  supply period to be stated at the time of sale. Confirm the exact requirement with legal.
  *Gap · owner + legal (R-B5)*
- **E4 · Delayed.** The order page shows the latest known state; support can confirm.
  *Proposal · dispatch-state copy: T003*
- **E5 · Lost in transit, or damaged.** Replacement or refund, and who pays return
  shipping (R-B13). A replacement belongs to the same purchase (C-15). *Gap · owner +
  legal*
- **E6 · Address change before dispatch.** Handled by support; there is no self-service.
  *Proposal · none*
- **E7 · Undeliverable, returned to sender.** Contact the buyer, then reship or refund.
  *Proposal · none*
- **E8 · Coin lost or stolen after delivery, before activation.** The buyer can't buy
  again (single purchase). So they need either activation from the order page (C-13) or
  a replacement coin, with the old coin's code switched off (U1 lets the buyer replace an
  unactivated coin's code). *Proposal · C-13*

## F. Activate the buyer's own token (stage 6)

*Held with the token flows (owner, 2026-11-14).*

The shape of this branch depends on **C-13**. Scenarios note where the options differ.

- **F1 · Normal path.** The buyer taps or scans the delivered coin, signs in if needed,
  and activates. The token binds to their account. *Proposal · C-13; T002, T013*
- **F2 · Someone else opens the coin** (found, stolen or resold). Only the buyer's account
  can activate it. The visitor sees a calm "this coin belongs to another account", with no
  account details, and a link to the product page. *Proposal · T013*
- **F3 · Tag doesn't read.** Fall back to the printed QR, or to the order page if C-13
  allows it. *Proposal · P4, C-13; hardware test (R-A5)*
- **F4 · Buyer never activates, or activates after the evening.** Late activation is
  allowed (U3), but it doesn't undo missing the evening. The page can't yet say "no
  deadline", because events still require an activation cutoff. *HOLD · R-C5*
- **F5 · Coin opened in a messaging app's browser.** Same as B8. *Settled · owner
  direction*
- **F6 · A first-time account activating at the door.** The owner has decided activation
  on the night must work. The sign-in protection proposed for Unlock adds a 48-hour wait
  before a new account's wallet (and so its on-chain membership) can be created, which
  would stop that. The owner is choosing between a narrow fix and accepting the conflict.
  *HOLD · Unlock sign-in decision*
- **F7 · Replacement coin** (after E5 or E8). The old code stops working, and the new coin
  activates for the same account. *Proposal · C-13; P4*

## G. Attend (stage 7)

- **G1 · Activated holder arrives.** Checked in against their account, not the coin.
  *Gap · check-in method not accepted*
- **G2 · Arrives without having activated.** Activates at the door with staff help
  (R-D7, owner decision). Blocked by F6 and the staff-consent design; staff-assisted
  activation is also on the proposed deferral list. *HOLD · F6*
- **G3 · Phone dead, or no signal.** Staff confirm the person another way. *Gap · owner*
- **G4 · Identity at the door.** Whether staff check ID against the account, and against
  which details. *Gap · owner; easier under C-17 (a)*
- **G5 · Can't come.** The place can't be passed on: transfer is excluded by the
  single-purchase rule and by the token being non-transferable. Whether a no-show is owed
  anything is open. *Gap · owner + legal (with I5)*
- **G6 · Capacity.** Every sold coin has a place and a seat on the transport (R-D4,
  R-D5), so capacity can't be exceeded. *Settled · T002*
- **G7 · Under the drinking age.** *Gap · B7*
- **G8 · Event cancelled, rescheduled or materially changed.** *Gap · R-D8, owner +
  legal*
- **G9 · Accessibility needs.** How to ask, and what the venue offers (R-D9). *Gap · owner*
- **G10 · Leaving and coming back in, and the transport between Part I and Part II.**
  Whether a holder can re-enter, and how the transport pickup confirms them. *Gap ·
  owner (R-D2, R-D4)*
- **G11 · Bringing a companion.** Each person needs their own coin; there are no plus-ones.
  Stated so that nobody arrives expecting otherwise. *Proposal · owner to confirm*

## H. Hold and return (stage 8)

*Held with the token flows (owner, 2026-11-14).*

- **H1 · Holder wants to see their membership.** The owner has directed a holder view on
  the activation page (T013). Anywhere else is C-2. *Proposal*
- **H2 · Later release.** Tokens are typed: an account holds at most one of each type
  (owner, 2026-11-13). A later release names its own token type. Multiple types are on the
  proposed deferral list, so only the launch type exists at first. *Settled · typed
  tokens; scope of later releases in C-15*
- **H3 · On-chain record.** Unlock is back on the critical path, with a target of about
  2026-12-04. What the customer is told about it is open. *Gap · P6*

## I. Support, withdrawal, return and refund (stage 9)

The PG and the Korean e-commerce rules look at these cases most closely. Every
customer-visible refund sentence waits for the legal and PG check (R-C6). Until then the
token model's default is to keep refund requests under review, neither refusing nor
granting them automatically.

- **I1 · Change of mind before dispatch.** Under C-13 (b) or (c) the token can't be active
  yet. The owner's rule that unactivated tokens can't be refunded (R-C6) then meets the
  statutory withdrawal right head-on. Under C-13 (a) the token is already active, so I3
  applies to the token, while the coin itself keeps the goods withdrawal right. *HOLD ·
  legal/PG*
- **I2 · Change of mind after delivery, token not activated.** The same conflict; this is
  the main open T002 check (R-B4). *HOLD · legal/PG*
- **I3 · After activation.** A digital-content exception is most likely to apply only
  once provision has started. *HOLD · legal/PG; also C-14*
- **I4 · Defective, or not as described.** Return and refund at the seller's cost
  (R-B13). *Gap · owner + legal values*
- **I5 · After the event, or because the event changed.** *Gap · with G5, G8*
- **I6 · How a request is made.** By email to support. Returns can already be recorded
  for each coin in admin [s6]. Self-service returns are on the proposed deferral list.
  *Proposal · owner to confirm*
- **I7 · A minor's purchase.** Under-14s can't sign up. Purchases by 14- to 18-year-olds
  made without a guardian's consent can be cancelled by law (R-B13). *Gap · process*
- **I8 · Buying again after a refund.** *Proposal · C-15, C-16*

## J. Revoke, dispute and abuse

*Held with the token flows (owner, 2026-11-14).*

- **J1 · Card dispute (chargeback) after activation.** The money goes back to the buyer,
  but the token stays unless revocation exists. *Proposal · C-14*
- **J2 · Refund after activation, if legally required.** The same question as J1.
  *Proposal · C-14*
- **J3 · One person, several accounts, to buy more than once.** Each account needs its own
  verified Korean phone. The launch plan says not to add identity rules that link
  accounts, so blocking this changes that rule. *Proposal · C-17*
- **J4 · Coin resold on 번개장터 or 중고나라.** The object can be sold, but the token stays
  with the buyer's account (F2). The page says so plainly enough that a second-hand buyer
  isn't misled. *Proposal · copy: T003*
- **J5 · Coin's code photographed before delivery.** Harmless if only the buyer's account
  can activate (F2). *Proposal · follows F2*
- **J6 · Delete the account, sign up again, buy again.** Possible unless sign-up recognises
  the same person. *Proposal · C-17*

## K. Account (any stage)

- **K1 · Lost access to the account that holds the token.** Recovery through Sophomores
  only (R-C4): proof by the bound phone, then concierge follow-up. *Proposal · T007*
- **K2 · Changes email or phone.** Effect on the token and order record to confirm.
  *Gap · T009*
- **K3 · Deletes the account.** The token is permanent and can't move. *Proposal · C-10*
- **K4 · Under 14.** Can't sign up (owner). How sign-up enforces it is open: an SMS code
  doesn't establish age. *HOLD · C-17*

---

## Cases to design together

These look small in one branch but connect several. Each should get one decision rather
than several partial ones.

1. **I1–I3 with J1–J2:** refunds and disputes, and whether a token can ever be taken back.
2. **E5, E8 and F7 with C-13:** losing a coin, replacing it, and whether the coin is needed
   at all.
3. **F4 with G2 and F6:** activating late, at the door, and the Unlock sign-in wait.
4. **A2 with C10, D7 and the PG reviewer:** a pre-sale page the PG can review, including
   consent and any purchase-safety notice.
5. **J3, J6 and K4 with C-17:** what sign-up proves about a person.

## Decisions for review

**C-13 · When the token becomes the buyer's, and from where.**
- (a) As soon as payment is confirmed. The coin is a keepsake that opens the holder view.
- (b) When the buyer activates their delivered coin, and only from the buyer's account.
- (c) As (b), but the order page can also activate once delivery is confirmed. This
  covers a lost coin and a tag that won't read.

*Recommendation:* (c). Activation stays the moment the digital part is provided, which is
where the withdrawal analysis (I1–I3) most likely lands. Tying it to the buyer's account,
not to the coin, is what makes theft and resale harmless. That means the coin is the usual
path, not a security control. *Blocks:* F, E8, the activation page (T013) and the refund
wording. The registry already records this timing as unselected (T001) [s7].

**C-14 · Can a token ever be revoked?**
- (a) Never.
- (b) Only after a refund or a successful card dispute.
- (c) At the owner's discretion, for listed reasons.

*Recommendation:* (b). Otherwise someone is paid back and keeps a permanent membership,
an outcome the rules can't explain to anyone. *Blocks:* J1, J2, I3 and the token model.
*Side effects to settle with it:* the product page calls the membership permanent, so the
wording needs an exception. And whether an on-chain record can be revoked at all is not
yet known (Unlock work).

**C-15 · What uses up the single purchase.**
Per account, per release. Because tokens are typed, this works as long as each release
has its own token type. If a later release reused a type, an account that already holds
it would get only the event. *Proposed answer for each order state:*

| Order state | Uses up the purchase? | What the buyer sees |
| --- | --- | --- |
| Payment window closed or declined | No | Buy again |
| Payment being confirmed | Yes, for now | "We're confirming your payment", with no second Buy |
| Paid, awaiting dispatch or delivered | Yes | Their order |
| Replacement coin (E5, E8) | Same purchase | Their order, marked as replaced |
| Refunded, token never activated (before or after delivery) | No; there is nothing to revoke | Buy again, if stock remains |
| Refunded, token activated | No, but only if C-14 (b) revoked it; otherwise yes | Buy again, if stock remains and the token was revoked |
| Card dispute upheld, token never activated | No | Buy again after support review |
| Card dispute upheld, token activated | No, but only if C-14 (b) revoked it | Buy again only after support review |

Under C-13 (a) the token is active from payment, so every refund falls in the "token
activated" row.

*Recommendation:* as in the table. *Blocks:* the eligibility check, B3, C5 and I8.

**C-16 · Buying again after a refund.**
- (a) Allowed.
- (b) Not allowed for that release.

*Recommendation:* (a) when the token was never activated, or was revoked (C-14 b). After an
upheld card dispute, in either case, only after support review. *Blocks:* the last four
rows above.

**C-17 · What sign-up proves about a person.**
- (a) Carrier identity verification (본인인증). It returns a stable per-person identifier
  and the date of birth, so it can enforce one purchase per person and the under-14 rule.
- (b) An SMS code only, as today. It proves control of a phone number and nothing about
  age or identity.

*Recommendation:* (a). It's how Korean sites usually enforce both rules, and it makes
door ID checks (G4) straightforward. It costs a verification provider contract and fees.
It also changes the launch plan's rule against linking accounts. One side effect: many
teenagers use a phone registered to a parent, so verification would identify the parent
and could use up the parent's purchase. *Blocks:* J3, J6, K4,
G4, and phone verification (launch plan step 6).

**C-10 · What account deletion does to a held token.**
- (a) Deletion is refused while a token is held, and support explains the options.
- (b) The token is retired with the account.

*Recommendation:* (a) until privacy review (R-B6, R-B11) says otherwise. *Blocks:* K3.

## Sources

- [s1] `src/hideaway/components/UX/escapeInAppBrowser.tsx`. Today it shows a dialog
  whose only action is copying the link. Detection already uses the installed
  `inapp-spy` and `ua-parser-js`, in `src/hideaway/stores/Device/detectDevice.ts`; a
  non-Hideaway copy exists at `src/stores/Device/detectDevice.ts` and is the reuse
  candidate (AGENTS.md library-first rule).
- [s2] `src/lib/commerce/catalogue.ts:73-82`.
- [s3] `src/components/commerce/payment.tsx:133-136` (desktop confirmation in place);
  `src/lib/commerce/portone/adapter.ts:75` (phone return address).
- [s4] `src/lib/commerce/portone/adapter.ts:62-67`.
- [s5] `src/components/commerce/payment.tsx:133` (`payMethod: "CARD"`).
- [s6] `src/lib/commerce/returns.ts` (`acceptUnitReturns`).
- [s7] `docs/To-Do List.md:245-247`.
- Payment status: `docs/To-Do List.md` T004 section. I0 is integrated. The real-database
  proof (I0DB) found RED-01, which blocks the in-transaction payment path; Remediation 1
  has been dispatched. I1 (payment result projection, candidate `c5cb02f`) is in
  cycle-1 review and is separate from that fix. The registry's T004 summary row still
  reads "I1–I6 unstarted".
