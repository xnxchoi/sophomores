# 05 — Design requirements

Working draft · 2026-11-15 · Level 5 of the [commerce experience plan](README.md). Mirrors the
live doc's "5 · Design requirements" tab; edits made there are canonical. Evidence: [05-evidence/](05-evidence/).

Step 2 of the reset: the direction in 4c, organised into every part the site is made of, what each part comprises, and what it must do.

**How this is reviewed.** This first version is only the inventory: every part, listed once. Each part is then specified in small batches, in the order at the end. The owner reviews each batch; a correction can reach back to an earlier batch or a wider part, and the revision log records where it reached.

**Each part records:** what it comprises; what is required, with its source; what is still open; and a status.

- **Settled:** decided by the owner, with a date.
- **Built:** exists in the code today; the source path is given.
- **Proposal:** anything without a source. Never treated as settled.
- **Open:** a question for the owner, or a decision (C-) that blocks it.

**Where a requirement cites 4c,** it is what the references share. The owner accepted 4c as the direction (2026-11-15), so these clauses guide the work, but they stay patterns rather than rules: one way to do it, not a requirement, unless the owner made it one.

**Scope.** The commerce section (3c's pages), plus the site-wide foundations and shell that every page shares. The site is more than these pages, but for now they are all it will hold, so the scope stays here (owner, 2026-11-15). The home page, essays, music and setlists inherit the foundations and shell but aren't specified here. The reset refines the site's direction; it doesn't throw out what the owner has already directed. Sign-in and verification keep their existing contracts and stay neutral monochrome in both modes (AGENTS.md). The product page's facts and copy stay in product-sales-page 01–03; its 04–06 are provisional.

**Rules every part keeps** (owner, AGENTS.md):

- No fixed animation durations. Each is reasonable and tuned individually (owner, 2026-11-15).
- Full motion by default, with no reduced-motion alternative path.
- Tailwind only; brand marks only through `BrandMark`.
- Touch targets at least 44 px, preferably 48 px.
- English copy in `messages/en.json`; Korean mirrors it and is never auto-filled.
- Before a part is styled, its live references are inspected; after, the live render is reviewed.

## Foundations

The layer every other part is built from. Specified first, because a change here reaches everything.

| # | Part | What it comprises | Required, with source | Open | Status |
| --- | --- | --- | --- | --- | --- |
| F1 | Colour and modes | Ground, text, lines, signature, accent; one token set per mode | Dark by default, plus a light mode, site-wide (owner, Q2, 2026-11-15); revised (owner, 2026-11-16): the global mode follows the device setting until the visitor picks, and a page can hold its own (the home page holds dark; see D2). Deep green is the signature (4b, 2026-11-14). Ways to use it, not rules: as a block for the loud moment (4b, 2026-11-14); as a full-width hero, with the rest of the site not insulated from it (owner, 2026-11-14; handoff notes); or with the interface kept black, white or grey plus one accent, so the colour comes from the work (the pattern at seven of 4c's eight sites) | The palette as brand identity (4b, palette round 2). Deep green's tonal range. What the light mode's ground is; Mersi's palettes are the basis to try, each checked before adoption (owner, 2026-11-14) | Settled in part |
| F2 | Display type | Narcissian Nectare at display sizes | Normal or light weight (owner, Q6). Large type is welcome (owner, Q1) | Where display type appears on shop and account pages. Start from how the references place it, then decide on our own terms (owner, 2026-11-14) | Settled |
| F3 | Labels and body type | A sans for labels and text; a mono; the serif in small roles | Sans by default, like Mersi's small uppercase grotesque; sans and mono labels in uppercase; mono and serif used selectively (owner's leaning, Q7) | Which sans and which mono; Hideaway's type is the starting candidate (handoff notes). A body face for long text (help, policies) | Settled in part |
| F4 | Brand mark | The Sophomores wordmark and its variants | Only through `BrandMark` (`src/lib/brand.tsx`), identical everywhere (AGENTS.md). Helvetica is today's form, not a rule: a new logo is welcome if it looks great (owner, 2026-11-14) | Wordmark forms (4b, still open); whether to design a new logo | Built |
| F5 | Type scale | The sizes and line heights for both voices | A full scale, with in-between sizes (owner, 2026-11-14). The contrast between very large display and small labels can still lead (a pattern at seven of 4c's eight sites, not a rule) | Every step of the scale | Proposal |
| F6 | Layout and margins | Outer margins, grid, column rules, spacing | No width rule: narrow or wide, whatever looks good (owner, 2026-11-15). The references run thin outer margins (4c, all eight) | The grid and spacing steps | Settled in part |
| F7 | Surfaces and depth | Flat ground, the floating layer, edges, radius | The header blurs (owner, Q3). Brutalist as structure (handoff notes). Patterns, not rules: glass only on the floating layer, which carries identity. Shadows are a detail, not identity: most references use no drop shadows (4c, seven of eight); Osklen, the e-commerce reference, uses soft ones | Radius; blur strength; line weights | Settled in part |
| F8 | Imagery and texture | Product photographs, the book's 3D render, texture and grain | Real product photographs are the primary images (product spec 04). The book's render and book page after Stripe Press (4b). Mersi's visuals, textures, graphic work and colour palette adopted closely, as opposed to porting components directly (owner, Q8) | Which textures; how photographs are art-directed | Settled in part |
| F9 | Motion system | Curves, sequencing rules, page change, scroll | No fixed durations; each tuned individually within reasonable bounds (owner, 2026-11-15). Full motion, no reduced-motion path (AGENTS.md). Patterns in 4c Motion, with how many of the eight show them: speed follows mass (all); strong curves (all); exits differ from entries (six, plus Hideaway); stagger only in type (six); masks over movement (four: a strand, not a majority). Installed: GSAP, Motion, Lenis, next-transition-router | Which library owns which kind of motion | Settled in part |
| F10 | Copy voice | Labels, headings, remarks, errors | The brand voice guide (`docs/design/brand-voice.md`). Few words per screen (4c, all eight). Witty remarks that change with navigation (lamalama, 4b). Normal Phenomena's prose tone (4b) | Where remarks appear in a shop flow | Settled in part |
| F11 | States | Loading, empty, error, partial, success, permission | Every page has loading, empty and error; loading keeps the layout still; an error offers Try again in place (3c's standard e-commerce flows, not the references: none of the eight was captured in these states) | How each state looks and moves | Proposal |
| F12 | Interaction rules | Close and back placement, targets, sheets, slots, reflow | AGENTS.md's shared interaction rules: close on the left, one coherent motion per change, no layout jumps, compact slots for short swaps, actions distinct from navigation | None | Settled |
| F13 | Icons and cursor | Icon set; the custom cursor | Phosphor is the one icon set (owner, D7, 2026-11-15). A custom cursor exists (`src/components/shell/cursor.tsx`) | Whether the cursor stays on shop pages: yes (owner, 2026-11-14). The cursor's overall style changes; to what is open, with Analogue's and lamalama's cursors as candidates (owner). Both captured 2026-11-15 (04c-site-records/cursors.md): Analogue hides the pointer for a small frosted-glass dot that changes form by zone (white over images, a "SEE CASE" pill on cases); lamalama keeps the pointer and adds a dot-matrix trail in the backdrop plus a lagging, scrambling text label | Proposal |

**F14 · Token layer.** *Proposal.* One semantic set of named tokens for colour, type, space, radius, blur and motion curves, with a dark and a light value each, registered in Tailwind's theme. Every part uses it, and shared tokens live in the theme layer (AGENTS.md). Delivered as a design note, a token file and a preview page once F1 and F3 settle. *Open:* naming, and how the three systems below fold into one.

**What exists today** (extracted from the code, 2026-11-15):

- **Three token systems sit side by side.** shadcn's variable names in `src/styles/globals.css` (background, foreground, a 0.625 rem radius); the Sophomores palette in `sophomores-tailwind-v4.css`; the teaser's own set in `teaser-theme.css` (a violet, a bright green, an 8 px card radius). The names alone don't make it generic: The Hideaway uses many of the same names with editorial values (owner). Its values need diffing against shadcn's stock set; if they are stock, they go (owner, 2026-11-14); shadcn components still read its variable names, so those point at our tokens (D1).
- **The site follows the device setting** unless a choice was saved (the boot script in src/lib/content/theme.ts sets `data-theme`), so a light device gets a light site. The owner's rule is dark by default (Q2). The Sophomores palette also declares light as its base.
- **Registered colours with no settled role yet:** oxblood, porphyry and terracotta (4b proposed keeping them out of the interface, possibly for the book; not withdrawn), and all seven deep-green candidates, though the owner kept one.
- **Type:** as declared, the default sans is Helvetica Neue and headings use the mono; five font classes also sit on the page root, so which face renders hasn't been checked. To start, the type setup matches The Hideaway's (owner, 2026-11-14). Loaded faces: Narcissian Nectare, Manrope, a reference serif, Suit and Hyd (`fonts.ts`).

## Shell

What stays on screen, or around the page, everywhere. Site-wide components belong to the shell, not to a page (owner, Q5).

| # | Part | What it comprises | Required, with source | Open | Status |
| --- | --- | --- | --- | --- | --- |
| S1 | Header object | Wordmark, shop, cart button with its count, account entry, menu button | The Hideaway header is the owner's base (src/hideaway/components/Shells/Header/HeaderClient.tsx; handoff notes). It blurs (owner, Q3). The references keep the chrome one small floating object, never a solid full-width bar (4c, all eight). One header interaction moves every header element, each on its own property, curve and timing (owner, Q5; Osklen). The cart count shows only when the cart holds something (3c). Built: `src/components/shell/site-header.tsx`, `header-actions.tsx`, `header-panels.tsx` | Its shape: Hideaway's full-width rounded bar, or the references' floating object (bar, pill or capsules). Whether lamalama's top panel, which folds and unfolds, is the header or the menu (4b) | Settled in part |
| S2 | Menu | The panel the menu button opens, and its contents | Grows out of the nav object (4c strand: lamalama, Blink, Analogue, Osklen). lamalama's fold and unfold (4b). Built: `site-menu.tsx`, `menu-frame.tsx`, `menu-gradient.tsx`, `menu-button.tsx` | Contents; how the shop sits in it | Proposal |
| S3 | Footer | Seller business details; policy links | The details Korean online shops show on every page: business name, representative, registration and mail-order numbers, address, phone, email, privacy officer (3c; R-B1, R-B10, R-B11). Links to terms, privacy and refund. Legal confirms the list | Its look; whether it is quiet or a full-bleed block | Proposal |
| S4 | Page change | How one page leaves and the next arrives | Covers, then uncovers; the chrome stays (4c, six). Hideaway's page change is the model for character: a curtain between page groups, a fade within one (owner, Q4). Normal Phenomena's logo animation during navigation and its loading fade (4b). Built: `src/components/shell/page-motion.tsx`, `src/components/UX/Transition/` | Which pages form a group. How the logo animation and the curtain combine | Settled in part |
| S5 | Mode switch | The control for dark and light | Both modes, dark by default (owner, Q2). Built: `site-theme.tsx`, `src/components/UX/DarkMode/` | Where it sits. Hidden on a page that holds its own theme, such as the home page; elsewhere the mode follows the device setting until the visitor picks (owner, 2026-11-16) | Proposal |
| S6 | Scroll | Smooth scroll and scroll-linked motion | Lenis appears at four of the eight (4c strand) and is installed. Built: `site-scroll.tsx` | Whether shop and account pages use it | Proposal |
| S7 | Messaging-app escape | The one-button way out of an in-app browser | On every shop page (3c; 03, B8) | Its place in the header or as a bar | Proposal |
| S8 | Not found | The page for a missing address | The site's existing not-found page, with a link to the shop (3c). Built: `src/app/(site)/not-found.tsx` | Its restyle | Built |
| S9 | Sign-in surface | The account tray that opens when sign-in is needed | Keeps its existing contracts: the Vaul tray, neutral monochrome, inline, returning the person to where they were (AGENTS.md; 3c). Not redesigned here | How its monochrome sits in each mode | Settled |

## Shared components

Parts used on more than one page. Shop parts follow Osklen's version, ported with detail changes to fit our style (owner, Q5).

**How they are built** (AGENTS.md; frontend patterns):

- **Composition over options.** A drawer or accordion is a small family of parts (root, trigger, content), not one component with many flags. `cva` only where variants are real.
- **Installed primitives first.** Base UI, Radix, Vaul, Motion and GSAP are installed; nothing is rebuilt that one of them already does.
- **Each component owns its states.** Loading, empty and error are part of the component, not added by each page.
- **Placed by who uses it.** Commerce-only parts under `src/components/commerce/`; parts the whole site uses with the shell.

| # | Part | What it comprises | Required, with source | Open | Status |
| --- | --- | --- | --- | --- | --- |
| C1 | Product card | Image, name, price, quick actions | Name and price on one line, over a large image (Osklen, 4c). On hover the second image swaps at once, then the controls fade in one after another (Osklen motion) | Whether a listing exists at all (C-1) | Open |
| C2 | Product media | Photographs, the book's 3D render, the scroll sequence | Real photographs first (F8). The book's render after Stripe Press; the scroll sequence after moto-card (4b) | Render or photographs on the first screen | Proposal |
| C3 | Add to cart | The add action and its confirmation | One per account: no quantity selector (owner, 2026-11-13). A signed-out visitor signs in inline, then the item is added (C-19, recommended). The drawer confirms the add (C-18) | C-19 | Open |
| C4 | Cart drawer | Panel, lines, total, the way to the cart page | Drawer and page both (C-18, settled). Close on the left; dismissing is not discarding (AGENTS.md). Unlike Osklen's, it must not snap: its slide and fade run together (4c, Osklen's flaw) | Side or bottom on a phone | Settled in part |
| C5 | Cart line | Item, options, price, remove | Remove is an action in place, with the result shown inline (AGENTS.md) | Undo after remove | Proposal |
| C6 | Totals | Subtotal, shipping, total | Short value swaps keep a compact, stable slot (AGENTS.md). Number Flow is installed | None | Proposal |
| C7 | Buttons and links | Primary, secondary, quiet, icon; text links | Actions look like buttons, navigation like links; busy feedback in the same place; targets 44–48 px (AGENTS.md) | Shape and radius (F7) | Settled in part |
| C8 | Fields and forms | Text, select, checkbox, switch; labels, hints, errors | Validation swaps in a compact slot; uppercase labels (F3; Q7). Single-input pages after Aurora (4b) | Which form library (ADR list) | Proposal |
| C9 | Accordion | Trigger, panel | Genuinely collapses and gives back its space; eases open (AGENTS.md; Osklen) | None | Settled in part |
| C10 | Labels and status | Small labels, tags, order status | Uppercase small labels (Q7). Order states as 3c lists them | Status colours within one accent (F1) | Proposal |
| C11 | Rows and lists | Order rows, settings rows, address rows | Long lists never stagger; short groups may (4c Motion) | Dividers or space | Proposal |
| C12 | Sheets and confirmations | Sheet, dialog, alert | Chosen by task: alerts for short decisions, sheets for richer work; confirm only what can't be undone (AGENTS.md). Cancel and return requests (C-22, settled) | None | Settled in part |
| C13 | Notices | Inline results, toasts | Results appear inline, without an extra modal (AGENTS.md). Sonner is installed | Whether toasts are used at all | Proposal |
| C14 | Long-form text | Headings, paragraphs, lists, tables for help and policies | Normal Phenomena's post layout and manifesto (4b) | The body face (F3) | Proposal |
| C15 | Credits | The people list for the Team page | Built from the Hideaway's Credits component (`src/hideaway/components/sections/Credits/`), modelled on tux.co/en/people (owner, 2026-11-14). Its SCSS moves to Tailwind as it's changed (AGENTS.md) | None | Settled |

## Pages

3c's nineteen pages and surfaces. "Scaffolded" means the route and an empty page frame exist (commit `caa35df`); structure only, no styling. Each page is specified from the foundations, shell and components above; only what is particular to it is listed here. Every page is a Proposal until its batch; the Open column holds what blocks it.

| # | Page | Route | What it comprises | Reference model | Today | Open |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Shop home | `/shop` | What is on sale, entry to each product | Osklen's home (owner, Q5) | Exists; also serves as the product page | C-1 |
| P2 | Product page | `/shop/[slug]` | Media, name, price, specs, availability, places left, add to cart, seller details | Osklen's product detail (Q5). The book page fills the viewport, after Stripe Press (4b, 2026-11-14). Facts and copy: product-sales-page 01–03. The story carries the purchase; visuals lead, at least partly; price, specs and availability each get their own place (handoff notes; 4b) | New; inside `/shop` today | C-1. A defined source for places left (4b) |
| P3 | Cart drawer | From the header | See C4 | Osklen's bag | New | C-18 settled: both |
| P4 | Cart page | `/shop/cart` | Lines, totals, the way to checkout | Osklen's bag | Scaffolded | C-19 |
| P5 | Checkout | `/shop/checkout` | Held: its behaviour is business logic that follows separately | — | Scaffolded (stub) | Held |
| P6 | Payment return | `/shop/payment` | Held | — | Exists | Held |
| P7 | Account home | `/me` | Orders, settings, the account's state at a glance | None captured | Scaffolded | Proposal needed |
| P8 | Order list | `/me/orders` | One row per order with its status | None captured | Scaffolded | — |
| P9 | Order detail | `/me/orders/[id]` | Items, status, shipping address, receipt, requests | None captured | Scaffolded; the old page at `/shop/orders/[id]` | Activation held |
| P10 | Cancel or return request | From the order detail | Reason, confirmation, the request's state | A sheet (C12) | New | C-22 settled: request buttons |
| P11 | Addresses | `/me/settings/addresses` | Saved addresses, a default, add and edit | Aurora's single-input simplicity for the form (4b) | Scaffolded | C-20 and privacy review |
| P12 | Notifications | `/me/settings/notifications` | Channels and topics, each a switch | None captured | Scaffolded | Which notices exist (C-3) |
| P13 | Profile, language, security | `/me/settings/account`, `general`, `security` | As built | Inherit the restyle | Exist | — |
| P14 | Help | `/help` | Topics, contact | Normal Phenomena's editorial style (4b) | Scaffolded | — |
| P15 | Shipping and returns | `/help/shipping` | Shipping times, costs, returns | Long-form text (C14) | Scaffolded | Facts from the launch plan |
| P16 | Terms, privacy, refund | `/terms`, `/privacy`, `/refund` | Policy text | Long-form text (C14); the manifesto layout (4b) | Exist; restyle | — |
| P17 | Header cart and account | Every page | See S1 | — | New | — |
| P18 | Footer with business details | Every page | See S3 | — | New | Legal confirms the list |
| P19 | Team | `/team` | The people, as credits | tux.co/en/people, with C15 (owner, 2026-11-14) | Scaffolded | — |

**Not here:** `/tickets` and `/tickets/payment` are removed. The invitation claim and the activation page are held with the token flows. Sign-in pages keep their existing rules (S9). The routes go, but their work may be reused (owner, 2026-11-14). Likely candidates, to check against the code: the PortOne payment result (portone-payment-result.tsx) for checkout and the payment return (P5, P6), and the ticket account entry (ticket-account-entry.tsx) for the account pages.

## Technical decisions to record

Choices of how the design is built, not what it looks like. Each one is decided in the batch that needs it and then written up as an architecture decision record in docs/adr/ (created 2026-11-15, with the owner's consent): the context, the decision, the alternatives and why they lost, and the consequences.

| # | Decision | Candidates | Decided in |
| --- | --- | --- | --- |
| D1 | One token layer | Fold shadcn's, the Sophomores and the teaser sets into one semantic set; or keep them layered. Stock shadcn values are dropped either way (owner, 2026-11-14). Decided (owner, 2026-11-15): the three layers proposed in batch 2 (primitives, semantic tokens under The Hideaway's names, shadcn names as aliases); ADR 0009 | Batch 2 |
| D2 | How the mode is set | The existing `data-theme` attribute with its boot script (built); or a theme library (none installed). Chosen (owner, 2026-11-14): follow The Hideaway's approach. Checked in its code (2026-11-15): The Hideaway sets data-theme from a boot script (providers/Theme/InitTheme), the same mechanism this site already has. Its default is dark, but when nothing is saved the device setting overrides it; dark by default (Q2) means dropping that fallback. Decided (owner, 2026-11-15): drop it. Built 2026-11-15 (commit 66f2f4c): one storage key, picks under the old keys carried over, first paint dark, checked live in both modes. Revised (owner, 2026-11-16): two layers, as in The Hideaway. The global theme is the visitor's pick, or the device setting until they pick; only a pick is saved. A page theme (the home page: dark) wins while the page is open, is never saved, and is released on leaving. The mode switch is hidden on such a page. Built 2026-11-16 (commit bac0052); ADR 0002 revised. Then (owner, 2026-11-16, commit a0f18e7): pages traced from The Hideaway hold dark (home, /team, the 404 from its first frame); the colour fade and the home page's own black ground come along | Decided 2026-11-14 (owner) |
| D3 | Which library owns which motion | Motion's animate() for choreographed sequences (header, page change); Motion for component state and presence; Tailwind CSS for colour and opacity (owner, 2026-11-14); Lenis for scroll. All installed, GSAP too. Motion is preferred over GSAP: existing GSAP timelines are being converted to Motion's animate(), harder to write but worth the performance gain (owner, 2026-11-14). Chosen (owner, 2026-11-14): follow The Hideaway's split, with Tailwind CSS for colour and opacity; checked in its code (2026-11-15): Motion in about 170 files, Lenis in about 46, GSAP in about 32. So Motion leads, Lenis handles scroll, and GSAP remains where it hasn't been converted yet | Decided 2026-11-14 (owner) |
| D4 | Page change | `next-transition-router` (installed); the existing `page-motion.tsx` and `UX/Transition`; or the browser's View Transitions. Chosen (owner, 2026-11-14): follow The Hideaway's approach; checked in its code (2026-11-15): next-transition-router, in about 25 files | Decided 2026-11-14 (owner) |
| D5 | Component primitives | Base UI or Radix (both installed); Vaul for drawers and sheets (in use for sign-in). Chosen (owner, 2026-11-14): Base UI. Anything that uses Radix is migrated to Base UI with shadcn plugh's skill. Drawers and sheets follow The Hideaway (owner, 2026-11-14), checked in its code (2026-11-15): Vaul, through its own wrapper (components/ui/vaul), with Motion inside the sheet. The Hideaway itself still uses Radix in about 38 files and Base UI in about 26 | Decided 2026-11-14 (owner) |
| D6 | Form library | React Hook Form or TanStack Form (both installed). Chosen (owner, 2026-11-14): follow The Hideaway's form library (earlier pick: TanStack Form). Checked in its code (2026-11-15): it uses both, in nine files each. React Hook Form runs the sign-in and account forms (the most recently changed); TanStack Form runs the registration tour and the auth form kit. Decided (owner, 2026-11-15): TanStack Form. React Hook Form was used in The Hideaway only where it had to be; TanStack is more accommodating, at the cost of a learning curve | Decided 2026-11-15 (owner) |
| D7 | Icon set | Phosphor, Lucide or Radix icons (all installed). Chosen (owner, 2026-11-14): follow The Hideaway's icon set (earlier pick: Phosphor). Checked in its code (2026-11-15): mostly Lucide (about 73 files), with Phosphor (about 17) and Radix icons (about 12). Decided (owner, 2026-11-15): icons move to Phosphor, rather than following The Hideaway's Lucide | Decided 2026-11-14 (owner) |

## Batches

Each batch specifies a few parts, shows a sample where it can be seen (a token preview page, a component on a test route), and goes to the owner. A correction may reach back further than its batch.

1. **The inventory** (this version). Is anything missing, grouped wrongly or mislabelled? 4c: accepted as the direction (owner, 2026-11-15). Scope: answered, it stays (owner, 2026-11-15).
2. **Colour, modes and tokens:** F1, F14; D1, D2. Everything else depends on these.
3. **Type:** F2–F5.
4. **Space, surfaces, imagery, icons:** F6–F8, F13; D7.
5. **Motion and the moving shell:** F9, S1, S4; D3, D4.
6. **The rest of the shell:** S2, S3, S5–S9; F10–F12.
7. **Cart and form components:** C4–C13; D5, D6.
8. **Shop pages:** P1–P4 with C1–C3, once C-1 is decided.
9. **Account pages:** P7–P13.
10. **Help, policies and team:** P14–P19 with C14, C15.

## Batch 2 · Colour, modes and tokens

*For review, 2026-11-15.* Covers F1, F14, D1 and D2. **No new colours are proposed.** The palette is brand identity, and 4b records that it waits on a conversation about what the identity should say. This batch sets the structure and shows the colours that already exist, as evidence.

**Preview:** [Mersi's palette tried on a sample shop screen, light and dark side by side; click any colour to try it (revised 2026-11-15, replacing the swatch board)](https://claude.ai/artifact/TKmmak4QRPsBrN5MAdTFZ2). Nothing in the code changes until this batch is approved.

### What the code shows

- **shadcn's names carry the site.** 167 files read them (background, foreground, muted-foreground, border and so on). Their values here are shadcn's stock neutral set, exactly, so they go (owner, 2026-11-14).
- **The Sophomores palette is declared but unused.** No component reads sophomore-, cypress-, brass- or surface- tokens.
- **The teaser set** is read by eight teaser files and by the two phone-verification files (teaser-card).
- **The Hideaway uses the same shadcn names with its own values,** built on a neutral scale with warm, cold and plain greys. Background and foreground each come with opaque, muted, off and faded variants. There's a translucent button background, and one accent (rouge) for accent text and errors. Dark is its base; light overrides it.

### D1 · Token structure (proposal)

1. **Primitives:** raw colours with no meaning attached. The neutral scale (The Hideaway's, to start), deep green's tonal scale (cypress 50–950), brass, and oxblood, porphyry and terracotta, kept registered with no role. The six other green candidates stay until the owner says otherwise.
2. **Semantic tokens:** what a colour is for, each with a dark and a light value. The Hideaway's names: background and foreground with their opaque, muted, off and faded variants, button background, border, signature, accent, error. Dark sits in the base layer; light overrides it under data-theme="light".
3. **Aliases:** shadcn's names point at the semantic tokens, so the 167 files keep working without a class-name change.

The teaser set stays apart: it serves the home page, which is out of scope. The two verification files keep teaser-card until sign-in is restyled.

**Impact.** Values change under the 167 files; no class names change. The Sophomores palette moves from light-first semantic tokens to primitives, and nothing reads it, so nothing breaks. Every page changes look at once, so this lands with a live check of the main pages in both modes.

### D2 · Ready to make

In the boot script (src/lib/content/theme.ts), the device setting stops counting: the site is dark until the visitor picks (owner, 2026-11-15). Built 2026-11-15, then superseded (owner, 2026-11-16): the global theme follows the device setting again, and the home page holds dark as a page theme (see D2).

### Finding: deep green against the dark ground

Deep green (#1A362B) against The Hideaway's dark ground measures **1.33:1** (lightness 0.31 against 0.22). In dark mode a green block barely separates from the page. Against the light ground it's 12.5:1. Text on the green reads well: white 12.5:1, vellum 11.7:1, brass 5.9:1. Possible answers, for the owner to choose:

- the block runs edge to edge, so it's never seen beside the ground;
- dark mode uses a lighter tone from the green's own range;
- dark mode's ground goes darker.

### Contrast of existing pairs (WCAG)

| Pair | Ratio |
| --- | --- |
| The Hideaway, dark: text on ground | 16.6:1 |
| The Hideaway, dark: muted text on ground | 8.7:1 |
| The Hideaway, light: text on ground | 19.8:1 |
| The Hideaway, light: muted text on ground | 10.1:1 |
| Mersi: text #1A1A1A on its ground #EDE7DE | 14.2:1 |
| Deep green on Mersi's ground | 10.6:1 |

### Questions for the owner

1. Does colour start from The Hideaway's set, as type does? If so, most of F1's values follow from it. Answered (owner, 2026-11-14): yes, but only its structure. The Hideaway's colour variables are slots; we fill them with our own colours.
2. **The light ground.** The Hideaway's light mode is near-white (#FBFAFA). Mersi's warm paper ground is the bar for quality. Does the light mode start from The Hideaway's white, or from a warm paper ground? (4b: proof a palette on cream and on white.) Leaning (owner, 2026-11-14): toward Mersi's warm paper ground. Mersi's palettes are the basis to try, each one checked before it is adopted (owner, 2026-11-14). They are not yet captured: Mersi gives each project its own colours, so the capture lists every project's palette plus the paper ground. Answered (owner, 2026-11-15): the combined set works well. Deep green fits too, tuned to match the feel of the rest (below).
3. **The green in dark mode:** which of the three answers above, or another? On hold (owner, 2026-11-14): none of the three looks right in the preview. Revisit once Mersi's palettes are captured, shown in a real page layout rather than as swatches. Proposal (2026-11-15): Maurice Cafe #657B69 shares the tuned deep green's hue and chroma at a lighter step and reads at 3.8:1 on the dark ground. That makes one tonal pair: deep green in light mode, Maurice Cafe in dark mode. For the owner to confirm. Answered (owner, 2026-11-15): split the green by job. As a background, deep green stays the signature; as a foreground it needs something lighter. See "Green, split by job" below.
4. **The palette conversation** still to have. 4b treats the palette as brand identity, so it planned a talk with you about what the brand should convey before proposing any swatch. Setting up The Hideaway's colour slots doesn't wait on that talk; choosing any colour beyond deep green does. Begun (owner, 2026-11-14): the identity draws on three earlier projects. The Hideaway was a magazine-NFT, a boutique hotel like Chateau Marmont or Soho House, real in every sense except as a physical space. Restored Projects embodies discreet, understated boutique and family-office funds with rich lineage and quiet influence. LOSTINSEOUL (2016) was modernist, edgy luxury grunge with a humanist message against Korea's tightly bound society. Heritage, inherited wealth, power and legacy fill the atmosphere but never the foreground. Sophomores celebrates will and agency: taking on the risk of forging your own path and refusing complacency. Hence "subvert the institutional heritage": Harvard and Yale were once revolutionaries and are now the system. The pursuit is the best life, hard but fulfilling, shared with those who truly care. Where the lineages pull apart, the palette sits between LOSTINSEOUL and The Hideaway - with RP present as a symbol and the umbrella philosophy  (owner, 2026-11-14).

### Mersi's palette (captured 2026-11-15)

Read from mersi-architecture.com's computed styles, at 1440 × 900: the home reel, Projets, Agence, Contact and a project page. Four interface colours and twelve project colours; each project card carries one. The last column is a first read against the brief above (between LOSTINSEOUL and The Hideaway, with Restored Projects as the symbol and umbrella philosophy). It's a proposal: every colour is the owner's to check.

| Colour | Hex | Lightness · chroma | Dark text on it | On a dark ground | First read |
| --- | --- | --- | --- | --- | --- |
| Ground | #EDE7DE | 0.93 · 0.014 | 14.2:1 | — | The light ground (Q2's leaning) |
| Sand surface | #DCD4C8 | 0.87 · 0.019 | 11.8:1 | — | Raised surfaces on the light ground |
| Stone | #BEB4A7 | 0.77 · 0.021 | 8.5:1 | 8.5:1 | Lines, quiet fields |
| Text | #1A1A1A | 0.22 · 0 | — | — | Text on light; near The Hideaway's dark ground |
| Berri | #AAA798 | 0.73 · 0.021 | 7.2:1 | 7.2:1 | Quiet field |
| Tonnemani | #B3A696 | 0.73 · 0.027 | 7.3:1 | 7.3:1 | Quiet field |
| Segur | #918F7A | 0.65 · 0.030 | 5.3:1 | 5.3:1 | Quiet field, olive cast |
| Paix | #CCB598 | 0.79 · 0.048 | 8.8:1 | 8.8:1 | Warm field: The Hideaway's side |
| Hamelin | #BB7E4A | 0.64 · 0.102 | 5.1:1 | 5.1:1 | Copper: The Hideaway's warmth |
| Aurelien Cohen | #DC8B3F | 0.71 · 0.134 | 6.5:1 | 6.4:1 | Ochre: The Hideaway's warmth |
| Naya | #AE4F2D | 0.54 · 0.133 | 3.3:1 | 3.3:1 | Rust: the edge, used rarely |
| Cook | #DC633F | 0.64 · 0.160 | 4.9:1 | 4.9:1 | The strongest colour: LOSTINSEOUL's edge, used rarely |
| Maurice Cafe | #657B69 | 0.56 · 0.038 | 3.8:1 | 3.8:1 | Sage: kin to deep green |
| Projets (slate) | #4A5E73 | 0.47 · 0.042 | 2.6:1 | 2.6:1 | Cool note; light text only |
| Projets (teal-slate) | #4E6D73 | 0.51 · 0.037 | 3.1:1 | 3.1:1 | Cool note; light text only |
| Atokym | #8B9EC1 | 0.70 · 0.056 | 6.4:1 | 6.4:1 | Periwinkle: furthest from the brief |

**What this changes.** Mersi's colours sit in the middle of the lightness range (0.47–0.79), so unlike deep green (1.33:1) every one stays visible on a dark ground, at 2.6 to 8.8:1. That reopens Q3 with real candidates. Dark text needs 4.5:1 for body copy, so Naya, Maurice Cafe and the two slates take light text or large type only.

**Next:** the owner has accepted the set (2026-11-15); the dark-mode green and the token structure (D1) still wait on the owner.

**Deep green, tuned to the set (2026-11-15).** The owner: deep green is a good fit, and could be tweaked to match the feel of the rest in colour terms. Mersi's colours are warm and muted: its neutrals sit at hue 73–103 with chroma 0.014–0.03, and its one green, Maurice Cafe, at hue 150 with chroma 0.038. Deep green sat at hue 166, bluer, with chroma 0.040. Proposal: keep its lightness (0.31, the depth that makes it the signature) and take Maurice Cafe's hue and chroma, which gives **#213627** in place of #1A362B. On the ground #EDE7DE it measures 10.5:1, and the ground's own text reads on it at the same ratio. It is still too dark for the dark ground (1.34:1), which is why dark mode takes the lighter step of the same family, Maurice Cafe #657B69 (3.8:1). A middle step, #405646 (6.5:1 on the light ground, 2.2:1 on the dark), is available for borders and hover states. The preview shows the original and the tuned green side by side.

**Green, split by job (owner, 2026-11-15).** Deep green as a background is fine and stays the signature; as a foreground (text, icons, rules) on the dark ground it needs something lighter. Proposal, all one family (hue 153, chroma 0.038–0.045):

| Job | Light mode | Dark mode |
| --- | --- | --- |
| Background (blocks, hero) | Deep green #213627; ground-coloured text on it 10.5:1 | Deep green #213627, the same block |
| Foreground (text, icons) | Deep green #213627, 10.5:1 on the ground | Light green **#8AA791**, 6.6:1 on #1A1A1A and 4.9:1 on a deep-green block |
| Quiet foreground (rules, hover) | Middle step #405646, 6.5:1 | Maurice Cafe #657B69, 3.8:1 |

The light green reads as body text on both the dark ground and the green block (4.5:1 is the bar). As a block on the dark ground, deep green still separates only faintly (1.34:1), which suits a block that fills the screen; a block that should stand apart on dark would need a rule or the quiet step around it. The preview shows the light green.

## Batch 3 · Type

*For review, drafted 2026-11-15 while the owner was away.* Covers F2–F5. Starting point, from the owner: the type setup matches The Hideaway's to start; Narcissian Nectare is the display face, normal or light; labels are sans by default, sans and mono in uppercase, mono and serif used selectively; the scale needs in-between sizes. Read from both codebases; nothing was changed.

### What the code shows

- **Both sites load the same Narcissian Nectare and SUIT files.** Beyond that the setups differ.
- **The Hideaway** sets SUIT as the body face explicitly, Narcissian Nectare as its serif token, Geist Mono as its mono and Blase as a "wide" face. Its root is 10px (62.5%) with its own size scale. In use: sans about 500 times, serif about 60, uppercase labels about 360 (mostly SUIT at 10–11px, tracked 0.18–0.32em).
- **This site** has no body-face rule; its sans token says Helvetica. The five font classes on the page root set no variables, so the SUIT and Narcissian Nectare tokens point at nothing, and the mono token points at itself. Which face body text gets depends on the order the bundler emits the font rules; a live check would settle it (most likely Narcissian Nectare). Sizes are Tailwind's defaults on a 16px root.
- **Narcissian Nectare has no light file** in either repo: 400 to 700, each with italic. "Normal" is available now; light needs a new file.
- **Faces in one site only.** The Hideaway: Blase (also Narcissian Nectare's fallback), Siegfried, Instrument Serif, Caveat, Doto, Mrs Saint Delafield. This site: Manrope, Nib Pro, H-A (Korean). Pretendard, Siegfried and Guida Mono files sit unused in public/fonts. The geist package, with Geist Mono, is installed here too.
- **The Hideaway's scale has a gap and a fold.** It jumps 18, 20, 24, 32, 36, 40, 48 px, and its 8xl and 9xl come out smaller than 7xl. Display sizes come from clamp() instead.

### Proposal

| Part | Proposal | Why |
| --- | --- | --- |
| Default sans (F3) | SUIT, set on the body as The Hideaway does | Matches The Hideaway; SUIT covers Korean too |
| Display (F2) | Narcissian Nectare 400 as "normal"; a light weight only if a file is sourced | No light file exists |
| Mono (F3) | Geist Mono, from the installed geist package | The Hideaway's choice; no new dependency |
| Labels (F3) | SUIT, uppercase, small, tracked wide; mono in uppercase where a label is technical | The Hideaway's most used label pattern; owner's Q7 |
| Scale (F5) | The Hideaway's sizes as the base, with the gap filled (no jump from 18 to 32 without steps) and the fold removed; display sizes by clamp() | Owner: in-between sizes needed |
| Tokens (F14) | Apply each font's variable to the page root; fix the mono token; one token per role (sans, serif, mono) | Today's tokens point at nothing |

### Questions for the owner

1. **Root size.** The Hideaway sets 1rem to 10px. This site uses 16px, and 167 files size and space themselves on it. Copy The Hideaway's sizes as pixel values on the 16px root (no layout shifts elsewhere), or move the root to 10px as The Hideaway does? Answered (owner, 2026-11-15): keep 16px, unless the other references besides MetaLab adjust the root. Checked 2026-11-15 (computed root size at 1440 and 390 px, read only): MetaLab sets a fixed 10px. Analogue, Blink, lamalama, Osklen and Tux keep 16px. Mersi scales its root with the window from 1024 px up (10.24px at 1024, 14.4px at 1440, 25.6px at 2560) and holds 16px below that. McAlpine steps it between 14px and 18px by window width. So two of the seven vary the root, both by window width and neither by moving to 10px. The base stays 16px; whether to scale it with the window as those two do is held for the owner, with the in-between sizes (F5). Answered (owner, 2026-11-15): 16px, fixed; the root doesn't scale with the window.
2. **Mono.** Geist Mono, as The Hideaway, or another face (Guida Mono's files are already here)? Answered (owner, 2026-11-15): the one The Hideaway uses, Geist Mono. The other mono faces stay registered, unused.
3. **Narcissian Nectare light.** Is "normal" enough for now, or source a light file? Answered (owner, 2026-11-15): the normal weight is fine; no light file.
4. **Faces from The Hideaway.** Bring Blase over (it's Narcissian Nectare's fallback and The Hideaway's wide face), or leave the extra faces behind? Answered (owner, 2026-11-15): yes, bring Blase back, and bring everything over from The Hideaway. Each face's role is assigned in the type table before use.
5. **Korean.** SUIT covers Korean; does H-A keep a role, or retire? Answered (owner, 2026-11-15): keep H-A as the Korean face.

### Fonts, reorganised from The Hideaway's stylesheet

*For review, 2026-11-15.* The owner: each face had a role, chosen for its look and its language coverage. Latin serifs carry no Korean, so the main serif is Latin with a Korean face behind it. Blase was the safe Korean fallback, and H-A (display only, no italic) was used where it looked better. Read from The Hideaway's font setup and stylesheet (fonts.ts; the @theme block in globals.css), with each face's Korean coverage counted from its files.

**What The Hideaway names.** There are no style names such as display, heading or label. Faces are named by token (sans, serif, wide, mono, dots), and sizes as text-body, text-small, text-h1 to text-h6 and text-p.

| Token | Face, then fallbacks | Korean coverage | Use in The Hideaway | Proposal |
| --- | --- | --- | --- | --- |
| sans | SUIT | 2,668 of 11,172 syllables, the common set | Body and nearly all interface text (about 590 uses) | Keep; the system sans catches rare syllables |
| serif | Narcissian Nectare, then Blase | Narcissian Nectare none; Blase all 11,172 | Display, quotes, titles (about 70 uses) | Keep, with Blase wired properly. The Hideaway names it as a plain "blase", which probably never matches the loaded font, so Korean in serif text falls to the system font there |
| serif with H-A (new) | Narcissian Nectare, then H-A, then Blase | H-A 2,368, a display set; Blase catches the rest | Not wired: H-A's files are present, nothing loads them | An opt-in token for display text where H-A looks better. Never italic: H-A has none, so italic text stays on the plain serif |
| wide | Blase | All 11,172 | Headings on the day-and-night pages (7 uses) | Keep |
| mono | Geist Mono | Not checked | 6 uses; doesn't work on The Hideaway's front end (its variable isn't applied) | Keep, with the variable applied |
| dots | Doto | Not checked | 6 uses | Bring over |

**The rest, brought over (owner: bring everything).** Siegfried, Caveat, Instrument Serif (used on the invoice and the ticket), Mrs Saint Delafield and Raleway Dots. On The Hideaway's front end their tokens resolve to nothing or go unused. Proposal: register each with a working token and no role until one is given.

**Sizes.** text-body, text-small, text-h1 to text-h6 and text-p come over by name, as pixel values on the 16px root (The Hideaway's 1.4rem is 14px; here that is 0.875rem). Its heading line heights point at variables that don't exist; that is fixed on the way over.

**Questions for the owner**

1. Rare Korean syllables in body text: the system sans (proposal), or Pretendard, whose files are already here, unused?
2. A name for the H-A serif token: serif-ha, or a name you prefer?
3. Does H-A have any use besides display text?

## Revision log

| Date | Change | Reached |
| --- | --- | --- |
| 2026-11-15 | Inventory first written: 14 foundations, 9 shell parts, 15 components, 19 pages, 7 technical decisions | — |
| 2026-11-15 | Batch 1 reviewed. 4c accepted; scope kept. Reference patterns relabelled as ways to do it, not rules (F1, F3, F5, F7, F9). F5 needs in-between sizes. F4: a new logo is welcome. Glass carries identity, shadows don't. Cursor style changes (F13). D2–D7 decided as "follow The Hideaway" and checked against its code; then D2 settled as dark until the visitor picks, D6 as TanStack Form, and D7 as Phosphor | F1, F3–F5, F7–F9, F11, F13; D2–D7; S5; docs/adr 0002–0007 |
| 2026-11-16 | D2 reworked to The Hideaway's two layers: a global theme (the visitor's pick, or the device setting until they pick) and a page theme that wins while its page is open and is never saved. The home page holds dark; others as we go. The mode switch is hidden on a page that holds its theme | F1, S5, D2; docs/adr 0002 |
