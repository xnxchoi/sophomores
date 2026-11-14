# 04 — Flow goals

Working draft · 2026-11-13 · Level 3 of the [commerce experience plan](README.md).
What each flow in [03](03-flows-and-scenarios.md) has to achieve for the person going
through it. The UX goals can be set now. The UI goals wait on the reference set
(level 4), so this document gives only their inputs.

## How goals are written

Each flow has a **goal** (what it is for), a **test** (how we check it) and a
**threshold** (what counts as passing). The criteria follow the standard usability
definition in ISO 9241-11: effectiveness (task success), efficiency (time and effort)
and satisfaction. Before launch there is no traffic to measure, so the tests are small
moderated sessions on real phones, plus scripted checks of the states in 03. Usage
metrics can be added after launch.

**Thresholds are proposals for the owner to set.** "Cold" means a participant who has
never seen the site. "Five of five" means each participant in a small moderated round.

## Goals that apply to every flow

| Goal | Test | Proposed threshold |
| --- | --- | --- |
| Every claim comes from an approved fact (`R-xx`); open questions stay visibly open | Review every visible string against the register | No string without a source or a marked open question |
| The customer always knows the state of their order, payment and token, and what happens next | On each screen in 03, ask "what happens next, and who does it?" | 5 of 5 answer correctly |
| Every refusal says why and what to do instead | Script each refusal state in 03 (A4, B3, C4, F2, D3 …) | Each names its reason and one next action |
| Statutory facts stay visible | PG-reviewer checklist from 02 on the product page | Every item found without opening anything collapsed |
| Phone first | Run every test below on a mid-range Android phone and an iPhone, in each language that has owner-approved copy | Passes on both phones |

## Goals for each flow

### A. Sale window and publication

- **Goal:** whatever the sale state, the page says so plainly and keeps what can still be
  read.
- **Test:** show each state in 03 A to a cold participant and to the PG checklist.
- **Threshold:** 5 of 5 can say whether they can buy now, from when, and what it is.
  A2 depends on R-G1.

### B. Evaluate and decide

- **Goal:** before price, the visitor understands what the object is, what the token
  means, what the launch evening includes, and that it's one per account.
- **Test:** cold participants read the page on a phone, then answer four questions
  without scrolling back.
- **Threshold:** 4 of 5 answer all four.

### B8. Leaving a messaging app's browser

- **Goal:** someone who opened the link inside KakaoTalk or Instagram reaches the phone's
  own browser with one action.
- **Test:** open the shared link from KakaoTalk, Instagram and SMS on both test phones.
- **Threshold:** one tap leaves the app wherever the app allows it. Where it doesn't,
  the fallback (copy the link) is clear enough that 5 of 5 succeed unaided.

### C. Buy: account, eligibility, agreement, address

*Parked with branches C and D (owner, 2026-11-14).*

- **Goal:** account entry feels like a step of buying, not a gate in front of it.
- **Test:** a cold participant goes from Buy to the PortOne window.
- **Threshold:** no lost input, no code sent without a button press (AGENTS.md purchase
  rules), and the Korea-only and one-per-account rules are seen before the address field.
  The PortOne window is the provider's own and is the one expected change of surface.
  Required and optional consents (C10) are shown separately, and 5 of 5 participants can
  say what they agreed to.

### D. Pay

*Parked with branches C and D (owner, 2026-11-14).*

- **Goal:** the customer is never unsure whether they've been charged.
- **Test:** script each outcome in 03 D (paid, closed, declined, unknown, duplicate
  confirmation) and ask the participant what has happened to their money.
- **Threshold:** 5 of 5 answer correctly for every outcome. An unknown result is never
  shown as failed or as paid.

### E. Receive and fulfil

- **Goal:** between paying and the box arriving, the customer can always find out where
  things stand.
- **Test:** from the order page, find the delivery state, the expected supply date and
  the support route.
- **Threshold:** each found in one step from the order page.

### F. Activate the buyer's own token

*Held with the token flows (owner, 2026-11-14).*

- **Goal:** the buyer goes from tap to holder in one sitting, and knows what they now
  hold. Someone with a coin that isn't theirs leaves without confusion.
- **Test:** buyers activate a delivered coin on a phone. Separately, a second participant
  taps someone else's coin.
- **Threshold:** 5 of 5 buyers succeed in under 3 minutes, including sign-in. 5 of 5
  second participants can say the coin isn't theirs and how to get one. The flow depends
  on C-13.

### G. Attend

- **Goal:** arriving at the evening is quick for holders, and exceptions don't hold up
  the line.
- **Test:** a rehearsal with door staff and test holders, including G2–G4.
- **Threshold:** set once the check-in method (G1) is chosen; for example, under
  15 seconds per activated holder.

### H. Hold and return

*Held with the token flows (owner, 2026-11-14).*

- **Goal:** the holder can see what they hold, since when, and what it gives them now.
- **Test:** a holder finds their membership, starting from the coin and from the order
  page.
- **Threshold:** one step from either. If C-2 adds a place in the account, the test adds
  "from anywhere on the site, within two taps".

### I. Support, withdrawal, return and refund

- **Goal:** asking for help or undoing a purchase is as clear as buying was.
- **Test:** from the order page, find your rights and how to use them; compare the
  answer with the policy text.
- **Threshold:** found in one step; word-for-word consistent with the policy. Refund
  wording waits on R-C6.

### J. Revoke, dispute and abuse

*Held with the token flows (owner, 2026-11-14).*

- **Goal:** the outcome of a dispute or refund is predictable and stated in the policy.
- **Test:** legal and PG review of the C-14 outcome against the policy text.
- **Threshold:** no case in 03 J without a stated outcome.

### K. Account

- **Goal:** the customer understands that the account is where the membership lives.
- **Test:** a holder finds recovery and deletion, and says what deletion does to the
  token.
- **Threshold:** 5 of 5, with the deletion consequence shown before confirmation (C-10).

## UI goals: inputs for level 4

The visual direction is set at level 4, from live references. This section only sets
what that work starts from.

### The reference set (to be captured live)

| Reference | Role, as the owner has described it | State |
| --- | --- | --- |
| **oflyn.fr** | Source of the site's current look | Owner-stated. Not yet captured or recorded in the repo |
| **osklen.com.br** | To be fused with the current look | Owner-stated. Not yet captured |
| One or two more | To follow | Waiting on the owner |
| Analogue, Má | Selected as reference mechanics in the [integration spec](../integration-specification.md) §3 | Recorded. Relationship to the new set is C-11 |

Nothing here describes how these sites look or behave. That comes from live captures
at level 4, as the project requires before any redesign.

### How the moodboard will be built

- **One board per flow group,** not one for the whole site: product and story (A, B);
  checkout and payment (C, D); order and activation (E, F, H); support and policies
  (I, K).
- **For each reference, separate mechanics from look.** Mechanics (layout rhythm,
  navigation, how a product page orders its information, how checkout steps behave) can
  be learned. Look (type, colour, imagery) is a fusion decision. Neither is copied.
- **Each capture records what it is evidence of,** at what viewport and on what date.
  Captures are comparison material, not assets.

### Constraints any direction keeps

- **Brand:** account entry and verification stay neutral monochrome; brand marks use
  the existing `BrandMark` with Helvetica (AGENTS.md).
- **Evidence:** real product photographs are the primary images (product spec, 04).
- **Engineering constraints** (they don't shape the look, but limit how it's built):
  Tailwind only, full motion by default, touch targets at least 44 px and preferably
  48 px.

## Decisions for review

**C-11 · How the new references relate to Analogue and Má.**
- (a) They replace them.
- (b) They sit alongside them.
- (c) They replace the look, and Analogue's and Má's mechanics stay.

*Recommendation:* (c). It keeps the pacing work already done and lets the fusion decide
the look. *Blocks:* level 4, and whether product-sales-page 04–06 are rewritten or
adjusted.

**C-12 · The weight of the current oflyn-derived look.**
- (a) It's the base, and the others adjust it.
- (b) All references are weighed equally.

*Recommendation:* (a), since it's already live and recognisable. *Blocks:* level 4.
