# Handoff: apply the single-purchase rule

Working draft · 2026-11-14 · From the commerce experience plan ([README](README.md)).
**For:** the branch that owns mechanism work, `codex/auth-payment-nfc`. **Not for** the
page-structure worktree (`feature/product-production`), which does no mechanism work.

## The decision

**Owner, 2026-11-13: each account may buy once, for itself. Buying on behalf of others is
removed.** On 2026-11-14 the owner asked for it to be applied, and said that is **not design
work**: it is handed off.

## What this handoff is, and is not

- **Is:** the owner's instruction to apply the rule, the pointers to what it touches, and the
  order to work in.
- **Is not:** a change. Nothing described here has been edited. Nothing has been run or
  verified; the code pointers below came from a text search and were not read in detail.
- **Impact first** (owner's working rule): before changing anything, report to the owner each
  affected surface and what will break, then wait for the go-ahead. Preserve the parts that
  work.

## What the rule touches

The full list is already written, so it is not repeated here. Read
[README, "What the single-purchase rule changes"](README.md#what-the-single-purchase-rule-changes):
the product-page fact base, the registry (T001, T002, T003, T005, T006, T010, T013), the
launch plan, and the site as built. Two things that list does not own:

1. **The gift parts of `/shop/orders/[id]`.** The order page still issues and reissues a gift
   link per coin and asks for a guest name (`src/components/commerce/order-admissions.tsx`,
   `src/lib/commerce/guests.ts`, `src/app/(site)/shop/orders/[id]/page.tsx`). The owner has
   settled (C-21) that orders move to `/me/orders/[id]`. An empty route there now exists
   for that on the page-structure worktree. Moving the page and removing its gift parts is
   one piece of work.
2. **Removing `/tickets` and `/tickets/payment`** (owner, 2026-11-14: remove both, no
   redirects, because nothing is live). The links run through code the payment work holds:
   - `src/app/(site)/_commerce/policy-page.tsx:26`
   - `src/components/music/SlotManager.tsx:98` (sends signed-in visitors to `/tickets`)
   - `src/components/tickets/ticket-account-entry.tsx:111` (used by `/account` and
     `/account/continue`)
   - `src/components/tickets/portone-payment-result.tsx:177,188,348` and
     `src/components/tickets/portone-checkout.tsx:105` (the legacy payment return, which names
     `/tickets/payment`)

   Before removing `/tickets/payment`, confirm nothing registered with PortOne still returns
   there. C-4 recorded that check; the owner then settled the removal.

Code found by a text search for gift, allowance, guest or bearer wording (**a pointer, not a
verified list**): `src/lib/commerce/` (`guests.ts`, `token-entitlements.ts`, `reservations.ts`,
`ecommerce.ts`, `returns.ts`, `contracts.ts`, `domain.ts`, `portone/result.ts`);
`src/components/commerce/` (`checkout.tsx`, `order-admissions.tsx`, `offer.tsx`,
`payment.tsx`, `invitation-claim.tsx`); `src/payload/collections/` (`commerce-allowances`,
`commerce-admissions`, `orders`, `commerce-events`, `users`); `src/payload/admin/commerce/`;
`src/app/(site)/shop/invitations/claim/page.tsx`; the music eligibility code. Payload schema
changes must follow AGENTS.md: schema-level design and migrations go under `src/payload/`,
and no quick direct database edits.

## Order of work

1. **Record the decision** in the registry, together with C-13 to C-17 (see
   [03](03-flows-and-scenarios.md#decisions-for-review)), so running work such as the T002
   production wiring stops building gift logic.
2. **Report the impact** for each surface above, as the owner's working rule requires.
3. **Apply**, after the owner's go-ahead, in the order the owner chooses.
4. **Interface copy** that changes goes through `messages/en.json` and `messages/ko.json`
   with `""` for new Korean keys (AGENTS.md). Do not touch existing Korean text.

## Out of scope

Design, styling and interaction work (waits for level 4); the checkout and payment mechanics
beyond removing gift logic (parked); the token flows (held by the owner, see README).

## Paste-ready prompt

> Read `docs/reference/commerce-experience/handoff-single-purchase-rule.md` and the README
> section it links. The owner decided on 2026-11-13 that each account may buy once, for
> itself, and on 2026-11-14 asked for it to be applied as mechanism work on this branch.
> Do not change anything yet. First record the decision in the registry, then report each
> affected surface and what will break, then wait for the owner's go-ahead.
