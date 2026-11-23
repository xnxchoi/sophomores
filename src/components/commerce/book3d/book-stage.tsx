"use client";

import { CaretLeftIcon, CaretRightIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/arc/button/button";
import { ArcRoles } from "../arc-roles";
import { useTheme } from "@/providers/Theme";
import type { BookSignals, BookTextures } from "./book";

// Not three's MathUtils: the stage loads with the page, and three must stay in the lazy canvas chunk.
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const BookCanvas = dynamic(() => import("./book-canvas"), { ssr: false });

/**
 * TEMPORARY: Stripe Press textures, replace before publishing. Owner, 23 Nov: "use stripe's for now". They are copies
 * in public/assets/textures/book-temp-*.png (references/ is untouched). README.md here lists each slot's size.
 */
export const TEMPORARY_BOOK_TEXTURES: BookTextures = {
  coverDiffuse: "/assets/textures/book-temp-diffuse.png",
  coverBumpBase: "/assets/textures/book-temp-bump-base.png",
  coverBumpCustom: "/assets/textures/book-temp-bump-custom.png",
  coverFoil: "/assets/textures/book-temp-foil.png",
  coverGlitter: "/assets/textures/book-temp-glitter.png"
};

/**
 * The product page's stage: the art (children) with the 3D book over it. The stage itself takes the pointer (the canvas
 * doesn't), so the art's own controls keep working. Rendering runs while the stage is in view and not covered by a
 * full-width section (`data-covers-stage`), which still counts as "in view" when it scrolls over the pinned stage.
 *
 * The page talks to the book through window events, so a row or the cart can drive it without importing three:
 * `book3d:spin` ({ direction: 1 | -1 }, add or remove) and `book3d:effect` ({ hologram?, radio? }, row hovers).
 *
 * Look inside opens from the pill or a click on the book, in the stage (full screen on a phone). Close sits on the left;
 * Esc, ← and h close it too, as does a click on empty canvas or a tap past either end. The control bar turns pages and
 * switches the magnifier; on touch, two fingers zoom and pan the open book, and a 300 ms hold pans with one.
 */
export function BookStage({ id, className, textures: own = {}, pageTextures: pageList = [], children }: {
  /** The product, so each book keeps its own saved page. */
  id: string;
  className?: string; textures?: BookTextures;
  /** Page images in reading order (two per leaf); none yet, so the pages are blank. */
  pageTextures?: string[];
  children?: ReactNode;
}) {
  const t = useTranslations("Customer.components_commerce_book_offer");
  // The product's own textures where it has them; the TEMPORARY Stripe Press ones fill every empty slot.
  const ownKey = JSON.stringify(own);
  // Keyed by content, not identity: the server sends a new object each render, and the book rebuilds its material on change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const textures = useMemo<BookTextures>(() => ({ ...TEMPORARY_BOOK_TEXTURES, ...Object.fromEntries(Object.entries(own).filter(([, url]) => url)) }), [ownKey]);
  const pagesKey = pageList.join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pageTextures = useMemo(() => pageList, [pagesKey]);
  const [open, setOpen] = useState(false);
  const [magnifier, setMagnifier] = useState(false);
  const [ink, setInk] = useState<null | "pink" | "yellow">(null);
  const close = () => { setOpen(false); setMagnifier(false); setInk(null); };
  // Picking the active ink again turns the highlighter off (stripe.press).
  const pickInk = (next: "pink" | "yellow") => setInk((current) => current === next ? null : next);
  const stage = useRef<HTMLDivElement>(null);
  const signals = useRef<BookSignals>({ scroll: 0, hologram: false, radio: false, spins: [], look: false, peek: false, commands: [],
    view: { zoom: 1, x: 0, y: 0, panning: false, unitsPerPx: 0.02 }, marker: null });
  useEffect(() => { signals.current.marker = ink; }, [ink]);
  const { ref: inViewRef, inView } = useInView({ initialInView: true });
  const [covered, setCovered] = useState(false);
  const dark = useTheme((store) => store.theme) === "dark";

  useEffect(() => {
    const main = stage.current?.closest("main");
    const onScroll = () => {
      // Progress through the page's own scroll range: 0 at the top, 1 where the page ends.
      const range = main ? main.offsetHeight + main.offsetTop - window.innerHeight : 0;
      signals.current.scroll = range > 0 ? Math.min(Math.max(window.scrollY / range, 0), 1) : 0;
      const cover = main?.querySelector("[data-covers-stage]"), top = stage.current?.getBoundingClientRect().top;
      setCovered(cover !== null && cover !== undefined && top !== undefined && cover.getBoundingClientRect().top <= top);
    };
    const onSpin = (event: Event) => { signals.current.spins.push((event as CustomEvent<{ direction?: number }>).detail?.direction ?? 1); };
    const onEffect = (event: Event) => {
      const detail = (event as CustomEvent<{ hologram?: boolean; radio?: boolean }>).detail ?? {};
      if (detail.hologram !== undefined) signals.current.hologram = detail.hologram;
      if (detail.radio !== undefined) signals.current.radio = detail.radio;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("book3d:spin", onSpin);
    window.addEventListener("book3d:effect", onEffect);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("book3d:spin", onSpin);
      window.removeEventListener("book3d:effect", onEffect);
    };
  }, []);

  useEffect(() => {
    signals.current.look = open;
    if (!open) { Object.assign(signals.current.view, { zoom: 1, x: 0, y: 0, panning: false }); return; }
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" || event.key === "ArrowLeft" || event.key === "h") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Touch zoom and pan of the open book (#27): pinch between 1× and 2× (rubber 0.35 beyond), two fingers or a 300 ms
  // hold pan (rubber 0.28 past the edge, a quarter of the spread stays on screen), and on release it springs back in.
  useEffect(() => {
    const element = stage.current, view = signals.current.view;
    if (!element || !open) return;
    const points = new Map<number, { x: number; y: number }>();
    let start: null | { dist: number; x: number; y: number; zoom: number; viewX: number; viewY: number } = null;
    let hold = 0, settle = 0, downAt = { x: 0, y: 0 };
    const rubber = (value: number, min: number, max: number, k: number) => value < min ? min - (min - value) * k : value > max ? max + (value - max) * k : value;
    const bounds = (zoom: number) => ({ x: 7.2 * 0.75 * Math.max(zoom - 0.5, 0), y: 5.2 * 0.75 * Math.max(zoom - 0.5, 0) });
    const centre = () => { const all = [...points.values()]; return { x: all.reduce((a, p) => a + p.x, 0) / all.length, y: all.reduce((a, p) => a + p.y, 0) / all.length }; };
    const spread = () => { const [a, b] = [...points.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 1; };
    const begin = () => { const c = centre(); start = { dist: spread(), x: c.x, y: c.y, zoom: view.zoom, viewX: view.x, viewY: view.y }; view.panning = true; cancelAnimationFrame(settle); };
    const down = (event: PointerEvent) => {
      if (event.pointerType !== "touch" || (event.target as Element | null)?.closest?.("[data-book-ui]")) return;
      points.set(event.pointerId, { x: event.clientX, y: event.clientY });
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
    element.addEventListener("pointerdown", down); window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
    element.addEventListener("gesturestart", block); element.addEventListener("gesturechange", block);
    return () => {
      window.clearTimeout(hold); cancelAnimationFrame(settle);
      element.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      element.removeEventListener("gesturestart", block); element.removeEventListener("gesturechange", block);
    };
  }, [open]);

  return <div data-open={open} ref={(element) => { stage.current = element; inViewRef(element); }}
    className={cn("touch-pan-y data-[book=drag]:cursor-grabbing data-[book=hover]:cursor-grab data-[book=mark]:cursor-none data-[open=true]:touch-none max-lg:data-[open=true]:fixed max-lg:data-[open=true]:inset-0 max-lg:data-[open=true]:z-50 max-lg:data-[open=true]:h-dvh max-lg:data-[open=true]:bg-background", className)}>
    {children}
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <BookCanvas eventSource={stage} signals={signals} textures={textures} frameloop={inView && !covered ? "always" : "never"} dark={dark}
        onOpen={() => setOpen(true)} onClose={close} storageKey={"book3d:" + id} pageTextures={pageTextures} magnifier={magnifier} />
    </div>
    {open
      ? <ArcRoles><div data-book-ui role="group" aria-label={t("lookInside")}
          className="absolute bottom-4 left-1/2 z-1 flex -translate-x-1/2 items-center gap-2 max-lg:bottom-[calc(4rem+env(safe-area-inset-bottom))]">
          <Button variant="secondary" size="sm" aria-label={t("closeBook")} onClick={close}><XIcon aria-hidden="true" className="size-5" /></Button>
          <Button variant="secondary" size="sm" aria-label={t("previousPage")} onClick={() => signals.current.commands.push("back")}><CaretLeftIcon aria-hidden="true" className="size-5" /></Button>
          <Button variant="secondary" size="sm" aria-label={t("nextPage")} onClick={() => signals.current.commands.push("forward")}><CaretRightIcon aria-hidden="true" className="size-5" /></Button>
          <Button variant="secondary" size="sm" aria-label={t("magnifier")} aria-pressed={magnifier} onClick={() => setMagnifier((on) => !on)}><MagnifyingGlassIcon aria-hidden="true" weight={magnifier ? "fill" : "regular"} className="size-5" /></Button>
          {/* TEMPORARY: Stripe Press's two ink colours, like the textures; colours are on hold for the owner. */}
          <Button variant="secondary" size="sm" aria-label={t("highlighterPink")} aria-pressed={ink === "pink"} onClick={() => pickInk("pink")}>
            <span aria-hidden="true" className={cn("size-4 rounded-full bg-[#ff5fa8]", ink === "pink" && "ring-2 ring-current ring-offset-2 ring-offset-transparent")} />
          </Button>
          <Button variant="secondary" size="sm" aria-label={t("highlighterYellow")} aria-pressed={ink === "yellow"} onClick={() => pickInk("yellow")}>
            <span aria-hidden="true" className={cn("size-4 rounded-full bg-[#f4e400]", ink === "yellow" && "ring-2 ring-current ring-offset-2 ring-offset-transparent")} />
          </Button>
        </div></ArcRoles>
      : <button type="button" data-book-ui onClick={() => setOpen(true)}
          onPointerEnter={() => { signals.current.peek = true; }} onPointerLeave={() => { signals.current.peek = false; }}
          className="absolute bottom-4 left-1/2 z-1 inline-flex h-10 -translate-x-1/2 items-center rounded-full border border-foreground bg-background px-4 text-[13px] uppercase tracking-[0.04em] outline-offset-2 focus-visible:outline-2 pointer-coarse:h-11">
          {t("lookInside")}
        </button>}
  </div>;
}
