# 04c — Direction: reset and redefine

Working draft · 2026-11-14 · Level 4 of the [commerce experience plan](README.md).
Mirrors the live doc's "4c · Direction (reset)" tab and its "Site records" sub-tab; edits made
there are canonical. Full per-site records: [04c-site-records/](04c-site-records/), captured
against [the framework](04c-site-records/FRAMEWORK.md). Once accepted, this replaces 04b's
"Proposed direction"; 04b stays as the record.

Step 1 of the reset (owner, 2026-11-14): distil the direction from the sites the owner gravitates to.

**The vision: an edge-to-edge canvas where the work carries the colour, and the interface is one
small floating object that stays while pages change around it.** Each page spends its loudness
once: a very large line of type, a full-bleed block, a change of scene. Everything else is quiet,
set in small labels.

Eleven traits appear on at least five of the eight sites. Analogue and TUX show all eleven.
Osklen, the only shop, shows seven: it is a strong reference, look included, but only for the
e-commerce parts (question 5).

## Method

Each site is read on the five planes of Jesse James Garrett's *The Elements of User Experience*
(2002), plus motion and voice: strategy and scope (inferred), structure, skeleton, surface,
motion, voice.

- Captured live in Orca's browser on 2026-11-14 at 1440 × 900 and 390 × 844. Numbers are marked
  measured or estimated in the records.
- Scope: each home page, plus the menu and one page change.
- Mechanics and look are kept apart.
- **Shared means at least five of the eight sites.** Three or four is a strand; one or two is a
  signature. Supplements to the list slot into the same matrix.
- Not on this list, but still references: Normal Phenomena, Stripe Press, moto-card and Aurora
  keep their 4b jobs under the reset (owner, question 9). oflyn.fr is out (kept for lostinseoul).
- Limits: hover never registered on Analogue, McAlpine, Osklen or Mersi; two menus didn't open;
  JavaScript-driven timings ran in a background tab and are estimates.

## The eight sites at a glance

✓ shows it · ~ partly · – does not.

| Trait | Metalab | lamalama | TUX | Blink | Analogue | McAlpine | Osklen | Mersi | Sites |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Small persistent chrome floating over the page, never a solid header bar | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| Thin outer margins (0–40 px); no narrow max-width container | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| Two type voices: display 56–223 px against labels 7–14 px | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ | 7 |
| Terse copy: a few words per screen | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 8 |
| Interface black, white or grey plus at most one accent; colour comes from the work | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | 7 |
| Glass only on the floating layer | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | 7 |
| No drop shadows | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | 7 |
| The home page is the work (an index, a reel, a rail) | ✓ | ✓ | ✓ | – | ✓ | ✓ | ✓ | ✓ | 7 |
| Page change is a 1–3 s scene; the chrome stays | ✓ | ✓ | ✓ | – | ✓ | ✓ | – | ✓ | 6 |
| First screen asks for nothing: no button, no form | ~ | – | ✓ | ✓ | ✓ | ✓ | – | ✓ | 5 |
| Small labels in uppercase | – | ✓ | ✓ | ✓ | ✓ | – | – | ✓ | 5 |
| **Core traits shown (of 11)** | **9** | **10** | **11** | **8** | **11** | **10** | **7** | **9** | |

**Strands** (three or four sites):

| Strand | Sites |
| --- | --- |
| Dark ground / light ground | Metalab, lamalama, TUX, Blink / Analogue, McAlpine, Osklen, Mersi: an even split |
| Type moves letter by letter or word by word | lamalama, TUX, Blink, Analogue (Mersi inferred) |
| One object per screen, most of it empty | Metalab, Blink, McAlpine, Mersi (Analogue partly) |
| A mono or technical face for labels | lamalama, TUX, Blink, Analogue (LCD dot face) |
| The menu grows out of the nav object | lamalama, Blink, Analogue, Osklen |
| A serif at display size, in light weights | Metalab (240), McAlpine (250), Blink (regular, headings only) |
| An abstract atmosphere in the hero | lamalama, Blink, Analogue, McAlpine |
| A device voice in the chrome: clock, notification, app badge, command bar | Metalab, lamalama, Blink, Analogue |
| Colour belongs to the item | Metalab (on hover), Analogue, Mersi |
| Lenis smooth scroll | Metalab, Blink, Analogue, McAlpine |

## What they share

The shared ground is mostly **mechanics**: how the chrome, the canvas and time behave. The **look**
(ground colour, typeface, display weight) is where the sites part, so it stays a decision.

### Mechanics

- **The chrome is one small object, and it stays.** A 438 × 50 bar (lamalama), a 470 × 53 pill
  (Analogue), a 532 × 33 tab bar (Blink), a 41 px monogram and a burger (McAlpine), 28 px capsules
  (Osklen). No site uses a full-width solid header.
- **The canvas runs to the edges; no page sits in a narrow max-width container.** Outer margins: 0 (Mersi), 12 (Blink), 15 (TUX), 20 (Analogue,
  McAlpine), 24 (Metalab), 30 (Osklen), 40 px (lamalama).
- **The home page is the work.** A client index (Metalab), a word index (McAlpine), a project reel
  (Mersi), case films (TUX), a case list (Analogue, lamalama), a product rail (Osklen). Blink is
  the exception.
- **A page change is a scene, not a reload.** About 1–3 s: lamalama ≈ 2 s (pixel wipe), TUX ≈ 2.8 s,
  McAlpine ≈ 2.3 s, Mersi ≈ 1 s, Analogue's wash to white plus 1.4 s entrances. The chrome never
  leaves. Osklen reloads; Blink has one page.
- **The first screen asks for nothing** at TUX, Blink, Analogue, McAlpine and Mersi.

### Look

- **Two type voices and nothing between them.** Display 56–223 px at seven sites (Mersi's home page
  tops out at a 21 px project name), labels 7–14 px; ratios from 5× (Blink) to 16× (TUX).
- **Hierarchy comes from size, not from boxes.** Seven of eight have no drop shadows.
- **Glass belongs to the floating layer:** 4 px (lamalama) to 50 px (McAlpine's menu). Mersi is
  flat, with film grain.
- **The interface is almost colourless,** with one accent at most: Metalab's violet `#584dff`,
  TUX's green `#17e013`. Blink partly differs.
- **Small labels speak in capitals** at five sites: mono (lamalama, TUX, Blink), LCD dot
  (Analogue), a 7.2 px wide grotesque (Mersi).
- **The words are few.**

## The philosophy

Inferred from what the sites do, not stated by them.

1. **The work is the interface.** The chrome recedes; the content carries colour and image. *(Seven; not Blink.)*
2. **Navigation is an object, not a bar.** It floats, stays, and sometimes changes shape. *(All eight.)*
3. **Quiet everywhere, loud once.** Each site saves its volume for one gesture. *(All eight.)*
4. **Scale, not ornament.** Hierarchy from the gap between very large and very small type. *(Seven, with Mersi partly.)*
5. **Time is a material.** A page change is a 1–3 s scene the persistent object carries across. *(Six.)*

## How closely each site aligns

| Site | Core traits | Closest to the core in | Furthest from it in |
| --- | --- | --- | --- |
| Analogue | 11 | The morphing pill; light field to frame to plain text | — |
| TUX | 11 | Mono labels against 223 px display; the one green block | A dense news grid |
| lamalama | 10 | Bar unfolds into the menu; bracketed mono labels | Asks for contact in the first screen |
| McAlpine | 10 | An index of words; a 2.3 s page change | Labels in sentence case |
| Metalab | 9 | Hover replaces the screen; one violet accent | Labels in sentence case |
| Mersi | 9 | The home page is a reel of the work; 7.2 px labels | No glass; its home-page type stays small |
| Blink | 8 | The notification as voice; the logo spread to full width | One page, no page change |
| Osklen | 7 | Glass capsules over large images; name and price on one line | Shadows, reloads, a shop's asks |

## Against what is already settled

Most of what is settled fits the shared ground. Nothing conflicts with it any more. The items that
were open are now settled: header blur, Narcissian Nectare, no fixed animation durations, a dark and a
light mode, and no rule on page width (narrow or wide, whatever looks good). The work the owner directed stays; only details such as
colour, size, weight and radius move.

| Already settled or built | What the eight sites show | Fit |
| --- | --- | --- |
| Deep green is the signature colour | One accent at most; TUX spends its one colour as full-bleed blocks for loud moments | Fits, as a block for the loud moment |
| Full-width deep green hero; site not insulated | All eight keep the same chrome on every page | Fits; the floating object is the bridge |
| Brutalist as structure | Thin outer margins, no shadows, flat surfaces | Fits |
| Type scale stays quiet, no oversized titles (as the handoff notes record it) | Seven of eight set display at 56–223 px; Metalab and McAlpine keep it quiet through light weights; Mersi keeps its home-page type small | **Fits:** large type is welcome; the note was a reaction to one mockup (owner, question 1) |
| Header: blur | Seven of eight put glass on the floating chrome only. The Hideaway header (read from source, not rendered) is a full-width rounded bar whose 20 px blur and tint start invisible and fade in | **Settled: blur** (owner, question 3), as seven of the eight do |
| Hideaway type vs Narcissian Nectare | Light serifs, a condensed grotesque, bold or medium grotesques; no bold condensed serif | **Settled: Narcissian Nectare stays, in normal or light weight** (owner, question 6), like Metalab and McAlpine |
| `BrandMark` spread on the teaser | Blink spreads its logo across the full width, then docks it | Fits |
| The teaser's mono labels | Mono at lamalama, TUX, Blink; uppercase labels at five | Fits |
| Credits component from TUX People | TUX is at the core | Fits |
| Today's narrow max-width page containers | All eight use thin outer margins and no narrow max-width container | **Settled: no width rule.** Narrow or wide, whatever looks good, decided at the restyle (owner, 2026-11-15) |
| 4b's ~1 s page-change proposal | The references take about 1–3 s | **Settled: no fixed durations;** each animation tuned individually within reasonable bounds (owner, question 4) |
| Ground: dark default, with a light mode | Four dark (Metalab, lamalama, TUX, Blink), four light (Analogue, McAlpine, Osklen, Mersi) | **Settled: both modes site-wide, dark by default** (owner, question 2) |

## Questions for the owner (all answered)

Answers were given as comments in the live doc on 2026-11-14 and in chat on 2026-11-15.

1. **Title size.** The handoff notes record no oversized titles; seven of eight references set
   display type at 56–223 px. *Answered (2026-11-14):* neither. Large type is welcome; the note was a
   reaction to one mockup that looked wrong, not a rule on size.
2. **Ground.** Four dark, four light. One ground across the site, or one per page type?
   *Answered (2026-11-15):* a dark mode and a light mode across the whole site, not one per page
   type. Dark is the default. Mersi's light ground is admired as a bar for quality, not a target to
   copy.
3. **Header.** Keep the blur on the floating header only, or go flat like Mersi? *Answered
   (2026-11-14):* blur.
4. **Page changes.** 1–3 s in the references. Right for the shop pages too? *Answered (2026-11-15):*
   no fixed durations, here or anywhere: a set number causes drift and anchoring. Every
   animation's duration stays reasonable, and within that each is tuned individually to be as
   visually and interactively compelling as possible. Hideaway's page change is a good model for its
   character, not for a number. For reference only: from Hideaway's source, two page changes
   fit: between page groups, a curtain the frame's colour covers in 0.7 s and pulls back in 0.4 s
   (1.1 s of motion); within a group, the new page fades in over 0.3 s after a 0.7 s hold. Both add
   the time the route takes to load. Read from code, not measured live. (The 1.24 s / 1.28 s values in
   `src/components/UX/Transition/` belong to the Lost in Seoul product transition, not this one.)
5. **Osklen** shows 7 of 11. Is its job shop conventions only? *Answered (2026-11-14):* no. Its look
   is its main use, for the e-commerce parts. The e-commerce pages take Osklen's version page by page,
   porting most or all of its layout components with detail changes to fit our style: home → shop home,
   listings → listings, detail → detail. Site-wide components such as the header belong to the shell.
   Second, visual communication: every interaction looks and feels right. It speaks through layout,
   opacity, stacking, position, shape, size and animation. Size and shape changes are snappy; some
   states, usually position changes, are deliberately subdued. Concurrent animations are sequenced,
   each element with its own easing and timing: one header interaction animates every header element,
   each by its own property, easing and stagger. *Not yet measured:* needs a live motion capture.
6. **Display face.** None of the eight uses a bold serif. Does Narcissian Nectare stay? *Answered:*
   the serif was always meant to be normal or light, as at Metalab (240) and McAlpine (250)
   (2026-11-14); Narcissian Nectare stays (2026-11-15).
7. **Labels.** Mono, a small uppercase grotesque, or sentence case? *Answered (2026-11-14):* a hybrid.
   Sans by default, like Mersi's uppercase grotesque; sans and mono labels in uppercase; mono and the
   serif used selectively.
8. **Direct or conceptual.** Which of the eight, if any, are conceptual? *Answered (2026-11-14):* seven
   are direct; Mersi is conceptual. Its visuals, textures, graphic work and colour palette are adopted
   closely; its components are not. Its light ground and colour set a bar for how good it should
   look, not a palette to copy (owner, 2026-11-15).
9. **The earlier jobs.** 4b gave Normal Phenomena (manifesto, posts), Stripe Press (the book page),
   moto-card (the book on scroll) and Aurora (single-input pages) specific jobs. Do they keep those
   jobs under the reset? *Answered (2026-11-14):* yes.

## Motion (captured 2026-11-15)

A second pass measured how the eight sites move, element by element, in a foreground browser at full
frame rate, plus Hideaway's page change read from its code. Per-site records, with every number:
[04c-site-records/motion/](04c-site-records/motion/). Under the owner's rule the numbers are evidence,
not targets: every duration stays reasonable and is tuned individually. What follows is how the sites
move, as relationships.

**The vision in motion: every interaction is a small choreography, not one effect.** Each element in it
moves its own property on its own curve and timing; the bigger the thing that moves, the heavier and
slower it moves.

### What they share

- **One interaction, many movements.** A single hover or click changes several elements, each by its own
  property, curve and timing. *(All eight.)* Two ways to separate them: by delay and order (Osklen,
  lamalama, TUX, Mersi), or by starting together and finishing apart, through different durations
  (McAlpine, Blink, Analogue, Metalab).
- **Speed follows mass.** Colour and opacity changes are the quickest things on every site. Small interface
  pieces (a panel, a pill, a menu) move quickly and land early. Whole surfaces (a full-screen cover, a page,
  a large mask) move slowly and heavily. *(All eight, read this way.)*
- **Curves are strong, never neutral.** Things arriving use front-loaded ease-outs that land early and
  glide (expo, quart, quint). Full-screen covers use steep, symmetric in-outs. No site uses linear or the
  browser's default ease for movement. Overshoot is rare: only Blink's pops and Analogue's springs.
  *(All eight.)*
- **Leaving is not arriving played backwards.** Exits are shorter, unstaggered, on another curve, or in
  reverse order. *(Seven: Metalab, McAlpine, lamalama, TUX, Osklen, Mersi, Hideaway; Blink reverses.)*
- **Stagger lives in type, and it is small.** Letters, words and lines arrive a few tens of milliseconds
  apart; short groups such as menu items sometimes do; long lists of cards never do (Osklen's listing
  cards rise together). *(Six; Metalab staggers only its menu cards, Osklen nothing.)*
- **Reveals use masks more than movement.** Lines rise inside a clip, images are uncovered rather than
  slid. *(lamalama, TUX, Mersi, Metalab; a strand.)*
- **The page change covers, then uncovers, and the chrome stays.** A dither wipe (lamalama), a dark panel
  (TUX), colour curtains taken from the work (Mersi), the clicked image expanding (Metalab), a white hold
  (McAlpine), a crossfade (Analogue). *(Six; Osklen reloads, Blink has one page.)*
- **Motion answers the visitor.** Almost nothing loops on its own; the exceptions are a hero video, TUX's
  credits roll and Blink's intro. Mersi's grain stands still.

### The owner's reading of Osklen, against all eight

The reading ("snappy for size and shape, subdued for position") holds at Osklen, lamalama and Analogue,
where panels, pills and menus change size fast and land early. TUX, Mersi, Blink, McAlpine and Metalab
do the reverse for their large pieces: size and mask changes are the slow, heavy moves. The rule under
both: speed follows mass. Osklen's snappy shapes are small pieces; its subdued moves are larger ones.

### Osklen in detail (the shop pages' model)

- **One header interaction, per element.** Hovering a category: the glass capsules merge into one bar and
  the page dims, instantly; the panel's height opens on a fast-start curve and looks full almost at once;
  its content fades in after a short delay, on its own curve; the logo fades on a third curve. The search
  field jumps wide on open and eases back on close.
- **Moving between categories morphs the panel** rather than closing and reopening it; only the content
  swaps, the old out before the new in.
- **Search opens in two stages:** width first, then height and the dropdown. It closes in reverse, faster.
- **Sequencing is by delay and reverse order,** never by staggered lists.
- **Shop pages:** listing cards swap to a second image instantly on hover, then the wishlist and quick-add
  controls fade in one after the other. The filter slides in, accordions ease open. Product detail has no
  entrance motion at all.
- **Page changes are full reloads,** with no transition.
- **One flaw, not a choice:** the bag drawer and quick-add button snap into place with only a fade running,
  because of a Tailwind v4 `translate`/`transition` mismatch in their code.

### Hideaway (the page-change model, from its code)

Two page changes. Between page groups: a curtain in the frame's colour closes from four sides while the
app fades beneath it, the route swaps behind full cover, and the curtain pulls back faster than it closed.
Within a group: the header, frame and logo stay; the new page holds, then fades in. Heavy, symmetric
in-out curves; full occlusion rather than crossfading content. On this site most shop and help pages fall
in one group, so most changes there would be the fade.

### Method and limits

Headless Chromium with the GPU on, so animation frames ran at full rate; declared CSS, WAAPI and GSAP
timings are exact, frame-sampled ones are fits. Pages that draw in WebGL fell to about 7.5 fps without the
GPU; Analogue's numbers come from a GPU re-run, and the others were checked. Not captured: Osklen's phone
menu close and "load more"; Mersi's project grid live; Metalab's theme toggle; McAlpine's cookie banner
and pop-ups; some phone states. Hideaway was read from code, not run. The evidence files (event logs,
videos, frames, capture scripts) sit in a session scratch folder that a reboot clears; the records keep
the numbers.
