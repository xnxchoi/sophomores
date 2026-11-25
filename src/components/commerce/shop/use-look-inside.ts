import { useCallback, useEffect, useRef, useState } from "react";
import type { SceneHub } from "./stripe-scene";

/**
 * Their "Open book" (look inside), desktop (06w9; mapped in .tmp/stripe-notes/slice-D-look-inside.md). Two modes share
 * the tweens, the bar and the scene's inputs:
 * - In the details (`pg`/`px`, 16314-16432): a click on the open book, or its "+ Open book +" pill, opens its pages in
 *   place beside the column; closing is `pm` (16199-16219).
 * - On the home (`hz`, 15692-15718): "Open book [+]" brings the book forward (the page scrolls onto it, then 650 ms
 *   later the cover opens); closing is `pM` (16564-16592), also by any wheel or touch.
 * The open (`pu`, 16119-16151): the cover tween runs 0 → 1 over 980 ms (ease-in quad); once it is half open and the
 * scene has the spread's textures (or after 1.2 s regardless) the pages tween 0 → 1 over 900 ms (their sigmoid). The
 * close (`pd`) runs both back together (900/980 ms, easeOutCubic, frame steps capped at 34 ms). Page turns are the
 * scene's (drag or click on the book); ← → turn one leaf with hold-to-repeat; Escape closes the pages first.
 */
type Book = { pageCount: number; startPage: number };
const LEAF_REPEAT_FIRST_MS = 300, LEAF_REPEAT_MIN_MS = 50, LEAF_REPEAT_RAMP_MS = 3000;
const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
const sigmoid = (s: number) => { const a = s ** 2.4, b = (1 - s) ** 1.1; return a + b > 0 ? a / (a + b) : s; };

export type LookInsideSource = {
  /** Scroll the home onto a book before it comes forward (their `ut` / the shelf seat). */
  place: (index: number) => void;
  book: (index: number) => Book | null;
};

export function useLookInside(hub: SceneHub, detailIndex: number | null, source: { current: LookInsideSource }) {
  const constant = hub as unknown as Record<string, number>;
  const [open, setOpen] = useState(false), [home, setHome] = useState(false), [homeIndex, setHomeIndex] = useState<number | null>(null);
  const [peek, setPeek] = useState(false), [pillHover, setPillHover] = useState(false), [prepare, setPrepare] = useState(false);
  const [page, setPage] = useState(1);
  const openRef = useRef(open), homeRef = useRef(home);
  useEffect(() => { openRef.current = open; homeRef.current = home; });
  const cover = useRef(0), pages = useRef(0);
  const gate = useRef({ requested: false, coverHalf: false, textures: false });
  const timers = useRef({ safety: 0, homeClose: 0, homeOpen: 0, coverFrame: 0, pageFrame: 0, frozenFrame: 0 });
  useEffect(() => { hub.homeLookInsideActiveLiveRef.current = home; }, [hub, home]);

  // A tween clock: real time opening; closing steps are capped at 34 ms so a hitch cannot skip the motion (their `aP`).
  const clock = (capped: boolean) => {
    let last = performance.now(), elapsed = 0;
    return () => { const now = performance.now(); elapsed += capped ? Math.min(34, now - last) : now - last; last = now; return elapsed; };
  };
  const stopTweens = () => { const t = timers.current; cancelAnimationFrame(t.coverFrame); cancelAnimationFrame(t.pageFrame); t.coverFrame = t.pageFrame = 0; };

  const tweenPages = useCallback((target: number) => {
    cancelAnimationFrame(timers.current.pageFrame);
    const from = pages.current, opening = target >= 1, ms = constant.LOOK_INSIDE_PAGE_MS || 900, time = clock(!opening);
    const step = () => {
      const l = Math.min(1, time() / ms);
      pages.current = from + (target - from) * (opening ? sigmoid(l) : easeOutCubic(l));
      if (l < 1) timers.current.pageFrame = requestAnimationFrame(step); else { pages.current = target; timers.current.pageFrame = 0; }
    };
    timers.current.pageFrame = requestAnimationFrame(step);
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  // Their `po`: the pages start once the open was asked for, the cover is half open and the spread's textures are in.
  const startPages = useCallback(() => {
    const g = gate.current;
    if (!(g.requested && g.coverHalf && g.textures)) return;
    g.requested = false; window.clearTimeout(timers.current.safety);
    setPrepare(true); tweenPages(1);
  }, [tweenPages]);

  const tweenCover = useCallback((target: number) => {
    cancelAnimationFrame(timers.current.coverFrame);
    const from = cover.current, opening = target >= 1, ms = constant.LOOK_INSIDE_COVER_MS || 980, time = clock(!opening);
    const half = constant.LOOK_INSIDE_PAGE_START_COVER_FRAC ?? 0.5;
    const step = () => {
      const l = Math.min(1, time() / ms);
      cover.current = from + (target - from) * (opening ? l * l : easeOutCubic(l));
      if (opening && !gate.current.coverHalf && cover.current >= half) { gate.current.coverHalf = true; startPages(); }
      if (l < 1) { timers.current.coverFrame = requestAnimationFrame(step); return; }
      cover.current = target; timers.current.coverFrame = 0;
      if (opening) { gate.current.coverHalf = true; startPages(); }
    };
    timers.current.coverFrame = requestAnimationFrame(step);
  }, [startPages]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Their `pu` (open tweens) and `pd` (close tweens).
  const openTweens = useCallback(() => {
    const t = timers.current;
    window.clearTimeout(t.homeClose); window.clearTimeout(t.homeOpen); t.homeClose = t.homeOpen = 0;
    stopTweens();
    gate.current = { requested: true, coverHalf: false, textures: gate.current.textures };
    setPrepare(true); tweenCover(1);
    window.clearTimeout(t.safety);
    t.safety = window.setTimeout(() => { gate.current.textures = true; startPages(); }, constant.LOOK_INSIDE_OPEN_TEX_SAFETY_MS || 1200);
  }, [tweenCover, startPages]);   // eslint-disable-line react-hooks/exhaustive-deps
  const closeTweens = useCallback(() => {
    const t = timers.current;
    window.clearTimeout(t.homeOpen); window.clearTimeout(t.safety); t.homeOpen = 0;
    gate.current = { requested: false, coverHalf: false, textures: false };
    setPrepare(false); stopTweens(); tweenPages(0); tweenCover(0);
  }, [tweenPages, tweenCover]);
  const resetFrozen = () => { hub.frozenLookInsideLiveRef.current = { index: null, value: 0 }; };

  /** In the details: open the open book's pages (their `pg` / `px`). */
  const openInDetail = useCallback(() => {
    if (openRef.current || detailIndex == null) return;
    setPeek(false); setOpen(true); resetFrozen(); openTweens();
  }, [detailIndex, openTweens]);   // eslint-disable-line react-hooks/exhaustive-deps
  /** In the details: close the pages (their `pm`). */
  const closeInDetail = useCallback(() => {
    setOpen(false); setPeek(false); resetFrozen(); closeTweens();
  }, [closeTweens]);   // eslint-disable-line react-hooks/exhaustive-deps

  /** On the home: bring a book forward and open it (their `hz`). */
  const openOnHome = useCallback((index: number) => {
    const t = timers.current;
    window.clearTimeout(t.homeClose); t.homeClose = 0;
    (hub as unknown as { holdSpineSelection?: () => void }).holdSpineSelection?.();
    setHome(true); setHomeIndex(index); setOpen(true); resetFrozen(); setPeek(false);
    source.current.place(index);
    window.clearTimeout(t.homeOpen);
    t.homeOpen = window.setTimeout(() => { t.homeOpen = 0; if (openRef.current) openTweens(); }, constant.LOOK_INSIDE_OPEN_DELAY_MS || 650);
  }, [openTweens]);   // eslint-disable-line react-hooks/exhaustive-deps
  /** On the home: close (their `pM`); the book goes back after the close tweens. */
  const closeOnHome = useCallback(() => {
    const t = timers.current;
    setOpen(false); setPeek(false); closeTweens();
    window.clearTimeout(t.homeClose);
    t.homeClose = window.setTimeout(() => {
      t.homeClose = 0;
      if (openRef.current) return;
      setPage(source.current.book(homeIndex ?? 0)?.startPage ?? 1); setHome(false); setHomeIndex(null);
    }, constant.LOOK_INSIDE_CLOSE_MS || 1880);
  }, [closeTweens, homeIndex]);   // eslint-disable-line react-hooks/exhaustive-deps
  const close = useCallback(() => { if (homeRef.current) closeOnHome(); else closeInDetail(); }, [closeOnHome, closeInDetail]);
  const closeRef = useRef(close);
  useEffect(() => { closeRef.current = close; }, [close]);

  // The book being read changed while its pages were open: the old book closes in place (their freeze and decay over
  // LOOK_INSIDE_MS, 17037-17066), the new one starts shut at its first spread.
  const lastDetail = useRef(detailIndex);
  useEffect(() => {
    const before = lastDetail.current;
    lastDetail.current = detailIndex;
    if (before === detailIndex || homeRef.current) return;
    if (openRef.current || cover.current > 0.001 || pages.current > 0.001) {
      const value = Math.max(cover.current, pages.current), ms = constant.LOOK_INSIDE_MS || 1100, start = performance.now();
      stopTweens(); cover.current = pages.current = 0; gate.current = { requested: false, coverHalf: false, textures: false };
      setOpen(false); setPrepare(false);
      if (before != null) {
        hub.frozenLookInsideLiveRef.current = { index: before, value };
        cancelAnimationFrame(timers.current.frozenFrame);
        const decay = () => {
          const l = Math.min(1, (performance.now() - start) / ms);
          hub.frozenLookInsideLiveRef.current = { index: before, value: value * (1 - easeOutCubic(l)) };
          if (l < 1) timers.current.frozenFrame = requestAnimationFrame(decay); else resetFrozen();
        };
        timers.current.frozenFrame = requestAnimationFrame(decay);
      }
    }
    if (detailIndex != null) setPage(source.current.book(detailIndex)?.startPage ?? 1);
  }, [detailIndex]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Leaving the details closes the pages with them.
  useEffect(() => { if (detailIndex == null && openRef.current && !homeRef.current) closeInDetail(); }, [detailIndex, closeInDetail]);

  // While open: Escape closes the pages (before anything else hears it); ← → turn one leaf, holding repeats from 300 ms
  // down to 50 ms over 3 s (16391-16434). On the home any wheel or touch closes (16593-16613).
  useEffect(() => {
    if (!open) return;
    const index = home ? homeIndex : detailIndex, book = index == null ? null : source.current.book(index);
    const leaves = Math.ceil((book?.pageCount ?? 0) / 2);
    let repeat = 0, held: 1 | -1 | null = null, since = 0;
    const turn = (step: 1 | -1) => setPage((current) => Math.max(0, Math.min(leaves, current + step)));
    const again = () => {
      const k = Math.min(1, (performance.now() - since) / LEAF_REPEAT_RAMP_MS);
      repeat = window.setTimeout(() => { if (held) { turn(held); again(); } },
        Math.max(LEAF_REPEAT_MIN_MS, LEAF_REPEAT_FIRST_MS - (LEAF_REPEAT_FIRST_MS - LEAF_REPEAT_MIN_MS) * k));
    };
    const down = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); closeRef.current(); return; }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.repeat) return;
      held = event.key === "ArrowRight" ? 1 : -1; since = performance.now();
      turn(held); window.clearTimeout(repeat); again();
    };
    const up = (event: KeyboardEvent) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { held = null; window.clearTimeout(repeat); } };
    const leave = (event: Event) => {
      if (event instanceof TouchEvent && (event.touches.length >= 2 || (event.target as Element | null)?.closest?.(".book-hit-rect"))) return;
      closeRef.current();
    };
    window.addEventListener("keydown", down, { capture: true });
    window.addEventListener("keyup", up, { capture: true });
    if (home) { window.addEventListener("wheel", leave, { passive: true }); window.addEventListener("touchmove", leave, { passive: true }); }
    return () => {
      window.clearTimeout(repeat);
      window.removeEventListener("keydown", down, { capture: true });
      window.removeEventListener("keyup", up, { capture: true });
      window.removeEventListener("wheel", leave); window.removeEventListener("touchmove", leave);
    };
  }, [open, home, homeIndex, detailIndex, source]);

  useEffect(() => () => {
    const t = timers.current;
    window.clearTimeout(t.safety); window.clearTimeout(t.homeClose); window.clearTimeout(t.homeOpen);
    cancelAnimationFrame(t.coverFrame); cancelAnimationFrame(t.pageFrame); cancelAnimationFrame(t.frozenFrame);
    hub.homeLookInsideActiveLiveRef.current = false; resetFrozen();
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  /** What the scene reads (their props, 06w9:17889-17911). */
  const sceneProps = {
    lookInsideOpenProgressRef: pages, lookInsideCoverProgressRef: cover,
    onLookInsideTopTexturesReady: () => { gate.current.textures = true; startPages(); },
    onLookInsidePageSettled: () => undefined,
    lookInsidePreparePages: prepare, lookInsidePageInteractionOpen: open, lookInsidePeekOpen: peek,
    coverPeekHovered: pillHover, lookInsidePageIndex: page, setLookInsidePageIndex: setPage,
    onLookInsideDragClose: () => closeRef.current(),
    onLookInsideCanvasPointerMissed: () => { if (openRef.current) closeRef.current(); },
    onDetailBookClick: () => openInDetail(), onDetailBookHoverChange: (hovered: boolean) => setPeek(hovered),
    homeLookInside: home,
  };
  return { open, home, homeIndex, peek, pillHover, setPillHover, page, setPage, openInDetail, openOnHome, close, sceneProps };
}
