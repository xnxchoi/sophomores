# Commerce experience: top-down plan

Working draft · 2026-11-13 · Planning only. Nothing here changes source, schema,
copy catalogues, Payload content or provider settings.

## What this is

This folder plans the whole customer-facing commerce section of the site. That covers
the shop home, the product page, payment, orders, activation, the
launch evening, support, refunds and the policy pages. It starts at the top (who goes
through what, and in what order) and works down to the pages. The Hideaway-era
fixtures that exist today are a starting point. Every user-facing commerce page is in
scope for rework.

**How I read the request.** "The PG thing" is the sales-page and PG-readiness work
in [product-sales-page](../product-sales-page/README.md), widened here to the whole
commerce section. The PG reviewer gets their own journey in this plan, rather than
a single gap.

**What still governs.** The [commerce launch plan](../commerce-launch-plan.md) and
the [To-Do registry](../../To-Do%20List.md) stay in charge of delivery. This folder
maps its flows onto their milestones and task IDs. It is not a parallel plan, and it
does not reorder the launch critical path.

## The levels

Each level is reviewed before the next is written. Later levels cite earlier IDs
instead of restating them.

| Level | Question it answers | Document | State |
| --- | --- | --- | --- |
| 0 | What exists, and who uses it | [01 — Surfaces and actors](01-surfaces-and-actors.md) | Draft |
| 1 | What is the end-to-end journey | [02 — Journey map](02-journey-map.md) | Draft |
| 2 | What happens in each branch, including the failures | [03 — Flows and scenarios](03-flows-and-scenarios.md) | Draft; C and D parked |
| 2b | The step-by-step path through each branch before and after the purchase | [03b — Step flows](03b-step-flows.md) | Draft; not independently reviewed; token sections held |
| 2c | The flows standard to e-commerce sites, and the pages they need | [03c — Standard e-commerce flows](03c-standard-ecommerce-flows.md) | Draft; not independently reviewed |
| 3 | What each flow must achieve (UX), and what it must look like (UI) | [04 — Flow goals](04-flow-goals.md) | UX draft · UI waits on references |
| 4 | Reference set and moodboard | [04b — References](04b-references.md) | oflyn and osklen captured 2026-11-14; direction proposed, waits on the owner |
| 5 | Page specifications | [product-sales-page](../product-sales-page/README.md) is the first one | See below |

### Current focus (owner, 2026-11-14)

The purchase itself (stage 4; branches C and D in 03) is **parked**. Work continues on
everything before it (A, B) and after it (E to K), in
[03b — Step flows](03b-step-flows.md). What stays in scope even though it touches the
purchase:

- **The eligibility check** (C-15): B3 before buying, I8 after a refund.
- **C-17** (what sign-up proves), through J3, J6, K4 and G4. Its sign-up mechanics (C3,
  C4) are parked.
- **The pre-sale page for the PG reviewer** (A2) is in scope. Its consent and
  payment-method content (C10, D7) is parked with C and D.

**Then, same day:** flows about the token (activating, holding, revoking) are held as
well. Work is now on the flows standard to e-commerce sites, and the pages they need, in
[03c](03c-standard-ecommerce-flows.md). "Held" means set aside by the owner; it isn't
the HOLD status in 03.

**Then:** the product, token and ticket process, and its scenarios, are handled in
another worktree, where it was overhauled (owner, 2026-11-14). 02, 03 and 03b stay here
as background only; this plan now covers building the pages in
[03c](03c-standard-ecommerce-flows.md). Nothing is live, so no page needs a redirect.
The registry question about the single-purchase rule is withdrawn for the same reason.

### Where the existing product-page work sits

The six documents in [product-sales-page](../product-sales-page/README.md) become the
level-5 specification for one page: the product page.

- **01–03 stay as the fact base.** The product definition, the requisites register
  (the `R-xx` IDs) and the draft copy hold whatever direction is chosen. This folder
  cites `R-xx` IDs rather than restating facts.
- **04–06 are provisional.** The design direction, UX storyboard and asset plan were
  built on the Analogue reference and the flame light. The owner now wants the
  current look (from oflyn.fr) fused with osklen.com.br and one or two others. That
  may replace their direction, so their pending re-reviews are **paused** until level 4
  settles. Their structural content (states, performance budget, the PG-visible fact
  layer, the asset requisites format) is expected to carry over.

## Review ledger

Failed and near-failed cycles stay recorded.

| Document | Cycle | Result | Notes |
| --- | --- | --- | --- |
| product-sales-page 01 | 1 · 2 | FAIL · PASS | Five LOW findings remain open |
| product-sales-page 02 | 1 · 2 | FAIL · FAIL | Both cycle-2 MEDIUMs fixed; verification pending |
| product-sales-page 03 | 1 | FAIL (both reviewers) | Rewritten; re-review pending |
| product-sales-page 04 | 1 | FAIL | Rewritten; re-review paused (direction may change) |
| product-sales-page 05, 06 | — | Not reviewed | Paused with 04 |
| commerce-experience 01–04 | 1 | FAIL · FAIL | Fact: 1 HIGH, 6 MEDIUM, 6 LOW. Structure: 2 HIGH, 5 MEDIUM, 5 LOW. Rewritten; single-purchase rule adopted |
| commerce-experience 01–04 | 2 | FAIL · FAIL | Fact: 3 MEDIUM, 8 LOW. Structure: 1 HIGH, 5 MEDIUM, 9 LOW. One fact finding was resolved differently: typed tokens are owner-confirmed (registry 377–393), so C-15 states the condition rather than marking H2 open. Fixes applied; cycle 3 pending |
| commerce-experience 01–04 | 3 | PASS · FAIL | Fact: PASS, 1 MEDIUM, 6 LOW. Structure: 2 MEDIUM, 8 LOW (refund rows ignored activation; statuses vs legend). All fixed; structure cycle 4 pending |
| commerce-experience 01–04 | 4 | — · FAIL | Structure only: 2 MEDIUM (dispute row ignored activation; statuses vs legend), 6 LOW. Fixed, plus a precedence rule for statuses. The full plan now also lives in the owner's live doc |
| commerce-experience 01–04 | — | Held for owner | Past the three-cycle cap. Round-4 fixes applied, not independently re-checked; the owner's read of the live doc is the next gate |
| commerce-experience 03c | — | Not reviewed | New 2026-11-14. No independent review; held for owner |
| commerce-experience 03b | — | Not reviewed | New 2026-11-14. One self-check: unaccepted steps marked as Proposals, two unsourced claims moved into questions, privacy review added to the door list. Held for owner |

## What the single-purchase rule changes

**Owner decision, 2026-11-13:** buying on behalf of others is removed. Each account may
buy once, for itself. This folder already follows it. It also reaches documents and
code that this folder does not edit:

- **Product-page fact base:**
  - [01](../product-sales-page/01-product-definition.md): who holds what, and gifting.
  - [02](../product-sales-page/02-requisite-information.md): R-E3 (allowance three → one),
    R-E4, R-E6, R-E7 and R-E9 (gift and bearer rules). R-E8 stays for the buyer's own
    coin; only its gift framing goes. R-E10 (cancelling releases units) and R-E11 (how
    the coin's link arrives) stay.
  - [03](../product-sales-page/03-copy.md): `giftRule`, `giftRuleHolder` and
    `keepLinkSafe`, and the "Buying for someone else" section.
  - [05](../product-sales-page/05-ux-flow.md) beat 5, and the [06](../product-sales-page/06-asset-plan.md)
    "coin handed over" image (I5).
- **Registry:**
  - the T002 token model: gift units, and bearer activation (whoever opens a coin's link
    first becomes its holder). U1's code regeneration stays for the buyer's own coin;
  - T001: buyer-first allocation (the first coin goes to the buyer, the rest are gifts),
    the three-per-account limit, and its "buying for others" matrix;
  - T003 (its recorded purchase and claim direction);
  - T005 and T013 (invitation journey);
  - T006 (guest-name corrections);
  - T010 (required gift registration).
- **Launch plan:**
  - "Account allowance and inventory" (net three; no identity rules across accounts,
    which C-17 would also change);
  - all of "Admission, account binding and physical activation" (self plus gifts,
    pending gifts, bearer activation);
  - worklist step 3 ("Preserve net-three");
  - implementation gate 3 (individual guest claims).
- **The site as built:**
  - the quantity selector and the gift line on `/shop`;
  - the three-per-account limit;
  - gift-link issuing on the order page;
  - the gift-link service behind it;
  - the invitation page;
  - the matching interface copy.

None of these is changed yet. The decision should first be recorded in the registry,
together with C-13 to C-17 (in [03](03-flows-and-scenarios.md#decisions-for-review)),
so that work already running (the T002 production wiring, for one) doesn't keep
building gift logic.

## Decisions collected so far

New decisions from this folder use the prefix **C-**. Each one lists options, a
recommendation and what it blocks. The product-page decisions (P, R-G1, V, U, A) stay in
their own documents.

| ID | Decision | Where |
| --- | --- | --- |
| C-1 | Shop structure | [01](01-surfaces-and-actors.md#decisions-for-review) |
| C-2 | Where a holder sees their membership | 01 |
| C-3 | Order notices at launch (email, 알림톡) | 01 |
| C-4 | Retiring `/tickets` and `/tickets/payment` | 01 |
| C-6 | Holding as part of the launch scope | [02](02-journey-map.md#decisions-for-review) |
| C-10 | Account deletion against a held token | [03](03-flows-and-scenarios.md#decisions-for-review) |
| C-11 | How new references relate to Analogue and Má | [04](04-flow-goals.md#decisions-for-review) |
| C-12 | Weight of the current oflyn-derived look | 04 |
| C-13 | When the token becomes the buyer's | 03 |
| C-14 | Whether a token can ever be revoked | 03 |
| C-15 | What "a single purchase" counts | 03 |
| C-16 | Rebuying after a refund | 03 |
| C-17 | What sign-up proves about a person (본인인증 or SMS code) | 03 |
| C-18 | Cart surface: drawer, page or both | [03c](03c-standard-ecommerce-flows.md#decisions-for-review) |
| C-19 | Signed-out visitor adds to cart | 03c |
| C-20 | Address book | 03c |
| C-21 | Where orders live | 03c |
| C-22 | Cancel and return requests from the order page | 03c |

C-5, C-7, C-8 and C-9 were withdrawn when gift purchases were removed.
