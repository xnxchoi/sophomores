# 03b — Step flows

Working draft · 2026-11-14 · Level 2b of the [commerce experience plan](README.md).
Mirrors the live doc's "3b · Step flows" tab; edits made there are canonical.

The path through every branch before and after the purchase: the normal steps, where
each one branches, and what is still open. Checkout and payment (C, D) are parked
(owner, 2026-11-14). Everything after them starts from "a paid order exists". Flows about
the token (activating, holding, revoking) are held too (owner, 2026-11-14). Their
sections stay here for later.

## How to read this document

Each section below has the same five parts. It is step detail, not screens or copy.
Scenario IDs and statuses are the ones in [03](03-flows-and-scenarios.md).

- **Starts and ends:** where the person comes in, and where they leave.
- **Normal path:** numbered steps, with where they are, what they do, and what the site
  or staff does.
- **Where it branches:** the 03 scenarios that leave the normal path, and what changes.
- **Gaps turned into proposals:** a recommendation for each 03 Gap I can recommend on.
  Nothing here is accepted until the owner says so.
- **Questions for the owner:** facts only the owner has.

**Status:** every step in a normal path is a Proposal unless it cites a scenario that 03
marks Settled.

## Before the purchase (A, B)

**Starts:** a shared link (KakaoTalk, Instagram, SMS), the site home, the music page's
"Get ticket" button, or seeing someone's coin. **Ends:** Buy (handing over to the parked
checkout), leaving, sharing the page, or writing to support.

**Normal path**

| # | Where | The visitor | The site |
| --- | --- | --- | --- |
| 1 | Any shop link | Opens it, often inside a messaging app | Detects the app's browser and offers one button out to the phone's browser (B8) |
| 2 | Product page | Arrives | Shows the sale state in the purchase area (A1–A5). The story and the statutory facts read the same in every state |
| 3 | Product page | Reads what it is: the coin, the token, the evening | Plain words for the token (B2). One per account (B4); ships within Korea only (B6) |
| 4 | Product page | Reads price, delivery, refund terms and seller | Product notice and seller details stay open, never collapsed (R-B1, R-B3) |
| 5 | Purchase area | Is signed in and has already bought | "You have yours", with a link to the order (B3; what counts is C-15) |
| 6 | Purchase area | Presses Buy | Hands over to checkout (parked) |

**Where it branches**

- **Not on sale:** before opening or after closing (A2); publication check failed, so the
  whole page says "not open" (A3).
- **Sold out** (A4), or **after the evening** (A5).
- **Wants one for someone else** (B4): told each account buys its own, and offered the
  share button.
- **Has a question** (B5): support by email.
- **Abroad** (B6): told before checkout. **Under the drinking age** (B7): see below.

**Gaps turned into proposals**

- **A2 · The pre-sale page (R-G1).** Before opening, show the whole product page,
  complete, with the purchase area replaced by the opening date (or "Opening date to
  follow"). The PG reviewer then reviews the real page, not a mock-up. After closing, the
  same page says "Sale closed". A3 keeps its whole-page fallback, since a page missing a
  statutory fact shouldn't be reviewable either. The consent and payment-method content
  the reviewer also checks is parked with C and D.
- **A5 · After the evening.** Keep the page as a record: the evening in the past tense
  with its date, and "Sale closed" in the purchase area. Taking it down would break the
  page holders share.
- **B7 · Drinking age.** Buying stays open from 14, the sign-up floor. The page says the
  Part I drinks are served only to adults, with age checked at the door, and that a
  younger holder attends without them. Legal confirms the age and whether minors may
  attend at the venue at all.

**Questions for the owner**

- **B5:** support hours, and a response target (for example, within one working day).
- **A2:** may the opening date be public before the PG approves, or should the page say
  "date to follow"?
- **A5:** keep the page as a record after the evening, or take it down?
- **B7:** may minors attend the evening at all? Legal confirms the drinking age (my
  understanding is 19, counted by birth year).

## Receive (E)

**Starts:** a paid order (D1). Payment can't yet be taken safely (03, D), so this branch
can be designed but not tested end to end. **Ends:** the box is delivered, which starts
Activate.

**Normal path**

| # | Where | The buyer | The site, or the courier |
| --- | --- | --- | --- |
| 1 | Order page | Lands there after paying | Shows the coin, "preparing", the expected dispatch window and how to reach support (E1, E3) |
| 2 | Email (C-3) | Receives it | Order confirmation with the same window and a link to the order |
| 3 | Order page | Checks back while waiting | The latest state, and the window unchanged unless it slipped (E4) |
| 4 | Email and order page | Is told it's on its way | Courier, tracking number and a link to the courier's tracking (E2) |
| 5 | Courier | Tracks it; receives the box | The courier's own tracking page and SMS |
| 6 | Order page | Opens it after delivery | "Delivered" once the courier confirms, with activation as the next step (F) |

**Where it branches**

- **Delayed** (E4): the new window on the order page and in a notice.
- **Lost in transit or damaged** (E5), or **lost or stolen after delivery, before
  activation** (E8).
- **Address change before dispatch** (E6): support only. **Returned to sender** (E7):
  contact the buyer, then reship or refund.

**Gaps turned into proposals**

- **C-3 · Notices.** At launch, email for confirmation and dispatch. Add 알림톡 once a
  sender is set up, which needs its own approval. Delivery itself is the courier's
  notice. No order notice of any kind is built today.
- **E2 · Dispatch details.** The order page shows the courier, the tracking number and a
  link to the courier's tracking page. The carrier field exists; the values and wording
  don't.
- **E3 · Supply date.** One expected dispatch window, in the same words on the product
  page, the order page and the confirmation. If it slips, both the order page and a
  notice give the new window. Legal confirms what the rules require.
- **E5 · Lost or damaged.** Lost, once the courier confirms it: reship at the seller's
  cost, or refund if the buyer prefers. Damaged: the buyer sends a photo to support, then
  gets a replacement, with return shipping at the seller's cost (R-B13). Either way it
  stays the same purchase (C-15), and the old coin's code is switched off (F7).
- **E8 · Lost after delivery (held with the token flows).** Under C-13 (c) the buyer activates from the order page,
  and the lost coin can't be used by anyone else (F2). A replacement coin is then
  optional, for a fee the owner sets, or none. Under (b) a replacement coin is the only
  way.

**Questions for the owner**

- **E2, E3:** the courier, and the dispatch window for the launch.
- **E7:** how long support tries to reach the buyer before refunding.
- **E8:** if a buyer loses the coin itself, do they get a replacement, and at what cost?
- The remote-area fee (도서산간, C8) is parked with checkout.

## Activate (F)

*Held with the token flows (owner, 2026-11-14). Kept as written, not being worked on.*

**Starts:** the delivered box, or the order page once delivery is confirmed. **Ends:**
the holder view (H), or, for someone else's coin, the product page. The steps assume the
recommended C-13 (c): activation from the coin or the order page, buyer's account only.

**Normal path**

| # | Where | The buyer | The site |
| --- | --- | --- | --- |
| 1 | The box | Finds the insert; taps the coin or scans its QR | The insert says what to do (R-A3, R-E11). Tag, QR or both is P4 |
| 2 | Activation page | Opens it | In an app's browser, one button out (F5). Works out which token the link is for, without revealing anything to a signed-out visitor (T005 C13) |
| 3 | Activation page | Signs in, if not already | The same inline account entry as the rest of the shop |
| 4 | Activation page | Presses Activate | Checks this is the buyer's account, then binds the token to it (T002) |
| 5 | Holder view | Sees what they now hold | "Patron since …" and what it gives them now (H1) |

The activation page is today's invitation page, renamed and repurposed. The owner has
rejected "invitation" and dislikes "claim" as names.

**The flow, as drawn in the live doc** (only the buyer's account can activate):

```
Taps the coin or QR ─┐        ┌─ Order page, once delivered (C-13 c)
                     ▼        ▼
            Activation page (signs in if needed)
                         │
                  Buyer's account?
              yes ┌──────┴──────┐ no
                  ▼             ▼
   Activate: token binds   Belongs to another account
                  │        (no owner details; link to buy their own)
                  ▼
            Holder view
```

The coin is the usual way in, not a security control. What protects a found or resold
coin is the account check.

**Where it branches**

- **Signed in to another account, or the coin is already someone else's** (F2): a calm
  "this coin belongs to another account", with no account details, and a link to buy
  their own.
- **Already activated by this account:** straight to the holder view.
- **Tag doesn't read** (F3): the printed QR, or the order page.
- **Activates late, or never** (F4): allowed (U3), but the page can't promise "no
  deadline" while events still require a cutoff (R-C5).
- **First-time account at the door** (F6): on hold for the Unlock sign-in decision.
- **Replacement coin** (F7): the old code stops working; the new coin activates for the
  same account.

**Gaps turned into proposals**

- **Signed-out visitor.** Step 3 asks them to sign in with the account that bought the
  coin, with "Not yours? Get your own" beneath it. The page says nothing about the coin's
  owner, so a found or resold coin reveals nothing.
- **Activating from the order page** (C-13 c). An Activate button appears on the order
  page once the courier confirms delivery. The result is the same as tapping the coin.
  This also covers E8 and F3.
- **Reminders** (F4). If the token isn't activated a week after delivery, one email
  reminder. A second one shortly before the evening, so nobody arrives unactivated by
  accident.

**Questions for the owner**

- **C-13:** recommended (c).
- **P4:** NFC tag, printed QR, or both.
- **F4:** the two reminders, yes or no.
- **F6:** the Unlock sign-in choice is still open: the narrow fix, or accepting that
  activation at the door can't work for a new account.

## Attend (G)

**Starts:** a few days before the evening, for every buyer. **Ends:** after Part II; the
holder goes on to Hold.

**Normal path**

| # | Where | The holder | The site, or staff |
| --- | --- | --- | --- |
| 1 | Email and holder view | Gets the arrival details | Date, Part I start, place, and the transport to Part II (R-D2, R-D4). Sent a few days before (C-3) |
| 2 | The door | Arrives and gives their name | Staff find them on the door list and confirm them (G1) |
| 3 | The door | Shows ID, if drinking | Age check for the Part I drinks (B7, G7) |
| 4 | Part I | Attends | Four drinks (R-D4) |
| 5 | Transport | Boards for Part II | The pickup confirms them against the same list (G10) |
| 6 | Part II | Attends | — |

**Where it branches**

- **Arrives without having activated** (G2): held with the token flows, since it means
  activating at the door.
- **Phone dead or no signal** (G3), and **ID at the door** (G4): both answered by the
  door list below.
- **Can't come** (G5): the place can't be passed on.
- **Cancelled, rescheduled or changed** (G8). **Accessibility needs** (G9).
- **Leaves and comes back, or misses the transport** (G10). **Brings a companion** (G11):
  each person needs their own coin.

**Gaps turned into proposals**

- **G1, G3 · Check-in.** A door list of buyers, loaded onto the staff device before the
  evening so it works without signal. Staff search by name and confirm with the last
  four digits of the phone. The holder doesn't need their phone at all. Buyers who haven't
  activated are on the list too, marked, ready for G2 once it's unblocked. A list of names
  and phone digits on a staff device needs privacy review (R-B6, R-B11).
- **G4 · ID.** Only for the age check. Under C-17 (a) the account carries a verified name
  and birth date, so the match is exact. Under (b) the name is whatever the buyer typed.
- **G5 · No-show.** No refund and no transfer for a missed evening, stated before
  purchase. The token stays. Legal checks this with I5.
- **G8 · Cancelled or changed.** Holders hear by email and on the order page within a day.
  Rescheduled: the new date, plus a refund window for anyone who can't come. Cancelled: a
  refund on the terms legal settles (R-D8). The token stays either way.
- **G9 · Accessibility.** One line on the product page and in the arrival details: what
  the venue offers, and how to ask support for more.
- **G10 · Re-entry and transport.** A wristband or stamp at check-in, so re-entry and the
  transport pickup need no second lookup.

**Questions for the owner**

- **G1:** is a name-plus-phone door list acceptable, or should holders show something?
- **G5:** is a no-show owed anything?
- **G9:** what the venue offers for access.
- **G10:** may holders leave and come back? And when Part II starts, which has no field
  yet (R-D2).

## Hold (H)

*Held with the token flows (owner, 2026-11-14).*

**Starts:** an activated token. **Ends:** it doesn't. The holder comes back at the next
release, which starts again at Discover (the loyalty loop).

**Normal path**

| # | Where | The holder | The site |
| --- | --- | --- | --- |
| 1 | The coin, or the order page | Opens it | The holder view (H1, T013): "Patron since …", and what the membership gives them now |
| 2 | Holder view | Checks what's coming | The next evening or release, if one is announced |
| 3 | A later release's product page | Arrives | Is recognised as a holder. Buys the new release's token type once (H2, C-15) |
| 4 | Holder view | Shows the coin, or shares the page | The share button leads to the current product page (advocacy) |

**Where it branches**

- **A later release** (H2): its own token type, so the one-purchase rule applies to it
  afresh.
- **The on-chain record** (H3): what the holder is told, and when.
- **Lost access to the account** (K1).

**Gaps turned into proposals**

- **C-2, C-6 · Where the holder view lives.** At launch, only on the activation page,
  linked from the order page. A section in the account comes after launch.
- **H3 · The on-chain record.** Say nothing about it until Unlock is live. Then one plain
  line in the holder view, with no crypto vocabulary (P6).

**Questions for the owner**

- **H1:** what the membership gives a holder now, beyond the evening. The holder view has
  to say it.
- **H2:** does holding the launch token give anything at later releases, such as early
  access?

## Support, refunds and disputes (I, J)

*Partly held (owner, 2026-11-14): what happens to the token is held, meaning J1–J6,
C-14, C-16 and the outcomes diagram. The money and goods side stays in scope.*

**Starts:** "Help with this order" on the order page, a policy page, or an email to
support. A card dispute starts at the PG instead (J1). **Ends:** a refund, a replacement
or a refusal with its reason; the order shows the outcome, and whether the buyer can buy
again (C-15). Every refund sentence a customer sees waits for the legal and PG check
(R-C6).

**Normal path**

| # | Where | The buyer | The site, or support |
| --- | --- | --- | --- |
| 1 | Order page | Opens "Help with this order" | Their rights for this order's current state, in the policy's own words, and the support address (I6) |
| 2 | Email | Writes to support | An automatic reply with the response target (B5) |
| 3 | Admin | — | Support records the request. A return is recorded for each coin, which admin can already do |
| 4 | Return parcel | Sends the coin back, if asked | The return address, and who pays the shipping (R-B13) |
| 5 | PortOne | — | The refund, as a cancellation of the payment. Its mechanics are payment work, parked with D |
| 6 | Order page and email | Sees the outcome | The order shows "refunded", and whether they can buy again (C-15, C-16) |

**Where it branches**

- **By when they ask:** before dispatch (I1); delivered, not activated (I2); after
  activation (I3). I1–I3 are on hold for legal and the PG.
- **Defective or not as described** (I4). **After the event, or because it changed**
  (I5, with G5 and G8).
- **A minor's purchase** (I7). **Buying again after a refund** (I8).
- **Card dispute** (J1), or **a refund after activation** (J2): whether the token is taken
  back (C-14).
- **One person, several accounts** (J3), or **deleting and rejoining to buy again** (J6):
  both turn on C-17.
- **Coin resold** (J4), or **its code photographed before delivery** (J5): harmless,
  since only the buyer's account can activate.

**Gaps turned into proposals**

- **Step 1 · "Help with this order".** It shows only what applies to the order's state.
  Before dispatch: how to withdraw. Delivered and not activated: how to return.
  Activated: what applies after activation, once legal has settled it.
- **I4 · Defective.** The seller pays return shipping for a defect or a coin not as
  described (R-B13). The buyer chooses a replacement (the same purchase, as in E5) or a
  refund.
- **I7 · A minor's purchase.** A guardian writes to support, which handles each case
  individually: refund, and under C-14 (b) the token is revoked. Legal confirms what
  proof support may ask for.
- **J4 · Resale.** One plain line on the product page and on the insert: the coin can
  change hands, but the membership stays with the account that bought it.

**The outcomes, as drawn in the live doc** (once the money goes back, the token goes too,
and the buyer may buy again; recommended C-14 (b) and C-16):

```
Refund granted (whether and when: legal, R-C6) ─┐   ┌─ Card dispute upheld
                                                ▼   ▼
                                     Token ever activated?
                                  no ┌──────────┴──────────┐ yes
                                     ▼                     ▼
                             Nothing to revoke       Token revoked (C-14 b)
                                     └──────────┬──────────┘
                                                ▼
                         Purchase freed (C-15: this release can be bought again)
                          after a refund ┌──────┴──────┐ after a dispute
                                         ▼             ▼
                              Buy again, if stock    Buy again after support review
                              remains
```

Under C-14 (a), an activated token stays and the purchase stays used. This is the C-15
table in 03, drawn. It shows what follows once money goes back; whether a refund is
granted at all is the legal hold on I1–I3.

**Questions for the owner**

- **C-14:** recommended (b): revoke only after a refund or an upheld card dispute.
- **C-16:** recommended: allow a new purchase when the token was never activated or was
  revoked; after a card dispute, only once support has reviewed it.
- **I4:** the return address and courier.
- **R-C6:** when to put the refund rules to legal and the PG. Most of this branch waits on
  that one check.

## Account (K)

**Starts:** at any stage. **Ends:** the account still holds the token, or support takes
over. Account entry itself follows the existing account rules and isn't redesigned here.

**Normal paths**

| # | Where | The holder | The site, or support |
| --- | --- | --- | --- |
| 1 | Sign-in | Can't get into the account | Recovery through Sophomores only: proof by the bound phone, then concierge follow-up (K1, R-C4, T007) |
| 2 | Settings | Changes email or phone | Verifies the new one before it replaces the old (K2) |
| 3 | Settings | Asks to delete the account | Shows what happens to the token before anything is confirmed (C-10) |

**Where it branches**

- **Under 14** (K4): can't sign up, but an SMS code can't tell. That turns on C-17.

**Gaps turned into proposals**

- **K2 · Changing email or phone.** The token and the order record belong to the account,
  not to the email or the phone, so neither moves. Under C-17 (a), re-verifying must
  return the same person; a different person goes to support. T009 confirms the
  mechanics.
- **K3 · Deletion (held with the token flows)** (C-10 a). Refused while a token is held, and support explains the
  options, until privacy review says otherwise.

**Questions for the owner**

- **C-17:** recommended: carrier identity verification (본인인증). It enforces one purchase
  per person and the under-14 rule. It costs a provider contract and fees, and it can
  count a teenager on a parent's phone as the parent.
- **C-10:** recommended: refuse deletion while a token is held.
