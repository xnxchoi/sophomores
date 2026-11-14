# 03c — Standard e-commerce flows

Working draft · 2026-11-14 · Level 2c of the [commerce experience plan](README.md).
Mirrors the live doc's "3c · Standard e-commerce flows" tab; edits made there are
canonical.

The flows every e-commerce site has, and the pages they need, so the missing pages can
be built from this list. Checkout, payment and token flows are held (owner, 2026-11-14),
so each flow stops where it reaches them. **Status:** everything here is a Proposal
unless it cites something that exists in the code today or is settled in
[03](03-flows-and-scenarios.md).

## Pages needed

Nineteen pages and surfaces: thirteen are new, three exist and need rework, one stays as
it is, and two are held.

| Page | Proposed route | Today | Flows | Decision |
| --- | --- | --- | --- | --- |
| Shop home | `/shop` | Exists, but is also the product page | Browse | C-1 |
| Product page | `/shop/[slug]` | New; today inside `/shop` | Browse, Cart | C-1 |
| Cart drawer | Opens from the header | New | Cart | C-18 |
| Cart page | `/shop/cart` | New. The cart lives inline on `/shop` | Cart | C-18, C-19 |
| Checkout | `/shop/checkout` | Held | Cart hands over here | — |
| Payment return | `/shop/payment` | Exists; held | — | — |
| Account home | `/me` | New. Only `/me/settings` exists | Account | — |
| Order list | `/me/orders` | New. No list of orders exists | Account | C-21 |
| Order detail | `/me/orders/[id]` | Exists at `/shop/orders/[id]`. Gift parts go; activation is held | Account, After an order | C-21 |
| Cancel or return request | From the order detail | New | After an order | C-22 |
| Addresses | `/me/settings/addresses` | New. The address book is switched off in the code | Account | C-20 |
| Notifications | `/me/settings/notifications` | New | Account | — |
| Profile, language, security | `/me/settings/account`, `general`, `security` | Exist | Account | — |
| Help | `/help` | New | Help | — |
| Shipping and returns | `/help/shipping` | New | Help, After an order | — |
| Terms, privacy, refund | `/terms`, `/privacy`, `/refund` | Exist; restyle | Help | — |
| Header cart and account | Every page | New | Across every page | — |
| Footer with business details | Every page | New. Seller details show only on the product page today | Across every page | — |
| Teams | `/team` (proposed) | New. Built with the Hideaway's Credits component (`src/hideaway/components/sections/Credits/`), modelled on tux.co/en/people (owner, 2026-11-14) | Across the site | — |

**Remove, with no redirects:** `/tickets` and `/tickets/payment`. Nothing is live, so
no address is old (owner, 2026-11-14). **Held with the token
flows:** `/shop/invitations/claim`, the activation page. Sign-in pages (`/login`,
`/account`) keep their existing rules and aren't redesigned here.

**Site map, as drawn in the live doc:**

```
Shop                     Account                          Help
Shop home  /shop         Account home  /me (new)          Help  /help (new)
  ↓                        ↓                                ↓
Product page (new)       Order list  /me/orders (new)     Shipping and returns (new)
  ↓                        ↓
Cart drawer (new)        Order detail  /me/orders/[id]    Policies  /terms /privacy /refund
  ↓                        ↓
Cart page (new)          Cancel or return requests (new)
  ↓                      Settings · /me/settings
Checkout (held)            Addresses (new) · Notifications (new)
                           Account settings: account, general, security

On every page: header with cart count and account · footer with business details ·
messaging-app escape
```

## Browse

**Pages:** shop home, product page. The product page itself is specified in the
[product-sales-page](../product-sales-page/README.md) work and in
[03b](03b-step-flows.md) (A, B); this section covers only how people reach it and move on.

**Normal path**

1. Arrives at the shop home from the site, the header or a shared link. An app's browser
   gets the one-button escape (B8).
2. Sees what's on sale now, what's coming, and what's sold out or past. Each item shows
   its image, name, price and state.
3. Opens a product page.
4. Adds to cart, or leaves. The header cart count updates either way (see Cart).

**Cases**

- **One product only.** The shop home can go straight to it, or show it alone (C-1).
- **Nothing on sale.** The shop home says so, and shows the next release if one is
  announced.
- **Sold out, or after the evening.** Stays listed, marked, so shared links keep working
  (A4, A5).
- **A product that isn't published.** Its address shows the not-found page, not an error.

**Not recommended at launch:** search, filters, a wishlist and restock alerts (재입고
알림). They are standard, but they earn their place only with a larger catalogue.

## Cart

**Pages:** cart drawer, cart page, header cart count. **What exists:** a server-side
cart from Payload's commerce plugin, owned by the account
(`src/lib/commerce/ecommerce.ts`: `allowGuestCarts: false`, merge endpoint filtered
out, `secureCart` locks the cart while a payment attempt is open). Checkout today
accepts one release per cart, and the quantity control sits inline on `/shop`
(`src/components/commerce/checkout.tsx`).

**Normal path**

1. On the product page, presses **Add to cart**. Korean shops usually also offer **Buy
   now** (바로 구매), which skips the cart and goes straight to checkout; recommended:
   both.
2. The drawer opens with the item just added, the subtotal, **View cart** and
   **Checkout** (C-18). The header count updates.
3. On the cart page: each line shows image, name, unit price, quantity and line total.
   Below: subtotal, shipping fee and total. The shipping fee is charged once per order
   (R-B5).
4. Changes a quantity or removes a line. Totals update in place. Removing needs no
   confirmation; an **Undo** stays in place for a few seconds.
5. Presses **Checkout**, which hands over to checkout (held).

**Cases**

- **Signed out and adds to cart:** C-19.
- **Empty cart:** says so, with a link back to the shop.
- **A per-product limit**, such as one per account for products that carry a token: the
  + control stops there and says why.
- **Stock ran out, or the price changed, since adding:** shown on that line when the
  cart opens, before checkout. Nothing changes silently.
- **Sale closed, or product withdrawn:** the line is marked unavailable, left out of the
  total, and offered for removal.
- **A payment is being confirmed:** the cart is locked (the code already does this). It
  says so and links to the order.
- **Several products in one cart:** needed once the shop sells more than one release
  (C-1 b). Today checkout refuses a mixed cart.
- **Two devices, or signing out and back in:** the same cart, because it belongs to the
  account.
- **Left in the cart:** no reminder emails at launch. A reminder is promotional, so it
  would need the separate marketing consent (see Account).

## Account and commerce settings

**Pages:** account home, order list, order detail, addresses, notifications, and the
existing settings sections. **What exists:** `/me/settings` with three sections (general,
account, security; `src/lib/settings/sections.ts`). The account section is still
described in ticket terms ("attendee identifier … ticket registration details"). There's
no account home and no order list.

**Account home** (`/me`)

- The latest order and its state, with a link to it.
- Links to Orders, Addresses, Notifications, Settings and Help.
- The membership section is held with the token flows.

**Order list** (`/me/orders`)

- Newest first. Each row: date, order number, item image and name, total, and state.
- The states: being confirmed, preparing, dispatched, delivered, cancelled, refunded.
- Empty: "No orders yet", with a link to the shop.

**Order detail**

- Items, the price breakdown and the shipping address.
- Payment method, with a link to the PG's receipt.
- Delivery state and tracking (03b, Receive).
- Actions that depend on the state: request a cancellation before dispatch, request a
  return or exchange after delivery, contact support. See "After an order".
- Activation is held.

**Addresses** (`/me/settings/addresses`, C-20)

- A list of saved addresses with one default. Add, edit, delete, set as default.
- Each address: recipient name, phone, postcode, road address and the detailed address
  (도로명주소, 상세주소). Korean shops fill the first three through a postcode lookup.
- Checkout offers the default, and lets the buyer pick another or type a new one.
- Today the address book is switched off in the code, deliberately, so that no addresses
  are kept outside orders (`ecommerce.ts`: "no address-book CRUD or retention path").
  Each order does store its shipping address.

**Notifications** (`/me/settings/notifications`)

- **Order notices** (confirmation, dispatch, delivery, refund) can't be turned off; the
  account chooses the channel once C-3 settles it.
- **Marketing** is separate: off by default, opted into by channel (email, 알림톡 or SMS),
  with the date of consent shown. Korean law treats these as two different consents
  (광고성 정보 수신 동의). Legal confirms what else it requires.

**Payment methods:** none saved. The PG and the easy-pay wallets keep cards, so a
saved-card page isn't needed.

**Privacy and deletion:** a way to ask what data is kept, and to delete the account.
Where deletion lives today wasn't checked. What deletion does to a held token is held
(C-10).

## After an order

**Pages:** order detail, and the request steps that open from it. **What exists:**
returns can be recorded for each coin in admin (`src/lib/commerce/returns.ts`).
Customers have no way to ask from the site; requests go by email. What a refund does to a
token is held.

**Track**

1. The order detail shows the state and, once dispatched, the courier and a tracking link
   (03b, E2).
2. A delay shows the new window (E4).

**Cancel before dispatch** (C-22)

1. On the order detail, **Request cancellation**, shown only before dispatch.
2. An optional reason, then a confirmation, since it ends the order.
3. The order shows "cancellation requested". Support approves it, and the PG refund
   follows (payment mechanics, held).
4. The order shows "cancelled", with the refund amount and date.

**Return or exchange after delivery** (C-22)

1. On the order detail, **Request a return**, shown during the period legal sets (R-B4).
2. Chooses return or exchange, and a reason. The reason decides who pays shipping:
   change of mind or a defect (R-B13). A defect asks for a photo.
3. Korean shops usually arrange the courier pickup (반품 회수); the alternative is that
   the buyer sends it back.
4. The order shows each step: requested, approved, collected, inspected, then refunded or
   exchanged.

**Receipts**

- A link to the PG's card receipt on the order detail.
- A cash receipt (현금영수증) is only needed for bank transfer, which is parked with
  payment methods (D7).

**Questions for the owner**

- Courier pickup, or the buyer sends it back?
- Exchange at all, or only a replacement for a defect?

## Help and policies

**Pages:** help, shipping and returns, and the three policy pages. **What exists:**
`/terms`, `/privacy` and `/refund`, built from the published disclosure, each still
linking to `/tickets`. Support is concierge@sophomores.co (R-B7), but the product page
shows only the seller's phone under "Contact".

- **Help** (`/help`): short answers grouped by ordering, delivery, returns and refunds,
  and account. A contact block gives the support email, its hours and response target
  (B5, still open), and the business phone (R-B1).
- **Shipping and returns** (`/help/shipping`): the courier, the fee, Korea only, the
  dispatch window, and how returns work. The remote-area fee is parked with checkout (C8).
- **Policy pages:** restyled, with the texts unchanged until legal settles them (R-B6).
  Their links move off `/tickets`.
- **One wording everywhere.** What the help pages, the product page and the order detail
  say about delivery and refunds matches the policy word for word (04, goal I).

## Across every page

- **Header:** the shop, the cart button with its count, and account entry (sign in, or
  the account once signed in). The count shows only when the cart has something in it.
- **Footer:** the seller's business details, which Korean online shops show on every
  page: business name, representative, business registration number, mail-order
  registration number (통신판매업 신고번호), address, phone, email and privacy officer
  (R-B1, R-B10, R-B11). Links to the terms, privacy and refund policies. Legal confirms
  the full list. The purchase-safety notice (R-B12) is parked with payment methods. Today
  these details appear only on the product page (`src/components/commerce/offer.tsx`).
- **Sign-in when needed:** inline, returning the person to where they were. Sign-in
  itself keeps its existing rules.
- **States:** every page has a loading, empty and error state. Loading keeps the layout
  still. An error offers **Try again** as a button, in place.
- **Not found:** the site's existing not-found page, with a link to the shop.
- **Language:** English and Korean. A Korean string that hasn't been written yet shows
  the English one.
- **Messaging-app browsers:** the one-button escape on every shop page (B8).

## Decisions for review

Five new decisions, plus C-1 from [01](01-surfaces-and-actors.md) (one page per release,
or a shop home with product pages), which sets the Browse pages.

**Build order (owner, 2026-11-14):** the pages are built in this worktree and read only
cart, order and account data, so the product and token work from the other worktree can
merge in later. Before any page is built, the reference sites are captured live and a
visual direction is agreed (level 4).

**C-18 · Cart surface.**
- (a) A drawer only.
- (b) A cart page only.
- (c) Both.

*Recommendation:* (c). The drawer confirms the add without leaving the product page. The
page is what a phone, a returning visitor or a link needs. *Blocks:* the header and the
product page's add action.

*Settled (owner, 2026-11-14): (c), both.*

**C-19 · A signed-out visitor adds to cart.**
- (a) As today: they sign in inline, then the item is added.
- (b) A cart kept in the browser, saved to the account when they sign in.

*Recommendation:* (a) at launch. Buying needs an account anyway, and it keeps the code's
deliberate choice: no signed-out carts, and the merge step removed. (b) is the more
common pattern, but it reverses a security decision, so it needs a security review
first. *Blocks:* the add action.

**C-20 · Address book.**
- (a) Off, as today: the address is typed at each checkout.
- (b) Saved addresses, with a default.

*Recommendation:* (b), after privacy review (R-B6, R-B11). It's what Korean shoppers
expect, and each order already keeps its shipping address. The privacy policy has to
cover how long saved addresses are kept and how they're deleted. *Blocks:* the addresses
page, and the address step in checkout.

**C-21 · Where orders live.**
- (a) `/me/orders` and `/me/orders/[id]`; the current `/shop/orders/[id]` moves there.
- (b) Keep `/shop/orders/[id]`, and add a list at `/shop/orders`.

*Recommendation:* (a). Orders belong with the account. Nothing is live, so the page simply
moves. *Blocks:* the order list and detail.

*Settled (owner, 2026-11-14): (a).*

**C-22 · Cancel and return requests.**
- (a) By email only, as today.
- (b) Request buttons on the order detail. Each creates a request that support decides.

*Recommendation:* (b). It's standard on Korean shops, and support still makes every
decision; nothing is refunded automatically. *Blocks:* the order detail's actions.

*Settled (owner, 2026-11-14): (b).*
