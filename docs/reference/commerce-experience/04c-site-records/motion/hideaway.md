# Hideaway page change: motion record

Source-only record. Every number below comes from source code, cited by file and line. Nothing was measured live, and no dev server, build or browser was run.

Path abbreviations:

- **O** = `/Users/seanschoi/WebstormProjects/thehideaway/src`. This is the original, on branch `temp-show` at HEAD `2df474db`. Its uncommitted edits to the motion files only rewrite import paths (`src/…` to `@/…`).
- **H** = `/Users/seanschoi/orca/workspaces/sphmrs/hamlet/src`. This is the current site.
- **TP** = `providers/TransitionProvider.tsx`
- **TI** = `components/UX/Transition/index.tsx`
- **UTS** = `components/UX/Transition/useTransitionSetter.tsx`
- **PG** = `components/UX/Transition/pageGroups.ts`
- **ST** = `stores/RP_Ui.ts`
- **AN** = `constants/animations.ts`
- **HC** = `components/Shells/Header/HeaderClient.tsx`
- **MN** = `components/UX/Menu/index.tsx`
- **PP** = `styles/__pagePortal.scss`
- **MB** = `components/UX/Menu/MenuButton.tsx`
- **FX** = `components/Shells/FXFrame/index.tsx`
- **CM** = `components/Shells/ContentMask/index.tsx`

Symbols used in the offset column:

- `R` is route resolution time: from `router.push` until the pathname changes. Source does not bound it.
- `rAF` is one `requestAnimationFrame` hop plus a React `startTransition` (TP:42-46).
- Offsets marked "computed" were solved from the cited Bézier curve. They are arithmetic, not measurements.

---

## 0. Summary

**A correction to the brief comes first.** The values 1.24 s and 1.28 s with ease `[0.6, 0, 0.3, 1]` belong only to the **LOST_PRODUCT** transition.

- The copy at `TI:208-240` (`transitionMappings`, with keys start/enter/exit) is not what a page reads.
- `RPage` reads the store map at `O/ST:161-282` (keys none/entering/leaving). LOST_PRODUCT sits at `ST:226-256`, and its 1.24 / 1.28 values are at lines 240 and 252.
- In hamlet the same values are at `H/ST:242` and `:254`, and at `H/TI:223-224` and `:236-237`.
- LOST_PRODUCT takes about 2.1 s plus `R`. That is over 1.4 s.
- LOST_PRODUCT cannot be reached on the hamlet site, because hamlet's classifier comments out the lost groups (`H/UTS:197-203`).

**Two Hideaway page changes have authored motion under 1.4 s.** `pickTransitionType` (`PG:195-216`) chooses between them.

- **CURTAIN** (when the source and destination page groups differ) is a closing four-sided wipe.
  - Two half-screen panels slide in from the left and right edges. Two 8rem bands slide in from the top and bottom. All four are painted the same `--n-s-menu` colour as the site's thin resting frame.
  - Under the panels, the whole app layer (`.rp-container`: page, header, logo and frame) fades to 0.
  - The route is swapped behind the opaque cover. The cover then retracts faster than it closed.
  - Timing: 0.70 s cover (`power4.inOut`) + `rAF` + `R` + 0.40 s reveal (`power3.inOut`) + `rAF`. That is **1.10 s of authored motion**.
- **FADE** (same page group) has no cover.
  - The chrome stays: header, frame and logo.
  - The new page mounts at opacity 0, waits 0.70 s, then fades in over 0.30 s (`easeIn`). That is **1.00 s after mount**, and so `rAF` + `R` + 1.00 s after the click.

**Character.** The motion is heavy-in/out and symmetric (quart-like `inOut` curves), with an asymmetric close and open: 0.7 s to close, 0.4 s to open. It uses a single colour for frame and cover, works by full occlusion rather than crossfading content, and pauses on a blank page before content arrives in FADE.

**How this maps to hamlet.** Hamlet's classifier puts `/shop`, `/team`, `/help` and other unlisted heads in group `static` (`H/UTS:236-238`, the default fallback). Most hamlet page changes therefore resolve to **FADE**. Changes between home (`/`, `/home`), `/me` or `/account`, the auth pages, `/users` and `static` resolve to **CURTAIN**.

---

## 1. Stack

| Layer | What | Source |
|---|---|---|
| Route orchestration | `next-transition-router` 0.2.11 `TransitionRouter leave/enter`. The stage moves none → leaving → entering → none. `leave(next)` runs before `router.push`. `enter(next)` runs when the pathname changes. | O `package.json:198`; `node_modules/next-transition-router/dist/index.js` (`navigate`, stage effects) |
| Motion | `motion` 12.43.0 (`motion/react`, `motion/react-m`, imperative `animate`). `LazyMotion` uses `domMax`, `strict`. | O `package.json:190`; O `providers/index.tsx:26,53`; O `providers/Motion.ts:1-3` |
| Smooth scroll | `lenis` ^1.3.26, plus GSAP `ScrollTrigger.refresh()` on entry | O `package.json:181`; TP:189-199 |
| Transition choice | `pickTransitionType`: an override, else FROM_MENU if the menu is open, else LOST_PRODUCT for lost↔lost, else SHELL for settings↔settings, else CURTAIN if the group changed, else FADE | PG:195-216 |
| Trigger | `Link` (wraps next-transition-router `Link`). The click calls `setGenericPageTransition(href)` synchronously; then the router `Link` calls `navigate` in the same click. The 120 ms delay applies only to `goToPage` callers. | O `components/core/Link/Link.tsx:9,98-110`; UTS:39-81 (120 ms at :76-78) |
| Cover | `.pt_container` (fixed, z-index 250, pointer-events none) holding 4 `.pt_mask` bands and 4 corner SVGs, driven by one motion value, `animationProgress` | TP:159-187, 814-871; PP:1-117 |
| App layer | `.rp-container` m.div wrapping all provider children: Header, RP_Menu (frame), Main/page | TP:803-813; O `app/(frontend)/layout.tsx:87-113` |
| Page wrapper | `RPage` → `TransitionInternal` m.div with `initial="none"`, `animate="entering"`, `exit="leaving"`, variants from the store | TI:355-618; ST:161-282 |

---

## 2. Page change, phase by phase

### 2a. CURTAIN (cross-group; the wipe)

| Phase | +offset | Target | Property | Duration | Easing | file:line |
|---|---|---|---|---|---|---|
| 0 click | +0 | store | `transitionOutType="CURTAIN"`, `isTransitioningWipe=true`. Refs are mirrored synchronously by subscription. | instant | — | UTS:46-53; TP:113-135 |
| 0 | +0 | router | stage → `leaving`; `leaver()` takes the `shouldRunWipe` branch | — | — | TP:741-757 |
| 1 cover | +0 | `animationProgress` (the single driver) | 0 → 1 | **0.70 s** | `TE.power4.inOut` = `cubic-bezier(0.76, 0, 0.24, 1)` | TP:519-532; AN:308 |
| 1 | +0 → +0.70 | 4 `.pt_mask` bands: top and bottom are 100% wide × 8rem; left and right are 50% wide × full height; colour `--n-s-menu` | translate from ±100% to 0 (`_frameMoves` = 100 → 0). Top moves on y−, bottom on y+, left on x−, right on x+. | rides the 0.70 s | inherits power4.inOut | TP:161, 180-183, 945-989; PP:13, 21-65 |
| 1 | +0 → ≈+0.342 (computed) | `.rp-container` (page + header + logo + frame) | opacity 1 → 0, mapped linearly from progress 0–0.45. `visibility: hidden` once opacity reaches 0. | ≈0.342 s (computed) | linear in progress, so power4.inOut in time | TP:184-187, 808-809 |
| 1 | +0 → +0.70 | 4 corner SVGs, 1.6rem, `--n-s-menu` | scale 0 → 1 (`_svgScale`). Translate `progress·(0.5·innerWidth − 1)` on x and `progress·(navWindow.top − 1)` on y, emitted with a **`%` unit** (see §7). | rides the 0.70 s | inherits | TP:160-171, 875-944; PP:67-117 |
| 1 | +0.05 | header `scrubPosition` (hidden: inside the fading container) | → 0 (expanded header) | 0.96 s | `TWEEN_EASE.power3.inOut` = `cubic-bezier(0.77, 0, 0.175, 1)` | HC:261-291 (delay 50 ms at :262; tween at :277-285) |
| 2 swap | +0.70 + rAF | app | `completeExfil`: `canInteract=false`, `window.scroll(0,0)`, `lenis.scrollTo(0, {immediate})`. Then `next()` = `router.push`. | instant | — | TP:200-207, 750-757 |
| 2 | +0.70 + rAF + R | new `RPage` m.div | Variant `none` (fixed, full viewport, pointer-events none) → `entering` (relative, auto height). No opacity change. | **0 s** | — | ST:205-224; TI:580-593 |
| 2 | same | page | `onAnimationComplete("entering")` → `setHeaderVisibility(prop)` and the page theme | — | — | TI:570-605 |
| 3 reveal | +0.70 + rAF + R | `animationProgress` | 1 → 0 | **0.40 s** | `TE.power3.inOut` = `cubic-bezier(0.77, 0, 0.175, 1)` | TP:506-518, 784; AN:303 |
| 3 | same → +0.40 | 4 bands | slide back out to ±100% | rides | inherits | TP:161 |
| 3 | +≈0.196 (computed) → +0.40 into the reveal | `.rp-container` | opacity 0 → 1 as progress passes 0.45 → 0 | ≈0.204 s (computed) | linear in progress | TP:184-187 |
| 4 settle | +1.10 + 2·rAF + R | app | `completeEntry`: scroll 0, `ScrollTrigger.refresh()`, `lenis.resize()`, `body` pointer-events auto, `canInteract=true`. Then `isTransitioningWipe=false` and `transitionOutType=null`. | instant | — | TP:189-199, 784-797 |
| 4 | settle + 20 ms | header | `headerDone` → `animate-to-previous`: a per-frame lerp (amount 0.08) toward the scroll-derived progress, cancelled after 1000 ms | ≤1.0 s | lerp | HC:452-474, 420-435; `headerMotion.ts:3,9-18` |

**Total, click to settled:** 0.70 + 0.40 = **1.10 s authored**, plus two `rAF` hops and `R`.

### 2b. FADE (same group)

| Phase | +offset | Target | Property | Duration | Easing | file:line |
|---|---|---|---|---|---|---|
| 0 click | +0 | store | `transitionOutType="FADE"`, `isTransitioningWipe=false` | instant | — | UTS:46-53 |
| 1 | +0 → +rAF | app | No cover: the `else` branch → `completeExfil` + `router.push` | instant | — | TP:769-774 |
| 1 | ≈+0.02 then +0.05 | header `scrubPosition` (visible) | → 0 (header expands to full width) | 0.96 s nominal, ending at +1.01 s; **cut short if R is small** (see the next row) | `TWEEN_EASE.power3.inOut` (0.77, 0, 0.175, 1) | HC:463-470 (`animate-to-full`, scroll animation re-enabled after 720 ms), HC:261-291. Each start stops the running one (HC:276, 400). |
| 4 | rAF + R + 0.40 + rAF + 0.02 | header `scrubPosition` | The enterer clears `transitionOutType` (TP:795) → `headerDone` 20 ms later → `animate-to-previous`. This stops the 0.96 s tween (HC:400) and hands the remainder to a per-frame lerp (amount 0.08) toward 0, cancelled after 1000 ms. The tween is cut only when this point falls before +1.01 s. | ≤1.0 s | lerp | TP:795; HC:479-491, 473, 398-435 |
| 2 | at commit | old page | Unmounts. Its `leaving` variant (opacity "0" after a 0.7 s delay, 0.3 s, `easeOut`) runs only if an exit is detected (see §7). | — / 0.3 s | `easeOut` = `cubic-bezier(0, 0, 0.58, 1)` | ST:176-184 |
| 2 | +rAF + R | new page | `none`: fixed, full viewport, opacity "0", pointer-events none | instant | — | ST:163-166 |
| 3 | +rAF + R + **0.70** | new page | opacity 0 → 1; position fixed → relative | **0.30 s** | `"easeIn"` = `cubic-bezier(0.42, 0, 1, 1)` | ST:153, 167-175; motion-utils 12.39.0 `easing/ease.mjs:3` |
| 3 | +rAF + R → +0.40 | `animationProgress` | 0 → 0 (already 0, so nothing moves); `completeEntry` runs when it resolves | 0.40 s | power3.inOut | TP:784-797 |
| settle | +rAF + R + **1.00** | page fully visible | 0.70 delay + 0.30 fade | — | — | ST:153, 172-173 |

**Total:** **1.00 s after mount**, which is `rAF` + `R` + 1.00 s after the click. Interaction is re-enabled at about +0.40 s after mount, while the page is still at opacity 0.

### 2c. Other types (all over 1.4 s, or only reachable by override)

| Type | When | Sequence (source values) | Authored total | file:line |
|---|---|---|---|---|
| LOST_PRODUCT | lost-commerce or lost-product ↔ either, path differs | **Leave:** the page is frozen in place (fixed, `top:-scrollY`, radius 4px, transform-origin at the viewport centre). A fog layer is added (`[data-lost-route-fog]`, z-index 1180, CSS 0.5 s / 0.54 s `cubic-bezier(0.52, 0, 0.22, 1)`). The page goes to `scale 0.5, scaleX 0.9` over **0.86 s**, `[0.6, 0, 0.3, 1]`. Navigation fires on an 860 ms timer. **Enter:** the new page goes from `y:100svh` to 0 over **1.24 s**, `[0.6, 0, 0.3, 1]`. Fog release fires at path change + 900 ms (0.62 s `cubic-bezier(0.6, 0, 0.3, 1)`). Cleanup fires at path change + 1800 ms; `transitionOutType` is reset 1520 ms after entry. The store's `leaving` (1.28 s) is a second definition of the scale-down. | 0.86 + R + 1.24 ≈ **2.10 s** + R | TP:553-679, 758-768, 781-792; ST:226-256; O `lostinseoul/index.css:189-340` |
| FROM_MENU | link clicked with the menu open | The page swap is instant (variants 0 s; the leaver takes the immediate branch). The menu closes 1200 ms after the click (+300 ms on mobile). Then the frame retracts and the page scales back, both over 1.2 s `power3.inOut` (§4). | ≈1.2 + 1.2 = **2.4 s** | ST:186-204; MN:1031-1059; MN:266-278; TI:500-546 |
| IMMEDIATE | override only | opacity 0.1 s `easeIn` / `easeOut` | 0.1 s | ST:257-282 |
| SHELL | `/me/settings` ↔ `/me/settings/*` | Not present in the O store map, so it falls back to FADE (TI:439-445). The `main` branch adds a TP pass-through (§6). | — | PG:207-213 |

---

## 3. What persists

| Element | CURTAIN | FADE | Source |
|---|---|---|---|
| Header (`#rp-header`, fixed, z-index 240; style z-index maps 249 → 245) | **Does not persist.** It is inside `.rp-container` and fades with it. The cover sits above it at z-index 250. | **Persists.** It animates to full width: `scrubPosition` → 0 over 0.96 s `power3.inOut`, starting at about +0.05 s. If `rAF + R + 0.42 s + rAF` is under +1.01 s, the tween is cut and a lerp finishes the move (§2b). | HC:512-544, 362; TP:803-811; PP:9 |
| Logo (`Mogo` in `#c-side`) | Fades with the container | Persists. Size follows the scrub: 28 → 22 px over scrub 0.1 → 0.3, so on expand it returns to 28 px. | HC:309, 605-630 |
| Resting frame: `.menu__frame` bands at 10 / 10 / 30 / 10 px (top / right / bottom / left; 0 when fullscreen), colour `--n-s-menu` | Fades with the container. The cover bands use the **same `--n-s-menu`**, and the left and right cover halves enter from the same screen edges the frame sits on. | Persists | O `providers/RP_Pro.tsx:243-246`; MN:235-279; O `styles/hideaway.scss:1518-1526`; PP:23 |
| FXFrame (bottom blur strip, fixed, z-index 10) | Fades with the container | Persists (follows the frame insets through springs) | FX:10-86; O `app/(frontend)/ClientLayout.tsx:15` |
| Cover itself (`.pt_container`) | Sits outside `.rp-container` and stays mounted; it is moved only by `animationProgress` | Idle at progress 0 (off-screen) | TP:814-871 |

---

## 4. Header and menu motion

### Header (Hideaway `HeaderClient`; not mounted in hamlet, see §6)

| Trigger | Target | Property | Duration | Easing | file:line |
|---|---|---|---|---|---|
| Mount or unmount (preloader done) | `m.header` | opacity 0 → 1, visibility | 0.3 s (library default; no transition given) | default `[0.25, 0.1, 0.35, 1]` | HC:510-525; motion-dom `animation/utils/default-transitions.mjs:23-27,37` |
| Scroll | `scrubPosition` | Set directly to `clamp((scroll − 50) / 350)` | live | — | HC:440-450; `headerMotion.ts:3-7` |
| Scrub-driven (0 → 1) | header | width viewport → 645 px (mobile: vw − 32). `translateY` 0 → 12 px (mobile 5 → 12). Z-index 249 → 245. Paddings; button background and blur 4 → 14 px; colour and blur overlays opacity = scrub; logo 28 → 22 px. | follows scrub | — | HC:303-371, 556-569 |
| Navigation leaving | `scrubPosition` | → 0 | 0.96 s | `TWEEN_EASE.power3.inOut` (0.77, 0, 0.175, 1) | HC:261-291 |
| `transitionOutType` set (not a wipe) | `scrubPosition` | → 0; scroll animation re-enabled after 720 ms | 0.96 s | power3.inOut | HC:398-418, 463-470 |
| After a transition clears | `scrubPosition` | per-frame lerp 0.08 toward the scroll target, cancelled after 1000 ms | ≤1.0 s | lerp | HC:420-435; `headerMotion.ts:9-18` |
| Resize | `scrubPosition` | [0, target] | 0.6 s | `TWEEN_EASE.power1.out` (0.25, 0.46, 0.45, 0.94) | HC:376-387 |
| Frame top change | header `top` | `top·0.5` (spring) | spring `SPRING_EASE.power4.out` (stiffness 440, damping 50, velocity 2); `visualDuration 0.2` ignored | spring | HC:129-133; AN:216-223 |
| Header hide (`slide`) | side clusters | x/y ±100% (spring) | `SPRING_EASE.power4.inOut` (stiffness 400, damping 48); `visualDuration 0.4` ignored | spring | HC:195-204, 234-243 |
| Header `fade`/`slide` | cluster opacity | 1 ↔ 0 (spring) | `SPRING_EASE.power2.inOut` (stiffness 210, damping 34); `visualDuration 0.3` ignored | spring | HC:207-215 |
| `slide` variant | inner y | 0 ↔ −100% | 0.4 s, delay 0.4 s (else 0.1 s) | `TWEEN_EASE.power4.inOut` (0.76, 0, 0.24, 1) | HC:221-232 |
| FX layer mount | `fx-container` | opacity | 0.2 s | `EASING.power2.out` (0.25, 0.46, 0.45, 0.94) | HC:722-736 |

### Menu (RP_Menu; ported to hamlet nearly verbatim, see §6)

| Trigger | Target | Property | Duration | Easing | file:line |
|---|---|---|---|---|---|
| Open or close | 4 `.menu__frame` bands | x/y to 0 (open: they close down to the `#navWindow` box) or to the resting-frame offsets (closed). Opacity 1. | **1.2 s** (0 on resize) | **open:** `power4.inOut` (0.76, 0, 0.24, 1); **close:** `power3.inOut` (0.77, 0, 0.175, 1) | MN:235-279 |
| Open or close | 4 corner holders and their SVGs | x/y to the window corners or the frame corners; SVG `translate(0,0)` | 1.2 s | same open/close split | MN:280-365 |
| Open or close | `©year` text (`er`) | opacity and visibility, delay 0.5 s on open | 1.2 s | none given: sequence default `"easeOut"` = (0, 0, 0.58, 1) | MN:383-395; framer-motion 12.43.0 `animation/sequence/create.mjs:55`; motion-utils `easing/ease.mjs:4` |
| Open or close | page (`TransitionInternal` inner div) | scale → `1.1 · navWindow.offsetHeight / innerHeight` (open) or 1, with y 0. Mobile: scale 1. | **1.2 s** (sidebar 0.8 / 0.4 s) | `TE.power3.inOut` | TI:489-546 |
| Open | nav list `m.ul` | opacity 0 → 1, x −150 px → 0, delay 0.75 s | 1.2 s | `TWEEN_EASE.power3.out` (0.165, 0.84, 0.44, 1) | MN:609-627 |
| Close | nav list | opacity → 0, x → −150 px | 0.9 s | power3.out | MN:628-637 |
| Mount | corner-stone SVG | opacity | 0.4 s | `"easeInOut"` = (0.42, 0, 0.58, 1) | MN:754-779; motion-utils `ease.mjs:5` |
| Mount | corner path | path variants | 0.2 s | `EASING.power2.out` | MN:783-800 |
| Item hover or active | item underline/translate | `translateX` −102% → 0%, opacity 0 → 1 | 0.6 s | power3.out | MN:906-959 |
| Item reset | item | `translateX` → 102%, opacity → 0.3 or 1 | 0.3 s | `TWEEN_EASE.power1.out` | MN:872-903 |
| Item click | flow | FROM_MENU set; menu closes after **1200 ms** (+300 ms on mobile); `navIsOpenDebounced` follows after 400 ms | — | — | MN:1031-1059, 197-203 |
| Menu button | "Menu"/"Close" labels, width | y 0 ↔ −105% / 105% ↔ 0; width to text + padding | 0.6 s | `EASING.power4.out` (0.165, 0.84, 0.44, 1) | MB:62-83 |
| Menu button | icon y (spring) | 50% ↔ 0 | `SPRING_EASE.power3.out` (stiffness 320, damping 42, velocity 2); `visualDuration 0.6` ignored | spring | MB:53-57 |
| Menu button | CSS hover/state width | Tailwind `duration-300 ease-out-power3` = `cubic-bezier(0.215, 0.61, 0.355, 1)` | 0.3 s | CSS token | MB:149; O `styles/globals.css:559` |
| FXFrame | wrapper | enter opacity 0.3 s `TWEEN_EASE.power3.inOut`; exit 0.2 s `TWEEN_EASE.power2.out`; insets through `SPRING_EASE.power3.inOut` (stiffness 300, damping 40; `visualDuration 0.4` ignored) | 0.3 / 0.2 s | see cell | FX:21-55 (0.3 at :43, 0.2 at :51) |

---

## 5. Shared motion vocabulary

### TS easing constants (`TE` = `TWEEN_EASE`, AN:289-369). `EASING` (AN:6-111) has identical values.

| Constant | Curve | Used for (motion-relevant sites) | Repo-wide uses (tween / spring)* |
|---|---|---|---|
| `power1.out` | (0.25, 0.46, 0.45, 0.94), AN:292 | header resize scrub (HC:382); menu item reset (MN:876, 892) | 3 / 0 |
| `power2.out` | (0.25, 0.46, 0.45, 0.94), AN:297. **Identical to `power1.out`.** | header FX (HC:735); FXFrame exit; corner path (MN:798) | 59 / 9 |
| `power2.inOut` | (0.455, 0.03, 0.515, 0.955), AN:298 | header cluster opacity spring (HC:213) | 2 / 8 |
| `power3.in` | (0.895, 0.03, 0.685, 0.22), AN:301. **Identical to `power4.in`.** | — | 6 / 0 |
| `power3.out` | (0.165, 0.84, 0.44, 1), AN:302. **Identical to `power4.out`.** | menu list in/out (MN:625, 634); menu item hover (MN:928) | 31 / 17 |
| **`power3.inOut`** | **(0.77, 0, 0.175, 1)**, AN:303 | **CURTAIN reveal 0.4 s** (TP:513); page scale on menu 1.2 s (TI:494); header 0.96 s (HC:280, 411); menu close 1.2 s (MN:275); FXFrame enter; preloader 1.0 / 1.8 s | 21 / 5 |
| `power4.out` | (0.165, 0.84, 0.44, 1), AN:307 | menu button labels 0.6 s | 4 / 1 |
| **`power4.inOut`** | **(0.76, 0, 0.24, 1)**, AN:308 | **CURTAIN cover 0.7 s** (TP:526); menu open 1.2 s (MN:275); header slide 0.4 s (HC:230) | 16 / 5 |
| `sine`, `circ`, `expo` (in/out/inOut) | AN:310-324 | `expo.out` 1 use | — |
| `back.*`, `elastic.*` | function eases, AN:325-367 | `back.out` 1 use | — |

\* Counted by grep over O for `(TE|TWEEN_EASE|EASING).<name>.<kind>` and `SPRING_EASE.<name>.<kind>`. The dynamic `TWEEN_EASE[\`power${…}\`]` calls in MN are not counted. These are counts, not a full call-site list.

`power3.inOut` (0.77, 0, 0.175, 1) and `power4.inOut` (0.76, 0, 0.24, 1) are nearly the same curve. In practice, the CURTAIN close and open differ by duration (0.7 s vs 0.4 s), not by curve family.

### Custom and library curves

| Curve | Where | Source |
|---|---|---|
| `[0.6, 0, 0.3, 1]` | LOST_PRODUCT enter (1.24 s) and leave (1.28 s / 0.86 s); lost bag frame; fog release; lost chrome CSS | ST:241, 253; TP:617; MN:518; O `lostinseoul/index.css:257, 274-282`, plus 16 TS/CSS occurrences under `lostinseoul/` |
| `cubic-bezier(0.52, 0, 0.22, 1)` | lost fog backdrop, bloom and wipe (0.5 / 0.54 s) | O `lostinseoul/index.css:202, 231, 253` |
| motion `"easeIn"` (0.42, 0, 1, 1) | FADE enter 0.3 s; IMMEDIATE enter | motion-utils 12.39.0 `easing/ease.mjs:3` |
| motion `"easeOut"` (0, 0, 0.58, 1) | FADE leave; IMMEDIATE leave; sequence default (menu year) | `ease.mjs:4`; framer-motion `sequence/create.mjs:55` |
| motion `"easeInOut"` (0.42, 0, 0.58, 1) | corner-stone fade 0.4 s | `ease.mjs:5` |
| motion default (0.25, 0.1, 0.35, 1), 0.3 s | header mount (no transition given) | motion-dom 12.43.0 `animation/utils/default-transitions.mjs:23-27` |

### CSS `@theme` easing tokens (O `styles/globals.css:551-566`). Their names do not match the TS values.

| Token | Value | Same-named TS constant |
|---|---|---|
| `--ease-power3` | (0.645, 0.045, 0.355, 1) | `TE.power3.inOut` = (0.77, 0, 0.175, 1) |
| `--ease-power2` / `--ease-power4` | (0.77, 0, 0.175, 1) | that value is `TE.power3.inOut` |
| `--ease-out` | (0.165, 0.84, 0.44, 1) | = `TE.power3.out` |
| `--ease-out-power3` | (0.215, 0.61, 0.355, 1) | `TE.power3.out` = (0.165, 0.84, 0.44, 1) |
| `--ease-out-power4` | (0.895, 0.03, 0.685, 0.22), an ease-*in* shape | = `TE.power3.in` |

A grep of `*.css` and `*.scss` under H for `--ease-power2`, `--ease-power3`, `--ease-power4`, `--ease-out`, `--ease-out-power3` and `--ease-out-power4` declarations returned nothing. Tailwind's own built-in theme defaults were not checked.

### Springs

`SPRING_EASE` (AN:123-288) gives stiffness/damping presets, for example `power3.inOut` = 300/40 and `power4.out` = 440/50 with velocity 2. Every `useSpring(…, { ...SPRING_EASE.x, visualDuration })` call passes both, and motion gives physics keys precedence over duration keys. **`visualDuration` is therefore ignored** in HC:130-133, 201-204, 212-215, FX:21-32 and MB:54-57 (motion-dom 12.43.0 `animation/generators/spring.mjs:113-129`).

### Durations and timers (seconds unless marked ms)

| Value | Use | Source |
|---|---|---|
| 0.1 | IMMEDIATE | ST:264, 273 |
| 0.2 | FX fades; corner path | HC:734; MN:797 |
| 0.3 | FADE in/out; header mount default; item reset; FXFrame enter; button CSS | ST:172, 181; HC:514-525 with motion-dom `default-transitions.mjs:26`; MN:877, 893; FX:43; MB:149 |
| 0.4 | CURTAIN reveal; header slide; corner-stone | TP:512; HC:228; MN:763, 773 |
| 0.6 | menu button; item hover; header resize | MB:65, 69, 80; MN:925, 937; HC:380 |
| **0.7** | CURTAIN cover; also the FADE delay `dlay` | TP:525; ST:153 |
| 0.86 | LOST leave | TP:616 |
| 0.9 | menu list exit | MN:635 |
| 0.96 | header expand | HC:278, 409 |
| 1.0 | preloader width (delay 0.2) | CM:131-134 |
| **1.2** | menu frame open/close; page scale; list enter | MN:274; TI:531 |
| 1.24 / 1.28 | LOST enter / leave | ST:240, 252 |
| 1.8 | preloader expand | CM:26, 159 |

Timers:

| Value | Use | Source |
|---|---|---|
| 20 ms | headerDone debounce | HC:490 |
| 50 ms | animateBye delay | HC:262 |
| 120 ms | goToPage | UTS:76 |
| 300 ms | mobile menu click | MN:1053 |
| 400 ms | nav debounce | MN:202 |
| 720 ms | header scroll re-enable | HC:469 |
| 860 ms | LOST navigate | TP:606 |
| 900 ms | fog release | TP:672 |
| 1000 ms | lerp cancel | HC:433 |
| 1200 ms | menu close after click | MN:1039 |
| 1520 ms | LOST type reset | TP:792 |
| 1800 ms | LOST cleanup | TP:662 |

---

## 6. Ported copy vs original

| Item | Observation |
|---|---|
| Original versions | O working tree is on `temp-show` @ `2df474db` (2026-09-09). Uncommitted edits are import-path rewrites only (`git diff -w`). `main` @ `f5b5b9ae` (2026-11-03) differs in the motion files only by TP gaining SHELL branches (11 lines; added in `bcf13387`) and a `globals.css` variable reorder. |
| `H/providers/TransitionProvider.tsx` | **Byte-identical** to O TP at `temp-show` HEAD, with no SHELL branch. |
| `H/hideaway/providers/TransitionProvider.tsx` | Matches O `main`: `@/hideaway/…` imports, plus a SHELL pass-through in leave and enter (H lines 769-772, 785-791). |
| `H/components/UX/Transition/index.tsx` (551 lines) | Same motion values as O TI. Changes: Voyageur removed (stub types, `pageTypeToPublicPath` inline); `PageRedirect` removed; unused y/scale motion values removed; commented GSAP blocks removed. `transitionMappings` (including 1.24 / 1.28 at :223-224 / :236-237) is unchanged, and unused by `RPage`, as in O. |
| `H/hideaway/components/UX/Transition/*` | Import-path differences only. `pageGroups.ts` and `Portaller.tsx` are identical. |
| `H/stores/RP_Ui.ts` | Same variant values. **Adds a `SHELL` variant** (`none:{}`, enter/leave opacity 1, duration 0; H:159-163), so the LOST lines shift to 242 / 254. Type simplifications for footer, nav and links. |
| `H/components/UX/Transition/useTransitionSetter.tsx` | Inlines the `pageGroups` logic. **Comments out** the lostinseoul, search, radio, essays, surf, tagged, archived and lists classifications (H:178-183, 197-205, 217-233). LOST_PRODUCT is unreachable, and those heads fall to `static`. |
| `H/constants/animations.ts` | **Identical** to O AN. `H/hideaway/constants/animations.ts` differs by whitespace and formatting only. |
| Cover CSS | `H/styles/sphmrs.scss:1655-1771` matches PP except for vh fallbacks: `100 * var(--vh, 1vh)`; the duplicate `100vh` lines are dropped. |
| `LazyMotion` | O: `domMax`, `strict` (O `providers/index.tsx:26,53`). H: `domAnimation`, not strict (H `providers/index.tsx:12,26`). |
| `RPage` placement | O: each page renders its own `RPage`, under `(site)/layout.client.tsx` `AnimatePresence mode="sync" propagate={false}`. H: one `RPage key={pathname}` in `app/(site)/client-layout.tsx:40-48`, with **no `AnimatePresence` parent**, so no `leaving` exit runs. |
| Header and frame chrome | H does not mount Hideaway `HeaderClient` or `FXFrame`. `SiteHeader` (`H/components/shell/site-header.tsx`) is imported only by `components/reading/reading-stage.tsx`. It uses `0.96 s` and `MENU_EASE = [0.77, 0, 0.175, 1]` (= `TE.power3.inOut`; site-header.tsx:17, 50). |
| Menu | `H/components/UX/Menu/index.tsx` differs from O only in an import and `isHome = pathname is "/" or "/home"` instead of Voyageur (H:994-995). Menu link data comes from `menuLinks` (client-layout.tsx:26-38). |
| Link | `H/components/core/Link/Link.tsx` inlines its prop types and imports via `@/`. The click flow (`setGenericPageTransition` then router `Link` navigate) is unchanged. |

---

## 7. Gaps (open; not resolved from source)

1. **Does the old page's `leaving` variant play in the original?** O `(site)/layout.client.tsx:24-26` wraps the route segment `children` in `AnimatePresence`. Whether that child's key changes per route was not established.
   - For CURTAIN the answer is immaterial: leave duration 0, and the cover is opaque.
   - For FADE it decides between two outcomes. Either the old page holds 0.7 s and then fades 0.3 s `easeOut` (a sequential crossfade into the new page's 0.7 s-delayed fade-in), or the old page vanishes at commit and leaves a blank page area for 0.7 s.
   - In hamlet the answer is the second outcome by construction, since there is no `AnimatePresence` parent.
2. **`R` and the `rAF` hops are unbounded in source.** Any part of an observed "under 1.4 s" beyond 1.10 s (CURTAIN) or 1.00 s (FADE) cannot be attributed from code.
3. **Corner translate units.** TP emits pixel-scale numbers (`progress · (0.5·innerWidth − 1)`) as `%` of a 1.6rem box (TP:162-171, 914-915; PP:73-76). The arithmetic puts the corners far outside the viewport for most of the progress range. The visual result was not verified.
4. **FADE `position` flip** (fixed → relative) under a 0.7 s delay: whether motion applies the non-animatable value at the start or after the delay was not traced. It happens while opacity is 0.
5. **Which page change the owner timed** is not stated. CURTAIN (1.10 s) and FADE (1.00 s after mount) both fit "< 1.4 s"; LOST_PRODUCT and FROM_MENU do not.
6. **Theme-dependent colours** (`--n-s-menu`, `--bg`) and the `data-themed` mechanics were not resolved to values.
7. **No live render** was inspected, by rule. All visual descriptions are inferred from styles and transforms in source.
