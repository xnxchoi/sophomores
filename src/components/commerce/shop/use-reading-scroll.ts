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
 * - Exit (14799-14822): each nearby book's exit runs from its anchor (the top of the full-width section under the
 *   product's column, or the panel's end) 220 px below the fold, over (0.5/1.3)·3 screens: the book rises and turns
 *   away, and its card leaves with it.
 * - Open (15254-15275, 15224-15236): the page parks on the book's section and keeps it there while it measures, and for
 *   2 s does not let it drift above it.
 */
type Geometry = { lvh: number; top: number; height: number; offset: number };
export type ReadingLayout = { extents: number[]; starts: number[]; tops: number[]; total: number; approach: number; readLock: number[] };
export type ReadingSource = {
  hrefOf: (index: number) => string | null;
  /** The book being read changed (the address already follows). */
  onIndex: (index: number) => void;
  /** Every scroll: the locked progress for the scene, and the reading book plus its exit for the art cards. */
  onProgress: (locked: number, cards: number) => void;
  /** 100 ms after the scroll settles: the locked progress for React. */
  onCommit: (locked: number) => void;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const HEADER_TRIM = 122, PANEL_TOP = 68, SECTION_TAIL = 70, MEASURE_TAIL = 300, ANCHOR_LEAD = 220;

function layoutFor({ lvh, top, height, offset }: Geometry, heights: number[], scroll: SceneScroll): ReadingLayout {
  const approach = Math.round(Math.max(0.01, Math.min(0.99, offset)) * height);
  const lead = top - 124, firstTrim = Math.max(0, approach + lead + PANEL_TOP + HEADER_TRIM - top);
  const content = heights.map((measured) => (measured <= 0 ? 3500 : Math.max(150, measured - MEASURE_TAIL)));
  const readLock = content.map((px) => Math.max(150, px - (lvh - lead)));
  const extents = content.map((px, index) => approach + px + SECTION_TAIL - (index === 0 ? firstTrim : 0));
  const starts = scroll.e(extents);
  const tops = extents.map((_, index) => (starts[index] ?? 0) + approach + lead + PANEL_TOP - (index === 0 ? firstTrim : 0));
  return { extents, starts, tops, total: extents.reduce((sum, px) => sum + px, 0), approach, readLock };
}

/** Their detail lock (`aZ`, detail branch). */
function lockedFor(progress: number, layout: ReadingLayout, canvasHeight: number) {
  const segment = Math.floor(Math.max(0, progress)), fraction = progress - segment;
  const extent = layout.extents[segment] ?? canvasHeight, read = layout.readLock[segment] ?? 150;
  const start = Math.min(0.985, Math.max(0.01, Math.min(0.985, layout.approach / extent)) + read / extent);
  return fraction >= start ? segment + (fraction - start) / (1 - start) : segment;
}

export function useReadingScroll(hub: SceneHub, scroll: SceneScroll, open: number | null, geometry: Geometry, count: number,
  source: { current: ReadingSource }) {
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
  useEffect(() => { live.current = { layout, geometry, count }; });
  const anchors = useRef(new Map<number, HTMLElement>());
  const index = useRef({ shown: 0, raw: 0 }), pending = useRef<number | null>(null), guard = useRef({ index: -1, until: 0 });
  const [opened, setOpened] = useState(0);
  const park = (at: number, tops: number[]) => Math.max(0, (tops[at] ?? 0) + HEADER_TRIM - scroll.p(scroll.X()));

  const reading = open != null;
  useLayoutEffect(() => {
    hub.detailSectionTopsLiveRef.current = reading ? layout.tops : null;
    return () => { hub.detailSectionTopsLiveRef.current = null; };
  }, [hub, reading, layout]);

  const read = useRef(() => undefined as void);
  useEffect(() => {
    if (!reading) return;
    const arrays = ["detailPraiseExitByIndexLiveRef", "detailBgExitByIndexLiveRef", "detailBgExitAtByIndexLiveRef", "detailRotExitByIndexLiveRef",
      "detailRevealByIndexLiveRef"].map((key) => hub[key]?.current as unknown[] | undefined);
    const [praise, card, cardAt, turn, reveal] = arrays;
    let settle = 0, still = 0;
    const run = () => {
      const { layout: L, geometry: G, count: n } = live.current, y = window.scrollY, vh = window.innerHeight || 1;
      scrolling.current = true; window.clearTimeout(still); still = window.setTimeout(() => { scrolling.current = false; }, 120);
      const progress = scroll.m(y, L.extents);
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
      for (let l = r - 1; l <= r + 1; l += 1) {
        const anchor = anchors.current.get(l);
        if (!anchor || !praise || !card || !cardAt) continue;
        const s = anchor.getBoundingClientRect().top - ANCHOR_LEAD;
        praise[l] = card[l] = clamp01((vh - s) / span);
        cardAt[l] = (at: number) => clamp01((vh - (s - (at - y))) / span);
      }
      const exit = (praise?.[r] as number | undefined) ?? 0;
      hub.detailPraiseExitProgressLiveRef.current = exit;
      source.current.onProgress(locked, r + exit);
      window.clearTimeout(settle); settle = window.setTimeout(() => source.current.onCommit(locked), 100);
      // For 2 s after an open the page may not drift above the book it opened on (theirs: hA).
      const g = guard.current;
      if (g.index >= 0 && performance.now() < g.until) {
        const floor = Math.max(0, Math.min((L.tops[g.index] ?? 0) - 44, park(g.index, L.tops)));
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
      window.clearTimeout(settle); window.clearTimeout(still);
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
    const target = park(at, layout.tops);
    window.scrollTo(0, target);
    guard.current = { index: at, until: performance.now() + 2000 };
    const progress = scroll.m(target, layout.extents);
    hub.scrollProgressDirectLiveRef.current = progress; hub.spineViewProgressLiveRef.current = hub.spineViewProgressFor(progress);
    hub.backgroundSnapScrollLiveRef.current = 6; hub.bookRowSeedLiveRef.current = 3;
    read.current();
    if ((heights[at] ?? 0) > 0) pending.current = null;
  }, [reading, layout, opened]);   // eslint-disable-line react-hooks/exhaustive-deps

  /** A book opens for reading (call before the open state commits). */
  const begin = useCallback((at: number) => { pending.current = at; index.current = { shown: at, raw: at }; setOpened((n) => n + 1); }, []);
  return { layout, measured, anchors, begin };
}
