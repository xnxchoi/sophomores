# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People building lives of their own: following work, interests or ambitions that may look little like the life others expect of them, with the energy and doubt that comes with it (docs/design/identity.md). They join by buying the book, the main product, which carries Signet membership with it, and they come back to Sophomores gatherings, intended at least twice a year. Confirmed by the owner, 2026-11-26.

Secondary audience in the product: Sophomores staff, who run the Payload admin (orders, tickets, check-in, the business content the site shows).

## Product Purpose

Sophomores brings these people together as a community they can return to, so each leaves with renewed curiosity, courage and excitement for the life they are pursuing. "Pursuing a life of your own does not mean wanting to pursue it alone." Sophomores is the host: it makes the encounters possible and leaves room for the people and their relationships (docs/design/identity.md).

The site's job: sell the book (its editions) confidently through its real benefits, take payment, grant membership, issue Tickets for gatherings, and admit members at the door.

## Positioning

All four, confirmed by the owner, 2026-11-26:
- **Recurring gatherings.** A community to return to, not a one-off event. People's lives continue between meetings, so there is more to tell each time.
- **The book as the way in.** Membership comes with buying the book, not with an application or a subscription.
- **Signet and the NFC key.** Membership is a non-transferable on-chain key (Signet, an Unlock lock on Polygon) held in a wallet Sophomores runs for the member. Check-in happens at the door with an NFC card.
- **The host's voice.** Dry, calm and grounded, with affection for the people and an eye for the absurdity of their pursuits (docs/design/brand-voice.md).

## Operating Context

- Purchase path: the book page, then order and payment through the standard checkout (PortOne). Account entry is an inline step of purchase. Sign-up is through Apple or Google (Kakao when it's switched on); registered members can also sign in with an email code.
- After payment: the member's wallet (a Safe Sophomores controls) gets one Signet. Every Signet holder gets one free Ticket for the launch event, and guest-invite Tickets go to the member who paid.
- At the gathering: NFC check-in reads the member's key, and Wallet passes (Apple and Google) carry the same door QR.
- Staff work in the Payload admin. Everything the business supplies (copy, prices, product facts) is edited there, not in code.
- Bilingual: English is canonical (messages/en.json). Korean mirrors it, and an empty Korean string falls back to English.

## Capabilities and Constraints

- Prices and product facts come from Payload records, never from code or copy.
- Terminology: say the product's name or "membership", never "coins". The products are the book's editions, Signet (membership) and Tickets. All editions launch together.
- No legacy compatibility is owed (there are no past orders), but every order records the version of the rules it was made under, so later changes never break it.
- Personal data follows the standard web-security baseline (no caching of private pages, back-button cache handling, sign-out clears client copies, nothing personal in URLs).
- Owner priority: the backend matters most, and the frontend has to exist and stay modular, so an edit doesn't cascade. UI tests ask only "does it work?"; there are no accessibility or screen-reader tests (owner, 2026-11-19).
- Undecided: gathering formats and calendar, invitation practice, participant expectations and the community's practical boundaries (identity.md, "Working status"). Moving a Signet to a member's own wallet is backlog.

## Brand Commitments

- Name: Sophomores. The wordmark renders only through the `BrandMark` component, identical everywhere.
- Voice: docs/design/identity.md and docs/design/brand-voice.md. The core and the English interface calibration are confirmed; reflective and invitation examples are still proposals, and the Korean interface voice isn't set. UI copy is terse; wordiness is the owner's biggest complaint.
- References the owner made binding: The Hideaway is the default for visual design and interaction (except anything used only on its /lostinseoul route). Commerce pages take their design from stripe.press. Arc UI supplies primitives and functional components such as forms, and never replaces a bespoke layout. The colours are on hold: keep the current ones. Motion is full motion, with no reduced-motion branches. Where any of these collides with Next.js or other official documentation, the code follows the documentation.

## Evidence on Hand

- Identity and voice: docs/design/identity.md, docs/design/brand-voice.md, docs/design/brand-voice-analysis.md (supporting only), and the About copy drafts in docs/reference/about-copy.* (see its handoff file: the quotation there is unverified).
- Provider marks: docs/design/provider-marks/.
- On-chain: the Signet lock is deployed on Polygon (docs/qa/auth-payment-nfc/consolidation.md).
- Absent, and must not be fabricated: testimonials, member stories, press, attendance figures, a gathering calendar or venue claims, and an approved visual identity beyond the commitments above.

## Product Principles

1. The people are the point. The design and copy make room for members and their pursuits, and Sophomores stays the host, not the subject.
2. Membership is something you hold. The book, the Signet key and the Ticket are real, owned objects; show them plainly and never as tokens or "coins".
3. Come back. Everything points to the next gathering and to returning, not to a one-time conversion.
4. Say what is happening. Practical messages state the actual state and the next step, with no invented feelings or promises.
5. The business edits its own content. Anything Sophomores supplies lives in Payload, so changing it never needs a code change.
