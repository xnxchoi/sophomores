# blink: motion, captured 2026-11-15 (1440×900, 390×844)

URL `https://blink.capital/`. Headless Chromium in the foreground, so `requestAnimationFrame` ran at about 60 fps (frames about 16 ms apart). There were four runs:
- `blink-load`: cold load.
- `blink-desk`: hover and a first scroll.
- `blink-scroll`: a second cold load, a lock-aware scroll, jumps and the menu exit.
- `blink-phone`: phone load, menu and one step.

Data is in `MC/out/blink/`. Both **declared** and **sampled** values count as **measured**. **Declared** means read from CSS or `getAnimations()`, so it is exact. **Sampled** means per-frame `getBoundingClientRect()` and computed-style polling, accurate to ±1 frame. **Estimated** means from video frames. All motion on the site is CSS keyframes, CSS transitions, or Vue `<Transition>` classes. The only per-frame inline-style motion is the background-video scroll scrub driven by Lenis.

Offsets in the intro use two anchors, because the intro runs on two clocks (§2, §10):
- **M** is app mount, when the first animations are created.
- **V** is the start of the background video's enter animation.

## 0. Motion in one paragraph
Blink's motion is metered and stepwise. Scrolling the hero does not move the page continuously. Scroll crosses a threshold, Lenis is **stopped** (input is ignored) for 1–3 s, and one CSS-timed event plays out. The step is a new notification card, a header fade or a story card. State flips are short and pop:
- colour or background cross-fades take 200 ms;
- scale-pops use the 400 ms `bounce-in`, which overshoots to 1.1, and a 300 ms title pop that overshoots to 1.25;
- opacity changes take 300–350 ms;
- all of these are `ease-in-out`.

Travel is slow and uses one steep curve, `cubic-bezier(0.5, 0, 0, 1)`: the tab bar enters over 3 s, people cards resize over 1.4 s, copy slides over 1.2 s, and the strategy stack moves over 0.8 s. The logo rise takes 1.5 s `ease-in-out`. Text enters word by word in two different stagger systems (§7). Concurrent elements mostly start in the same frame and are told apart by duration, not by delay. The intro is the exception: it is a timed chain of discrete beats.

## 1. Stack
- **Nuxt/Vue.**
  - Detected by the `/_nuxt/NmUm-x2B.js` bundle and `data-v-*` scoped attributes.
  - Vue `<Transition>` classes are visible in the class log: `bounce-enter-from/-active/-to`, `fade-leave-*`, `scale-move`, `slide-fade-*` and `main-menu-enter-*`.
  - `window.__NUXT__` is absent. Measured.
- **Lenis.**
  - Detected by `html.lenis`, `lenis-smooth`, `lenis-scrolling` and `lenis-stopped`.
  - `lenis-stopped` is the step gate described in §6.
- **No other animation libraries.** There is no gsap, three, canvas or Motion: `window.gsap` and `THREE` are undefined, and there are no WAAPI animations besides CSS ones. The only other script is the Cloudflare beacon.
- **Hero background.** A `<video>` (an iridescent ring) whose `transform` and `opacity` are written inline every frame from scroll position.

## 2. Load and intro (1440×900)
Two cold loads were measured:
- Load 1: M = +2,196 ms after navigation, V = M+1,933.
- Load 2: M = +5,437 ms, V = M+3,467.

On the phone, V = M+1,473. Everything after V keeps the same offsets in all three runs, within ±16 ms. The logo rise is tied to M. So whether the glyphs light up during the rise or after it depends on load timing:
- In load 1 they overlapped the last about 900 ms of the rise (glyphs M+2,100–2,850).
- On the phone they overlapped almost the whole rise (glyphs M+1,620–2,700, rise M+1,500–3,000).
- In load 2 they came about 630 ms after the rise ended.

| Offset | Element | Property | Duration | Delay | Easing | Source |
|---|---|---|---|---|---|---|
| M+0 | `.title-logo` row (6 glyphs `B L / * N K`, `justify-content: space-between`, spread across all 1,440 px, glyph pitch 276 px), vertically centred | appears; glyphs at opacity 0.5 | — | — | — | sampled |
| M+0…≈M+900 | glyphs | font swap from a Times fallback to Guida Mono Pro (glyph x positions shift, pitch 277 px to 276 px). This is font loading, not designed motion. | — | — | — | sampled, and frame at 2.6 s |
| M+0 | `.app-header__logo--intro` | `logo-animation` runs 3,000 ms. It holds at `translateY(calc(-50% + 50dvh))` for the first 50%, then moves to `translateY(0)`. | 3,000 total; the move segment is 1,500 | 0 | per segment `ease-in-out` | declared |
| M+1,500→M+3,000 | the same row | y 426 → 12 (414 px), the whole row as one unit. Midpoint y 219 at about +750 ms, so the curve is symmetric. | 1,450–1,500 | — | ease-in-out | sampled |
| V+0 | `<video>` background | `background-enter-animation`: opacity 0 for 0–20%, 0→1 for 20–40%, then scale 1→1.3 for 40–100% | 5,000 | 0 | per segment `ease-in-out` | declared |
| V+0 | `html` | `lenis-stopped`: scroll is locked through the intro | until V+5,005 | — | — | class log |
| V+150, +300, +450, +600, +750, +900 | glyphs B, L, /, *, N, K, left to right | opacity 0.5 → 1 (class `active` added, 150 ms apart) | 300 each | stagger 150 | ease-in-out | declared, and sampled per frame |
| V+2,000 | `.app-menu` tab bar | `main-menu-in`: translateY(50 px) → 0, rising from below the bottom edge. No opacity change. | 3,000 | 0 | cubic-bezier(0.5, 0, 0, 1) | declared |
| V+3,000 | logo | `--intro` class removed (the animation has already finished) | — | — | — | class log |
| V+5,005 | `<video>` | switches to class `scrub`: inline `transform: scale(1.3)` and `opacity: 1` from now on (§6) | — | — | — | class log |
| V+5,005 | `html` | Lenis unlocks | — | — | — | class log |
| V+5,016 | `.fake-notifications` (the first card) | `bounce-in`: scale 0 → 1.1 → 1 and opacity 0 → 1 (opacity reaches 1 at the peak), from its centre | 400 (two segments of 200) | 0 | per segment `ease-in-out` | declared; sampled peak scale 1.1 at +198 ms, settled at +400 ms |
| V+5,016 (same frame) | `.title-logo` row | **dock**: width 1,440 → 1,008 px in **one frame**. Glyph K jumped from x 1,392.8 to x 960.8 between consecutive frames, and pitch went from 276 px to 190 px. Not a tween: the notification column mounts and the flex-grow logo is squeezed. | 0 (one frame) | — | none | sampled |
| V+5,016 + 100 | `.notification__title` "From:Blink team" | `bounce-in-text`: scale 0 → 1.25 → 1 and opacity | 300 | 100 | per segment `ease-in-out` | declared |
| V+5,016 + 50·i | notification body words (16 spans) | `text-animation-alt`: opacity 0→1, translateY 20 px → 0 | 200 each | 50, 100 … 800 | ease-in-out | declared |

So the intro is a chain of discrete beats. The rise is 1.5 s and soft. The glyph lighting is a 150 ms left-to-right stagger. The bar enters at V+2 s. At V+5 s the notification pops in and the logo snaps to its docked width in the same frame. The logo is **timed, not scroll-linked**. After the intro it never moves again, except when the whole header fades at the hero exit (§6). Frames of each beat are in `out/blink/load-contact.png` (estimated visual check).

## 3. Page change
Skipped: there is no page change.
- The site is one page, and every tab is a hash link (`/#origin` and so on).
- A click sets `scrollY` to the chapter offset in one frame. There is no smooth scroll and no route change.
- Nothing leaves or covers the page except the in-page transitions listed under §4 (Jump).

## 4. Navigation and menu
**Tab bar**
- Entry: see §2.
- `.app-menu__items` is 532×33 at x 454, y 855 (measured). It sits inside `.app-menu`, a fixed 1,416-px-wide flex row with the bar centred.

**Hover and current item**
- Both are the same state: white background and black text.
- Background colour and text colour transition together: 200 ms `ease-in-out`, delay 0 (declared).
- Moving from item A to item B starts A's fade-out and B's fade-in in the **same frame**. There is no sliding indicator, no stagger, and no transform.
- Hovering an item that is not current shows **two** white blocks, the hovered one and the current one.

**Current follows the scroll chapter**

| Trigger | Elements | Property | Duration | Easing | Source |
|---|---|---|---|---|---|
| reaching Origin, at scrollY about 1,800 | the old current and the new current item | background and colour cross-fade, simultaneous | 200 | ease-in-out | declared |

**Exit at Contacts and re-entry**
- On a jump to Contacts, `.app-menu` plays `main-menu-out`: opacity 1→0 over 750 ms, cubic-bezier(0.5, 0, 0, 1) (declared). Then it is removed.
- Scrolling back up out of Contacts plays `main-menu-in` again: translateY 50→0 over 3,000 ms, cubic-bezier(0.5, 0, 0, 1).

**Jump (tab click)**, measured on Origin, Strategy, People and Contacts:
- At +2 ms, `no-transition` is added to the elements that hold transitions: `.how__circle` and the `strategy-card-wrapper`s. It is removed at +155 ms, so the instant scroll does not animate them.
- In the same frame:
  - The header (logo and notifications) fades out: 350 ms opacity, `ease-in-out`.
  - The `.how__content` copy leaves: 600 ms with a 200 ms delay.
  - On the jump to Contacts, the People cards ran their 1,400 ms `min-width` transition to the last step.
  - The target chapter's serif headline replays its word reveal (§7) about 350 ms later, once the header fade ends.

**Phone menu** (390×844)

| Offset | Element | Property | Duration | Delay | Easing | Source |
|---|---|---|---|---|---|---|
| tap +0 | MENU button (160×33) | background → white, text → black | 200 | 0 | ease-in-out | declared |
| tap +0 | the new icon line pair | `menu-icon-first/second`: from translate(−100%, ∓3 px) to translateY(∓3 px) at 75%, then to 0. The lines slide in from the left and merge, so the two-line icon ═ becomes a single line —. | 400 | 0 | per segment `ease-in-out` | declared |
| tap +0 | list of five items, each 160×33, stacked upward (container 33 → 198 px tall) | appears in **one frame**: no transition, no stagger | 0 | — | — | sampled |
| close +0 | button | reverses to transparent and white text | 200 | 0 | ease-in-out | declared |
| close +0 | icon | the same keyframes played with `reverse` (CSS), 400 ms | 400 | 0 | ease-in-out | declared |
| close +0 | list | disappears in one frame | 0 | — | — | sampled |

## 5. Hover and micro-interactions
- Only the tab-bar items, and the phone MENU button, respond to hover.
- Hovering these produced **zero** animation, transition or style events (measured):
  - the notification card;
  - an Origin story card;
  - the Skip control;
  - two People cards.
- Contacts, checked in a separate run (`blink-contacts`):
  - "→ Connect with us" is a `<span>`.
  - "design by charmer" is a `<span class="link">` with `cursor: pointer`.
  - Hovering them, the "© blink 2026" footer and the text block produced **zero** events (measured).
- The cursor is the native cursor; there is no custom cursor.
- Micro-detail on the notification:
  - When it is demoted, its time label "now" fades out over 350 ms. A wall-clock time (for example "12:16:31 AM") then fades in over 350 ms. Both are `ease-in-out`, Vue out-in mode, and the clock fade starts about 365 ms after the first one began.
  - On re-promotion, the label reverses.

## 6. Scroll
**Lenis smooth scroll with step gates.** The steps are triggered, not scrubbed.

Measured with a lock-aware wheel (100 px wheel steps, waiting out each lock):

| Scroll position at trigger (down) | Step | What plays | Lock (`lenis-stopped`) |
|---|---|---|---|
| ≈304–308 | Hero step 1 | Card 1 background goes violet `#690de2` → `#161616` (200 ms `ease-in-out`). Its time label cross-fades (§5). Card 2 `bounce-in`s below it (400 ms). Card 2's title pops after a 100 ms delay, and its 26 words take 50 ms steps, finishing at about 1,500 ms. The container's height snaps 169 → 337 px in one frame. | 1,582 ms in run 1; 2,501 ms in run 2. It varied, and the cause was not isolated. |
| ≈600–604 | Hero exit | The whole `.app-header` (logo and both cards) fades: opacity over 350 ms, `ease-in-out`. When the fade ends, the Origin serif headline reveals (§7). | 1,002 and 1,001 ms |
| ≈1,800 | into Origin | Tab current cross-fade (200 ms). The story progress bar fills: `scaleX` 0→1 over 3,000 ms, linear. | none |
| ≈1,800–3,650 | Origin stories 2–4 | The new card `scale-in`s from `transform-origin: right top`: 500 ms, delay 50, cubic-bezier(0.5, 0, 0.5, 1). In the same frame, the earlier cards slide left 336 px. This is a Vue `scale-move` FLIP: 500 ms on the same curve. Steps came about 600–610 ms apart at our wheel pace, so they are driven by scroll position (estimated at about 675 px per story). | none until the last story |
| ≈3,629–3,657 | Origin last story | — | 3,001 / 2,942 ms. This equals the 3 s story timer. |
| ≈4,500 | into How | `.how__circle` rotates 0 → −90°: 1,200 ms, cubic-bezier(0.33, 1, 0.68, 1). Concurrently, the copy leaves: opacity plus translateY −60 px, 600 ms after a 200 ms delay, (0.5, 0, 0, 1). The new copy then enters: opacity plus translateY 40→0, 1,200 ms, (0.5, 0, 0, 1). The enter starts about 850 ms after the leave starts (Vue out-in). | none observed |

- **Scrolling up has no locks** (measured: 0 locks from 5,519 to 0).
- Story cards reverse with `scale-out-md`: scale 1→0 and margin-left 0 → −336 px, 500 ms, delay 50.
- The header fades back in (350 ms) when scrollY falls back to about 600 or below.
- Card 2 then leaves with `bounce-in` played in **reverse**: 400 ms, scale 1 → 1.1 → 0 and opacity. In the same frame, card 1 returns to violet (200 ms). Card titles replay `bounce-in-text` when the header remounts.

**Scrubbed: the hero video only**
- Sampled per frame against `scrollY`:
  - `scale = 1.3 + 0.5 × min(scrollY, 900) / 900`. Residual 0.000 at every sample.
  - Scale stays flat while scroll is flat during locks.
  - Opacity is 1 until scrollY is about 630, then falls linearly to 0 at about 900. At scrollY 738 it measured 0.600 against 0.600 predicted.
  - At scrollY 900 the video is set to `visibility: hidden`.
- On the way up, the video's scale ran for 1,381 ms. Its curve fits `power2.out (cubic)` (re-fitted with the corrected analyser; RMS 0.051). It tracks the formula above, so it is Lenis smoothing of the scroll, not a tween.
- Phone: the same scrub starts from `scale(2) translateY(-7%)`.

Other observations:
- No pinned-header changes besides the hero-exit fade.
- No parallax besides the video.
- No sticky shrink of the tab bar.

## 7. Type in motion
There are two word-stagger systems, plus pops.
1. **`text-animation`** is used on the serif chapter headlines (hero/Origin title, People title, Contacts text).
   - Text is split into chunks of **1–3 words** ("for those", "who understand").
   - Each chunk animates `filter: blur(12px)` → none, opacity 0→1 and translateY(20 px) → none, `ease-in-out`.
   - **All chunks start in the same frame, with delay 0. The stagger comes from duration alone: 200·i ms.** The Origin line runs 200, 400 … 1,400. The Contacts line runs 200 … 2,200 over 11 chunks.
   - Later chunks therefore resolve more slowly as well as later (declared).
2. **`text-animation-alt`** is used on notification and strategy-message body words (mono, uppercase).
   - It works the other way round: a **fixed 200 ms** per word, with the stagger by **delay 50·i** (50, 100 … 1,300 ms).
   - Opacity plus translateY 20 px, no blur (declared).
3. **`bounce-in-text`** is used on card titles ("From:Blink team", strategy card headings).
   - Scale 0 → 1.25 → 1 with opacity, 300 ms after a 100 ms delay.
   - `ease-in-out` on notifications, `ease-out` on strategy cards (declared).
4. **`typing-text-animation`** is the strategy "typing" label.
   - It holds invisible at translateY(−20 px) for 50%, then drops in over 800 ms.
   - Typing dots use `typing-dots-animation`: 800 ms, `ease`, infinite (declared CSS, not triggered in this pass).
5. **Logo glyphs** are lit one by one with an opacity-only stagger (§2). There is no letter motion.

## 8. Phone differences (390×844)
**Logo**
- The row spans 390 px, with glyph boxes 26×36 and a pitch of 68 px. It rises 392 px over 1,500 ms (`calc(-50% + 50dvh)`).
- The glyph stagger is the same: 150 ms steps, 300 ms each.
- There is **no dock**. The notification stacks *below* the logo, full width at 366 px (x 12, y 72), so the logo keeps its 390 px width (sampled).

**Video**
- `background-enter-animation-mobile`: scale 1 → 2 with translateY(−7%) throughout, 5,000 ms.

**Tab bar and menu**
- Same 3 s entry. The bar collapses to the 160×33 MENU button (§4).

**Step 1**
- Same behaviour as desktop: card 1 is demoted (200 ms), card 2 bounces in below it (400 ms), and the time label cross-fades.

## 9. Vocabulary
Durations are declared. The × count is the number of distinct animated element families observed in this capture's runs; the duplicated stylesheet listing is not counted.

| Duration | × | Used for |
|---|---|---|
| 200 | 5 | colour/background flips (desktop tab items, phone MENU button, notification demote); per-word `text-animation-alt` (notification body, strategy messages) |
| 300 | 3 | glyph opacity; `bounce-in-text` (notification title, strategy heading) |
| 350 | 3 | `fade` enter/leave (header, time label); strategy card colours |
| 400 | 3 | `bounce-in` (first notification container, later notification cards); menu icon pair |
| 500 (+50 delay) | 3 | story card scale-in, scale-out-md and `scale-move` FLIP |
| 600 (+200 delay) | 1 | How copy leave |
| 750 | 1 | tab bar exit |
| 800 | 2 | strategy stack transform; typing label |
| 1,000 | 1 | People cards fade (`cards-fade`, holds at 0 until 40%, then translate 60 px → 0) |
| 1,200 | 2 | How copy enter; orbit rotation |
| 1,400 | 1 | People card `min-width` |
| 1,500 | 1 | logo rise (a segment of a 3,000 ms animation) |
| 3,000 | 2 | tab bar entry; story progress bar (linear) |
| 5,000 | 1 | video enter (desktop and mobile variants) |
| 200·i | 1 | headline chunks (one system on three headlines: Origin, People, Contacts) |

Easings, with the same count of element families:
- **`ease-in-out` ×16**: the default for every opacity, colour and scale-pop, for word reveals and for the logo rise. It is applied per keyframe segment, so overshoot pops are two `ease-in-out` halves.
- **`cubic-bezier(0.5, 0, 0, 1)` ×6**: a slow start and a long, very soft landing. Used for large travel and resize: tab bar in, tab bar out, People width, strategy stack, How copy enter and How copy leave.
- **`cubic-bezier(0.5, 0, 0.5, 1)` ×3**: symmetric. Used for the Origin story cards (scale-in, scale-out, move).
- **`cubic-bezier(0.33, 1, 0.68, 1)` ×1**: fast start, ease-out. Used only for the orbit rotation.
- **`linear` ×2**: the progress bar, and the video scroll scrub (proportional to scroll).
- **`ease-out` ×1**: the strategy title pop.
- **`ease` ×1**: the typing dots (declared, not triggered).

## 10. Sequencing
- **Snappy versus subdued, by property** (declared):
  - Colour, opacity and scale-pops last 200–400 ms with `ease-in-out`, and overshoot reaches 1.1 to 1.25.
  - Position and size travel lasts 800–3,000 ms on `(0.5, 0, 0, 1)` or `ease-in-out`: logo rise 1.5 s, bar 3 s, People 1.4 s, How copy 1.2 s, strategy 0.8 s.
  - This matches the owner's Osklen reading, where shape and state are snappy and position is subdued. The difference is that Blink's "snappy" carries an overshoot rather than a sharp ease-out.
- **Concurrency is mostly same-frame, told apart by duration.**
  - Tab A and B cross-fade together.
  - Card 1's demotion (200 ms) and card 2's pop (400 ms) start in the same frame. Card 2's title adds +100 ms and its words add 50·i.
  - Headline chunks all start together and end at 200·i ms.
  - Story FLIP move and new-card scale share the same 500 ms curve and start 50 ms apart (the delay).
  - In How, the orbit (1,200 ms, ease-out-like) runs over the copy's out-then-in (200 + 600, then 1,200 ms).
- **Explicit chains** exist only where Vue `mode="out-in"` or timers impose them:
  - the intro beats (V+150 stagger, V+2,000 bar, V+5,000 notification and dock);
  - header fade, then headline;
  - time-label out, then in.
- **The step gate is part of the choreography.** Scroll input is stopped for 1.0–3.0 s while each hero or story step plays (§6). This metering only applies going down.
- **Two clocks in the intro.** The rise is tied to mount; everything else is tied to the video start. Their overlap therefore varies from load to load (§2).

## 11. Gaps
- **What sets V.** It is the video enter start, and probably video readiness, but the `canplay` and `playing` listeners did not report. It is not established. The window from M to V was 1.9 s, 3.5 s and 1.5 s across three loads.
- **Hero step-1 lock length.** It varied (1,582 ms against 2,501 ms) and the cause was not isolated. Wheel input continued during the lock in run 1 and was paused in run 2.
- **Chapters not scrolled through step by step.**
  - Strategy (message stack, typing dots) and People steps were seen only through tab jumps. Their per-step timings above are declared CSS, not observed in sequence.
  - Contacts' lower content was not explored.
- **Phone.** Only the first hero step was measured. The step thresholds, Origin and later chapters on phone were not captured. How the old ═ icon pair disappears when the menu opens was not recorded: no animation fired on it, though it is visually gone in `phone-menu-compare.png`.
- **Orbit step throttle.** The earlier record cites a 1.3 s throttle between orbit steps. Only one How step was captured (at scrollY about 4,500), so the throttle is unverified.
- **Font swap.** Its timing (under 900 ms after M) comes from sampling, and depends on the network.
- **Video frames.** Only spot-checked: `out/blink/load-contact.png` and `out/blink/phone-menu-compare.png`. Visual descriptions from them are estimated.
