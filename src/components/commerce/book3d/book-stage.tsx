"use client";

import { XIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/Theme";
import type { BookSignals, BookTextures } from "./book";

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
 * Esc, ← and h close it too, as does a click on empty canvas or a tap past either end.
 */
export function BookStage({ id, className, textures = TEMPORARY_BOOK_TEXTURES, pageTextures = [], children }: {
  /** The product, so each book keeps its own saved page. */
  id: string;
  className?: string; textures?: BookTextures;
  /** Page images in reading order (two per leaf); none yet, so the pages are blank. */
  pageTextures?: string[];
  children?: ReactNode;
}) {
  const t = useTranslations("Customer.components_commerce_book_offer");
  const [open, setOpen] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const signals = useRef<BookSignals>({ scroll: 0, hologram: false, radio: false, spins: [], look: false, peek: false });
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
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" || event.key === "ArrowLeft" || event.key === "h") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return <div data-open={open} ref={(element) => { stage.current = element; inViewRef(element); }}
    className={cn("touch-pan-y data-[book=drag]:cursor-grabbing data-[book=hover]:cursor-grab data-[open=true]:touch-none max-lg:data-[open=true]:fixed max-lg:data-[open=true]:inset-0 max-lg:data-[open=true]:z-50 max-lg:data-[open=true]:h-dvh max-lg:data-[open=true]:bg-background", className)}>
    {children}
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <BookCanvas eventSource={stage} signals={signals} textures={textures} frameloop={inView && !covered ? "always" : "never"} dark={dark}
        onOpen={() => setOpen(true)} onClose={() => setOpen(false)} storageKey={"book3d:" + id} pageTextures={pageTextures} />
    </div>
    {open
      ? <button type="button" data-book-ui onClick={() => setOpen(false)}
          className="absolute top-3 left-3 z-1 inline-flex size-11 items-center justify-center rounded-full bg-background text-foreground outline-offset-2 focus-visible:outline-2 max-lg:top-auto max-lg:bottom-[max(1rem,env(safe-area-inset-bottom))]">
          <XIcon aria-hidden="true" className="size-5" /><span className="sr-only">{t("closeBook")}</span>
        </button>
      : <button type="button" data-book-ui onClick={() => setOpen(true)}
          onPointerEnter={() => { signals.current.peek = true; }} onPointerLeave={() => { signals.current.peek = false; }}
          className="absolute bottom-4 left-1/2 z-1 inline-flex h-10 -translate-x-1/2 items-center rounded-full border border-foreground bg-background px-4 text-[13px] uppercase tracking-[0.04em] outline-offset-2 focus-visible:outline-2 pointer-coarse:h-11">
          {t("lookInside")}
        </button>}
  </div>;
}
