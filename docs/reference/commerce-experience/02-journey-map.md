# 02 — Journey map

Working draft · 2026-11-13 · Level 1 of the [commerce experience plan](README.md).
Uses the surfaces and actors in [01](01-surfaces-and-actors.md).

## Models used, and the job each does

No single standard model covers a physical coin that carries a permanent membership
and admits its holder to an event. The map combines established models, and each one
has a stated job.

**Service blueprint** (G. Lynn Shostack, 1984; extended by Bitner, Ostrom and
Morgan, 2008). *Job: the spine.*
- Each stage is read across the standard lanes: physical evidence, customer actions,
  the line of interaction, frontstage, the line of visibility, backstage, and support
  processes.
- It keeps the systems the customer never sees (Payload, PortOne, the mint, the
  courier, door staff) on the same map as the screens they do see.

**Buyer decision process.** *Job: the stage order up to and just after purchase.*
- The five stages are need, information search, evaluation, purchase and post-purchase.
- The model goes back to John Dewey (1910) and to Engel, Kollat and Blackwell (1968).
  Kotler made it the standard marketing version.

**Consumer decision journey** (Court, Elzinga, Mulder and Vetvik, McKinsey, 2009;
with the advocate-and-bond stages added by Edelman, 2010). *Job: what happens after
purchase.*
- It replaces the funnel with a loop: trigger, initial consideration, active evaluation,
  moment of purchase, post-purchase experience, then a loyalty loop that skips
  re-evaluation next time.
- Here, since each person buys their own coin, **advocacy is word of mouth**: a holder
  shows their coin or shares the page, and that becomes someone else's trigger. Later
  releases close the loyalty loop.

**Order-to-cash, with returns management (reverse logistics).** *Job: the physical-goods
branch.*
- Standard operations terms for order, payment, fulfilment and delivery, then return,
  refund and restock.
- They are what the PG and Korean e-commerce rules check.

**Entitlement lifecycle.** *Job: what the token goes through.*
- The common pattern in software licensing and digital-goods systems: grant, deliver,
  activate, use, transfer, recover, revoke. **Transfer is excluded here** by the owner's
  rules (single purchase; non-transferable token).
- It is a convention, not one author's model. The token has states the coin does not
  have, and the coin's states do not imply them.

**Ticket and entry lifecycle.** *Job: the launch evening.*
- The pattern used in event ticketing: issue, transfer, check-in, attendance, no-show
  and re-entry. Transfer is excluded here too; re-entry and no-show are cases G10 and G5
  in 03.

**Baymard Institute's e-commerce UX research areas.** *Job: a coverage check.*
No statistics are quoted. Each area, and where 03 covers it:

| Area | Covered by |
| --- | --- |
| Homepage and navigation | A, C-1 |
| Product page | B |
| Cart and checkout | C, D. There is no cart: one coin per account |
| Account and self-service | H, I, K |
| Mobile | B8, and every test in 04 runs on phones |

## The stages

Nine stages, one straight line per buyer. Each account buys once, for itself (owner,
2026-11-13), so there is no gift branch. Stages 1–4 are the purchase. Stage 9 (support
and undo) can branch off from stage 4 onwards; a question before buying is part of stage 2
(03, B5).

```
1 Discover → 2 Evaluate → 3 Decide → 4 Buy & pay → 5 Receive → 6 Activate
                                                                   │
            ┌──────────────────────────────────────────────────────┘
            ▼
      7 Attend the launch evening → 8 Hold, and return for later releases
                                         │
                          (loyalty loop) └──► 1 for the next release

9 Support · withdraw · return · refund · dispute — branches from stage 4 onwards
```

Whether stage 6 is a separate step or happens at payment is decision C-13 in
[03](03-flows-and-scenarios.md#decisions-for-review).

**Stage 4 is parked** (owner, 2026-11-14). Work continues on the stages before and after
it. Stages 5 onwards start from "a paid order exists" and can be designed now, but not
tested end to end until payment is unblocked (03, D). **Stages 6 and 8 are held too**
(owner, 2026-11-14): activating and holding the token.

How the decision-journey loop maps: **trigger** at 1 (often a friend's coin);
**consideration and evaluation** at 2; **moment of purchase** at 3–4; **post-purchase
experience** at 5–7; **advocacy** when a holder shares it; the **loyalty loop** at 8.

## Blueprint

Cells are kept short; the cases and failures are in [03](03-flows-and-scenarios.md).
Items above the line of visibility are what the customer sees. Plan and task owners
are listed separately below the table.

| Stage | Evidence | Customer does | Frontstage | Backstage | Support processes |
| --- | --- | --- | --- | --- | --- |
| **1 Discover** | Share image; someone's coin | Hears of it; opens a link | Site home, link preview, shop | Offer published | Payload publication |
| **2 Evaluate** | Real photos (R-A6) | Reads what it is and what it carries | Product page | Offer loaded; publication check | Payload; disclosure data |
| **3 Decide** | Product notice (R-B3) | Reads price, delivery and refund terms | Price, one-per-account rule, seller | Eligibility check: may this account still buy (03, Terms) | Account service |
| **4 Buy & pay** | PG receipt | Signs in or up, verifies, agrees, gives address, pays | Inline account entry; consent; PortOne window; result | Reservation; payment; confirmation | Payment provider; phone verification; account service |
| **5 Receive** | Box and insert | Waits; receives | Order page; tracking; notices (C-3) | Fulfilment | Mint; courier |
| **6 Activate** | Coin's tag or QR (P4) | Opens the coin; signs in; activates (C-13) | Activation page | Token bound to the buyer's account | Membership record; Unlock |
| **7 Attend** | Venue, drinks, transport | Arrives; is checked in | Arrival details; the door | Attendance record; capacity | Door staff; venue; transport |
| **8 Hold** | The coin | Keeps it; comes back for later releases | Holder view | Token persists (U2, U3) | Membership record; on-chain record |
| **9 Support and undo** | Return parcel | Asks; withdraws; returns; disputes | Support; policy pages; order page | Cancellation; refund; return | Payment provider; courier; support inbox |

**Plan and task owners for each stage:**
- 1–2: launch plan step 4; T003.
- 3: step 3; T003.
- 4: steps 2, 6 and 8; T003, T004, T009, T010.
- 5: step 3; C-3.
- 6: critical-path item 2; T002, T013.
- 7: T002 (attendance); R-D7 held.
- 8: T002 and the Unlock work (the outside service that also records each membership on
  a public blockchain), back on the critical path with a target of about 2026-12-04.
- 9: steps 3 and 8; legal (R-B4, R-B13, R-C6).

## The other journeys

### Someone holding a coin that isn't theirs

A found, borrowed or second-hand coin. They enter at stage 6 by tapping it, and learn
calmly that it belongs to another account. They are offered the product page, so they
can buy their own (03, F2 and J4).

### Visitor arriving from a messaging app

Shared links in Korea mostly travel by KakaoTalk or Instagram, which open them in their
own browser. These visitors enter at stage 1 or 2 inside that browser and are offered a
single button out of it before account entry or payment (03, B8).

### PG reviewer

A short journey that has to work before stage 1 exists for anyone else.

1. Receives the merchant application with the site's address.
2. Opens the product page in a pre-sale or review state. **R-G1: no such state exists
   today.**
3. Checks the product, price, seller identity and product notice (R-B1–R-B3). Checks
   that delivery, withdrawal and refund terms match the policies (R-B4–R-B6, R-B13).
4. Checks the business phone line, email and privacy officer (R-B1, R-B10, R-B11).
5. May make a test payment in the PG's own environment, under step 8 approvals.

They read stages 2, 3 and 9 and the policy pages, not the story. That is why the
statutory facts stay visible and open in any design direction.

### Door staff

They see stage 7 from the other side: holders arriving, and guests who haven't yet
activated (R-D7, held). Their tool is outside this plan's visual work. Its failure
cases are in 03.

## What the map makes visible

It doesn't reorder the launch plan. It shows four gaps:

- **R-G1 comes before stage 1.** The PG application is on the critical path.
- **Stage 5 says nothing.** There are no order notices and no insert copy.
- **Stage 8 has only the directed holder view.** Where else a holder sees their
  membership is open (C-2).
- **Revocation has no decision** (03, branch J). Today the entitlement lifecycle runs
  grant → activate → use, with no way back.

## Decisions for review

(C-5, about naming the sender of a gift, was withdrawn when gift purchases were
removed.)

**C-6 · Holding as part of the launch.**
- (a) The holder view on the activation page only.
- (b) Also a membership section in the account (C-2).

*Recommendation:* (a) at launch, (b) after. *Blocks:* stage 8 scope.
