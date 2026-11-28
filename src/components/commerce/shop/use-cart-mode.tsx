"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** The cart's frame state (their `cartMotionRef`, read by the scene every frame; 06w9 eR/eM for rest and open). */
export type CartMotion = { active: boolean; layout: number; panel: number; bookSlide: number; nonCartSlide: number;
  shelfSlide: number | null; stackExit: number | null; pageOpacity: number; backdropOpacity: number };
/** Which books fly into the stack and in what order (module 60444 `k`). */
export type CartEntry = { bookIndex: number | null; bookOrder: number[]; visibleBookIndices: number[]; fromShelf?: boolean };
type Clock = { elapsedMs: number; lastTickMs: number; waitingSinceMs: number | null; nextBook: number; bookStartsMs: Record<number, number> };
type Curves = { panel: number; page: number; bookSlide: number; nonCartSlide: number; layout: number; shelfSlide: number | null; done: boolean };
type Rect = { index: number; leftPx: number; topPx: number; widthPx: number; heightPx: number };
/** Their entry clock (vendored module 60444). */
export type CartTiming = {
  m: { bookSettled: number };
  B: (entry: CartEntry, now: number) => Clock;
  W: (clock: Clock, now: number, entry: CartEntry, ready: Set<number>) => Clock;
  s: (ms: number, entry: CartEntry | null, clock: Clock | null) => Curves;
  k: (active: number | null, cart: number[], visible?: number[], fromShelf?: boolean) => CartEntry | null;
  t: (rects: Rect[], active: number, width: number, height: number) => number[];
};
/** Their motion constants and curves (vendored module 72646). */
export type CartConstants = { $: number; p: number; A: number; o: number; F: number; X: number; g: number; a: number; _: number; O: number;
  j: (ms: number) => number; T: (x: number) => number; B: (x: number) => number };
export type CartPhase = "idle" | "toCart" | "toBrowse";
export type CartToggle = { entry?: CartEntry | null; exitStackFirst?: boolean; returnToShelf?: boolean };

const rest = (): CartMotion => ({ active: false, layout: 0, panel: 0, bookSlide: 0, nonCartSlide: 0, shelfSlide: null, stackExit: null, pageOpacity: 1, backdropOpacity: 0 });
const open = (): CartMotion => ({ active: false, layout: 1, panel: 1, bookSlide: 1, nonCartSlide: 1, shelfSlide: null, stackExit: null, pageOpacity: 0, backdropOpacity: 1 });

/**
 * The cart mode's motion, ported from stripe.press's cart hook (06w9 page chunk, the hook returning isCartMode /
 * cartMotionRef / handleCartToggle). One rAF tick drives everything: the panel fades in (easeOutCubic 500 ms, no slide),
 * the page under it fades out and the backdrop in (easeInOutQuad 800 ms), the books restack into the cart (layout,
 * easeInOutQuad 1000 ms after the source lead) and slide over (bookSlide / nonCartSlide), each book 150 ms after the
 * last; closing runs it back (panel 500, layout 1000, slides 1100, page 800) or, to the shelf, snaps the stack and
 * springs the row back (critically damped, 1000 ms). Their own clock and curves (modules 60444 and 72646) do the
 * timing. `onFrame` receives every frame's state (theirs writes three :root variables and the scene shift from it).
 * `initialOpen` (a direct load of the cart's address) starts it open at rest, everything at 1 (their openInstantly): the
 * first render is already the cart's, and its frame is written at commit, before the first paint (Review-B, 28 Nov).
 */
export function useCartMode({ timing, k, coverReady, onFrame, initialOpen = false }: { timing: CartTiming; k: CartConstants;
  /** The books whose covers are on (their coverAppliedLiveRef): a book waits up to 2.5 s for its cover before it moves. */
  coverReady: { current: Set<number> };
  onFrame: (motion: CartMotion) => void; initialOpen?: boolean }) {
  const [cartMode, setCartMode] = useState(initialOpen);
  const [panelOpen, setPanelOpen] = useState(initialOpen);
  const [layoutBlend, setLayoutBlend] = useState(initialOpen ? 1 : 0);
  const [phase, setPhase] = useState<CartPhase>("idle");
  const [nonCartSlide, setNonCartSlide] = useState(initialOpen ? 1 : 0);
  const [stackExit, setStackExit] = useState<number | null>(null);
  const [shelfSlide, setShelfSlide] = useState<number | null>(null);
  const [entry, setEntry] = useState<CartEntry | null>(null);
  const clock = useRef<Clock | null>(null), motion = useRef<CartMotion>(initialOpen ? open() : rest()), pending = useRef<CartMotion | null>(null), frame = useRef<number | null>(null);
  /** Set with every mode change, not after render, so a close right after an open sees it. */
  const modeRef = useRef(initialOpen);
  /** The phase as each transition is accepted, before React commits it: a second close in the same task is refused
   * instead of restarting the motion (Review-B, 28 Nov). */
  const phaseRef = useRef<CartPhase>("idle");
  const enter = useCallback((next: CartPhase) => { phaseRef.current = next; setPhase(next); }, []);
  const frameRef = useRef(onFrame);
  useEffect(() => { frameRef.current = onFrame; });

  const cancel = useCallback(() => {
    pending.current = null;
    if (frame.current != null) { cancelAnimationFrame(frame.current); frame.current = null; }
  }, []);
  useEffect(() => () => cancel(), [cancel]);
  const write = useCallback((next: CartMotion) => { motion.current = next; frameRef.current(next); }, []);
  /** At the end of a run the state goes active until the scene reports its stack at rest (their settleCartMotion). */
  const hold = useCallback((next: CartMotion) => { pending.current = next; write({ ...next, active: true }); }, [write]);
  const settle = useCallback(() => { const next = pending.current; if (next) { pending.current = null; write(next); } }, [write]);

  /** A direct load of the cart's address writes its open frame once, at commit (the state above already starts open). */
  const startedOpen = useRef(initialOpen);
  useLayoutEffect(() => { if (startedOpen.current) write(motion.current); }, [write]);

  /** Start the open or the close; false (and nothing changes) when a close is already under way. */
  const toggle = useCallback((options?: CartToggle): boolean => {
    if (phaseRef.current === "toBrowse") return false;
    if (!modeRef.current) {
      cancel(); modeRef.current = true; enter("toCart"); setLayoutBlend(0); setNonCartSlide(0); setStackExit(null);
      const from = options?.entry ?? null, fromShelf = from?.fromShelf === true;
      setEntry(from); setShelfSlide(fromShelf ? 0 : null); setPanelOpen(true); setCartMode(true);
      write({ ...rest(), active: true, shelfSlide: fromShelf ? 0 : null });
      const start = performance.now();
      let running = from ? timing.B(from, start) : null;
      clock.current = running;
      const seen = { layout: false, shelf: !fromShelf };
      const tick = () => {
        const now = performance.now(), before = running?.elapsedMs ?? 0;
        if (from && running) running = timing.W(running, now, from, coverReady.current);
        const ms = running?.elapsedMs ?? now - start;
        clock.current = running;
        const c = timing.s(ms, from, running);
        // Until the first book has had its motion (plus the shelf's lead), the page follows the clock; after, it holds.
        const live = !from || before < timing.m.bookSettled + (fromShelf ? k.g : 0);
        if (live) {
          if (!seen.shelf && c.shelfSlide == null) { seen.shelf = true; setShelfSlide(null); }
          if (!seen.layout && c.layout >= 1) { seen.layout = true; setLayoutBlend(1); }
        }
        if (c.done) {
          frame.current = null; setLayoutBlend(1); setNonCartSlide(1); setShelfSlide(null); enter("idle"); hold(open());
          return;
        }
        if (live) write({ active: true, layout: c.layout, panel: c.panel, bookSlide: c.bookSlide, nonCartSlide: c.nonCartSlide,
          shelfSlide: c.shelfSlide, stackExit: null, pageOpacity: 1 - c.page, backdropOpacity: c.page });
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
      return true;
    }
    // Closing, from wherever the open had got to.
    const was = motion.current, from = { layout: was.layout, panel: was.panel, bookSlide: was.bookSlide, nonCartSlide: was.nonCartSlide, shelfSlide: was.shelfSlide };
    const stackFirst = options?.exitStackFirst ?? false;
    const at = (t: number) => {
      if (options?.returnToShelf) {
        const lead = from.shelfSlide == null && stackFirst ? k.O : 0, snapped = t >= lead;
        const spring = k.j(t - lead), page = k.T((t - lead) / k._);
        return { layout: snapped ? 0 : from.layout, panel: from.panel * (1 - k.B(t / (lead || k._))),
          bookSlide: snapped ? 0 : from.bookSlide, nonCartSlide: snapped ? 0 : from.nonCartSlide,
          pageOpacity: 1 - (from.shelfSlide == null ? 1 : from.panel) * (1 - page), stackExit: lead > 0 ? k.T(t / lead) : null,
          shelfSlide: snapped ? (from.shelfSlide ?? 1) * (1 - spring) : null, done: t >= lead + k.a };
      }
      const exitFirst = stackFirst && from.layout >= 1, lead = exitFirst ? k.O : 0, span = exitFirst ? k.A : k.o, d = Math.max(0, t - lead);
      const layout = 1 - k.T(d / span), slide = 1 - k.B(d / k.p), page = 1 - k.T(d / k.F);
      return { layout: from.layout * layout, panel: from.panel * (1 - k.B(t / k.X)), bookSlide: from.bookSlide * slide,
        nonCartSlide: from.nonCartSlide * slide, pageOpacity: 1 - from.panel * page, stackExit: exitFirst ? k.T(t / k.O) : null,
        shelfSlide: null, done: t >= lead + Math.max(span, k.p, k.F) };
    };
    const first = at(0), backdrop = 1 - was.pageOpacity;
    setStackExit(first.stackExit); setShelfSlide(first.shelfSlide); setPanelOpen(false); cancel(); enter("toBrowse");
    write({ active: true, layout: first.layout, panel: first.panel, bookSlide: first.bookSlide, nonCartSlide: first.nonCartSlide,
      shelfSlide: first.shelfSlide, stackExit: first.stackExit, pageOpacity: first.pageOpacity, backdropOpacity: backdrop });
    const start = performance.now(), seen = { shelf: first.shelfSlide != null, exit: first.stackExit == null };
    const tick = () => {
      const ms = performance.now() - start, c = at(ms);
      if (!seen.shelf && c.shelfSlide != null) { seen.shelf = true; setShelfSlide(c.shelfSlide); }
      if (!seen.exit && c.stackExit != null && c.stackExit >= 1) { seen.exit = true; setStackExit(1); }
      if (c.done) {
        frame.current = null; setLayoutBlend(0); setNonCartSlide(0); setStackExit(null); setShelfSlide(null); setEntry(null);
        clock.current = null; modeRef.current = false; enter("idle"); setCartMode(false); hold(rest());
        return;
      }
      write({ active: true, layout: c.layout, panel: c.panel, bookSlide: c.bookSlide, nonCartSlide: c.nonCartSlide, shelfSlide: c.shelfSlide,
        stackExit: c.stackExit, pageOpacity: c.pageOpacity, backdropOpacity: backdrop * (1 - k.T(Math.min(1, ms / k.$))) });
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return true;
  }, [timing, k, coverReady, cancel, write, hold, enter]);

  return { cartMode, modeRef, phaseRef, panelOpen, layoutBlend, phase, nonCartSlide, stackExit, shelfSlide, entry, clock, motion,
    toggle, settle, cancel };
}
