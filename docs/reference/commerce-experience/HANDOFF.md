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

**Scaffolded (structure only; not styled; not reviewed in a browser; committed in `caa35df`):** `/shop/cart`,
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

**Design reset, step 2 (owner, 2026-11-15): started.** Organise the direction into a complete design
requirements document: every part of the site, what it comprises and what it must do. It is then specified in
small batches, each reviewed by the owner; a correction may reach wider than its batch.
[05-design-requirements.md](05-design-requirements.md) mirrors the live doc tab "5 · Design requirements".
Batch 1, the inventory (14 foundations, 9 shell parts, 15 components, 19 pages, 7 technical decisions), was
reviewed 2026-11-15 in doc comments: 4c accepted as the direction; reference patterns are "one way to do it",
not requirements, unless the owner made them one; technical decisions follow The Hideaway, checked against
its code (`~/WebstormProjects/thehideaway`) and recorded as ADRs 0002–0007. Dark until the visitor picks a mode (the device
setting doesn't count); forms use TanStack Form; icons
move to Phosphor. Batch 2 (colour, modes and tokens) is written and waits on the owner: structure only, no new
colours; preview at https://claude.ai/artifact/TKmmak4QRPsBrN5MAdTFZ2. Findings: the 167 files that use colour
read shadcn's names with stock values; the Sophomores palette is unused; deep green on The Hideaway's dark
ground is 1.33:1. The D2 boot-script change is ready but held until batch 2 is approved.

**Batch 2, owner answers (doc comments, 2026-11-15):** The Hideaway's colour variables are slots filled with
our own colours; Mersi's palettes are the basis, each checked before adoption; the dark-mode green question
is on hold until Mersi-based colours are seen in a real layout. Identity brief (owner's own edit in the doc):
the palette sits between LOSTINSEOUL and The Hideaway, with Restored Projects as the symbol and umbrella
philosophy; heritage in the atmosphere, never the foreground. (A comment reply said "between LOSTINSEOUL and
RP"; the owner's edit to the doc text supersedes it.) Mersi's palette was captured (16 colours, in
[04c-site-records/mersi.md](04c-site-records/mersi.md) and the 05 tab), and the preview now shows it on a
sample shop screen in both modes. Waiting on the owner: keep, change or drop each colour.

**Overnight (2026-11-15, owner asleep), done:**
- Batch 3 (type) drafted for review in the 05 tab; evidence in [05-evidence/type-setups.md](05-evidence/type-setups.md).
  Key finding: this site's font tokens point at nothing, so the rendered face depends on bundler order.
- Cursors captured for F13: [04c-site-records/cursors.md](04c-site-records/cursors.md), with screenshots.
- D2 (dark by default) planned through `orch-change-feature` to Gate 1, not implemented:
  [05-evidence/d2-dark-default-plan.md](05-evidence/d2-dark-default-plan.md). Three theme initialisers and three
  storage keys; needs owner approval of the plan.
- Code work goes through `orch-add-feature` / `orch-change-feature` (owner, 2026-11-15).

**Batches 2 and 3, owner answers (2026-11-15):** the Mersi-based colour set is accepted, and deep green stays,
tuned to Mersi's green: #1A362B becomes #213627 (same lightness, Maurice Cafe's hue and chroma), with
Maurice Cafe #657B69 as the proposed dark-mode step. Type: root stays 16px (only MetaLab fixes 10px; Mersi and
McAlpine scale theirs with window width, five keep 16px); mono is The Hideaway's Geist Mono; Narcissian
Nectare at its normal weight; Blase and The Hideaway's other faces come over; H-A stays as the Korean face
(recorded in [ADR-0008](../../adr/0008-type-setup-follows-the-hideaway.md)). Still open: the dark-mode green
(proposal above), the D1 token structure, whether the root scales with the window, and each brought-over
face's role. Batch 4 not started.

**Waiting on the owner:** the dark-mode green and D1 (token structure), the fluid-root question, and
D2 Gate 1. Technical decisions become ADRs once decided, in [docs/adr/](../../adr/README.md) (created
2026-11-15 with the owner's consent). Scope stays at the commerce pages plus the shared foundations and
shell: they're all the site will hold for now. The reset refines the direction; it doesn't discard what the
owner directed. Also 2026-11-15: oflyn and C-12 removed from 04's flow goals, and
the "1–3 s" framing taken out of 04c's synthesis (kept only as measured evidence).

**Plan order (from `README.md`):** level 3 UX is in draft; level 4 is settled in 04c; level 5 is the
design requirements, then the page specifications.

**Delivery** stays under `docs/reference/commerce-launch-plan.md` and the To-Do registry. The cart and page build was paused, not finished.

**Canvas** (published, private): https://claude.ai/artifact/8m5r912PLWXrq75kENj36C. Files live in `/private/tmp/claude-501/-Users-seanschoi-orca-workspaces-sphmrs-hamlet/19c56513-df79-4627-ab2e-59acb5e8a600/scratchpad/canvas/project/`, which a reboot can clear.
