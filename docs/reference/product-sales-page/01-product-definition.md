# 01 — Product definition

Working draft · 2026-11-13 · Planning only: no runtime, CMS, schema or public-copy change.
Part of [the product sales page plan](README.md).

## Sources, in order of authority

1. Owner decisions recorded in the [To-Do registry, T002](../../To-Do%20List.md#t002--unlock-protocol)
   (reframe, answers, typed tokens and launch directives, all 2026-11-13). Where these
   conflict with older documents, they win.
2. [Commerce launch plan](../commerce-launch-plan.md): physical offer, allowance,
   shipping and payment boundaries (owner-approved implementation contract).
3. [Account, membership, event and NFC activation plan](../ticket-account-planning-20261110.md):
   D1–D5 and the physical-activation proposal.
4. [T002-A model](../../qa/t002-a-20261113/model.md): launch-event mapping and held
   commercial questions.
5. [Identity](../../design/identity.md): who the product is for and why it exists.

`ticket-offer.en.md` is historical for this physical-goods offer (commerce plan,
"Physical offer and launch facts") and is not used as a source of facts here.

## The product in one paragraph

A **Sophomores coin**: a real, shipped physical collectible. Each coin carries one
**launch token**, a membership token that lasts indefinitely. Opening the coin's
activation link changes nothing by itself. The token is bound only when an eligible
person signs in or registers, verifies, and explicitly activates it, subject to the
buyer's own first coin and the existing-holder rule below. Holding the launch
token admits its holder to the **launch evening**, with that event's package: four
Part I drinks and shared transport from Part I to Part II. The coin is what is sold
and shipped; the token is what makes someone a holder; the evening is the first
thing holding it gives access to, not the whole of what it is.

> Working names. "Sophomores coin", "launch token" and "launch evening" are
> descriptive labels for this plan, not approved product names. The customer-facing
> name of the coin, the token and the holder ("Patron" appears only as an owner
> illustration) is decision **P1** below.

## What a buyer receives, per coin

| Component | What it is | Settled basis | What is still open |
| --- | --- | --- | --- |
| Physical coin | Shipped collectible object, South Korea delivery only, one address per order | Commerce plan: "a shipped physical collectible coin, not a renamed ticket or a preorder" | Specification, material, dimensions, finish, packaging, photos, price, stock, dispatch date (owner facts) |
| Activation link | One unguessable bearer link per unit, opening a page where activation is an explicit step. The buyer may regenerate the code until the token is activated (U1) | Settled: bearer link and explicit activation (D3/D4), regeneration (U1). **Proposal only:** NFC tag in or on the coin with a QR/manual fallback (planning §2, §4) | NFC is an explicit owner goal (D5), but launch inclusion is open (decision **P4**). The launch-scope note moved NFC off the critical path; the later directive restores "all token and Unlock investigations" without saying whether NFC is included. Antenna behaviour on metal is unproven |
| Launch token | One typed membership token: perpetual, one per account per token type, not transferable once activated | T002 reframe; typed-token clarification; U2 | Final name. The owner handles the token itself; token and Unlock work targets ~2026-12-04 |
| Launch-evening access | Holders of the launch token attend the launch evening without buying anything else | Owner answer, "Token holders and the launch event" | Event date, venue, capacity and schedule (owner facts) |
| Event package | Four Part I drinks plus shared Part I → Part II transport, one per eligible activated account for the event | Commerce plan; T002-A launch mapping | Redemption and check-in behaviour still need acceptance |

## Who ends up holding what

- **First coin of a buyer with no token:** set aside for the buyer at settlement (the
  ledger calls this self occupancy). The buyer activates it themselves.
- **Every other coin is a gift.** Whoever first opens its link, signs in or registers,
  verifies, and explicitly activates becomes its holder. No recipient is named in
  advance, the buyer does not confirm, and there is no deadline. The token stays
  available after the event (U1, U3).
- **A member who buys again:** only one token is ever bound to their account; the
  rest stay inactive, each open to activation through its own link (owner answer,
  "Repeat purchases by a holder"). For the launch event, a holder's purchased units
  are all gifts, each carrying event access, and the holder attends through their
  existing token (owner answer, "Token holders and the launch event").
- **Someone who already holds a launch token opens a gift:** the gift stays untouched.
  They receive neither its token nor its event access (owner answer, "Gift opened by
  a holder").
- **Allowance:** at most three coins per account per release, across orders, counting
  active reservations. Cancelled payments and accepted returns restore it. It is not
  a phone, household or address cap. Cancelled payments release their units (owner
  decision).
- **Event capacity:** sold units plus attending holders. The sale starts with zero
  memberships, so every launch holder comes from this sale. Cancelled units free
  capacity.
- **Support:** `concierge@sophomores.co` (T002 reframe).
- **Disclosure duty:** the page shows the actual product with representative imagery
  and states its admission benefit truthfully, to customers and to the PG (commerce
  plan).

## What the product is not

These framings are ruled out by owner vocabulary and policy, and copy must not
reintroduce them:

- Not an **invitation**, **seat**, **reservation**, or "ticket for this event". The
  owner also asks to avoid "accept" and dislikes "claim"; "redeem" is imperfect.
  The activation verb is open (decision **P2**).
- Not a preorder, and not "stock ready" until product and fulfilment evidence exist.
- Not transferable once activated. The owner's own framing is "an NFT token … like a
  DAO token" (registry wording); there is no on-chain voting yet. The coin itself can
  always change hands; only an unactivated token can pass to someone else.
- Not a name-on-a-list admission. Check-in by name is removed; arrival means
  activating on the spot.
- Not "one new NFT per purchased unit for its buyer" (T002-A: explicitly not to be
  published).

## Why it exists (identity link)

Identity describes a community "to return to", with an intention (not yet a
calendar) of anchor points at least twice a year, where lives continue between
gatherings. A token that persists after its event, records when someone became a
holder (U3: "likely becomes the basis for how far their history with Sophomores
extends"), and can be given to someone else while still unactivated is the
commercial form of that recurrence. The launch evening is the first anchor point.
The gift mechanic matches the central line: "pursuing a life of your own does not
mean wanting to pursue it alone." This is a reading of the identity, offered for
the copy step. It is not an owner-stated product rationale.

## Two page scopes this plan covers

| Scope | What it is | Owner of its content |
| --- | --- | --- |
| **General product page** | The reusable `/shop` page structure: gallery, product facts, price and fee lines, allowance, purchase panel, seller disclosure, policies. It must work for later releases and future token types. | Page chrome: `messages/en.json` (with `ko.json` mirror). Product facts: Payload `products` and `commerce-publication`. |
| **Launch sales content** | The storytelling for this coin: what it is, what holding the token means, the launch evening, gifting, and how activation works. | Payload-owned content (decision **P5**: today's `products` schema has commerce fields but only title, description and images for free-form content, so it cannot hold structured sales sections). |

The purchase panel itself (quantity, inline account entry, shipping address, payment)
belongs to T003 and the inline account-entry contract in AGENTS.md. This plan ends
where that panel begins. The post-activation holder page belongs to T013.

## Conflicts with what currently renders

These strings are live in `messages/en.json` and contradict the definition above.
They are recorded here; fixing them goes through copy (step 3) and the owning tasks.

| Key | Current English | Conflict |
| --- | --- | --- |
| `Customer.components_commerce_offer.admissionIncludesEvent` | "One coin includes one admission to {event}." | Frames the coin as an admission ticket. The token, not the coin, admits, and a holder's own coin can be a gift. |
| `Customer.components_commerce_order_admissions.eachCoinIncludesOneAdmissionAddTheGuestS` | "…Add the guest's name here. Registration is optional and is not required to attend." | Check-in by name is removed; activation is required (F32 in Korean pass 3). |
| `…aGuestWhoCompletesTheirOwnVerifiedRegistrationAnd` | "…claims their invitation…" | Uses "claim" and "invitation". |
| Claim-cutoff behaviour (`guests.ts`, T001/T005 wording) | Links expire at `claimCutoffAt` | Owner: no deadlines; links stay valid until activation. Tracked under T002. |

## Decisions for the step-7 review

| ID | Decision | Why it blocks the page |
| --- | --- | --- |
| **P1** | Customer-facing names for the coin, the token and the holder | Every heading and CTA depends on them |
| **P2** | The activation verb | The gift and activation sections, and the CTA after delivery |
| **P3** | What the page leads with: the object, the membership, or the evening | Sets the hero and the order of sections. Proposal: lead with the object, because it is what is sold, shipped and shown to the PG, and let membership and the evening follow |
| **P4** | Whether NFC tap is part of the launch product, or the link arrives by QR/card only. NFC is an explicit owner goal (D5); deferring it is an owner decision, not a silent drop | Changes the activation story and the asset list |
| **P5** | Where launch sales content lives: a Payload schema extension (additive migration, permitted locally) or a single long description | The current schema cannot hold structured sections |
| **P6** | How much to say about the token's NFT/on-chain nature. The owner calls it "an NFT token"; the planning proposal (§2, not an owner decision) suggests proportionate disclosure with no blockchain onboarding ceremony | Disclosure must be truthful to customers and the PG |
| **P7** | Korean sales copy: author it, or explicitly defer | Default locale is `ko`; owner directive says copy is first-class with no implicit deferral, while AGENTS.md forbids translating without an owner request |
| **P8** | What the page says to someone activating after the event. Settled: activation still works (U3). Proposal only: past-event perks are not revived (T002-A) | Gift and "no deadline" copy |
| **P9** | How far the sales page explains the first-coin/gift split at quantity choice, versus leaving it to the T003 purchase panel | Avoids two competing explanations |
| **P10** | Whether the page names the launch event before its facts are approved | The hero and the evening section |
| **P11** | Wording of the bearer warning and of regeneration (U1) | The owner asked for a clear warning |

## Holds carried forward (not resolved here)

- Returns after activation; per-event passes; staff proof and consent at the door.
- No-refund rule for unactivated tokens: legal and PG check before it reaches any
  page (T002).
- Override of the used-seat ruling.
- Every product fact: specification, photos, price, shipping fee, stock, dispatch,
  event date and venue, seller and policy texts.
- Unlock auth decision held for the owner (cycle 3 of 3). Under option D the 48-hour
  step-up wait also blocks wallet creation, so a new guest could not activate at the
  door. Until resolved, the page cannot promise "activate on arrival".
- Unlock shape rework 2 is still running.
- T013: revealing a token's type before sign-in needs a security decision (existence
  oracle, T005 C13). This limits what a signed-out page may show about a link.
- The owner's deferral list stays a proposal until each item is named.

The already-holder question is settled for buying (extra units stay inactive and
giftable) and for opening a gift (it stays untouched). Those answers are in "Who
ends up holding what".
