# 02 — Requisite information

Working draft · 2026-11-13 · Planning only. Part of [the product sales page plan](README.md).
Builds on [01 — Product definition](01-product-definition.md).

This is the register of every fact the page needs before it can be truthful, with
where each fact lives and who supplies it. Later steps cite these IDs instead of
restating values. **No value below is approved.** A "Have" status means a field or
settled rule exists, not that its content has been filled or approved.

Status key: **Have** (settled rule, or field exists) · **Owner** (owner must supply
the fact) · **Legal/PG** (needs legal or PG confirmation) · **Gap** (no field or
decision exists yet).

## A. The object

| ID | Fact the page needs | Where it lives today | Status |
| --- | --- | --- | --- |
| R-A1 | Product name | `products.title` | Field: Have · Name: Owner (P1) |
| R-A2 | Material, finish, diameter, thickness, weight | none | Gap: no structured spec fields |
| R-A3 | What is in the box: coin, case or pouch, card, activation insert | none | Gap · Owner |
| R-A4 | Edition: numbered or not, total minted, whether reissued later | `products.inventory` (stock only) | Owner. Stock is not an edition size; no scarcity claim without this |
| R-A5 | Where the NFC tag sits and how to tap it (if P4 keeps NFC) | none | Owner + hardware test on the production sample |
| R-A6 | Actual product photographs, each with descriptive alt text | `products.images` (square crop in today's layout; alt falls back to the title, `offer.tsx:22`) | Field: Have · Photos and alt text: Owner. The plan requires the actual product to be shown |
| R-A7 | Care, handling, materials safety (e.g. plating, allergens) | none | Owner · Legal/PG (see R-B3) |
| R-A8 | Manufacturer and country of origin | none | Owner · Legal/PG (see R-B3) |

## B. Statutory and PG disclosures (Korean online sale of goods)

These are the items a Korean mail-order sale and a PG merchant review usually
check. The list is a checklist to confirm with legal and PortOne/PG, not a legal
finding. The PG application is on the launch critical path and depends on these.

| ID | Fact | Where it lives today | Status |
| --- | --- | --- | --- |
| R-B1 | Seller identity: business name, representative, registration number, address, phone | `commerce-publication.disclosure.seller`; values hard-coded in `disclosures.ts:39-46` | Identity: Have. The policy draft calls 리스토어드프로젝트 the "approved same-entity legal identity". **Blocker:** the recorded phone is a mobile number, which fails the existing non-mobile publication gate (`disclosures.ts:8, 58-63`). Owner must supply a business line |
| R-B2 | Mail-order business registration number (통신판매업 신고번호) | `disclosure.seller.mailOrderRegistrationNumber`, **optional** in schema | Legal/PG: confirm whether it must be required. Filing it normally needs a purchase-safety (escrow) certificate from the PG or a bank, so it may follow R-B12 |
| R-B3 | Product information notice (상품정보제공고시): the category's required items, e.g. name/model, certification, origin, manufacturer, after-sales contact | none | Gap · Legal/PG: no field, no section on the page. If the coin carries an NFC tag, ask whether radio conformity (KC, 전파법) applies; passive tags are often exempt |
| R-B4 | Withdrawal right for goods and its exceptions (청약철회) | `disclosure.policies.refund` | Legal/PG. The owner's "unactivated tokens cannot be refunded" rule meets a statutory withdrawal period for the physical goods. Any digital-content exception would plausibly attach only once provision starts (activation), so the owner rule places the exception where it is least likely to hold. That is the open T002 legal/PG check |
| R-B5 | Delivery: courier, fee, regions, expected dispatch | `products.shippingFeeKRW` (charged once per order), `products.dispatchSchedule`, `commerce-publication.shippingCountries` (KR), per-order `fulfillment.carrier` | Fields: Have · Values and courier choice: Owner. The page should say the fee is per order |
| R-B10 | Seller email address (operator display and identity disclosure) | none in the seller schema | Gap · Owner |
| R-B11 | Privacy officer (name and contact) | none | Gap · Owner + Legal |
| R-B12 | Payment methods offered; escrow or purchase-safety service if bank transfer or virtual account is offered | none on the page | Owner + PG. Required for the PG application |
| R-B13 | Transaction terms: return address and process; who pays return shipping for change of mind and for defects; withdrawal when goods differ from the description; after-sales service; damage-compensation and dispute standard; a minor's purchase without guardian consent can be cancelled | `disclosure.policies.refund` and `terms` (text only) | Owner + Legal |
| R-B14 | Price statement: VAT included or added | none | Owner + Legal |
| R-B15 | Service period of a perpetual membership, and how the token is described to the PG. Card and PG reviews may treat NFT or virtual-asset sales as a restricted category | none | Owner + PG. Ties to P6 |
| R-B6 | Terms, privacy (including address retention and courier disclosure), refund policy texts | `disclosure.policies.{terms,privacy,refund}` | Field: Have · Text: Owner + Legal. The [policy draft](../commerce-policy-drafts.md) is ticket-era and internal |
| R-B7 | Customer support contact, hours, response target, event-day urgent route | Seller phone renders as "Contact" (`offer.tsx:45`); no support-email field | Address: Have (rule), `concierge@sophomores.co` (owner, T002 reframe). The policy draft still shows the Hideaway address and must change. Hours, response target and event-day route: Owner |
| R-B8 | Hosting provider and escrow or purchase-safety notice, if required | none | Legal/PG: confirm whether the site footer or page needs them |
| R-B9 | Age eligibility for the event's alcohol (Part I drinks) | none | Gap · Owner + Legal: who may receive drinks, and how age is checked (ENTRY.02 in the old template) |

## C. The token and what holding it means

| ID | Fact | Status |
| --- | --- | --- |
| R-C1 | What the token is: a membership token that lasts indefinitely, one per account per token type | Have (T002 reframe, typed tokens) |
| R-C2 | What a holder gets now (the launch evening) and that later events name their own required token type | Have (owner answers on events and typed tokens) |
| R-C3 | What a holder gets beyond events, if anything | Owner. The reframe says "the event is one perk among others" but names no other perks; the page cannot list any yet |
| R-C4 | Not transferable once activated; recovery only through Sophomores | Have |
| R-C5 | No activation deadline; the token can be activated after the event | Owner rule: Have (U1, U3). **Conflict:** the CMS still requires `claimCutoffAt` on events (`commerce-events/index.ts:44`), and links expire from it. The page cannot say "no deadline" until T002 reconciles this |
| R-C6 | Refunds: unactivated tokens are not refundable | Owner rule · **Legal/PG hold** before any page shows it |
| R-C7 | How much of the on-chain nature to explain, and in what words | Owner (P6) |
| R-C8 | Customer names for coin, token and holder | Owner (P1) |

## D. The launch evening

| ID | Fact | Where it lives today | Status |
| --- | --- | --- | --- |
| R-D1 | Event name | `commerce-events.name` | Field: Have · Value: Owner |
| R-D2 | Date, Part I start and end, Part II timing; timezone | `commerce-events.partIStartsAt` and `partIEndsAt` (both required); the offer projection drops `partIEndsAt` (`catalogue.ts:45-47`). No Part II field | Values: Owner. The projection needs extending, not a new field. The policy draft records a working schedule (18 December; Part I 20:00–22:30; Part II until 02:00; year and timezone unconfirmed). It is provenance only, not approved |
| R-D3 | Venue(s) for Part I and Part II, or whether they are revealed later | none | Gap · Owner |
| R-D4 | Package: four Part I drinks, shared Part I → Part II transport | Rule: Have · no CMS field for the package; `transportCapacity` is required, and publication is blocked unless it covers every admission (`commerce-events/index.ts:26`) | The page states it from approved content. Transport is guaranteed for every admission by an existing rule |
| R-D5 | Capacity: sold units plus attending holders | `capacity`, `committedQuantity` | Have (rule) · Value: Owner |
| R-D6 | What the evening is like: format, who comes, what happens | none | Owner. Identity says formats "remain to be developed"; no programme claims without facts |
| R-D7 | Arrival: activate on the spot, staff help | Owner decision, **held in practice**: the Unlock auth finding (option D's 48-hour step-up blocks a new guest at the door) and the open staff-consent design; staff-assisted activation is also on the proposed deferral list |
| R-D8 | What happens if the event is cancelled, rescheduled or materially changed | none | Owner + Legal (the policy draft marks it open) |
| R-D9 | Venue accessibility and how to ask for accommodation | none | Owner |

## E. Buying, gifting and activating

| ID | Fact | Status |
| --- | --- | --- |
| R-E1 | Price per coin (KRW) | Field: Have (`priceInKRW`) · Value: Owner |
| R-E2 | Sale opens and closes | Field: Have (`saleStartsAt`, `saleEndsAt`) · Values: Owner |
| R-E3 | Up to three coins per account per release, including reservations | Have (rule and current string) |
| R-E4 | First coin is the buyer's unless they already hold the launch token; the rest are gifts | Have (D1/D2, owner answers) |
| R-E5 | Account requirement: verified email and phone to buy and to activate | Rule: Have (offer brief eligibility; D3/D4). Public phone verification is not yet live (item 4 of the custodian's launch critical path in the To-Do registry; step 6 of the commerce plan worklist). Public trust currently denies every grant |
| R-E6 | How a gift reaches its recipient: hand over the coin, or share the link | Have (bearer rule) · wording: Owner (P2) |
| R-E7 | Bearer warning: whoever activates first becomes the holder; keep the link safe | Have (owner wants a clear warning) |
| R-E8 | Buyer may regenerate the code until the token is activated | Have (U1) · whether the page mentions it: Owner |
| R-E9 | A holder who opens a gift leaves it untouched | Have (owner answer) |
| R-E10 | Cancelling a payment releases its units | Have (owner decision) |
| R-E11 | How the link arrives: NFC tap, printed QR, or both | Owner (P4) |

## F. Brand and page-level inputs

| ID | Input | Status |
| --- | --- | --- |
| R-F1 | `BrandMark` component and approved Helvetica typography | Have |
| R-F2 | Approved flame envelope mask (`public/masks/flame-envelope.png`) and footer flame renderer | Have (renderer is shared; do not edit it) |
| R-F3 | Identity and working voice guide | Have (working documents; examples not approved) |
| R-F4 | Selected reference mechanics (Analogue hero, Má pacing, pricing breakdown) | Have as direction ([integration spec](../integration-specification.md) §3); captures are unlicensed comparison material |
| R-F5 | Page route and URL: `/shop` alone, or `/shop/[product]` for later releases | Gap · Owner. The loader refuses to choose between two published products |
| R-F6 | Korean copy for every launch string | Owner (P7) |

## What blocks what

| Blocks | Required items |
| --- | --- |
| **PG merchant application** (on the critical path) | R-A1, R-A2, R-A6, all of R-B (including the business line in R-B1), R-C1, R-C6, R-C7, R-D1, R-D2, R-B9, R-E1, R-E2. Korean PG reviews usually inspect a reachable page showing product, price, seller and policies, so **a reviewable page is a prerequisite of the application**, not a later step. R-B2 may depend on R-B12's escrow certificate. **Gap (decision R-G1):** today no such page can exist before the sale opens. `loadCommerceOffer` returns `null` outside the sale window (`catalogue.ts:82`) and whenever the publication gate fails (`catalogue.ts:73-74`), so `/shop` shows only "Purchasing is not open". The PG review needs a pre-sale review mode, a publicly visible not-yet-purchasable state, or another owner-chosen route |
| **A truthful draft page** (step 3 can proceed with placeholders) | R-C1–R-C4, R-D4, R-E3, R-E4, R-E6–R-E10 are settled enough to write against. R-C5 and R-D7 are not (see their conflicts) |
| **Publication** | Everything above, plus approved copy; `publicationApproved` on the publication, product and event; `physicalProductApproved`, `fulfillmentReady` and `addressRetentionApproved` set from evidence; each policy's `effectiveDate` on or before now (`disclosures.ts:70`) |

## Owner fact request (to send after step 7)

One consolidated request, so the owner answers once. Grouped by who is likely to
know: product and manufacture (R-A2–A8), event (R-D1–D9, R-B9), commerce
(R-E1, E2, R-E11, R-B5, R-B12, R-B14), seller and support (R-B1 business line,
R-B7, R-B10, R-B11), legal and PG (R-B2–B4, B6, B8, B13, B15, R-C6), holder benefits
and route (R-C3, R-F5), naming and voice (P1, P2, P6, P7).
