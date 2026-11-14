# 04b — References

Working draft · 2026-11-14 · Level 4 of the [commerce experience plan](README.md).
The live doc's "4b · References" tab is canonical. It holds the full description of each
reference and the capture boards; this file keeps the reference list, the key
measurements, the proposed direction and the open questions. Captures are comparison
material, not assets.

Each reference has one job, in the owner's words (2026-11-14). oflyn.fr is out: the owner
is keeping it for the lostinseoul project. The product is now a book.

## The references

| Reference | Scope | Its job |
| --- | --- | --- |
| [metalab.com](https://metalab.com/) | Home | A major inspiration overall |
| [tux.co/en/people](https://tux.co/en/people/) | That page only | Becomes our Teams page, built with the Hideaway's Credits component |
| [osklen.com.br](https://www.osklen.com.br/) | Home | An elegant composition that still feels like a regular e-commerce site |
| [Stripe Press, Maintenance Part One](https://press.stripe.com/maintenance-part-one) | That page only | The book's 3D render, and the book page |
| [normalphenomena.life](https://normalphenomena.life/) | Home | The palette, the logo animation during navigation and transitions, the general approach, the prose tone, the extreme editorial style |
| [normalphenomena.life/about](https://normalphenomena.life/about/) | That page only | The manifesto layout, and everything else on it |
| [A Normal Phenomena post](https://normalphenomena.life/editorial/beyond-better-tools-reframing-biotechnology-at-asilomar-with-anton-jackson-smith-and-gabrielle-lamb/) | That page only | A stylish, readable post layout, and the loading fade's timing and effect |
| [lamalama.com](https://lamalama.com/) | Home, with navigation | The top panel, its fold and unfold, the interactivity, snappy loading and feel, and the witty remarks that change with navigation |
| [moto-card.com](https://www.moto-card.com/) | That page only | The scroll sequence and the card render |
| [Aurora members login](https://joinaurora.co/members/login) | That page only | The simplicity and elegance of a single-input page |

## Key measurements (captured 2026-11-14)

- **Normal Phenomena:**
  - **Palette and type:**
    - ground `#191919`, text white at 80%, one neon-green marker (`#00FF2C`);
    - posts flip to white;
    - Univers, almost all Bold.
  - **Page change:**
    - a persistent logo;
    - the old page fades out over 1.3 s linear under an 8 px blur;
    - colours cross-fade over 1.3 s `power2.inOut`;
    - the new page fades in over 2 s linear after 100 ms;
    - about 5–6 s from click to settled.
  - **About:** the manifesto is a stepped poem on a nested 6-column grid with 58 px indent steps.
  - **Post:** body 19/22 px at about 62–68 characters a line, in the right half; titles 104 px uppercase.
- **lamalama:**
  - **Top panel:** a 438 × 50 px glass bar that unfolds downward in 0.45 s `expo.out`. It is 90% open at 160 ms, and its rows follow 50 ms apart.
  - **Remarks:** each page section has a pool of remarks, and one is picked at random when the section enters view. It changes with a character scramble of about 0.45 s.
  - **Page change:** a pixel-grid wipe, about 2 s from click to usable.
- **moto-card:**
  - **Render:** a three.js model with a matcap and planar-reflection shader, inside a blurred cylinder of image tiles.
  - **Scroll sequence:**
    - it is pinned over about 1,530 px of scroll;
    - the card makes one and a half turns and rises, settling by 70%;
    - the heading then blurs in;
    - a 1 s scrub lag smooths it.
- **Metalab:**
  - **Home:** one screen, with no scroll on desktop. Hovering a client pill swaps the whole hero.
  - **Cursor:** a custom cursor, a dot that becomes a violet ring.
  - **Menu:** it opens framed by panels that slide in from the edges.
  - **Type and colour:** PP Eiko 88/240 with Basis Grotesque; accent `#584dff`; 200 ms hovers.
- **TUX People:**
  - **Roll:** a self-scrolling two-column credits roll at about 83 px/s, looping. The wheel speeds it up.
  - **Hover:** stops the roll over 0.8 s and instantly shows a photo card and a blurred photo background.
  - **Phone:** a full-screen swipe carousel.
  - **Our Credits component:** the Hideaway's Credits component (`src/hideaway/components/sections/Credits/`) uses the same structure and names:
    - `.equipe` and `.fondFlou`;
    - the two columns;
    - the birthday confetti;
    - the phone carousel.

    It appears to be built from this page. Its 319-line Sass file must become Tailwind when it is reused.
- **Aurora:**
  - **Input:** one 448 × 50 px pill centred on black, with a 20%-white border over a 6% fill. Focus changes only the caret.
  - **No jumps:** a 56 px slot is reserved for the button, and the next step opens over 0.75 s.
- **Stripe Press:** a three.js book.
  - **Motion:** it leans at rest, tilts to the pointer and turns on drag.
  - **Highlight:** metallic, on the cover's printed lines only.
- **osklen home:**
  - floating controls over large imagery;
  - then a plain product rail, with name and price on one line.

**Not captured:**
- Normal Phenomena: the post past about 8,500 px.
- lamalama: a frame of the panel mid-close, the smooth-scroll feel, and the intro loader.
- Metalab: exact menu and page-change timings.
- Aurora: the button and the code step.
- Stripe: phone size.

## Proposed direction

| Our page or element | Taken from | What it takes |
| --- | --- | --- |
| Site-wide look | Normal Phenomena home | Near-black ground, text at 80% white, almost no colour, one typeface weight doing most of the work, text printed straight over photographs, the prose tone |
| Top bar and menu | lamalama | One small bar, top centre, holding our wordmark, a remark and the menu. It unfolds downward into the menu in under half a second, with rows rising 50 ms apart |
| Remarks | lamalama | A pool of short lines per page section, picked at random as each section comes into view, changed with a quick character scramble. Written in our own voice |
| Page changes | Normal Phenomena home | The wordmark stays put and carries the transition: the page fades, the site's colours cross-fade to the next page's, the new page fades in |
| Shop home | osklen home | An elegant composition that still reads as a shop: large imagery, then a plain rail of products with name and price on one line |
| Overall interaction | Metalab | A list that drives the hero on hover, and a custom cursor that changes over links, media and draggable things |
| Book page | Stripe Press | The book as a live 3D object that leans, tilts to the pointer and turns on drag, with a metallic highlight on its printed lines; and the book page around it |
| The book on scroll | moto-card | A pinned scroll sequence: the book rises and turns, settles by about 70% of the scroll, then its heading blurs in to sharp |
| About and manifesto | Normal Phenomena About | The manifesto set as a stepped poem on a fine grid, rhythm from position alone |
| Journal posts | Normal Phenomena post | A huge staggered title, a standfirst, a body column in the right half at about 65 characters a line, quotes across the full width, and the 2 s fade-in on arrival |
| Teams | TUX People, through the Credits component | The self-scrolling credits roll, the photo and blurred background on hover, the phone carousel |
| Single-input pages | Aurora login | One pill input, centred on black, with space kept for the button so nothing jumps |

## Questions that decide the rest

1. **Speed:** Normal Phenomena takes about 5–6 s from click to settled; lamalama takes about 2 s.
   - Proposal: Normal Phenomena's choreography at lamalama's pace, about 1 s in all.
2. **Animating the wordmark:** AGENTS.md keeps the wordmark identical everywhere.
   - Proposal: it moves and fades as a whole, and its shape and type never change.
3. **Colour by page:** dark everywhere, or light for journal posts?
4. **Type:** which approach, alongside Helvetica for the wordmark?
   - Metalab: a thin serif with a grotesque;
   - Normal Phenomena: one Bold grotesque;
   - lamalama: monospace labels.
5. **Single-input pages:** which pages take Aurora's form?
   - Sign-in and verification keep their current behaviour and neutral monochrome styling (AGENTS.md).
6. **The book:** a 3D book needs the trim size, the spine width and the cover artwork, with the highlight lines on their own layer. Are the print files available?
7. **Custom cursor:** site-wide, or only on the book and Teams pages?

## Owner review, round 1 (2026-11-14)

The direction stands. Two tracks from here: visual exploration moves to mock-ups on a
design canvas; page building continues with plain styling, restyled once the direction
settles. The live doc holds the full round-1 section (palette tables, navigation sketch,
book concepts).

- **Palette:** must become a Sophomores palette. Keep Normal Phenomena's method (one dark
  ground, text at 80% opacity, one small accent), using our tokens. Option A: Ink
  `#0E1814` ground. Option B: Cypress `#1A362B` ground. Both use Vellum text, Verdigris
  for quiet text and Brass as the one accent. Open.
- **Navigation:** Metalab and lamalama combine. lamalama's bar is the container
  (rest → unfold → fold); Metalab's hover-swap happens inside it, and the remark answers
  the hovered row. Bag and account sit in the bar's last row. Mock-up next.
- **Book page:** agreed. **Book on scroll (moto-card):** maybe, open.
- **Wordmark:** Normal Phenomena's shifting mark is liked for its distinctness, not to
  copy. Ideas: the bar is the shape-shifter; the remark is the variable; the mark scales
  as a whole by page (needs the round-one wordmark answer).
- **Type:** a bold condensed serif, Narcissian Nectare (already in `fonts.ts`). Bold for
  nearly everything; long body text still to test.
- **Book:** no print files. Three concepts to react to: cloth and foil, vellum jacket,
  quiet cover with loud edges. A placeholder hardcover model unblocks the page.
- **Still open:** palette, book on scroll, book concept and length, and the round-one
  questions on speed, wordmark, light posts, single-input pages and cursor.

## Aesthetic assessment, round 2 (2026-11-14)

The owner is unsure flat design should define the site. Normal Phenomena is flat and
brutalist: bold, but short on precision, sensitivity and sleekness. Metalab sits between.
The launch teaser (the current home page) already carries [blink.capital](https://blink.capital)
and [analogueagency.com](https://analogueagency.com) in it, so both join this assessment.
Their existing analyses stand: the [integration specification](../integration-specification.md)
§3.1 and §3.4, and the [Blink motion fidelity audit](../../qa/blink-motion-fidelity-20261003.md).
This round reads the teaser from source; it was not re-rendered.

### What the teaser already is

- **Atmosphere from light:** a dark ground lit by a light field (the Warp rays, the glowing
  ring, the footer orb). Depth comes from light, not from shadows or stacked panels.
- **Surfaces:** notification cards (`#161616`, 8 px radius), neutral glass (`#F2F2F21A`),
  and teaser blue `#2C36CB` on the cards and the seller disclosure.
- **Type:** Helvetica Neue with uppercase mono labels: a system voice.
- **The wordmark:** `BrandMark`, uppercase, spread across the full width. Each letter moves
  and scales on its own as the page enters (`src/components/teaser/hero.tsx`).

### What each reference adds

- **Blink, precision:** a system typeface in uppercase, the spread wordmark, the
  notification card as a speaking voice. Scroll picks a step and a timed transition
  finishes it; the audit's top finding (F1) was the teaser scrubbing poses instead.
- **Analogue, the handoff:** full-bleed light becomes a rounded frame on off-white, then
  gives way to editorial text that greys in as it is read. A frosted pill bar sits on top.
  This is the bridge from an atmospheric page into a plain one.

### Four directions

| Direction | Depth comes from | Colour | Type | Risk |
| --- | --- | --- | --- | --- |
| Brutal | None; scale contrast only | One dark ground, no accent | One bold face, huge | Bold but blunt; reads as Normal Phenomena |
| Precise editorial | Only the bar and the book | Tonal Ink or Cypress, one accent | Condensed serif + tracked small labels, hairlines | Sleek, but can turn cool and quiet |
| Layered | Shadows, glass and stacked panels throughout | Several tones | Mixed | Generic product-site polish; breaks the AGENTS.md depth rule |
| **Lit (from the teaser)** | **Light: a field that persists behind the pages** | **Dark ground, light carries the colour** | **Condensed serif + the teaser's mono labels** | **Light fields cost GPU; must stay readable** |

**Recommendation: lit editorial.** Precise editorial pages, flat where they are meant to
be flat, with light as the one atmosphere. Boldness from Normal Phenomena's scale;
precision from Blink's system labels and hairlines; sleekness from the light and from
Analogue's handoff. Floating surfaces (the bar, cards, the book) keep restrained glass.

### Conflicts the teaser raises

1. **Is the teaser the seed of the site, or a separate launch moment?** This one answer
   sets the palette, the label type and where depth comes from.
   - *Seed (recommended):* the site grows out of the teaser. The light field is re-lit in
     our palette (brass and verdigris light on Ink) and teaser blue retires later. The
     teaser is not changed without the owner's approval.
   - *Separate:* the teaser keeps its blue; the site starts after an Analogue-style
     handoff into Ink and Vellum.
2. **The wordmark already moves.** Round one proposed that the mark only moves and fades
   as a whole. The teaser's `BrandMark` already spreads and gathers letter by letter, so
   Sophomores has its own dynamic mark: the distinctness the owner liked in Normal
   Phenomena, without copying it. Proposal: the mark spreads on arrival and gathers into
   the bar. There are now two forms of the mark (uppercase spread on the teaser,
   mixed case in the site header); the owner confirms which forms are approved.
3. **Book on scroll.** moto-card's sequence is scroll-scrubbed, which is exactly F1. If it
   is kept, it becomes step-triggered: scroll picks the next pose, a timed turn finishes it.
4. **Type.** The teaser's uppercase mono labels fill the small-label role beside
   Narcissian Nectare.
5. **The Analogue hero** is mandatory on some page (NAR-02); its placement stays open.
   The handoff is the natural bridge from the teaser into the book and the shop.

**Next:** the design canvas draws one screen four ways (brutal, precise editorial,
layered, lit).

### Owner response (2026-11-14)

The owner finds **brutal** the most pleasing of the four, and says none of the four is exactly what they want. What differs is not yet specified. Until it is, the brutal direction is the working base, and the other three stay as comparisons only. Still open: the seed-or-separate question, the wordmark forms, and book on scroll.

### Owner direction, book page (2026-11-14)

- **Layout:** follow the Stripe Press book page more closely. The book page fills the whole viewport, as the brutal board does.
- **Look:** flat brutalist as the base, with more references to be brought in before the detail is set.
- **Information:** the current board shows too little for a purchase. Price, specs and availability need their own places on the page.
- **Scarcity:** the owner means space, not edition. The page must show that places are limited (a quantity remaining or a capacity line), so the signal needs a defined source before it is built.
- **Status:** no new board yet. The owner is looking for more references to bring in.

## Palette round 2 (2026-11-14): modern, sharp, with academic heritage

The owner is not happy with the deep-green palette. It does not work with sharp, contrasting, minimalist type and layout. The brief: a more modern palette, mostly single colours, that still reads as institutional and in touch with academic heritage. The round-one palette is no longer a constraint; the palette is open again.

Three directions, with WCAG contrast checked for each text pair:

| Direction | Ground | Text | Single accent | Heritage cue | Contrast |
| --- | --- | --- | --- | --- | --- |
| **A · Library vermilion** | Ink `#101010` | Paper `#F2EFE8` | Vermilion `#E8452C` | Printer's red on a university press | Paper on ink 16.6:1; vermilion on ink 4.8:1 (text only at large sizes) |
| **B · Oxford gilt** | Oxford navy `#0B1F3F` | Paper `#F4F2EE` | Gilt `#D9A441` | Library cloth and gilt lettering | Paper on navy 14.7:1; gilt on navy 7.3:1; gilt on paper 2.0:1 (never as text on paper) |
| **C · Stark paper** | Paper `#F4F4F0` | Ink `#0B0B0B` | Cobalt `#1F4BFF` | Ruled proofs and index cards | Ink on paper 17.9:1; cobalt on paper 5.4:1 |

Notes:
- Each direction has one accent. Round one's oxblood, porphyry and terracotta are not used.
- **C is light.** It answers the open question of colour by page: it suits journal posts, and A or B would keep the site dark.
- The vermilion in A and the gilt in B are the only colours on the page. Brass moves to the book's foil only.
- Pairs under 4.5:1 are for graphics or large display type only. Small text must use the high-contrast pairs.

Open: which direction, or whether one page type (journal or book) takes a different ground.

### Owner correction on palette round 2 (2026-11-14)

- The three palette directions above are **withdrawn as proposals**. They were offered too quickly.
- The palette is **brand identity**, not a web style. Web use follows from it. It is not decided here.
- The website examples in the earlier review (Glossier, Allbirds, Dyson and similar) were too commercial and generalised. That criticism applies to the website examples, not to this palette research.
- Editorial palette references gathered so far (to study, not to adopt):
  - Penguin Modern Classics: a restrained grey, orange, black and white system with a type-led grid. Secondary sources only; verify on the source.
  - Faber Editions: a type-led cover system with a colour strip chosen from four predetermined colours, built on the heritage of the Faber paper-covered editions. Secondary source only.
  - Monocle: a serif wordmark and headlines from print, with a single bright promotional yellow.
  - University press cover round-ups (Spine magazine): muted grounds with one saturated or contrasting element, and small, quiet type.
- Discipline noted by one guide: no more than three main colours and two accents, each with a defined role.
- Paper matters: a palette must be proofed on cream and on white stock, since paper tone shifts colour.
- Status: palette open. Next step is a conversation with the owner on what the identity should say, before any swatch is proposed.

### Owner decision on signature green (2026-11-14)

- The owner tested three signature greens on the canvas (deep control, proof green, cool teal) and rejected the two alternatives. **Deep green stays the signature colour.**
- The open work is making deep green hold up with sharp, high-contrast type. Deep green is a block on paper, not text on ink. Its tonal range (lighter or cleaner variants of the same hue) is open.
- The light or dark ground question is still open.

## Handoff (2026-11-14): read this first in any new session

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

**Not yet done:** the reference list (owner to send). Level 3 UX is in draft. Level 4 waits on the references. Level 5 page specs follow.

**Plan order (from `README.md`):** finish level 3 UX, then level 4 references, then level 5 page specifications. Do not design UI before level 4 settles.

**Delivery** stays under `docs/reference/commerce-launch-plan.md` and the To-Do registry. The cart and page build was paused, not finished.

**Canvas** (published, private): https://claude.ai/artifact/8m5r912PLWXrq75kENj36C. Files live in `/private/tmp/claude-501/-Users-seanschoi-orca-workspaces-sphmrs-hamlet/19c56513-df79-4627-ab2e-59acb5e8a600/scratchpad/canvas/project/`, which a reboot can clear.
