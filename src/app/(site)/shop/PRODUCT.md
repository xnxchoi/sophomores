# Product

<!-- impeccable:product-schema 1 -->

Scope: the Sophomores shop and its purchase journey only (owner, 26 Nov): /shop, a product's details, cart, checkout,
payment and orders. The rest of sophomores.co is outside this record.

## Platform

web

## Users

Two audiences, equally primary (owner, 26 Nov):

- **Newcomers deciding whether to buy.** They come to look at the editions, read what each one is and what it costs,
  and decide. Some editions also bring them into the community.
- **Returning members.** They come back to see their orders and editions, and to buy another.

Both arrive on desktop and on phones (touch), in Korean or English.

## Product Purpose

The shop sells Sophomores' book editions. It shows each edition as a book you can pick up, open and page through, then
says plainly what the edition is, what it includes, what it costs and how refunds work. Success: a visitor can tell
the editions apart and buy the right one without being misled about anything.

## Positioning

The book is a publication first; membership comes with some editions only (owner, 26 Nov). One edition, for example, is
the book alone; another includes the book, a membership token and a free Member Ticket. The shop presents the editions
the way stripe.press presents its books: as objects in a 3D scene, opened and read in place (owner, 23-25 Nov).

## Operating Context

- Korea: prices in KRW, dates and times in Asia/Seoul.
- Korean and English. The catalogues mirror each other; untranslated Korean falls back to English.
- Sign-in is passwordless: Apple or Google (Kakao when switched on) to sign up; registered members can also sign in
  with an email code.
- The purchase steps, payment, orders, tickets and keys are mechanisms another lane owns. Shop pages read their states
  only (signed in or out; not purchased, pending, paid or failed).
- Business-supplied content (an edition's page fields, art, gallery, praise, details) is edited in Payload.

## Capabilities and Constraints

- Three products, shown with their real names and prices from the records. Never call them "coins": say the product's
  name or "membership".
- Purchase is not open yet. No date is known, nothing can be bought or paid, and there is no notify-me. The shop is
  display-only until then.
- Each edition's refund rule shows beside its buy row and under its title wherever the shop lists it.
- Some editions are limited to one per account.
- Open: when purchase opens, and the editions' final content (cover art, page images, gallery, praise, details). Until
  the owner supplies them, products show a placeholder cover and sections without content stay hidden.

## Brand Commitments

- Name: Sophomores. The wordmark is only ever the `BrandMark` component.
- Voice: dry, calm and grounded (docs/design/identity.md, docs/design/brand-voice.md). Interface copy is terse: say
  what's true and what happens next. Wordiness is the owner's biggest complaint.
- Commerce pages take their design and flow from stripe.press, ported from its code and runtime and checked by
  measurement (owner, 23-25 Nov). None of stripe.press's logo, art, assets, fonts or audio ships.
- Elsewhere The Hideaway is the default standard; Arc UI supplies primitives and forms only.
- Standing owner rules: current colours stay (colour hold); no mono type except where the owner names it (the open
  book's page-turn bar, Geist Mono); full motion, with no reduced-motion branches.
- The book sounds are the owner's Kenney "RPG Audio" files (CC0).

## Evidence on Hand

- Product records (names, prices, what each edition includes, refund terms) in Payload.
- The owner's book model (`public/assets/three/book/book.glb`), generated neutral textures and a placeholder cover.
- The owner's book sounds (`public/assets/three/book/audio/`, with PROVENANCE.md).
- Testimonials, reviews, press, sales figures and customer stories have not been supplied or verified for use in the
  shop. Never invent them, praise included.

## Product Principles

1. Show only what is true: real names, prices, inclusions and refund rules, and nothing that implies a purchase is
   possible while it isn't.
2. The book is the object. Looking at, opening and reading the book comes before selling it.
3. Say less. Each line either tells the visitor something they need or it goes.
4. Pages depend on states, not mechanisms, so the owner's edits never cascade.

## Accessibility & Inclusion

- Touch targets are at least 44 × 44 px on coarse pointers.
- Keyboard focus shows a ring on the visible control only.
- UI checks stay functional ("does it work?"); no screen-reader or accessibility test suites (owner, 19 Nov).
