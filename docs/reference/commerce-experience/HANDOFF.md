# Handoff: read this first

This file is the entry point for any new session. Read it before the rest of the folder.

**Latest: start at "Handoff to Codex (2026-11-17)" at the end of this file.** The sections above it are older.

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

**Then (owner, 2026-11-15):** green splits by job: deep green #213627 is the background (signature) in both
modes; as a foreground on dark it is the light green #8AA791 (6.6:1), with #405646 / #657B69 as quiet steps.
Root fixed at 16px, not scaling with the window. D1 approved ([ADR-0009](../../adr/0009-three-layer-colour-tokens.md)).
D2 approved and built: commit 66f2f4c (12 tests in tests/theme, full functional suite green, live-checked in
both modes, code review approved). Known from the live check: `src/styles/teaser.css` hard-codes the page to
black, so light mode keeps a black page until the D1 token work scopes it. Fonts: The Hideaway's setup mapped
([05-evidence/hideaway-font-map.md](05-evidence/hideaway-font-map.md)) and reorganised in batch 3, "Fonts,
reorganised from The Hideaway's stylesheet": serif = Narcissian Nectare, then Blase (the only face with full
Korean); an opt-in serif with H-A between them for display; never italic on H-A.

**Then (owner, 2026-11-16): D2 reworked to The Hideaway's two layers** ([ADR-0002](../../adr/0002-colour-mode-follows-the-hideaway.md), revised).
The global theme is the visitor's pick, or their device setting until they pick (followed live); only a pick
is saved. A page theme holds a page while it is open, wins over the global theme and is never saved; leaving
releases it. The home page holds dark (`pageThemes` in `src/lib/content/theme.ts`, read by the boot script so
it paints dark from the first frame); the 404 holds dark through the store; other pages "as we go". On a held
page the mode switch is hidden (header button and the search panel's quick action) and ⌘H does nothing.
Tests in `tests/theme/` (22), full functional suite green, live-checked (including 404 → home).
Then (owner, 2026-11-16, commit a0f18e7): dark pages traced from The Hideaway: `/team` (its `/the-team`) holds
dark with home; the 404 paints dark from its first frame (inline `holdThemeBoot` script). The colour fade comes
along (`html.theme-animating [data-themed]` in globals.css, `data-themed` on `<body>`), and `teaser.css`'s black
ground is kept to the home page (`:has(.teaser)`). Tests and full suite green. Live-checked 2026-11-16 (dev, device light): `/shop` and `/help` light with a
white ground, `/team` and home dark, the colour fade runs and clears on `/essays`, the 404 settles dark. The bare error
shell (`<html id="__next_error__">`, no theme) that unmatched URLs got in dev and in a production build is gone
(2026-11-16): they are served by `src/app/global-not-found.tsx`, with `data-theme="dark"` on the served `<html>`;
live-checked in dev and production with a saved light pick on a light device: no `data-theme` write at all,
dark before first paint, pick untouched; leaving is a full load (home dark, `/essays` light). Then (owner,
2026-11-16: "NEVER show flash unstyled", "separate not found between admin and rest"): every site 404 is
served that way, including a missing essay or setlist (a redirect to `?not-found=1`, since replaced: see "404" below) and a malformed order id
(a config rewrite); live-checked in dev and production, each dark before first paint with no write. `/admin/*`
keeps Payload's own Not Found and `/api` answers with Payload's JSON.

**Batch 3 answered (owner, 2026-11-16):** Pretendard is the default for Korean; the H-A token is `serif-ha`;
H-A beyond display is open (display only until then). Batch 4 (space, surfaces, imagery, icons) drafted the same day and waits on the owner: four questions (shop page
width, a header bar on shop pages, grain, the cursor's style); evidence in
[05-evidence/batch4-space-surfaces.md](05-evidence/batch4-space-surfaces.md). A worker
(`404-first-frame`) fixed unmatched URLs and every page 404 (see above); The Hideaway's plain-`notFound()` shape was tested and still serves the bare shell (ADR 0002). Still open: leaving the 404 is a full
load with no fade (owner to accept). Next code work: D1 token layer and the font
tokens, through orch-add-feature / orch-change-feature. Technical decisions become ADRs once decided, in [docs/adr/](../../adr/README.md) (created
2026-11-15 with the owner's consent). Scope stays at the commerce pages plus the shared foundations and
shell: they're all the site will hold for now. The reset refines the direction; it doesn't discard what the
owner directed. Also 2026-11-15: oflyn and C-12 removed from 04's flow goals, and
the "1–3 s" framing taken out of 04c's synthesis (kept only as measured evidence).

**Plan order (from `README.md`):** level 3 UX is in draft; level 4 is settled in 04c; level 5 is the
design requirements, then the page specifications.

**Delivery** stays under `docs/reference/commerce-launch-plan.md` and the To-Do registry. The cart and page build was paused, not finished.

**Canvas** (published, private): https://claude.ai/artifact/8m5r912PLWXrq75kENj36C. Files live in `/private/tmp/claude-501/-Users-seanschoi-orca-workspaces-sphmrs-hamlet/19c56513-df79-4627-ab2e-59acb5e8a600/scratchpad/canvas/project/`, which a reboot can clear.

**404 (2026-11-16, revised later that day):** a `notFound()` thrown before streaming gets Next's bare
`__next_error__` shell (a Next bug, vercel/next.js#62228, unfixed). The earlier conclusion that The Hideaway serves
the same shell was wrong: its `<Suspense>` inside `<body>` sends the styled document first. Owner chose The
Hideaway's way: the essay and setlist pages look their record up inside `<Suspense>` and call plain `notFound()`;
the `?not-found=1` redirect and its rewrite are gone. Accepted: those 404s answer 200 (with noindex) and may flip
light→dark. Unmatched URLs and bad order ids still get `global-not-found` (a real 404). Live-checked in dev; the
code landed in `b991c51` (swept into another session's docs commit). See ADR 0002. Owner: no redirects plugin;
`(auth)` (the preview-auth gate) is not to be touched.
The worker `404-first-frame` is merged and can be closed. Batch 4 answered (owner, 2026-11-16): shop width delegated (decided: run to the margin on the 12-column grid, text
blocks keep a readable measure); the header bar on every page; grain site-wide the way The Hideaway does it, with its
interface assets brought over (a background agent is building grain, assets and the header on all pages); cursor:
comparison at https://claude.ai/artifact/MHL6PCAvuP6ZaSjz2GJJkE; decided: The Hideaway's cursor (already ported,
`src/components/UX/Cursor`), with its hover accent switched from rouge to this site's own accent (to be chosen, not
deep green). D1 plan for Gate 1: [05-evidence/d1-token-plan.md](05-evidence/d1-token-plan.md) (also in the live doc), three
owner questions (accent colour, dark ground and text, h5/h6). Fix with the D1 tokens: its 10px-root rem sizes (1.6× too big here) and the five classes that point at
missing tokens; delete the unmounted `src/components/shell/cursor.tsx`. Next:
the D1 colour-token plan (Gate 1 with the owner).

## Handoff to Codex (2026-11-17)

**The worktree and what it owns.** Worktree `~/orca/workspaces/sphmrs/hamlet`, branch `feature/product-production`
(pushed, in sync, clean). It owns the site's look and build-out as The Hideaway port: the design requirements in
`05-design-requirements.md` (repo copy) and the live doc's "5 · Design requirements" tab
(https://claude.ai/artifact/Qvf3t58MWEDYs5N4aNyNz9); ADR 0002 (modes; dark by default), ADR 0008 (type) and ADR 0009
(three colour layers); and the D1 token plan in `05-evidence/d1-token-plan.md`, four slices through
`orch-change-feature`. Done here so far: D2 dark by default, pages that hold dark, the styled 404, grain, assets and
the header bar, and D1 slice 2 (fonts, below). It does not touch `main`, `src/app/(auth)` or the auth mechanisms
(`codex/auth-payment-nfc`). The Claude session that worked here (terminal "Next.js unstyled 404 page flash") has
stopped. Pick it up with a fresh session in this worktree that reads this section first; one session per worktree.

**Colour is on hold (owner, 2026-11-16).** "Keep the colors that we have right now. I like them." No page's colours
change. D1 slice 1 (colour) and slice 4 (cursor, which reads the accent) wait for the owner; the hold is recorded in
[05-evidence/d1-token-plan.md](05-evidence/d1-token-plan.md) §9 and in the live doc's design-requirements tab. Parked
idea for later: two cool and two warm hues, the warm side between orange, yellow and red (80s-sunset red, blood
orange).

**D1 slice 2 (fonts): done and on `feature/product-production`** (`e9ab799` plus the follow-up commit). Owner
direction: follow The Hideaway's font map wherever it uses a face; bring faces over only when something here uses
them; roles go in the existing `@theme` block in `globals.css` (no separate token files).
- Loaders in `fonts.ts` set only `.variable` on `<html>` (`(site)/layout.tsx`, `global-not-found.tsx`). Roles: sans
  Helvetica Neue, then SUIT for Korean (owner, 2026-11-17: "Helvetica with suit fallback"); serif Narcissian Nectare
  then Blase (the Korean serif); wide Blase; mono and heading Geist Mono (`geist` package); dots Doto. Blase (4
  weights, copied from The Hideaway into `public/fonts/Blase/`) has `preload: false`.
- Removed: Nib (`font-teaser-serif` became `font-serif`; it never rendered) and the unused Manrope and H-A loaders
  (files kept). Pretendard was not added: The Hideaway doesn't use it.
- Before, every page rendered Narcissian Nectare by accident (five `.className`s raced on `<html>`). Now body text and
  every `font-sans` use (the home Warp headline included) are Helvetica; home and invitation headings stay
  Narcissian Nectare; Korean sans text shows in SUIT, Korean serif text in Blase.
- Checks: `tests/tokens/fonts.test.ts` (red 6/7 before, green after); functional suite 2916 pass, 0 fail; typecheck
  clean; live before/after on five pages in both modes: colours identical on all ten. Code review: no CRITICAL or
  HIGH.

**Open items:**
- The 390px phone check was not done (the Orca browser ignores device emulation).
- Doto is defined twice: the new loader, and the hand-written `@font-face` in `sphmrs.scss` used only by the
  unmounted `src/components/shell/cursor.tsx`. Both go with slice 4.
- All 8 Narcissian Nectare files preload on every page (unchanged from before); worth trimming later.

**Live check tool:** `05-evidence/live-check/capture.sh` with `font-colour-probe.js` (Orca browser; theme key
`sophomores-theme`; pages `/`, `/shop`, `/help`, `/team`, `/essays`). Today's render is the baseline: record it before
a slice and compare after.

**Next:** slice 3 (sizes, radius, gutter), with h5 16px and h6 14px as the default for the owner's open question.
Slices 1 and 4 stay held. Working rules: guarded runs only, one guarded job per checkout, port 3000 only after
checking `lsof -iTCP:3000 -sTCP:LISTEN` and asking the holder, only the plan-owner session writes `main`, one session
per worktree (this session stops working in `hamlet` once Codex takes it).
