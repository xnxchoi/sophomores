import { useCallback, useEffect, useRef, useState } from "react";
import type { SceneCatalogue, SceneHub, SceneRouter } from "./stripe-scene";

type Transition = { active: boolean; index: number; progress: number; activeProgress: number; activeProgressY: number;
  returning: boolean; landingFrac: number; landingExits?: unknown; advance?: (now: number) => void };
const idle = (): Transition => ({ active: false, index: -1, progress: 0, activeProgress: 0, activeProgressY: 0, returning: false, landingFrac: 0 });
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const inOutQuad = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

/** What the hook needs from its page: raw scroll progress, the hrefs to show in the address bar, and where the shop is. */
export type BookDetailSource = { rawProgress: () => number; hrefOf: (index: number) => string | null; home: string };

/**
 * Their book detail (06w9), desktop: a click on a shelf spine carries that book into its details inside the scene.
 * - Open (`openBookDetail` h$, on-shelf branch, 15069-15150): the transition ref on a rAF clock (neighbours fall over
 *   BOOK_OPEN_BOOKS_MOVE_MS, the book after BOOK_OPEN_ACTIVE_DELAY_MS, the next card revealed from
 *   BOOK_OPEN_BG_REVEAL_START_MS), the detail presentation from the active delay (the scene shifts −20vw over 640 ms,
 *   17079-17100), the detail state at the end. A featured book opens in place (no carry), as theirs does after its scroll.
 * - Close (`pR` → `pb` / `pE`, 16424-16562): from the shelf, the reverse carry at half speed after the column fades
 *   (motion tokens P + i); otherwise the column slides out over DETAIL_EXIT_SLIDE_MS.
 * - The URL: pushed to the product's address on open (native history, kept in sync by Next), back to the shop on close;
 *   Back, Escape and the return link close it. The gesture router learns the book-detail scope.
 */
export function useBookDetail(hub: SceneHub, catalogue: SceneCatalogue, router: SceneRouter, motion: { P: number; i: number },
  source: { current: BookDetailSource }) {
  const constant = hub as unknown as Record<string, number>;
  const [open, setOpen] = useState<number | null>(null), [presenting, setPresenting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const clock = useRef({ token: 0, frame: 0 }), fromShelf = useRef(false), pushed = useRef(false);
  const transition = () => hub.bookOpenTransitionLiveRef as { current: Transition };

  const cancel = () => { clock.current.token += 1; if (clock.current.frame) cancelAnimationFrame(clock.current.frame); clock.current.frame = 0; };
  const settle = useCallback((index: number) => {
    setOpen(index); setLeaving(false);
    window.dispatchEvent(new Event("resize"));
  }, []);

  const openBook = useCallback((index: number) => {
    const current = transition().current;
    if (current.active && !current.returning && current.index === index) return true;
    if (window.innerWidth < 900) return false;                                    // phone: row 20, not this slice
    cancel();
    const raw = source.current.rawProgress(), onShelf = raw >= catalogue.J + 0.5 && raw < catalogue.K + 1;
    fromShelf.current = onShelf;
    const href = source.current.hrefOf(index);
    if (href && !pushed.current) { window.history.pushState(null, "", href); pushed.current = true; }
    else if (href) window.history.replaceState(null, "", href);
    if (!onShelf) { setPresenting(true); settle(index); return true; }
    const token = ++clock.current.token;
    const delay = constant.BOOK_OPEN_ACTIVE_DELAY_MS, move = constant.BOOK_OPEN_BOOKS_MOVE_MS;
    const revealStart = constant.BOOK_OPEN_BG_REVEAL_START_MS, reveal = constant.BOOK_OPEN_BG_REVEAL_MS;
    const total = Math.max(move, revealStart + reveal, delay + move);
    transition().current = { active: true, index, progress: 0, activeProgress: 0, activeProgressY: 0, returning: false, landingFrac: 0 };
    hub.shelfReturnRevealLiveRef.current = -1; hub.bookOpenRevealLiveRef.current = 0;
    hub.canvasShiftAnimatingUntilRef.current = performance.now() + total + 200;
    const start = performance.now();
    let elapsed = 0, presented = false;
    const advance = (now: number) => {
      if (now - start <= elapsed) return;
      elapsed = now - start;
      const ref = transition().current;
      ref.progress = inOutQuad(clamp01(elapsed / move));
      ref.activeProgress = ref.activeProgressY = inOutQuad(clamp01((elapsed - delay) / move));
      hub.bookOpenRevealLiveRef.current = 1 - (1 - clamp01((elapsed - revealStart) / reveal)) ** 3;
    };
    transition().current.advance = advance;
    const step = () => {
      if (token !== clock.current.token) return;
      advance(performance.now());
      if (!presented && elapsed >= delay) { presented = true; setPresenting(true); }
      hub.canvasShiftAnimatingUntilRef.current = performance.now() + 200;
      if (elapsed < total) { clock.current.frame = requestAnimationFrame(step); return; }
      clock.current.frame = 0;
      const ref = transition().current;
      ref.progress = ref.activeProgress = ref.activeProgressY = 1; hub.bookOpenRevealLiveRef.current = 1;
      settle(index);
      requestAnimationFrame(() => { if (token === clock.current.token) { transition().current = idle(); hub.bookOpenRevealLiveRef.current = 1; } });
    };
    clock.current.frame = requestAnimationFrame(step);
    return true;
  }, [hub, catalogue, settle]);   // eslint-disable-line react-hooks/exhaustive-deps

  const closeState = useCallback(() => { setOpen(null); setPresenting(false); setLeaving(false); }, []);

  const closeBook = useCallback((fromHistory = false) => {
    if (open == null) return;
    if (!fromHistory && pushed.current) window.history.replaceState(null, "", source.current.home);
    pushed.current = false;
    cancel();
    const index = open, token = ++clock.current.token;
    if (!fromShelf.current) {                                                      // pE: the column slides out
      setLeaving(true); hub.detailExitAnimatingLiveRef.current = true;
      window.setTimeout(() => { if (token !== clock.current.token) return; hub.detailExitAnimatingLiveRef.current = false; closeState(); },
        constant.DETAIL_EXIT_SLIDE_MS);
      return;
    }
    setLeaving(true);                                                              // pb: fade, then the reverse carry
    hub.shelfReturnRevealLiveRef.current = index; hub.bookOpenRevealLiveRef.current = 1;
    let faded = 0, last = performance.now();
    const fade = (now: number) => {
      if (token !== clock.current.token) { if (hub.shelfReturnRevealLiveRef.current === index) hub.shelfReturnRevealLiveRef.current = -1; return; }
      faded += Math.min(now - last, 1000 / 30); last = now;
      const k = clamp01((faded - motion.P) / 500);
      hub.bookOpenRevealLiveRef.current = 1 - (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
      if (k < 1) requestAnimationFrame(fade);
    };
    requestAnimationFrame(fade);
    window.setTimeout(() => {
      if (token !== clock.current.token) return;
      transition().current = { active: true, index, progress: 1, activeProgress: 1, activeProgressY: 1, returning: true, landingFrac: 0 };
      setPresenting(true); closeState();
      requestAnimationFrame(() => { if (token === clock.current.token) setPresenting(false); });
      const delay = constant.BOOK_OPEN_ACTIVE_DELAY_MS, move = constant.BOOK_OPEN_BOOKS_MOVE_MS;
      const total = Math.max(move, constant.BOOK_OPEN_BG_REVEAL_START_MS + constant.BOOK_OPEN_BG_REVEAL_MS, delay + move);
      hub.canvasShiftAnimatingUntilRef.current = performance.now() + 2 * total + 200;
      const start = performance.now();
      let elapsed = 0;
      const advance = (now: number) => {
        const t = (now - start) / 2;                                               // half speed
        if (t <= elapsed) return;
        elapsed = t;
        const left = Math.max(0, total - elapsed), ref = transition().current;
        ref.progress = inOutQuad(clamp01(left / move));
        const s = clamp01((delay + move - left) / move);
        ref.activeProgress = 1 - inOutQuad(clamp01(s / 0.7)); ref.activeProgressY = 1 - inOutQuad(s);
        hub.canvasShiftAnimatingUntilRef.current = performance.now() + 200;
      };
      transition().current.advance = advance;
      const step = () => {
        if (token !== clock.current.token) return;
        advance(performance.now());
        if (elapsed < total) { clock.current.frame = requestAnimationFrame(step); return; }
        clock.current.frame = 0;
        hub.backgroundSnapScrollLiveRef.current = 6;
        transition().current = idle(); hub.shelfReturnRevealLiveRef.current = -1; hub.bookOpenRevealLiveRef.current = 1;
      };
      clock.current.frame = requestAnimationFrame(step);
    }, motion.P + motion.i);
  }, [open, hub, motion, closeState]);   // eslint-disable-line react-hooks/exhaustive-deps

  // The scene shift (17079-17100): −20vw while the detail is presented, eased over 640 ms on every change.
  const shift = presenting || (open != null && !leaving) ? -20 : 0, lastShift = useRef(0);
  useEffect(() => {
    hub.detailCanvasShiftVwLiveRef.current = shift;
    if (lastShift.current === shift) return;
    lastShift.current = shift;
    hub.canvasShiftAnimatingUntilRef.current = performance.now() + 720;
    hub.sceneShiftAnimRef.current = { startTime: performance.now(), startValue: hub.sceneShiftXWorldLiveRef.current, duration: 640 };
  }, [shift, hub]);

  // While a book is open the page holds still (slice A: the column scrolls on its own; their per-panel scroll model,
  // where reading runs on into the next book, is slice C).
  useEffect(() => {
    if (open == null) return;
    const root = document.documentElement, before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => { root.style.overflow = before; };
  }, [open]);

  // The router's book-detail scope (16985-16992) and its state flag; Escape and Back close.
  const closeRef = useRef(closeBook);
  useEffect(() => { closeRef.current = closeBook; }, [closeBook]);
  useEffect(() => {
    const state = router._.current;
    state.bookDetail = open != null;
    return () => { state.bookDetail = false; };
  }, [open, router]);
  useEffect(() => {
    if (open == null) return;
    const scope = router.v("book-detail", { acceptsGesture: false, horizontal: (step: number) => { if (step === -1) closeRef.current(); } });
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") closeRef.current(); };
    const back = () => { if (window.location.pathname === source.current.home) closeRef.current(true); };
    window.addEventListener("keydown", key);
    window.addEventListener("popstate", back);
    return () => { scope(); window.removeEventListener("keydown", key); window.removeEventListener("popstate", back); };
  }, [open, router, source]);
  useEffect(() => () => { cancel(); transition().current = idle(); hub.shelfReturnRevealLiveRef.current = -1; hub.bookOpenRevealLiveRef.current = 1; }, [hub]); // eslint-disable-line react-hooks/exhaustive-deps

  return { open, presenting, leaving, openBook, closeBook };
}
