"use client";

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
 */
export function BookStage({ className, textures = TEMPORARY_BOOK_TEXTURES, children }: { className?: string; textures?: BookTextures; children?: ReactNode }) {
  const stage = useRef<HTMLDivElement>(null);
  const signals = useRef<BookSignals>({ scroll: 0, hologram: false, radio: false, spins: [] });
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

  return <div ref={(element) => { stage.current = element; inViewRef(element); }}
    className={cn("touch-pan-y data-[book=drag]:cursor-grabbing data-[book=hover]:cursor-grab", className)}>
    {children}
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <BookCanvas eventSource={stage} signals={signals} textures={textures} frameloop={inView && !covered ? "always" : "never"} dark={dark} />
    </div>
  </div>;
}
