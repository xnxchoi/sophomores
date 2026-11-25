"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import dynamic from "next/dynamic";
import { useTransitionRouter } from "next-transition-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@/components/core/Link/Link";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { cn } from "@/lib/utils";
import type { BookTextures } from "../book3d/book";
import { recordCarry } from "../book3d/book-carry";
import type { ShelfRect } from "../book3d/shelf-canvas";
import { StripeScene } from "./stripe-scene";

// three stays in the lazy canvas chunk (as BookStage loads book-canvas).
const ShelfView = dynamic(() => import("../book3d/shelf-canvas"), { ssr: false });

/**
 * The titles above the books (stripe.press's title marquee): every title in one line, the current one in full and slid
 * to the centre (600 ms, stripe.press's enter ease), the rest faint. A title takes you to its book.
 */
function TitleRail({ titles, active, label, onPick }: { titles: string[]; active: number; label: string; onPick: (index: number) => void }) {
  const rail = useRef<HTMLElement>(null), items = useRef<(HTMLButtonElement | null)[]>([]);
  const [shift, setShift] = useState(0);
  useEffect(() => {
    const place = () => {
      const box = rail.current, item = items.current[active];
      if (box && item) setShift(box.clientWidth / 2 - (item.offsetLeft + item.offsetWidth / 2));
    };
    place();
    const observer = new ResizeObserver(place);
    if (rail.current) observer.observe(rail.current);
    return () => observer.disconnect();
  }, [active, titles]);
  return <nav ref={rail} aria-label={label} className="relative overflow-hidden py-2">
    <ul style={{ transform: "translateX(" + shift + "px)" }}
      className="flex w-max items-baseline gap-x-8 whitespace-nowrap transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] lg:gap-x-12">
      {titles.map((title, index) => <li key={index}>
        <button ref={(item) => { items.current[index] = item; }} type="button" aria-current={index === active || undefined} onClick={() => onPick(index)}
          className="font-display text-[1.75rem] leading-none tracking-[-0.02em] text-foreground/25 outline-offset-4 transition-colors duration-300 hover:text-foreground/60 focus-visible:outline-2 aria-[current]:text-foreground lg:text-[3.5rem]">
          {title}
        </button>
      </li>)}
    </ul>
  </nav>;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="text-[11px] uppercase leading-4 tracking-[0.06em] text-muted-foreground">{children}</h2>;
}

/** Under a book: its title and price, and the way to its page. */
function Caption({ title, price, href, label }: { title: string; price: string; href: string; label: string }) {
  return <div className="flex min-h-11 items-center justify-between gap-4 text-[13px]">
    <p className="min-w-0 truncate">{title}<span className="ml-3 tabular-nums text-muted-foreground">{price}</span></p>
    <Link href={href} className="group/focus inline-flex min-h-11 shrink-0 items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground">
      <FocusShape className="inline-flex items-center gap-[inherit]">{label}<ArrowRightIcon aria-hidden="true" className="size-3.5" /></FocusShape>
    </Link>
  </div>;
}

/**
 * The shop's home as stripe.press's (owner, 25 Nov: their 3D verbatim, the page ours in Tailwind). One tall page: each
 * book has a window-high stretch of scroll, and the scroll position is the book index their scene follows (their home
 * feeds `scrollProgress` and its live ref the same way). Fixed over it: the art card (the current book's stage art),
 * their book scene and the title rail under the header; in the flow, each book's caption with its link.
 */
export function ShopHome({ items, label, viewDetails }: {
  items: { id: string; title: string; price: string; href: string; stageArt: { url: string; alt?: string | null } | null }[]; label: string; viewDetails: string;
}) {
  const router = useTransitionRouter();
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const value = Math.max(0, Math.min(items.length - 1, window.scrollY / Math.max(1, window.innerHeight)));
      progressRef.current = value; setProgress(value);
    };
    const schedule = () => { frame ||= requestAnimationFrame(read); };
    read();
    window.addEventListener("scroll", schedule, { passive: true }); window.addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [items.length]);
  const active = Math.min(items.length - 1, Math.round(progress)), item = items[active];
  const books = useMemo(() => items.map(({ id, title, stageArt }) => ({ id, title, stageArt: stageArt?.url ?? null })), [items]);
  if (!item) return null;
  return <section aria-label={label}>
    <div aria-hidden="true" className="fixed inset-x-4 top-[10.125rem] bottom-14 z-0 overflow-hidden rounded-[10px] bg-muted">
      {items.map((entry, index) => entry.stageArt && (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={entry.id} src={entry.stageArt.url} alt={entry.stageArt.alt ?? ""} draggable={false}
          className={cn("absolute inset-0 size-full object-cover transition-opacity duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]", index === active ? "opacity-100" : "opacity-0")} />))}
    </div>
    <StripeScene books={books} progress={progress} progressRef={progressRef} active={active}
      onOpen={(index) => { const target = items[index]; if (target) router.push(target.href); }}
      className="pointer-events-none fixed inset-0 isolate z-10" />
    <div className="fixed inset-x-4 top-[4.5rem] z-20 pt-2">
      <SectionLabel>{label}</SectionLabel>
      <TitleRail titles={items.map((entry) => entry.title)} active={active} label={label}
        onPick={(index) => window.scrollTo({ top: index * window.innerHeight, behavior: "smooth" })} />
    </div>
    {/* Each book's stretch of scroll, its caption pinned to the bottom of the window while the stretch is in view. */}
    {items.map((entry) => <article key={entry.id} className="relative z-20 flex h-svh flex-col justify-end">
      <div className="sticky bottom-0 bg-background"><Caption title={entry.title} price={entry.price} href={entry.href} label={viewDetails} /></div>
    </article>)}
  </section>;
}

/**
 * New and featured (stripe.press's home, top): each featured book on its own art, full width, one after another, with
 * the title rail held under the header following the book in the middle of the screen. The stage is the product page's
 * own (BookStage over StageArt), so a book here turns to the pointer and opens in place the same way.
 */
export function FeaturedReleases({ items, label, viewDetails }: {
  items: { id: string; title: string; price: string; href: string; stage: ReactNode }[]; label: string; viewDetails: string;
}) {
  const [active, setActive] = useState(0);
  const rows = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    // The row crossing the middle of the screen is the current one.
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
    }, { rootMargin: "-45% 0px -45% 0px" });
    rows.current.forEach((row) => { if (row) observer.observe(row); });
    return () => observer.disconnect();
  }, [items.length]);
  return <section aria-label={label}>
    <div className="sticky top-[4.5rem] z-2 bg-background pt-2">
      <SectionLabel>{label}</SectionLabel>
      <TitleRail titles={items.map((item) => item.title)} active={active} label={label}
        onPick={(index) => rows.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" })} />
    </div>
    {items.map((item, index) => <article key={item.id} data-index={index} ref={(row) => { rows.current[index] = row; }} className="pt-4 first:pt-1">
      {item.stage}
      <Caption title={item.title} price={item.price} href={item.href} label={viewDetails} />
    </article>)}
  </section>;
}

/**
 * The full catalogue (stripe.press's spine row): every edition spine out on one shelf, the selected one turned to face
 * you, its title centred on the rail above. A spine or a title selects; the selected book opens its page, carried from
 * the shelf into the page's stage.
 */
export function ShopShelf({ books, label, viewDetails }: {
  books: { id: string; title: string; price: string; href: string; textures: BookTextures }[]; label: string; viewDetails: string;
}) {
  const [selected, setSelected] = useState(() => Math.floor((books.length - 1) / 2));
  const router = useTransitionRouter();
  const book = books[selected];
  const open = (index: number, rect: ShelfRect) => {
    const target = books[index];
    if (!target) return;
    // The page's stage frames the closed book at about 79% of its height: start the frame so the book keeps its size.
    const height = rect.height / 0.79, width = height * 0.8;
    recordCarry(target.id, { left: rect.left + rect.width / 2 - width / 2, top: rect.top + rect.height / 2 - height / 2, width, height });
    router.push(target.href);
  };
  if (!book) return null;
  return <section aria-label={label} className="mt-20 lg:mt-28">
    <SectionLabel>{label}</SectionLabel>
    <TitleRail titles={books.map((entry) => entry.title)} active={selected} label={label} onPick={setSelected} />
    <div className="relative h-[min(84svh,58rem)] w-full max-lg:h-[min(80svh,36rem)]">
      <ShelfView books={books} selected={selected} onSelect={setSelected} onOpen={open}
        className="absolute inset-0 touch-pan-y outline-offset-4 focus-visible:outline-2" />
    </div>
    <Caption title={book.title} price={book.price} href={book.href} label={viewDetails} />
  </section>;
}
