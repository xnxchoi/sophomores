import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SceneHub, SceneScroll } from "./stripe-scene";

/**
 * Their book-detail reading scroll, desktop (06w9; mapped in .tmp/stripe-notes/slice-C-reading-scroll.md). While a book
 * is open the page is the reading scroll: every book's details stand in a stack, one section per book, and the page's
 * scroll drives the scene.
 * - Sections (11635-11666): each book's section is its measured content height plus the approach and 70 px, the first
 *   trimmed so it parks at the top; the section tops (13473-13493) are published for the scene.
 * - Progress (readScroll 14714-14822): scroll maps to section progress; their detail lock (`aZ`, 10393-10406) holds it
 *   on a book while its content is read and lets it rise to the next one over the last stretch; the reading index
 *   follows with ±0.65 hysteresis (13139-13146) and the address follows it (shallow replace).
 * - Exit (14799-14822): each nearby book's exit runs from its anchor (theirs: the praise label; ours: the top of the
 *   full-width section under the product's column) 220 px below the fold, over (0.5/1.3)·3 screens: the book rises and
 *   turns away. A book without one leaves when the next one takes over, as theirs does without praise.
 * - Open (15254-15275, 15224-15236): the page parks on the book's section and keeps it there while it measures, and for
 *   2 s does not let it drift above it.
 */
type Geometry = { lvh: number; mobile: boolean; top: number; height: number; offset: number };
export type ReadingLayout = { extents: number[]; starts: number[]; tops: number[]; total: number; approach: number; readLock: number[];
  /** Book 0's trim (their `lb`): on a phone the landing target of its first slot. */
  trim: number; mobile: boolean; lvh: number };
export type ReadingSource = {
  hrefOf: (index: number) => string | null;
  /** The book being read changed (the address already follows). */
  onIndex: (index: number) => void;
  /** Every scroll: the locked progress for the scene (and the art cards). */
  onProgress: (locked: number) => void;
  /** 100 ms after the scroll settles: the locked progress for React. */
  onCommit: (locked: number) => void;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
/**
 * stripe.press runs one book's details on into the next book's (its section, its 3D book, its address). Owner, 26 Nov:
 * "build and keep the stripe transition as we may use it at some point, and 2) just stop at end for now". So the page
 * holds the open product's section: the page stops at the bottom of its details (and above its park), and the scene is
 * capped where the next product would start to rise, so neither the next book nor the address changes. The other
 * products' panels stay measured (the layout is theirs) but inert. `true` restores their run-on; nothing else changes.
 */
export const READING_RUN_ON = false;
/** Room left under the open product's last line when the page stops (px). */
const END_CLEARANCE = 48;
const HEADER_TRIM = 122, PANEL_TOP = 68, SECTION_TAIL = 70, MEASURE_TAIL = 300, ANCHOR_LEAD = 220;
/** Their phone nav height (`eL.k`), which the phone's detail offset uses instead of the card top (06w9:11619-11621). */
const MOBILE_NAV = 162, PARK_ABOVE = 44, SECTION_HEAD = 127;

/**
 * Their phone open targets (`la`, 06w9:11588-11642), in the stack's own coordinates (theirs: the document from 0):
 * `park` keeps the slot's head just under the top, `landing` lowers it by 0.296 of the viewport so the book shows above.
 */
export function phoneTargets(sectionHead: number, slotTop: number | null, lvh: number, viewport: number) {
  const i = slotTop != null ? slotTop - PARK_ABOVE : sectionHead;
  const o = Math.max(0, Math.max(sectionHead, i) - 0.15 * lvh);
  const park = slotTop != null ? Math.max(o, i) : o;
  return { park, landing: Math.max(park, o + 0.296 * viewport) };
}
/** Their phone exit curves (`aB`, 06w9:10142-10149): px past the landing → the book's slide, its turn and its card. */
function exitCurves(px: number, landing: number, lvh: number) {
  const n = (a: number, b: number, c: number) => clamp01((a - b) / Math.max(1, c));
  return { slide: n(px <= landing ? 0.89 * px : 0.89 * landing + 1.7 * (px - landing), 0, 3 * lvh), rot: n(px, 0.3 * lvh, 1.9 * lvh),
    bg: n(px, 0, 1.2 * lvh) };
}
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

function layoutFor({ lvh, mobile, top, height, offset }: Geometry, heights: number[], scroll: SceneScroll): ReadingLayout {
  const approach = Math.round(Math.max(0.01, Math.min(0.99, offset)) * height);
  const lead = (mobile ? MOBILE_NAV : top) - 124;
  const firstTrim = mobile ? phoneTargets(SECTION_HEAD, approach + lead + PANEL_TOP, lvh, lvh).landing
    : Math.max(0, approach + lead + PANEL_TOP + HEADER_TRIM - top);
  const content = heights.map((measured) => (measured <= 0 ? 3500 : Math.max(150, measured - MEASURE_TAIL)));
  const readLock = content.map((px) => Math.max(150, px - (lvh - lead)));
  const extents = content.map((px, index) => approach + px + SECTION_TAIL - (index === 0 ? firstTrim : 0));
  const starts = scroll.e(extents);
  const tops = extents.map((_, index) => (starts[index] ?? 0) + approach + lead + PANEL_TOP - (index === 0 ? firstTrim : 0));
  return { extents, starts, tops, total: extents.reduce((sum, px) => sum + px, 0), approach, readLock, trim: firstTrim, mobile, lvh };
}

/** Their detail lock (`aZ`, detail branch). */
function lockedFor(progress: number, layout: ReadingLayout, canvasHeight: number) {
  const segment = Math.floor(Math.max(0, progress)), fraction = progress - segment;
  const extent = layout.extents[segment] ?? canvasHeight, read = layout.readLock[segment] ?? 150;
  const start = Math.min(0.985, Math.max(0.01, Math.min(0.985, layout.approach / extent)) + read / extent);
  return fraction >= start ? segment + (fraction - start) / (1 - start) : segment;
}

export function useReadingScroll(hub: SceneHub, scroll: SceneScroll, open: number | null, geometry: Geometry, count: number,
  source: { current: ReadingSource },
  /** The stack's own top: theirs starts at the top of the document, ours under the site header's place. */
  root: { current: HTMLElement | null }) {
  const [heights, setHeights] = useState<number[]>(() => Array.from({ length: count }, () => 0));
  const scrolling = useRef(false);
  // Their `tg`: ignore changes under 2 px, and under 400 px while the page is scrolling.
  const measured = useCallback((index: number, px: number) => setHeights((before) => {
    const was = before[index] ?? 0;
    if (was === px || (was > 0 && (Math.abs(was - px) < 2 || (scrolling.current && Math.abs(was - px) < 400)))) return before;
    const next = [...before]; next[index] = px; return next;
  }), []);
  const layout = useMemo(() => layoutFor(geometry, heights, scroll), [geometry, heights, scroll]);
  const live = useRef({ layout, geometry, count });
  // Layout effect, ahead of the park below: a park must never read the layout from before the panels were measured.
  useLayoutEffect(() => { live.current = { layout, geometry, count }; });
  const anchors = useRef(new Map<number, HTMLElement>());
  const index = useRef({ shown: 0, raw: 0 }), pending = useRef<number | null>(null), guard = useRef({ index: -1, until: 0 });
  const [opened, setOpened] = useState(0);
  const base = () => (root.current ? root.current.getBoundingClientRect().top + window.scrollY : 0);
  /** Book `at`'s phone targets in the stack's coordinates (their `lh` park and `lp` landing; book 0 adds its trim back). */
  const phone = (at: number, L: ReadingLayout) => {
    const o = at === 0 ? L.trim : 0;
    const t = phoneTargets((L.starts[at] ?? 0) + SECTION_HEAD, (L.tops[at] ?? 0) + o, L.lvh, window.innerHeight || L.lvh);
    return { park: t.park - o, landing: t.landing - o };
  };
  /** Where the page holds a book's details: desktop under the header; a phone at its park (theirs `lh`). */
  const park = (at: number, L: ReadingLayout) => L.mobile ? Math.max(0, base() + phone(at, L).park)
    : Math.max(0, base() + (L.tops[at] ?? 0) + HEADER_TRIM - scroll.p(scroll.X()));
  /** Where an open lands: desktop the park; a phone the landing, lower, so the book shows above its details (`lp`). */
  const landingY = (at: number, L: ReadingLayout) => L.mobile ? Math.max(0, base() + phone(at, L).landing) : park(at, L);
  /** Without the run-on: the page's range for book `at` (from its park to the bottom of its details in the DOM, plus a
   * little clearance) and the scene's cap (the last scroll before the detail lock lets the next book rise; bisection,
   * as `scroll.m` is theirs). */
  const holdRange = (at: number, L: ReadingLayout, canvasHeight: number) => {
    const top = base(), from = top + (L.starts[at] ?? 0), extent = L.extents[at] ?? 0, vh = window.innerHeight || L.lvh;
    const floor = Math.max(0, Math.min(top + (L.tops[at] ?? 0) - PARK_ABOVE, park(at, L)));
    let lo = from, hi = from + extent;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (lockedFor(scroll.m(mid - top, L.extents), L, canvasHeight) <= at + 1e-6) lo = mid; else hi = mid;
    }
    const panel = document.querySelector<HTMLElement>('[data-detail-panel-index="' + at + '"]');
    const bottom = panel ? panel.getBoundingClientRect().bottom + window.scrollY + END_CLEARANCE - vh : lo;
    return { min: floor, max: Math.max(floor, landingY(at, L), Math.ceil(bottom)), scene: Math.max(floor, Math.floor(lo)) };
  };
  // The open's blend on a phone (their `lf`): the exits ease in from the park over 450 ms; none for a shelf or address open.
  const blend = useRef<{ index: number; t0: number } | null>(null);

  const reading = open != null;
  useLayoutEffect(() => {
    const offset = base();
    hub.detailSectionTopsLiveRef.current = reading ? layout.tops.map((top) => top + offset) : null;
    return () => { hub.detailSectionTopsLiveRef.current = null; };
  }, [hub, reading, layout]);

  const read = useRef(() => undefined as void);
  useEffect(() => {
    if (!reading) return;
    const arrays = ["detailPraiseExitByIndexLiveRef", "detailBgExitByIndexLiveRef", "detailBgExitAtByIndexLiveRef", "detailRotExitByIndexLiveRef",
      "detailRevealByIndexLiveRef"].map((key) => hub[key]?.current as unknown[] | undefined);
    const [praise, card, cardAt, turn, reveal] = arrays;
    let settle = 0, still = 0, rerun = 0;
    const run = () => {
      const { layout: L, geometry: G, count: n } = live.current, vh = window.innerHeight || 1, top = base();
      let y = window.scrollY, sceneY = y;
      // Stop at the open product's ends (run-on off): the page at its details' bottom, the scene before the next one rises.
      if (!READING_RUN_ON && pending.current == null) {
        const range = holdRange(index.current.shown, L, G.height);
        const held = Math.max(range.min, Math.min(range.max, y));
        if (Math.abs(held - y) > 0.5) { window.scrollTo(0, held); y = held; }
        sceneY = Math.min(y, range.scene);
      }
      scrolling.current = true; window.clearTimeout(still); still = window.setTimeout(() => { scrolling.current = false; }, 120);
      const progress = scroll.m(sceneY - top, L.extents);
      hub.scrollProgressDirectLiveRef.current = progress;
      hub.spineViewProgressLiveRef.current = hub.spineViewProgressFor(progress);
      const locked = lockedFor(progress, L, G.height), centred = locked - G.offset, at = index.current;
      if (Math.abs(centred - at.raw) > 0.65) at.raw = Math.round(centred);
      const next = Math.max(0, Math.min(n - 1, at.raw));
      if (next !== at.shown) {
        at.shown = next;
        const href = source.current.hrefOf(next);
        if (href) window.history.replaceState(null, "", href);
        source.current.onIndex(next);
      }
      const span = (0.5 / 1.3) * 3 * vh, r = at.shown;
      [praise, card, cardAt, turn, reveal].forEach((list) => { if (list) list.length = 0; });
      // A phone (06w9:14756-14798): no anchors; each nearby book's exit runs on its section's progress past its landing,
      // eased in from its park for 450 ms after an open (and re-run each frame meanwhile).
      if (L.mobile) {
        const e = Math.max(1, L.lvh), b = blend.current, now = performance.now();
        for (let l = r - 1; l <= r + 1; l += 1) {
          const T = L.extents[l];
          if (!T || !praise || !card || !cardAt || !turn || !reveal) continue;
          const sIn = Math.max(0.01, Math.min(0.985, L.approach / T)), u = l === 0 ? L.trim : 0, targets = phone(l, L);
          const d = (progress - (l + sIn)) * T + u;
          const m = Math.max(0, (scroll.m(targets.landing, L.extents) - (l + sIn)) * T) + u;
          const v = u > 0 ? m : Math.min(m, (scroll.m(targets.park, L.extents) - (l + sIn)) * T + u), x = m - v;
          const lag = b && b.index === l && x > 1 ? x * (1 - easeInOutCubic(clamp01((now - b.t0) / 450))) : 0, k = d - lag;
          const S = (curve: (px: number) => number, px = k) => (!(x > 1) || px >= m ? curve(px) : px <= v ? 0 : curve(m) * ((px - v) / x));
          praise[l] = S((px) => exitCurves(px, m, e).slide);
          card[l] = S((px) => exitCurves(px, m, e).bg);
          cardAt[l] = (Y: number) => S((px) => exitCurves(px, m, e).bg, (scroll.m(Y - top, L.extents) - (l + sIn)) * T + u - lag);
          turn[l] = S((px) => exitCurves(px, m, e).rot);
          reveal[l] = x > 1 ? clamp01((k - v) / x) : 1;
        }
        if (b && now - b.t0 < 482 && !rerun) rerun = requestAnimationFrame(() => { rerun = 0; run(); });
      } else for (let l = r - 1; l <= r + 1; l += 1) {
        const anchor = anchors.current.get(l);
        if (!anchor || !praise || !card || !cardAt) continue;
        const s = anchor.getBoundingClientRect().top - ANCHOR_LEAD;
        praise[l] = card[l] = clamp01((vh - s) / span);
        cardAt[l] = (at: number) => clamp01((vh - (s - (at - y))) / span);
      }
      const exit = (praise?.[r] as number | undefined) ?? 0;
      hub.detailPraiseExitProgressLiveRef.current = exit;
      source.current.onProgress(locked);
      window.clearTimeout(settle); settle = window.setTimeout(() => source.current.onCommit(locked), 100);
      // For 2 s after an open the page may not drift above the book it opened on (theirs: hA).
      const g = guard.current;
      if (g.index >= 0 && performance.now() < g.until) {
        const floor = Math.max(0, Math.min(top + (L.tops[g.index] ?? 0) - PARK_ABOVE, park(g.index, L)));
        if (y < floor - 0.5) window.scrollTo(0, floor);
      }
    };
    read.current = run;
    const release = (event: Event) => {
      if (event instanceof KeyboardEvent && !["ArrowUp", "PageUp", "Home", " "].includes(event.key)) return;
      guard.current.until = 0;
    };
    window.addEventListener("scroll", run, { passive: true });
    (["wheel", "touchstart", "keydown"] as const).forEach((type) => window.addEventListener(type, release, { passive: true }));
    return () => {
      window.removeEventListener("scroll", run);
      (["wheel", "touchstart", "keydown"] as const).forEach((type) => window.removeEventListener(type, release));
      window.clearTimeout(settle); window.clearTimeout(still); cancelAnimationFrame(rerun);
      [praise, card, cardAt, turn, reveal].forEach((list) => { if (list) list.length = 0; });
      hub.detailPraiseExitProgressLiveRef.current = 0;
      read.current = () => undefined;
    };
  }, [reading, hub, scroll, source]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Open: park on the book's section (again whenever the layout changes until that panel is measured), progress live,
  // the scene's row smoother snapped (theirs, 15254-15275).
  useLayoutEffect(() => {
    const at = pending.current;
    if (!reading || at == null) return;
    const target = landingY(at, layout);
    window.scrollTo(0, target);
    guard.current = { index: at, until: performance.now() + 2000 };
    const progress = scroll.m(target - base(), layout.extents);
    hub.scrollProgressDirectLiveRef.current = progress; hub.spineViewProgressLiveRef.current = hub.spineViewProgressFor(progress);
    hub.backgroundSnapScrollLiveRef.current = 6; hub.bookRowSeedLiveRef.current = 3;
    read.current();
    if ((heights[at] ?? 0) > 0) pending.current = null;
  }, [reading, layout, opened]);   // eslint-disable-line react-hooks/exhaustive-deps

  /** A book opens for reading (call before the open state commits). `instant`: from the shelf or its own address (no
   * blend on a phone, theirs `t0 = −∞`). */
  const begin = useCallback((at: number, instant = false) => {
    pending.current = at; index.current = { shown: at, raw: at };
    blend.current = { index: at, t0: instant ? -Infinity : performance.now() };
    setOpened((n) => n + 1);
  }, []);
  /** A phone's carry (their `lP`, 06w9:11646-11657): the open book's exits at its landing, which the scene and the card
   * ride while it travels; nothing on desktop. */
  const landingExits = useCallback((at: number) => {
    const L = live.current.layout, T = L.extents[at];
    if (!L.mobile || !T) return undefined;
    const sIn = Math.max(0.01, Math.min(0.985, L.approach / T)), u = at === 0 ? L.trim : 0;
    const px = Math.max(0, (scroll.m(phone(at, L).landing, L.extents) - (at + sIn)) * T) + u;
    return exitCurves(px, px, Math.max(1, L.lvh));
  }, [scroll]);   // eslint-disable-line react-hooks/exhaustive-deps
  return { layout, measured, anchors, begin, landingExits };
}
