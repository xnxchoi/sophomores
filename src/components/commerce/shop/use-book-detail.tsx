import { useCallback, useEffect, useRef, useState } from "react";
import { cartOwnsInput } from "./cart-column";
import type { SceneCatalogue, SceneHub, SceneRouter } from "./stripe-scene";

type Transition = { active: boolean; index: number; progress: number; activeProgress: number; activeProgressY: number;
  returning: boolean; landingFrac: number; landingExits?: unknown; advance?: (now: number) => void };
const idle = (): Transition => ({ active: false, index: -1, progress: 0, activeProgress: 0, activeProgressY: 0, returning: false, landingFrac: 0 });
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const inOutQuad = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

/** What the hook needs from its page: raw scroll progress, the hrefs to show in the address bar, where the shop is, and
 * where the page scrolls to bring a featured book onto its card (their `ut`) or the shelf's row into its seat (`nK`). */
export type BookDetailSource = { rawProgress: () => number; hrefOf: (index: number) => string | null; home: string;
  placeOf: (index: number) => number; shelfAt: () => number | null;
  /** Commit the scene's progress to the open book (theirs: `e6(e)` when the detail settles) and release it on close.
   * `instant`: opened from the shelf or on its own address (a phone's exits then start at once). */
  pin: (index: number, arrived: boolean, instant: boolean) => void; unpin: (index: number) => void;
  /** A phone's carry: the open book's exits at its landing (their `landingExits`); undefined on desktop. */
  landingExits?: (index: number) => unknown;
  /** True while the book's pages are open ("Open book"): ← turns a page then, it does not leave the details. */
  pagesOpen: () => boolean };

/**
 * Their book detail (06w9), at every width: a click on a shelf spine carries that book into its details inside the scene.
 * - Open (`openBookDetail` h$, on-shelf branch, 15069-15150): the transition ref on a rAF clock (neighbours fall over
 *   BOOK_OPEN_BOOKS_MOVE_MS, the book after BOOK_OPEN_ACTIVE_DELAY_MS, the next card revealed from
 *   BOOK_OPEN_BG_REVEAL_START_MS), the detail presentation from the active delay (the scene shifts −20vw over 640 ms,
 *   17079-17100), the detail state at the end.
 * - Off the shelf, theirs scrolls first: a book that isn't featured goes to the shelf, waits for the row to assemble and
 *   settle (at most 900 ms), then carries from there (14968-15016); a featured book scrolls onto its card (ease-out quad,
 *   320–1200 ms by distance) and then opens in place (15151-15172).
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
  /** Closing from the shelf, until the reverse carry starts: the scene stays shifted while the column fades. */
  const [holding, setHolding] = useState(false);
  /** An open under way (their `ds`): set when one starts, cleared when it lands, or when the visitor takes the scroll first. */
  const [pending, setPending] = useState<number | null>(null);
  const clock = useRef({ token: 0, frame: 0 }), fromShelf = useRef(false), pushed = useRef(false);
  const transition = () => hub.bookOpenTransitionLiveRef as { current: Transition };
  const openRef = useRef<(index: number) => boolean>(() => false), isOpen = useRef(false);
  useEffect(() => { isOpen.current = open != null; }, [open]);

  const cancel = () => { clock.current.token += 1; if (clock.current.frame) cancelAnimationFrame(clock.current.frame); clock.current.frame = 0; };
  const settle = useCallback((index: number, arrived = false) => {
    source.current.pin(index, arrived, arrived || fromShelf.current);
    setOpen(index); setLeaving(false); setPending(null);
    window.dispatchEvent(new Event("resize"));
  }, []);

  // `arrived`: the page was loaded on this product's address (theirs: the deep link opens with rememberOrigin false and
  // instant, 06w9:15164-15170): no carry, no history entry; closing replaces the address with the shop's.
  const openBook = useCallback((index: number, arrived = false) => {
    const current = transition().current;
    if (current.active && !current.returning && current.index === index) return true;
    cancel(); setPending(index);
    const raw = source.current.rawProgress(), onShelf = !arrived && raw >= catalogue.J + 0.5 && raw < catalogue.K + 1;
    // Already reading a book: the next one opens in place, with no scroll (theirs, 15063).
    if (isOpen.current && !arrived) {
      const href = source.current.hrefOf(index);
      if (href) window.history.replaceState(null, "", href);
      setPresenting(true); settle(index); return true;
    }
    // Their pre-scroll to the shelf for a book that isn't featured (14968-15016): ease-out quad onto the row's seat
    // (re-read every frame), then wait for the row to assemble and its selection to settle, then open again from there.
    const seat = source.current.shelfAt();
    if (!arrived && !onShelf && index >= catalogue.t && seat != null) {
      const token = ++clock.current.token;
      const ms = Math.min(1200, Math.max(320, Math.round((Math.abs(seat - window.scrollY) / Math.max(1, window.innerHeight)) * 1000)));
      let from: number | null = null, start = 0, arrivedAt = 0, landed = 0;
      const step = (now: number) => {
        if (token !== clock.current.token) return;
        if (from == null) { from = window.scrollY; start = now; }
        if (!arrivedAt) {
          const target = source.current.shelfAt() ?? seat, t = Math.min(1, (now - start) / ms);
          window.scrollTo(0, from + (target - from) * (1 - (1 - t) * (1 - t)));
          if (t >= 1) { arrivedAt = now; landed = window.scrollY; }
          clock.current.frame = requestAnimationFrame(step); return;
        }
        if (Math.abs(window.scrollY - landed) > 8) { clock.current.frame = 0; setPending(null); return; }   // the visitor took the scroll
        const selection = hub.spineSelectionLiveRef.current as { settled?: boolean } | null;
        if (!((hub.spineRowAssembleLiveRef.current as number) > 0.98 && selection?.settled) && now - arrivedAt < 900) {
          clock.current.frame = requestAnimationFrame(step); return;
        }
        clock.current.frame = 0; openRef.current(index);
      };
      clock.current.frame = requestAnimationFrame(step);
      return true;
    }
    fromShelf.current = onShelf;
    const href = source.current.hrefOf(index);
    if (arrived) pushed.current = true;
    else if (href && !pushed.current) { window.history.pushState(null, "", href); pushed.current = true; }
    else if (href) window.history.replaceState(null, "", href);
    if (arrived) { setPresenting(true); settle(index, true); return true; }
    if (!onShelf) {
      // Their scroll onto a featured book's card before it opens (15151-15172), unless the page is already there.
      const target = Math.min(Math.max(0, document.documentElement.scrollHeight - window.innerHeight), source.current.placeOf(index));
      const distance = arrived ? 0 : Math.abs(target - window.scrollY);
      const ms = distance < 1 ? 0 : Math.min(1200, Math.max(320, Math.round((distance / Math.max(1, window.innerHeight)) * 1000)));
      if (ms <= 16) { setPresenting(true); settle(index); return true; }
      const token = ++clock.current.token;
      let from: number | null = null, start = 0;
      const step = (now: number) => {
        if (token !== clock.current.token) return;
        if (from == null) { from = window.scrollY; start = now; }
        const t = Math.min(1, (now - start) / ms);
        window.scrollTo(0, from + (target - from) * (1 - (1 - t) * (1 - t)));
        if (t < 1) { clock.current.frame = requestAnimationFrame(step); return; }
        clock.current.frame = 0; setPresenting(true); settle(index);
      };
      clock.current.frame = requestAnimationFrame(step);
      return true;
    }
    const token = ++clock.current.token;
    const delay = constant.BOOK_OPEN_ACTIVE_DELAY_MS, move = constant.BOOK_OPEN_BOOKS_MOVE_MS;
    const revealStart = constant.BOOK_OPEN_BG_REVEAL_START_MS, reveal = constant.BOOK_OPEN_BG_REVEAL_MS;
    const total = Math.max(move, revealStart + reveal, delay + move);
    // A phone's carry also slides the book and the card by its exits at the landing (06w9:15085-15086).
    transition().current = { active: true, index, progress: 0, activeProgress: 0, activeProgressY: 0, returning: false, landingFrac: 0,
      landingExits: window.innerWidth < 900 ? source.current.landingExits?.(index) : undefined };
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
  }, [hub, catalogue, settle, source]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { openRef.current = openBook; }, [openBook]);

  const closeState = useCallback((index: number) => { source.current.unpin(index); setOpen(null); setPresenting(false); setLeaving(false); setHolding(false); }, [source]);
  /** Reading on into another book's details (the page's reading scroll): it becomes the open book. */
  const setReading = useCallback((index: number) => { setOpen((current) => (current == null ? current : index)); }, []);

  const closeBook = useCallback((fromHistory = false) => {
    if (open == null) return;
    if (!fromHistory && pushed.current) window.history.replaceState(null, "", source.current.home);
    pushed.current = false;
    cancel();
    const index = open, token = ++clock.current.token;
    if (!fromShelf.current) {                                                      // pE: the column slides out
      setLeaving(true); hub.detailExitAnimatingLiveRef.current = true;
      window.setTimeout(() => { if (token !== clock.current.token) return; hub.detailExitAnimatingLiveRef.current = false; closeState(index); },
        constant.DETAIL_EXIT_SLIDE_MS);
      return;
    }
    setLeaving(true); setHolding(true);                                            // pb: fade, then the reverse carry
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
      setHolding(false);
      transition().current = { active: true, index, progress: 1, activeProgress: 1, activeProgressY: 1, returning: true, landingFrac: 0 };
      setPresenting(true); closeState(index);
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

  // The scene shift (17079-17100): −20vw while the detail is presented, eased over 640 ms on every change; none on a
  // phone, where the details run full width under the book.
  const phone = typeof window !== "undefined" && window.innerWidth < 900;
  // Theirs keeps the shift (`hy`) through the close's fade and lets it go as the reverse carry starts (16424-16562).
  const shift = !phone && (presenting || (open != null && (!leaving || holding))) ? -20 : 0, lastShift = useRef(0);
  useEffect(() => {
    hub.detailCanvasShiftVwLiveRef.current = shift;
    if (lastShift.current === shift) return;
    lastShift.current = shift;
    hub.canvasShiftAnimatingUntilRef.current = performance.now() + 720;
    hub.sceneShiftAnimRef.current = { startTime: performance.now(), startValue: hub.sceneShiftXWorldLiveRef.current, duration: 640 };
  }, [shift, hub]);

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
    const scope = router.v("book-detail", { acceptsGesture: false, horizontal: (step: number) => { if (step === -1 && !source.current.pagesOpen()) closeRef.current(); } });
    const key = (event: KeyboardEvent) => { if (event.key === "Escape" && !cartOwnsInput()) closeRef.current(); };
    const back = () => { if (window.location.pathname === source.current.home) closeRef.current(true); };
    window.addEventListener("keydown", key);
    window.addEventListener("popstate", back);
    return () => { scope(); window.removeEventListener("keydown", key); window.removeEventListener("popstate", back); };
  }, [open, router, source]);
  useEffect(() => () => { cancel(); transition().current = idle(); hub.shelfReturnRevealLiveRef.current = -1; hub.bookOpenRevealLiveRef.current = 1; }, [hub]); // eslint-disable-line react-hooks/exhaustive-deps

  return { open, pending, presenting, leaving, shifted: shift !== 0, openBook, closeBook, setReading };
}
