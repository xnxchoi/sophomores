# 03 — Copy

Working draft · 2026-11-13 · **Draft copy, not approved and not installed.** No edit to
`messages/en.json`, `messages/ko.json` or Payload. Part of [the product sales page plan](README.md).

Inputs: [01](01-product-definition.md), [02](02-requisite-information.md),
[identity](../../design/identity.md), [voice guide](../../design/brand-voice.md),
`/ux-writing`. English only; Korean waits for decision P7.

## Conventions used in this draft

- `[token]` and `[holder]` stand for names still open under P1. "Coin" is used as a
  generic noun until P1 names the object.
- `[activate]` stands for the verb open under P2, in the forms `[activate]`,
  `[activated]`, `[activates]` and `[activation]`. The chosen verb must supply all
  four forms. **"Verify" cannot be the verb**, because the same sentences already
  ask people to verify their email and phone.
- `{token}`, `{event}`, `{email}` are runtime variables in interface strings.
- `{R-xx}` is a fact from the [requisites register](02-requisite-information.md),
  rendered from approved content. Copy never restates it as a literal.
- **HOLD** marks a sentence that cannot be written until a decision or check exists.
  It is a gap, not a placeholder to fill with a plausible guess.

## A. General product page: interface strings

These belong in `messages/en.json` under `Customer.components_commerce_offer`, with
matching `ko.json` keys set to `""` in the same commit. They must work for any later
release and token type, and for a visitor whose holder status is unknown.

### Replacements for strings that contradict the product

| Key | Current | Proposed | Why |
| --- | --- | --- | --- |
| `admissionIncludesEvent` | One coin includes one admission to {event}. | Each coin carries one {token}. Once it's [activated], the {token} admits its [holder] to {event}. | The activated token admits its holder, not the coin or the buyer |
| `admission` (label) | Admission | Event access | Plain row label |
| `physicalCollectible` (eyebrow) | Physical collectible | Physical collectible | Unchanged: accurate and PG-relevant |

The two `components_commerce_order_admissions` strings quoted in step 1 are retired
by the owner's decisions. Their replacements are order-page copy and belong to
T003/T013, not this page.

### New strings

| Proposed key | English | Shown when |
| --- | --- | --- |
| `whatsIncluded` | What's included | Heading over the box contents and token rows |
| `productDetails` | Product details | Heading over material, size and weight (R-A2) |
| `productInformation` | Product information | Heading for the statutory notice (R-B3) |
| `tokenRule` | Each account can hold one {token}. Once it's [activated], it stays with the account that [activated] it and can't be passed on. | Under the token row |
| `noDeadline` | **HOLD** (R-C5). Candidate: "There's no deadline to [activate] it." Blocked while events still require `claimCutoffAt` | Under the token row |
| `giftRule` | If you don't hold a {token} yet, the first coin you buy is yours. Any others are gifts: whoever [activates] one first becomes its [holder]. | Default, including signed-out visitors |
| `giftRuleHolder` | You already hold a {token}, so every coin you buy is a gift. Whoever [activates] one first becomes its [holder]. | Signed-in launch-token holder only; replaces `giftRule` |
| `keepLinkSafe` | Give the coin only to the person you mean it for. | Directly after either gift rule. "Or its link" is added only once R-E11/P4 say where the buyer finds the link |
| `questions` | Questions before you buy? Email {email}. | Above seller information; `{email}` from approved disclosure |

`giftRuleHolder` uses only the signed-in visitor's own status. It must not reveal
anything about a link or another account (T005 C13 boundary). If T003 owns the
signed-in purchase panel, both gift strings move there.

## B. Launch sales content (Payload-owned)

Written as one continuous page, in the order proposed under P3 (object first).
Headings are working; body copy is the candidate.

### 1. Opening

**{R-A1 product name}**

A {R-A2 material/finish} coin, shipped to you. It carries a Sophomores [token]: a
membership that isn't tied to one event and lasts after it. Holding it gets you
into the launch evening on {R-D2 date}.

### 2. The coin

{R-A2: diameter, thickness, weight, finish}. {R-A3: what comes in the box}.
{R-A4: edition statement, only if the owner supplies one}.

**HOLD**, with the door paragraph in section 4: "Once its [token] is [activated], you
don't need to bring the coin to the evening." This is true only if check-in uses the
account-bound credential and never the coin.

### 3. What holding it means

Sophomores is for people building lives of their own, and means to keep bringing
them together. The [token] is a Sophomores membership. It isn't tied to one event,
and it lasts after the launch evening.

When you [activate] it, it's bound to your Sophomores account, and it can't be
passed on afterwards. Each gathering will say which token it asks for. The launch
evening asks for this one. For now, it's the one thing the [token] is confirmed for.

{R-C3: anything a [holder] receives beyond events. HOLD: nothing is listed until the
owner names it. When something is named, the "for now" sentence changes with it.}

{R-C7: one plain sentence on the token's on-chain record, if P6 calls for it. HOLD.}

### 4. The launch evening

Holding the [token] gets you into the launch evening. There's nothing else to buy.
{R-D2 date and times}.

Part I comes with {R-D4: drinks per [holder]}. Afterwards we go on to Part II
together, with {R-D4: shared transport between the two} included. {R-D3: venues, or
when they will be shared}.

{R-D6: what the evening is. HOLD. Identity says formats are still being developed,
so this paragraph waits for real programme facts rather than describing a mood.}

{R-B9: age requirement for the drinks. HOLD until owner and legal answer.}

{How [holders] who have already [activated] check in on arrival. HOLD: redemption and
check-in still need acceptance.}

**HOLD**: "If you haven't [activated] your [token] by the time you arrive, you can do
it at the door. Staff will help." Activating on arrival with staff help is the
owner's decision, but two things are open: how staff confirm it is the guest's own
account, and the Unlock auth hold, where a 48-hour step-up wait would stop a new
guest activating at the door. The paragraph ships only once both are resolved.

### 5. Buying for someone else

If you don't hold a [token] yet, your first coin is yours. Every other coin you buy
is a gift, and if you already hold one, they all are.

A gift has no name on it. Whoever [activates] it first becomes its [holder], so give
it only to the person you mean it for. {R-E11: "or send its link", once P4 settles
where the link is.}

**HOLD** (R-C5): "A coin can still be [activated] after the evening, and its [token]
lasts. If you want someone there, give it to them before {R-D2 date}."

Someone who already holds a [token] can't [activate] another. If they open a coin
you've given them, it stays as it is, ready for someone who doesn't.

{R-E3: allowance per account for this release.}

### 6. Delivery and [activation]

We ship within South Korea. {R-B5: courier, fee per order, dispatch schedule}.

When it arrives, {R-E11: tap the coin with your phone | scan the card in the box} to
open its page. Sign in or create an account, verify your email and phone if you
haven't, then [activate] it.

{R-E8: if the owner wants it on the page: "If you lose the link before it's
[activated], you can generate a new one from your order." HOLD: the buyer-side
regeneration screen does not exist yet.}

### 7. Before you buy

The fact panel renders from approved content (price R-E1, fee R-B5, sale window R-E2,
allowance R-E3). One sentence of copy sits with it:

{R-C6 refunds: HOLD. "Coins whose [token] hasn't been [activated] can't be refunded"
is the owner's rule, but it meets the statutory withdrawal right for goods and the
PG's terms. No refund sentence appears anywhere until that check is done.}

## C. Gaps this copy does not fill

| Gap | Owner |
| --- | --- |
| Names and verb (P1, P2) | Owner |
| Holder benefits beyond events (R-C3) | Owner |
| Evening format, venue, age, check-in (R-D3, R-D6, R-B9) | Owner, legal, T002 |
| No-deadline wording (R-C5) | T002 reconciliation of `claimCutoffAt` |
| Refund sentence (R-C6) | Legal/PG, then owner |
| Where the buyer finds a coin's link (R-E11) | P4, T003/T013 |
| Buyer link regeneration screen (R-E8) | T002/T010 |
| Door activation wording (R-D7) | Unlock auth hold, staff-consent design |
| Statutory product information table (R-B3) | Legal/PG supplies items; copy is labels only |
| Korean for all of the above (P7) | Owner |
| Purchase panel, order page and activation page copy | T003, T013 |

## Voice notes for review

- The opening leads with the physical object and its plain use. No scarcity,
  selectivity or "exclusive" language: identity does not support it, and there is no
  edition fact.
- No line gives the buyer an identity, a product intent nobody has stated, or a
  punchline in place of a fact a gift buyer needs.
- "For now, it's the one thing the [token] is confirmed for" keeps the benefit
  truthful while R-C3 is empty.
- `we` is the host speaking (shipping, going on to Part II together), consistent with
  the voice guide.
