# Blink reference: source behavioral contract

Source inspection only, 2026-10-03. Downloaded scripts were treated as untrusted text and **never executed**. Formatting used the locally installed Prettier Babel/CSS parsers. This is source-backed intent, not browser proof, timing measurements, or proof of asset appearance. Root audit owns browser confirmation.

## Evidence files / entry points

All paths below are relative to this evidence directory.

| Alias | Evidence file | Role |
|---|---|---|
| P | `reference-page.formatted.js` | Home sections, notification/header, story, orbit, strategy, people/footer |
| B | `reference-bundle.formatted.js` | Shared store, Lenis, keyboard navigation, video and background |
| C | `reference-rendered.formatted.css` | Captured rendered stylesheet rules; includes repeated equivalent component rules |
| N | `reference-layout.formatted.js` | Default layout, desktop/mobile navigation, skip |
| L | `reference-lock.formatted.js` | Temporary scroll lock and user escape behavior |
| A | `reference-lottie.formatted.js` | Lottie component defaults and playback lifecycle |

Original page/bundle/CSS files were already supplied. Three additional source dependencies were fetched only from literal observed imports: `https://blink.capital/_nuxt/DuULU8RX.js` (P:41), `https://blink.capital/_nuxt/BYEoHfWb.js` (B:11 and B:10455), and `https://blink.capital/_nuxt/WPl0FuOn.js` (P:42). Saved as `reference-lock.js`, `reference-layout.js`, `reference-lottie.js` and formatted companions. No guessed dependency path, no production mutation, no browser automation.

## Execution / orchestration model

- Section order: hero → origin → how → strategy → people → contacts (B:10788–10795; P:1186–1190).
- Shared scroll quantizer (P:258–283): progress is clamped `(scrollY - section document top) / max(section offsetHeight - innerHeight, 1)`; displayed target step is `floor(progress * stepCount)`, clamped to the final index. Active means strictly `0 < progress < 1`, not intersection visibility.
- Target step centers for programmatic story navigation are `sectionTop + scrollSpan * (index + 0.5) / stepCount` (P:268). Scroll thresholds are therefore discrete, while smooth scrolling is continuous.
- Delayed displayed-step helper (P:490–512): changes displayed index by one immediately, then waits its section-specific duration before catching up another step. Can catch up forward or backward; while inactive, a target-step change sets displayed index directly. Reaching the final displayed index while not `navigating` invokes a 3000 ms scroll lock. This helper is shared by origin, how, and strategy, **not** people or hero.
- Scroll lock (L:4–39): stops Lenis and applies root overflow clip. Releases after supplied duration; default wheel grace is 200 ms. After grace a wheel input unlocks and scrolls to prior target plus wheel delta. Any touchstart immediately unlocks. A new lock cancels previous timeout/listeners. Thus “3 seconds” is an escapable maximum, not an unbreakable dwell.
- Lenis 1.3.16 bundle marker B:10818. App configuration: duration 1.2 seconds, exponential-out easing `min(1, 1.001 - 2^(-10*t))`, smoothWheel true, syncTouch true, wheel multiplier 1, touch multiplier 2 (B:11732–11740; shared setup B:11635–11680).
- Active nav section uses IntersectionObserver with a viewport-center line (`rootMargin` -50% top/bottom), separate from section quantizer state (B:11753–11764).

## Entry, logo, video, notifications, hero statement

1. On normal hero entry, background enters animation mode; nav visibility is requested after 2000 ms. Lenis is stopped and restarted after 5000 ms, at which point background switches to scrub mode (P:320–338). A non-hero initial hash bypasses this intro branch, enables menu immediately, and sets background to scrub; app initially jumps to that hash immediate+force (B:11750–11752).
2. Logo has six independently activated glyphs, one every 150 ms; 0.5→1 opacity transitions last 300 ms ease-in-out (P:45–99; C:169–199). Logo holds vertically centered through the first half of a 3-second ease-in-out animation, then rises to the top (C:137–155). The intro class is removed at 3000 ms (P:210–221).
3. Same header schedules notification container mount at 5000 ms, not at first scroll (P:210–221). Its first notification is initially active; second is mounted when hero step >= 1. First changes from active purple to inactive dark and its time swaps from “now” to a locale-time string captured on notification setup (P:103–200, P:352; C:1713–1767).
4. Notification mount uses 400 ms ease-in-out bounce: scale 0→1.1 at midpoint→1; leave reverses this. Title uses 300 ms bounce with 100 ms delay; each body word uses a 200 ms ease-in-out vertical fade and stagger `(wordIndex + 1) * 50 ms` (P:111–150; C:1256–1281,1747–1760). This is word-level, not character typing.
5. Hero occupies min-height 200vh, with a sticky 100dvh stage (C:56–64), and 3 quantized states. With stable viewport geometry, thresholds are approximately +33.33vh and +66.67vh from its top; actual formula uses offsetHeight and innerHeight.
6. Sequential forward transitions lock for 2500 ms with 1500 ms wheel grace except final hero state, which locks for 1000 ms with 500 ms wheel grace. `navigating` suppresses these forward locks (P:287–318). Touch can immediately escape either lock per L.
7. At hero final step, header visibility turns off; statement becomes visible 350 ms later and `showSkip` becomes true (P:309–318). Header fade is 350 ms ease-in-out (C:1248–1255). Returning below final step clears a pending timer, hides statement, and shows header again; it does **not** reset `showSkip` to false.
8. Statement copy/word segmentation is P:359–379. Words animate blur 12px + translateY(20px) + opacity 0 to clear/settled/visible. Crucial: spans 2–8 have progressively longer **durations** 0.2–1.4 seconds, not progressively later delays (C:101–124,1419–1429). First span has automatic duration. Typeface Nib Pro; uppercase conversion is not used: CSS is capitalize. Mobile statement font is 40px (C:65–129).
9. Video component is a normal autoplay/loop/muted/playsinline `<video>`, source `/videos/3000.mp4`; mount calls `play()` and catches rejection with a console warning (B:11783–11818). No source-controlled currentTime scrubbing or scroll-controlled playback. It uses object-fit cover and pointer-events none (C:1189–1197).
10. Intro video: 5 seconds ease-in-out; opacity held at 0 through 20%, reaches 1 by 40%, scales 1→1.3 desktop / 1→2 mobile. Mobile maintains translateY(-7%) (C:1–55). Scrub mode scales desktop `1.3 + heroProgress*0.5`; mobile `2 + heroProgress*0.8` with same -7% translate. Opacity stays 1 until hero progress 0.7, then fades linearly to 0 at 1; visibility hidden at exactly 0 opacity (B:11831–11844).

## Origin / story: triggers, timers, progress, manual controls, exit, reverse

- Four content records P:521–562. Backgrounds: plain first; second `circle` Lottie scaled .75; third `lines` Lottie rotated 90deg and scaled 3; fourth `/images/story.png` object-fit cover. Lottie defaults loop and autoplay true, speed 1, delay 0, SVG renderer (A:15808–15827). No pause-on-inactive story state is passed.
- Origin is 300vh minimum; sticky stage 100dvh (C:201–208). With normal 300vh geometry, span is 200vh and target step boundaries relative to section top are 0, 50vh, 100vh, 150vh. Programmatic centers are 25vh, 75vh, 125vh, 175vh. Active excludes exact top/end.
- Four-step displayed-state catch-up throttle is 600 ms (P:568–570); accumulated cards are `slice(0, displayedIndex + 1)`, not one card replaced in isolation.
- Autoplay is a 3000 ms timeout whenever displayed step or active status changes. Previous timer is canceled first. It schedules only when active and not on last card; on timeout Lenis scrolls to next step center over 0.8 seconds (P:571–587). Therefore “every 3 seconds” is not a wall-clock carousel independent of scroll; movement and threshold crossing affect the next timer start.
- Manual input listens on the whole sticky stage, not only card buttons. Pointer down records X/Y; pointer up must move no more than 10px on each axis. Right viewport half advances, left half reverses; out-of-range requests ignored. Valid request cancels auto timer, explicitly unlocks, then scrolls to target step center over 0.6 seconds (P:588–609). No dedicated story key listener, swipe next/previous handler, hover pause, hold-to-pause, or clickable indicator handler is present here. Global arrow/page keys navigate sections instead.
- Each card has four indicators; previous cards' completed bars include their own index. Current active card marks earlier bars complete and creates a fill only for its own index (P:435–456,638–639). Fill animates scaleX(0→1), 3000 ms linear both (C:319–328,407–414). Leaving active removes the current fill; reentering can remount/reset it.
- Final story card still has its 3000 ms progress animation, but **no automatic advance to orbit**; final step invokes escapable 3000 ms lock via common helper, then awaits user scroll/manual reverse/skip/nav (P:490–502,579–583).
- TransitionGroup name scale; CSS disabled while teleporting (P:613–615). Enter: 500 ms cubic-bezier(.5,0,.5,1), 50 ms delay, origin right top, scale 0→1. Group move 500 ms same easing. Reverse removes future cards with scale-out and negative margin-left: -624px default, -416px at 1728–1919, -336px <=1727 (C:1296–1369). Reverse is not identical to forward fade or slide.
- At widths <=1727, story card content box 280×537px + 24px padding on each edge = 328×585px outer box (global content-box C:1399–1404; C:243–281). Wrapper anchor right calc(50% - 164px); baseline bottom inset 45px (C:216–241). Short-height clipping risk must be checked in browser rather than assumed away.

## How / orbit

- Three data states at P:700–718; progress target uses three steps, display throttle 1300 ms, angle exactly `-displayedStep*90deg` (P:720–724). It is a discrete rotate-and-settle sequence, not free continuous orbit; no timed auto-advance or pointer control in this component.
- 300vh min section, sticky 100dvh stage. Approximate thresholds +66.67vh / +133.33vh relative to section top (C:415–423).
- Circle 164vw square, left -32vw, top 50dvh. White 1px border. Rotation transition 1.2 seconds cubic-bezier(.33,1,.68,1), disabled for teleporting (C:431–445). Cursor is 128px dashed vertical line centered horizontally / vertically (C:424–429).
- Red marker at top, blue at right rotated 90°, light blue at bottom rotated 180°, all 16px squares. Title travels with its marker; colors and anchor math C:446–478.
- Description keyed by displayed step uses slide-fade **out-in** (P:748–759): old description leaves over 600 ms plus 200 ms delay, translateY(-60px)/fade; only then new description enters over 1200 ms from translateY(40px)/opacity 0, both cubic-bezier(.5,0,0,1) (C:1225–1238). Full old-to-new text cycle can thus take ~2 seconds, separate from 1.2-second circle rotation / 1.3-second state throttle.
- Mobile retains huge circle; description uses 7.5vw side gutters, 18px font (C:532–568). Common final-state lock applies, with same 200 ms default wheel grace and immediate touch escape.

## Strategy / messages, typing, alligator image

- Exactly three source messages P:881–900; source image only in third message, `/images/image.png`. Source alone does not identify depicted animal; alligator appearance belongs to browser/asset visual evidence.
- 300vh sticky section (C:570–578), three steps, displayed state throttle 1200 ms, accumulated slice to current state (P:901–905). There is **no strategy auto-timer**, despite typing suggesting chat. User scroll changes the target; common helper can finish queued intermediate transitions and applies final-state lock.
- First card is never active/orange (`active` requires nonzero card index). Earlier cards set away; cards more than one behind set far-away (P:929–941). Active fill rgb(255,76,37), black message; away bg rgb(21,21,21), 50% white; far-away bg rgb(8,8,8), 20% white; colors transition 350 ms ease-in-out (C:637–699).
- Middle message alone has typing flag; rendered only when that card is active (P:887–891,850–868). Typing label enters over 800 ms ease-in-out, holds invisible/translateY(-20px) first 50%; dots loop 800 ms ease with delays 0,200,400 ms and opacity .5→1 / scale 1→1.1 (C:761–817).
- Body words stagger 50 ms each on mount, animate 200 ms ease-in-out from translateY(20px)/opacity 0. Heading text bounces 300 ms ease-out after 100 ms (P:790–800; C:722–755).
- TransitionGroup bounce-alt appear; disabled during teleporting (P:913–916). Card mount/leave is 800 ms ease-in-out using independent CSS scale property, 0→1.1→1; leave reverses it (C:1262–1294). Position changes use separate transform transition 800 ms cubic-bezier(.5,0,0,1) (C:579–636).
- Desktop position choreography, relative to card's own dimensions at anchor 50vw/50vh: first alone (-50%,-50%); first after second (-75%,-105%) scale .85; first after third (-115%,-330%) scale .7225; second current (-20%,-20%); second after third (-70%,-265%) scale .85; third current (-20%,-50%). Mobile uses centered X=-50% throughout; corresponding Y=-50%/-100%/-260%/-50%/-220%/-50% (C:588–635).
- Mobile content-box card width min(348px,100vw - 84px) plus 48px horizontal padding; default/desktop widths C:637–667. Third image has 4px border radius (C:758–760), no source interaction.

## People: expanding available view, then natural mobile stack

- Three image cards use `/images/img1.png`, `/images/img2.png`, `/images/img3.png`, with 96×96 image dimensions (P:978–1151). Quantizer has 3 steps without delayed-step helper / auto-advance / final lock (P:989–991). Every card shares the current step class.
- Desktop content sticky top 0, height calc(100vh - 100px), padding 12px 12px 0, overflow hidden, title/cards spaced apart. Scroll spacer height 150vh (C:822–833,971–982). This makes nominal section height about 250vh - 88px including top padding; trust measured offsetHeight for exact thresholds.
- Cards are a horizontal flex row gap 12px, max-height 508px. All start min-width calc(91.6667% - 48px), then step1 calc(45.8333% - 53.5px), then step2 calc(33.3333% - 56px); each has 24px padding and 130px internal gap. Transition is 1.4 seconds cubic-bezier(.5,0,0,1) (C:898–939). Effect is shrinking card width to reveal more peers, not a carousel translating through three individual cards.
- Cards have a 1-second ease-in-out entrance; first 40% holds opacity 0 and translateX(60px), then settles (C:898–904,1175–1187). Title word durations match 0.2–1.4-second progressive durations (not delays) (C:873–896). These declarations are mounted normally; source contains no people visibility observer to initiate replay.
- At <=1023px (tablet as well as phone), sticky is removed, height fit-content, cards stack vertically, max-height unset, spacer height unset (C:834–844,905–915,974–982). At <=767px base card min-width becomes calc(100% - 48px), but later step1/step2 rules still exist (C:930–939); verify resulting layout rather than treating desktop thresholds as mobile behavior.

## Footer / contacts / text / navigation

- Footer text starts opacity 0. Passive scroll callback checks text bounding top < innerHeight - 100, adds animated class and hides nav. Otherwise nav becomes visible. Class is **never removed**, so text animation is one-shot; nav reverses based on threshold (P:992–1003; C:1057–1123). Callback is registered on mount, not called directly then; browser initial/deep-link behavior must be observed.
- Twelve spans animate same blur12/translateY20/opacity keyframe; spans 2–12 use durations .2 through 2.2 seconds in .2 increments, no staggered delays (C:1085–1123,1419–1429). Footer copy segmented in P:1166.
- Footer is height calc(100dvh - 24px) + 24px padding, i.e. 100dvh outer content-box; overflow hidden, black-to-transparent gradient at 75%. Two-column content with 20% gap becomes a column with 32px gap on phones (C:984–1009). Phone text 32px (C:1080–1083).
- Footer mounts another instance of the same autoplay looping video, independently of hero progress. It is positioned top 60%, height 180%, width 100%, z-index -1 (P:1169; C:1150–1156). Do not implement it as the hero video merely returning to view.
- Connect text is a static span, no href / click in captured source. Design credit is an onclick opening charmerstudio in a new tab; year dynamic (P:1004,1163–1177). Do not infer a contact link behavior from the CTA's appearance.
- Menu shown through conditional mount in default layout (N:511–531). Enter animation 3 seconds cubic-bezier(.5,0,0,1) translateY50→0; leave 750 ms same easing opacity1→0 (C:1371–1392). Intro requests show at 2 seconds, so the menu finishes entering near 5 seconds.
- Desktop all six section links; current/hover white background and black text, 200 ms ease-in-out. Fixed bottom `max(safe-area-inset-bottom + 8px,12px)`, horizontal inset12px, 16px backdrop blur (C:1608–1637).
- Menu selection unlocks, sets teleporting, scrolls immediate+force to section, clears teleporting after150ms. TransitionGroups/position transitions opt out during teleport (N:385–400; P:615,738,915,941). It is not smooth scrolling between menu destinations.
- Skip exists after hero statement but hidden in people/contacts. Skips one section via 1.2-second scroll, marks navigating for1400ms (N:308–338). No explicit unlock in skip handler. Global ArrowDown/Right/PageDown and ArrowUp/Left/PageUp similarly navigate next/previous section and hold navigating1400ms (B:11716–11728); not story-specific keyboard control.
- Mobile store threshold is **innerWidth < 767**, whereas most CSS phone queries are max-width767px (B:10813–10815; C:164–166 etc.): exact767px is a JS/CSS breakpoint mismatch to include in audit.
- Mobile menu is a160px-wide column-reverse popover. Current section button toggles open; on hero there is generic Menu toggle and Home is excluded from its list. Other destinations exclude current item. Selecting item navigates and closes (N:395–470; C:1638–1668). Menu icon enter/leave400ms ease-in-out (C:1573–1584). Source shows no overlay outside-click or Escape dismissal/focus trap handling in AppMenu.

## Architecture / comparison recommendations

- Treat quantized scroll target, displayed staged index, active-range flag, intro wall-clock time, and navigation bypass flags as separate state domains. Conflating them will produce false equivalence in screenshots.
- Match measured orchestration, not just visual labels: story auto-advances but orbit/strategy do not; people changes width without staged throttle; menu teleports; keyboard and skip scroll by section; footer text is one-shot.
- Compare easing and independent clocks separately: e.g. orbit rotation1.2s, displayed-state throttle1.3s, out-in copy roughly2s; story fill3s versus auto-scroll.8s versus group enter.55s including delay.
- Reference omits several robust controls (semantic CTA, focus management, some short-height handling, reduced-motion branch in inspected app-specific sections). These are audit observations, not blanket instructions to reproduce accessibility weaknesses.
- External/runtime dependencies evidenced: Nuxt/Vue, Pinia-style shared store, Lenis1.3.16, Lottie SVG; Guida Mono Pro and Nib Pro local/site fonts. Shared boundaries: scroll quantizer, staged-index helper, scroll lock, video component, navigation flags.
- Browser-only remaining proof: asset identities/content, actual elapsed timings and frames, scroll-lock feel and cancellation, autoplay/media load, route/hash return behavior, clipping/overlays on real viewport dimensions, contact button behavior elsewhere, keyboard/touch usability.
