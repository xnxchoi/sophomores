# 01 — Surfaces and actors

Working draft · 2026-11-13 · Level 0 of the [commerce experience plan](README.md).
What exists today, what is missing, and who goes through it. Code references are
collected under [Sources](#sources) at the end.

## Surfaces on the site

The disposition column is a proposal. **Rename** and **retire** are decisions, not
changes. Nothing moves until the owner agrees and the owning task picks it up.

| Route | What it does today | Proposed disposition | Owner task |
| --- | --- | --- | --- |
| `/shop` | Shop home and product page in one; quantity, address and payment are here [s1] | **Rework.** One page per release, or a shop home plus product pages (C-1) | T003; product spec in [product-sales-page](../product-sales-page/README.md) |
| `/shop/payment` | Phone return point from PortOne; confirms or recovers a payment, never starts one [s2] | **Rework the look; keep the address,** because PortOne is set to return here | T003, T004 |
| `/shop/orders/[id]` | One order; issues and reissues a gift link per coin, needing a guest name and the event cutoff [s3] | **Rework** into the buyer's order and delivery record; gift-link issuing goes | T003, T013 |
| `/shop/invitations/claim` | Where a gift link opens | **Rename and repurpose** as the buyer's activation page (C-13) | T013; critical-path item 2 |
| `/tickets` | Shows `/shop` unchanged. Still linked from the setlists page, the policy pages, account entry and the legacy payment result [s4] | **Retire later.** Redirect only after every link and account-entry return moves off it (C-4) | T003, T010 |
| `/tickets/payment` | Legacy payment result page | **Retire later,** after confirming nothing registered with PortOne still points at it (C-4) | T004 |
| `/setlists/[slug]` | Music page with a "Get ticket" button linking to `/tickets` [s4] | **Rework the link and wording** when `/tickets` retires | Music page owner; T012 |
| `/account`, `/account/continue` | Inline account entry, and the return point after Google sign-in | **Restyle only within the account-entry rules** in AGENTS.md | Auth owners |
| `/login`, `/logout` | Standalone account entry | **Keep the existing rules** | Auth owners |
| `/me/settings/*` | Account, general and security settings | **Extend** if the holder view lives here (C-2) | C-2 |
| `/refund`, `/privacy`, `/terms` | Policy texts from the published disclosure. Each links to `/tickets` [s4] | **Restyle;** texts from R-B6 | T003; legal |
| `/` | Site home | **Entry point only.** Whether it links to the shop was not checked: its content may be managed in Payload | — |

With gift purchases removed (owner, 2026-11-13), the order page loses gift-link issuing,
and the invitation page becomes where the buyer activates their own coin. The owner
rejects "invitation" and dislikes "claim" as names.

### The activation page: owner direction already given

The owner has set direction for the activation page (T013, 2026-11-13; illustrations,
not approved copy).
- A signed-in account that already holds the token sees a **holder view** (for example
  "Patron since …"), with a small link asking whether they were given a token. That
  link loses its purpose now that gifts are removed.
- Before choosing a view, the page has to establish exactly which token is in scope.
  Revealing a token's type from the link before sign-in must not let anyone probe which
  links exist (T005 C13), so it needs a security decision.

## Touchpoints off the site

| Touchpoint | What it is | State |
| --- | --- | --- |
| PortOne payment window | The PG's own payment window, opened from `/shop`; card only today [s5] | Provider-owned look. Our job is the hand-off before and after it |
| PG and card receipts | Sent by the PG or the card issuer | Not ours to design; the order page must agree with them |
| Order notices | Confirmation, dispatch, delivery, activation, refund. In Korea these usually go by KakaoTalk business message (알림톡) as well as, or instead of, email | **Not built.** The only mailer today sends account sign-in mail [s6]; no order notice of any kind (C-3) |
| Messaging apps | Shared links mostly travel by KakaoTalk, Instagram or SMS. KakaoTalk and Instagram open links in their own built-in browser | Google sign-in and payment windows can fail there. Owner direction: detect it and offer a single button out (03, B8) |
| Courier | Tracking page and SMS | Courier-owned; we supply the tracking link |
| The box | Coin, packaging and the activation insert (NFC tag, printed QR or both, P4) | The insert carries copy (R-A3, R-E11) |
| The door | Check-in at the launch evening, and activation on arrival (R-D7, held) | Check-in method not settled |
| Support | concierge@sophomores.co (R-B7). The offer page shows only the seller's phone under "Contact" today; there is no support-email field [s7] | Address settled; field, hours and response target are owner facts |
| Resale marketplaces | 번개장터, 중고나라 and similar | Not ours, but coins can be resold there. The token stays with the buyer's account (03, F2 and J4) |

## Surfaces that do not exist yet

- **A pre-sale or review state** that the PG reviewer can reach before the sale opens
  (R-G1).
- **The holder view.** Directed for the activation page (above). Where else a holder
  sees their token and order is open (C-2).
- **Order history.** There is no list of a customer's orders.
- **A support or help page** beyond the contact shown on the offer.
- **Withdrawal or return requests.** Per-coin returns exist in admin only [s8].
  Self-service returns are on the proposed deferral list.
- **Order notices** (above).

## Actors

| Actor | Who they are | What they come to do | Where they are unusual |
| --- | --- | --- | --- |
| **Visitor** | Signed out; may arrive inside a messaging app's browser | Understand the product, decide | The page must read completely without sign-in |
| **Buyer** | Has or will create an account with a verified Korean phone (R-E5) | Buy one coin, for themselves | One purchase per account (owner, 2026-11-13; scope in C-15). No Korean phone: support handles it individually. Under 14: cannot sign up |
| **Buyer who already bought** | Signed in; has an order for this release | Check their order, or try to buy again | The page says they have theirs and links to the order |
| **Holder** | Has an activated token | Come to the evening; see their membership | The holder view (directed, T013) |
| **Someone with a coin that isn't theirs** | Found, borrowed or bought second-hand | Tap it | Only the buyer's account can activate it (proposed, 03 F2); they are pointed to buying their own |
| **PG reviewer** | Reviews the merchant application | Check that product, price, seller, policies and refund terms are visible and consistent | Must see a reviewable page before the sale opens (R-G1). Reads the statutory facts, not the story |
| **Door staff** | Run check-in at the evening | Admit holders; help with activation on arrival (held) | Need a fast way to confirm a holder that works when signal is poor (gap) |
| **Owner / operator** | Runs Sophomores | Publish, fulfil, answer support, refund | Uses Payload admin. Covered only where it changes what a customer sees |

## Decisions for review

**C-1 · Shop structure.**
- (a) One page per release at `/shop`.
- (b) A shop home listing releases, plus a product page for each.

*Recommendation:* (a) for the launch, built so it can become (b) later. *Blocks:* the
route (R-F5) and the product-page layout. This is the same question as U-4 in the
product spec.

**C-2 · Where a holder sees their membership, outside the activation page.**
- (a) A section in `/me`.
- (b) The order page.
- (c) A new page.

*Recommendation:* (a), reusing the holder view the owner directed for the activation
page. *Blocks:* stage 8 of the journey.

**C-3 · Order notices at launch.**
- (a) None; the order page only.
- (b) Email confirmation.
- (c) Email plus 알림톡 for confirmation and dispatch.

*Recommendation:* at least (b). Without any notice, a buyer has no record outside the
PG receipt. *Blocks:* stage 5 copy, plus a sender setup that needs its own approval.

**C-4 · Retiring `/tickets` and `/tickets/payment`.**
- (a) Keep both until after launch.
- (b) Redirect them before launch, once every link above is moved.

*Recommendation:* (b) for `/tickets`. For `/tickets/payment`, (a) until PortOne
settings are confirmed. *Blocks:* removing ticket vocabulary from the site.

*Settled (owner, 2026-11-14): remove both, with no redirects. Nothing is live, so no
address is old.*

## Sources

- [s1] `src/components/commerce/checkout.tsx:235-244` (quantity, address, total and payment on `/shop`).
- [s2] `src/lib/commerce/portone/adapter.ts:75` (return address); `src/components/commerce/payment.tsx:223` (the pay button is hidden in recovery).
- [s3] `src/components/commerce/order-admissions.tsx:53-68,80-85`; `src/lib/commerce/guests.ts:99-113`.
- [s4] `src/app/(site)/tickets/page.tsx`; `src/components/music/SlotManager.tsx:90-101`; `src/app/(site)/_commerce/policy-page.tsx:26`; `src/components/tickets/ticket-account-entry.tsx:111`; `src/components/tickets/portone-payment-result.tsx:348`.
- [s5] `src/components/commerce/payment.tsx:133` (card only).
- [s6] `src/lib/member-auth/mail.ts`.
- [s7] `src/components/commerce/offer.tsx:45`.
- [s8] `src/lib/commerce/returns.ts` (`acceptUnitReturns`).
