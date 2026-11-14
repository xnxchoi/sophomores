# Handoff: read this first

This file is the entry point for any new session. Read it before the rest of the folder.

## Current state (2026-11-14)

**Status of everything above this section: provisional.** The palette directions, the canvas boards (Directions, Greens, GreenTests, HeroOnly) and the design brief were drafted before level 4 was settled. None is decided. The owner has not approved any of them as a final direction.

**Settled by the owner so far:**
- Deep green is the signature colour. Alternatives (proof green, cool teal, lifted greens) were rejected.
- Brutalist is the structural reference, not a literal style. Type scale stays quiet. No oversized titles.
- The hero can be a full-width deep green block. The site should not be insulated from the hero.
- Typography and the header come from the Hideaway system. Confirm whether that replaces Narcissian Nectare.
- Commerce information is in design scope: how price, specs and availability are presented is designed now. Only the data sources and their wiring are later.
- The story should carry the purchase.
- Visuals lead, at least partly.

**Rejected (owner's words):** the near-black green as the signature ("just plain black looks better").

**Owner on the insulated hero (quoted):** "it works if we're going to make this a completely insulated space from the rest. I don't want to do that." Then, on a constant-header fix I proposed: "fucking don't do that. We need to find a better way to ... match the things that I like about this brutalist thing with the rest of the fucking site."

**My inference, not the owner's words:** a header that changes colour per section would make the hero insulated. The owner has not ruled on header colour behaviour directly.

**Open conflict, not settled:** the owner said the glass-style header does not fit the brutal hero, and also that the Hideaway header is already there and transfers. The Hideaway header (`src/hideaway/components/Shells/Header/HeaderClient.tsx`) uses backdrop blur. Whether the header keeps its blur or goes flat is an open owner decision.

**Owner decisions, later the same day (2026-11-14):**
- **Structure now, style and interaction later.** A page has content and structure, styling,
  and interactions. Create the routes and files now, structure only. How a page behaves (checkout is the
  example) is business logic, not design. Styling and interactions wait for level 4. This overrides
  "do not design UI before level 4" only for structure. 03c's build-order line changes in the live doc.
- **oflyn.fr is out** (kept for lostinseoul). The README is updated.
- **Reference list:** the owner will send it. Research follows it. Do not research or propose before it arrives.
- **Single-purchase rule:** apply it, but as a handoff, not as design work. See
  [handoff-single-purchase-rule.md](handoff-single-purchase-rule.md).
- **Independent review of 01–04, 03b and 03c:** held. Nothing is scheduled.

**Scaffolded (structure only; not styled; not reviewed in a browser; not committed):** `/shop/cart`,
`/shop/checkout` (stub), `/me`, `/me/orders`, `/me/orders/[id]`, `/me/settings/addresses` (empty,
pending C-20), `/me/settings/notifications`, `/help`, `/help/shipping`, `/team`. Each shows a heading
only, through `PageFrame` (`src/components/commerce/page-frame.tsx`). The `/me` pages redirect signed-out
visitors to `/account`. Headings are placeholder labels, not approved copy; `messages/ko.json` has `""`
for every new key. Not touched: `/shop`, `/shop/orders/[id]`, `/shop/payment`, `/tickets*`, the header,
the footer, the cart drawer and the settings rail (the two new settings routes are not in it yet).
Checked: guarded typecheck and the i18n tests passed. No dev server or live render has been run.

**Design reset, step 1 (owner, 2026-11-14):** the owner asked to reset and redefine the whole site's
direction from the sites they gravitate to: metalab, lamalama, tux.co, blink.capital, analogueagency.com,
mcalpinehouse.com, osklen.com.br, mersi-architecture.com. More may follow, some direct, some conceptual.
The parts the owner directed stay; details such as colour, size, weight and radius may be refined.
Captured live and distilled in [04c-direction.md](04c-direction.md) (live doc tab "4c · Direction
(reset)"). All nine questions are answered (doc comments 2026-11-14, chat 2026-11-15): large type is
welcome; header keeps its blur; dark and light modes site-wide, dark by default; Narcissian Nectare
stays, normal or light weight; no fixed animation durations (reasonable, each tuned individually;
Hideaway's page change models the character, not a number); Osklen leads the
e-commerce pages, look included; Mersi is the one conceptual reference; uppercase sans labels with mono
and serif used selectively; the 4b references keep their jobs. Motion captured 2026-11-15 (all eight plus
Hideaway from code): see 04c, "Motion", and [04c-site-records/motion/](04c-site-records/motion/).

These answers supersede the "Settled" list above where they differ: "no oversized titles" no longer
holds, and the header blur is decided. Page width has no rule: narrow or wide, whatever looks good.

**Not yet done:** the reference list (owner to send). Level 3 UX is in draft. Level 4 waits on the references. Level 5 page specs follow.

**Plan order (from `README.md`):** finish level 3 UX, then level 4 references, then level 5 page specifications. Do not design UI before level 4 settles.

**Delivery** stays under `docs/reference/commerce-launch-plan.md` and the To-Do registry. The cart and page build was paused, not finished.

**Canvas** (published, private): https://claude.ai/artifact/8m5r912PLWXrq75kENj36C. Files live in `/private/tmp/claude-501/-Users-seanschoi-orca-workspaces-sphmrs-hamlet/19c56513-df79-4627-ab2e-59acb5e8a600/scratchpad/canvas/project/`, which a reboot can clear.
