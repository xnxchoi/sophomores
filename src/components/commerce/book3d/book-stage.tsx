"use client";

import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/Theme";
import { useRPStore } from "@/providers/RP_Pro";
import { useCanvasClaim } from "@/components/gl/canvas-frameloop";
import type { BookSignals, BookTextures } from "./book";
import { endCarry, peekCarry } from "./book-carry";
import { BookControlBar, BookPill } from "./book-controls";

// Not three's MathUtils: the stage loads with the page, and three must stay in the lazy canvas chunk.
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
// Also not book.tsx's easeInOutQuad, for the same reason (three stays in the lazy chunk).
const easeInOutQuad = (x: number) => x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
// The carry (TEARDOWN §5): the active book travels for 600 ms (its 200 → 800 ms window), eased in and out.
const CARRY_MS = 600;
const BookCanvas = dynamic(() => import("./book-canvas"), { ssr: false });

/**
 * The product page's stage: the art (children) with the 3D book over it. The book draws in the site's shared canvas
 * through a drei View (book-canvas.tsx); only its clipped hit area takes the pointer, so the art's own controls keep
 * working. The book's View draws while the stage is in view; it leaves ahead of the first full-width
 * section marked `data-covers-stage`, stripe.press's detail-scroll rule (TEARDOWN §7): on wide screens the book holds
 * while you read and leaves through the top as the first such section arrives (it starts 220 px before the section
 * reaches the viewport's bottom and is gone about 1.15 viewport heights later). Below lg the stage scrolls with the page,
 * so nothing slides over it. The book hides while the site menu is open. Its controls live in a layer above the canvas
 * (a body portal that mirrors the stage's rect), as stripe.press keeps its pills above its fixed canvas.
 *
 * The page talks to the book through window events, so a row or the cart can drive it without importing three:
 * `book3d:spin` ({ direction: 1 | -1 }, add or remove) and `book3d:effect` ({ hologram?, radio? }, row hovers).
 *
 * No system pointer over the book (the site hides it; owner, 24 Nov). The owner chose stripe.press's follow: the closed
 * book turns toward the pointer (book.tsx), and "Look inside" is anchored at the book's centre, fading in while the pointer
 * is on the book (scale 1.1 → 1, 300 ms; TEARDOWN §4.4). A click on the book or the label opens it; keyboard focus shows
 * the label too. Look inside opens in the stage (full screen on a phone). Close sits on the left;
 * Esc, ← and h close it too, as does a click on empty canvas or a tap past either end. The control bar turns pages and
 * switches the magnifier; on touch, two fingers zoom and pan the open book, and a 300 ms hold pans with one.
 */
export function BookStage({ id, className, textures: own = {}, pageTextures: pageList = [], closedZ, children }: {
  /** The product, so each book keeps its own saved page. */
  id: string;
  className?: string; textures?: BookTextures;
  /** Page images in reading order (two per leaf); none yet, so the pages are blank. */
  pageTextures?: string[];
  /** How near the closed book stands (book.tsx; the shop's featured rows bring it closer). */
  closedZ?: number;
  children?: ReactNode;
}) {
  const t = useTranslations("Customer.components_commerce_book_offer");
  // The product's own textures where it has them; an empty slot leaves the cover plain (white, matte: book.tsx). The owner
  // is designing the textures (23 Nov: "The 3d book can be UNSTYLED"), and no borrowed texture is shipped.
  const ownKey = JSON.stringify(own);
  // Keyed by content, not identity: the server sends a new object each render, and the book rebuilds its material on change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const textures = useMemo<BookTextures>(() => Object.fromEntries(Object.entries(own).filter(([, url]) => url)), [ownKey]);
  const pagesKey = pageList.join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pageTextures = useMemo(() => pageList, [pagesKey]);
  const [open, setOpen] = useState(false);
  const [magnifier, setMagnifier] = useState(false);
  const [ink, setInk] = useState<null | "pink" | "yellow">(null);
  // Closing (or opening from the button, which unmounts before its pointerleave) clears hover; the hit-rect's next move
  // engages again if the pointer is still on the book.
  const close = () => { setOpen(false); setMagnifier(false); setInk(null); setHovering(false); };
  // Picking the active ink again turns the highlighter off (stripe.press).
  const pickInk = (next: "pink" | "yellow") => setInk((current) => current === next ? null : next);
  const stage = useRef<HTMLDivElement>(null);
  const signals = useRef<BookSignals>({ scroll: 0, hologram: false, radio: false, spins: [], look: false, peek: false, commands: [],
    view: { zoom: 1, x: 0, y: 0, panning: false, unitsPerPx: 0.02, reachX: 0 }, marker: null, hitRect: null, invalidate: null,
    exit: 0, pointer: { x: 0, y: 0 }, overlay: null, onGone: null, onReading: null, frame: null, spreadRect: null });
  // The open spread while reading (null until the book has opened): the control bar shows then and reads its pages.
  const [reading, setReading] = useState<{ spread: number; leaves: number; shown: boolean } | null>(null);
  useEffect(() => { const sig = signals.current; sig.onReading = setReading; return () => { sig.onReading = null; }; }, []);
  // The keys read the latest tool state without re-binding (Escape turns off the magnifier, then the ink, then closes).
  const tools = useRef({ magnifier, ink, lastInk: "pink" as "pink" | "yellow" });
  useEffect(() => { tools.current.magnifier = magnifier; tools.current.ink = ink; if (ink) tools.current.lastInk = ink; }, [magnifier, ink]);
  const overlay = useRef<HTMLDivElement>(null), frameBox = useRef<HTMLDivElement>(null), sync = useRef<(() => void) | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id); }, []);
  const menuOpen = useRPStore((state) => state.navIsOpen);
  useEffect(() => { signals.current.marker = ink; }, [ink]);
  const { ref: inViewRef, inView } = useInView({ initialInView: true });
  const dark = useTheme((store) => store.theme) === "dark";
  // The loop runs ('always') only while the book is engaged: the pointer on its hit-rect or controls, or Look inside open.
  // Otherwise it renders on demand: a scroll, a row's effect or the theme asks for a frame, and the book keeps asking only
  // while something it shows still moves (book.tsx), so an idle page draws nothing (Review-B r2: demand on release).
  const [hovering, setHovering] = useState(false);
  // Arriving from a shop card: the book starts at that card's cover and travels into the stage (book-carry.tsx).
  const [carried] = useState(() => peekCarry(id));
  const [carrying, setCarrying] = useState(false);
  const carry = useRef<{ from: NonNullable<typeof carried>; start: number } | null>(null);
  // The shared canvas runs 'always' while any View holds a claim (gl/canvas-frameloop.tsx), otherwise on demand.
  const shown = inView && !menuOpen;
  // The book's own presence: once the scroll exit has carried it out of view, its label and hit area go too, though the
  // sticky stage is still on screen (Review-B r1, step 2). The View stays on, so the exit plays to its end.
  const [gone, setGone] = useState(false);
  useEffect(() => { const sig = signals.current; sig.onGone = setGone; return () => { sig.onGone = null; }; }, []);
  const usable = shown && !gone;
  useCanvasClaim(shown && (hovering || open || carrying));
  useEffect(() => {
    if (!carried) return;
    carry.current = { from: carried, start: performance.now() };
    let frame = requestAnimationFrame(function step() {
      setCarrying(true);
      sync.current?.();
      if (carry.current && performance.now() - carry.current.start < CARRY_MS) { frame = requestAnimationFrame(step); return; }
      carry.current = null; endCarry(id); setCarrying(false); sync.current?.();
    });
    return () => { cancelAnimationFrame(frame); carry.current = null; };
  }, [carried, id]);
  const engage = () => setHovering(true), release = () => setHovering(false);
  const poke = () => signals.current.invalidate?.();
  // Pointers pressed on the book; when it hides or leaves mid-gesture each is cancelled, so a held drag, page turn, stroke, pinch or
  // pan ends the way a cancelled touch does (Review-B r2).
  const pressed = useRef(new Set<number>());
  useEffect(() => {
    const down = (event: PointerEvent) => { if (signals.current.hitRect?.contains(event.target as Node)) pressed.current.add(event.pointerId); };
    const up = (event: PointerEvent) => { pressed.current.delete(event.pointerId); };
    document.addEventListener("pointerdown", down, true);
    for (const type of ["pointerup", "pointercancel"] as const) document.addEventListener(type, up, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      for (const type of ["pointerup", "pointercancel"] as const) document.removeEventListener(type, up, true);
    };
  }, []);
  useEffect(() => {
    const hit = signals.current.hitRect;
    if (usable || !hit) return;
    for (const pointerId of pressed.current) {
      try { hit.releasePointerCapture(pointerId); } catch { /* not captured */ }
      hit.dispatchEvent(new PointerEvent("pointercancel", { pointerId, bubbles: true }));
    }
    pressed.current.clear();
    const id = requestAnimationFrame(() => setHovering(false));
    return () => cancelAnimationFrame(id);
  }, [usable]);
  // The theme's change re-lights the book.
  useEffect(() => { signals.current.invalidate?.(); }, [dark]);

  useEffect(() => {
    const main = stage.current?.closest("main");
    const onScroll = () => {
      // Progress through the page's own scroll range: 0 at the top, 1 where the page ends.
      const range = main ? main.offsetHeight + main.offsetTop - window.innerHeight : 0;
      const scroll = range > 0 ? Math.min(Math.max(window.scrollY / range, 0), 1) : 0;
      if (scroll !== signals.current.scroll) poke();
      signals.current.scroll = scroll;
      // The scroll exit (06w9:14799-14822, desktop): exit = (vh − (anchorTop − 220)) / ((0.5 / 1.3) × 3 × vh), clamped,
      // where the anchor sits inside the first full-width section, under its 160 px top padding.
      const rect = stage.current?.getBoundingClientRect(), vh = window.innerHeight;
      const anchor = main?.querySelector("[data-book-exit-anchor]")?.getBoundingClientRect();
      const exit = anchor && window.matchMedia("(min-width: 64rem)").matches
        ? Math.min(Math.max((vh - (anchor.top - 220)) / ((0.5 / 1.3) * 3 * vh), 0), 1) : 0;
      if (exit !== signals.current.exit) { signals.current.exit = exit; poke(); }
      // The book's layer spans the window (the book may spill past the stage and leaves over the page, as stripe.press's
      // full-window canvas does); the stage's rect is its frame: the camera is framed on it, and the controls sit on it.
      // During the carry the frame travels from the clicked card's cover to the stage.
      const from = carry.current, e = from ? easeInOutQuad(clamp((performance.now() - from.start) / CARRY_MS, 0, 1)) : 1;
      const lerp = (a: number, b: number) => a + (b - a) * e;
      if (rect) {
        const frame = { left: lerp(from?.from.left ?? rect.left, rect.left), top: lerp(from?.from.top ?? rect.top, rect.top),
          width: lerp(from?.from.width ?? rect.width, rect.width), height: lerp(from?.from.height ?? rect.height, rect.height) };
        signals.current.frame = frame; poke();
        const box = frameBox.current;
        if (box) { box.style.left = frame.left + "px"; box.style.top = frame.top + "px"; box.style.width = frame.width + "px"; box.style.height = frame.height + "px"; }
      }
    };
    // The closed book's tilt follows the pointer over the whole viewport (mouse and pen; touch has no hover).
    let lastPoke = 0;
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      signals.current.pointer = { x: event.clientX / window.innerWidth * 2 - 1, y: 1 - event.clientY / window.innerHeight * 2 };
      if (event.timeStamp - lastPoke > 33) { lastPoke = event.timeStamp; poke(); }
    };
    const onSpin = (event: Event) => { poke(); signals.current.spins.push((event as CustomEvent<{ direction?: number }>).detail?.direction ?? 1); };
    const onEffect = (event: Event) => {
      poke();
      const detail = (event as CustomEvent<{ hologram?: boolean; radio?: boolean }>).detail ?? {};
      if (detail.hologram !== undefined) signals.current.hologram = detail.hologram;
      if (detail.radio !== undefined) signals.current.radio = detail.radio;
    };
    onScroll();
    sync.current = onScroll;
    const resize = new ResizeObserver(onScroll);
    if (stage.current) resize.observe(stage.current);
    document.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("book3d:spin", onSpin);
    window.addEventListener("book3d:effect", onEffect);
    return () => {
      resize.disconnect();
      document.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("book3d:spin", onSpin);
      window.removeEventListener("book3d:effect", onEffect);
    };
  }, [mounted]);

  useEffect(() => {
    signals.current.look = open;
    // The phone's open state moves the stage to a fixed full screen: the control layer follows on the next frame.
    const frame = requestAnimationFrame(() => sync.current?.());
    if (open) signals.current.peek = false;
    if (!open) { Object.assign(signals.current.view, { zoom: 1, x: 0, y: 0, panning: false, reachX: 0 }); return () => cancelAnimationFrame(frame); }
    // stripe.press's keys while open: ← → turn a page and repeat while held (every 300 ms, quickening to 50 ms over 3 s);
    // < > turn too; x closes; m toggles the magnifier; h the highlighter (last ink); Escape steps back one thing at a time.
    let repeat = 0;
    const stopRepeat = () => { clearTimeout(repeat); repeat = 0; };
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || (event.target as Element | null)?.closest?.("input, textarea, [contenteditable=true]")) return;
      const { key } = event, push = (command: "back" | "forward") => { signals.current.commands.push(command); poke(); };
      if (key === "ArrowLeft" || key === "ArrowRight") {
        event.preventDefault();
        if (event.repeat) return;
        const command = key === "ArrowLeft" ? "back" : "forward", start = performance.now();
        stopRepeat(); push(command);
        const again = () => { push(command); repeat = window.setTimeout(again, 300 - 250 * Math.min((performance.now() - start) / 3000, 1)); };
        repeat = window.setTimeout(again, 300);
      }
      else if (key === "<" || key === ">") push(key === "<" ? "back" : "forward");
      else if (key === "m") setMagnifier((on) => !on);
      else if (key === "h") setInk((current) => current ? null : tools.current.lastInk);
      else if (key === "Escape") {
        if (tools.current.magnifier) setMagnifier(false); else if (tools.current.ink) setInk(null); else close();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") stopRepeat(); };
    window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKeyUp); window.addEventListener("blur", stopRepeat);
    return () => {
      cancelAnimationFrame(frame); stopRepeat();
      window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("blur", stopRepeat);
    };
  }, [open]);

  // Touch zoom and pan of the open book (#27): pinch between 1× and 2× (rubber 0.35 beyond), two fingers or a 300 ms
  // hold pan (rubber 0.28 past the edge, a quarter of the spread stays on screen), and on release it springs back in.
  useEffect(() => {
    // On the book's hit area: it lives in the control layer, so its events no longer bubble through the stage.
    const element = signals.current.hitRect, view = signals.current.view;
    if (!element || !open || !shown) return;
    const points = new Map<number, { x: number; y: number }>();
    let start: null | { dist: number; x: number; y: number; zoom: number; viewX: number; viewY: number } = null;
    let hold = 0, settle = 0, downAt = { x: 0, y: 0 };
    const rubber = (value: number, min: number, max: number, k: number) => value < min ? min - (min - value) * k : value > max ? max + (value - max) * k : value;
    const bounds = (zoom: number) => ({ x: Math.max(7.2 * 0.75 * Math.max(zoom - 0.5, 0), view.reachX * zoom), y: 5.2 * 0.75 * Math.max(zoom - 0.5, 0) });
    const centre = () => { const all = [...points.values()]; return { x: all.reduce((a, p) => a + p.x, 0) / all.length, y: all.reduce((a, p) => a + p.y, 0) / all.length }; };
    const spread = () => { const [a, b] = [...points.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 1; };
    const begin = () => { const c = centre(); start = { dist: spread(), x: c.x, y: c.y, zoom: view.zoom, viewX: view.x, viewY: view.y }; view.panning = true; cancelAnimationFrame(settle); };
    const down = (event: PointerEvent) => {
      if (event.pointerType !== "touch" || (event.target as Element | null)?.closest?.("[data-book-ui]")) return;
      points.set(event.pointerId, { x: event.clientX, y: event.clientY });
      try { (event.target as Element).setPointerCapture(event.pointerId); } catch { /* the pointer is already gone */ }
      window.clearTimeout(hold);
      if (points.size === 2) begin();
      else if (points.size === 1) { downAt = { x: event.clientX, y: event.clientY }; hold = window.setTimeout(begin, 300); }
    };
    const move = (event: PointerEvent) => {
      if (!points.has(event.pointerId)) return;
      points.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (!start && Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) > 8) window.clearTimeout(hold);
      if (!start) return;
      const c = centre(), zoom = points.size > 1 ? rubber(start.zoom * spread() / start.dist, 1, 2, 0.35) : start.zoom, b = bounds(zoom);
      view.zoom = zoom;
      view.x = rubber(start.viewX - (c.x - start.x) * view.unitsPerPx, -b.x, b.x, 0.28);
      view.y = rubber(start.viewY + (c.y - start.y) * view.unitsPerPx, -b.y, b.y, 0.28);
    };
    const up = (event: PointerEvent) => {
      points.delete(event.pointerId); window.clearTimeout(hold);
      if (!start || points.size > 0) return;
      start = null;
      // Spring back into range (stiffness 140, damping ratio 0.75), then hand the pointer back to the pages.
      const goal = () => { const zoom = clamp(view.zoom, 1, 2), b = bounds(zoom); return { zoom, x: clamp(view.x, -b.x, b.x), y: clamp(view.y, -b.y, b.y) }; };
      const velocity = { zoom: 0, x: 0, y: 0 }, k = 140, c = 2 * 0.75 * Math.sqrt(k);
      let last = performance.now();
      const step = (now: number) => {
        const dt = Math.min((now - last) / 1000, 0.05), g = goal(); last = now;
        (["zoom", "x", "y"] as const).forEach((key) => { velocity[key] += (k * (g[key] - view[key]) - c * velocity[key]) * dt; view[key] += velocity[key] * dt; });
        if (Math.abs(g.zoom - view.zoom) + Math.abs(g.x - view.x) + Math.abs(g.y - view.y) > 0.001) settle = requestAnimationFrame(step);
        else { Object.assign(view, g); view.panning = false; }
      };
      settle = requestAnimationFrame(step);
    };
    // Safari's own pinch gestures would zoom the page instead.
    const block = (event: Event) => event.preventDefault();
    element.addEventListener("pointerdown", down); element.addEventListener("pointermove", move); element.addEventListener("pointerup", up); element.addEventListener("pointercancel", up);
    element.addEventListener("lostpointercapture", up);
    element.addEventListener("gesturestart", block); element.addEventListener("gesturechange", block);
    return () => {
      window.clearTimeout(hold); cancelAnimationFrame(settle); view.panning = false;
      element.removeEventListener("pointerdown", down); element.removeEventListener("pointermove", move); element.removeEventListener("pointerup", up); element.removeEventListener("pointercancel", up);
      element.removeEventListener("lostpointercapture", up);
      element.removeEventListener("gesturestart", block); element.removeEventListener("gesturechange", block);
    };
  }, [open, shown]);

  return <div data-open={open} ref={(element) => { stage.current = element; inViewRef(element); }}
    onDragStart={(event) => event.preventDefault()}
    className={cn("pointer-events-none select-none [-webkit-touch-callout:none] [-webkit-user-drag:none] [&_img]:[-webkit-user-drag:none] max-lg:data-[open=true]:fixed max-lg:data-[open=true]:inset-0 max-lg:data-[open=true]:z-50 max-lg:data-[open=true]:h-dvh max-lg:data-[open=true]:bg-background", className)}>
    {children}
    {/* The book's layer above the shared canvas: a fixed body portal, after the canvas in paint order, mirroring the
        stage's rect (scroll, resize, the phone's full-screen open state). It holds the book's View and its controls. */}
    {mounted && createPortal(<div ref={(element) => { overlay.current = element; signals.current.overlay = element; }}
      // The same gate as the book's View (menu, out of view): hidden controls fade out and take no pointer or focus.
      data-open={open} data-hidden={!usable} inert={!usable} onDragStart={(event) => event.preventDefault()}
      className="group/layer pointer-events-none fixed inset-0 z-1 select-none [-webkit-touch-callout:none] [-webkit-user-drag:none]">
      {/* The book draws in the site's shared canvas through a drei View. The View's own element is its hit area (the
          stripe.press hit-rect) and lives in this layer, so its rect follows the stage's, and can travel (the carry, step
          3). It spans the layer; the book clips its hit-testing to its own bounds each frame (none while Look inside is
          open). It starts clipped to nothing. Pointer engagement holds a frameloop claim. */}
      <BookCanvas signals={signals} textures={textures} visible={shown} dark={dark} intro={!carried} closedZ={closedZ}
        onOpen={() => setOpen(true)} onClose={close} storageKey={"book3d:" + id} pageTextures={pageTextures} magnifier={magnifier}
        onElement={(element) => { signals.current.hitRect = element; }}
        onPointerEnter={engage} onPointerDown={engage} onPointerMove={hovering ? undefined : engage} onPointerLeave={release}
        // Hidden (menu, out of view) means no input target either: drei's View passes `visible` to the canvas, not to this
        // DOM tracker (Review-B r2).
        inert={!usable} className={cn("pointer-events-auto absolute inset-0 touch-pan-y in-data-[open=true]:touch-none", !usable && "pointer-events-none")} />
      {/* The stage's frame (its rect, kept by the scroll handler): stripe.press's bar sits on its bottom edge as a tab. */}
      <div ref={frameBox} className="pointer-events-none absolute">
        {reading !== null && <div className="pointer-events-none absolute inset-x-0 bottom-0 z-1 flex justify-center max-lg:bottom-[calc(max(var(--bar-target),var(--frame-bottom))+28px+env(safe-area-inset-bottom))]">
          <BookControlBar shown={reading.shown && open} spread={reading.spread} leaves={reading.leaves} magnifier={magnifier} ink={ink} onClose={close}
            onBack={() => { signals.current.commands.push("back"); poke(); }} onForward={() => { signals.current.commands.push("forward"); poke(); }}
            onMagnifier={() => setMagnifier((on) => !on)} onInk={pickInk} />
        </div>}
      </div>
      {!open && <BookPill sign="+" label={t("lookInside")} typed shown={hovering && usable} onClick={() => { setOpen(true); setHovering(false); }}
            onPointerEnter={() => { signals.current.peek = true; engage(); }} onPointerLeave={() => { signals.current.peek = false; release(); }}
            onFocus={() => { signals.current.peek = true; poke(); }} onBlur={() => { signals.current.peek = false; poke(); }}
            // Anchored on the book's centre; it fades in from 1.1× over 300 ms (stripe.press's open pill).
            className="pointer-events-none absolute top-(--book-y) left-(--book-x) -translate-1/2 scale-110 opacity-0 outline-offset-2 transition-[opacity,scale,background-color,color] duration-300 focus-visible:pointer-events-auto focus-visible:scale-100 focus-visible:opacity-100 focus-visible:outline-2 data-[shown=true]:pointer-events-auto data-[shown=true]:scale-100 data-[shown=true]:opacity-100" />}
    </div>, document.body)}
  </div>;
}
