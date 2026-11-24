"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The open book's controls, rebuilt from stripe.press's LookInsideControlBar and PeekPill (bundle 06w9:8393-8999,
 * 10174-10209), in our sans and colours (no mono: owner rule). One solid bar of plain text buttons under the book:
 * [ ← ] spread [ → ]  magnifier  inks  [ X ]. No pills, blur, shadow or disabled states (prev/next at an end do nothing).
 * It appears when the book has opened, fades in over 200 ms and staggers its items in (320 ms each, 80 ms + 60 ms apart),
 * and on a phone becomes a full-width band with a rule under it.
 */
export function BookControlBar({ spread, leaves, magnifier, ink, onBack, onForward, onMagnifier, onInk, onClose }: {
  spread: number; leaves: number; magnifier: boolean; ink: null | "pink" | "yellow";
  onBack: () => void; onForward: () => void; onMagnifier: () => void; onInk: (ink: "pink" | "yellow") => void; onClose: () => void;
}) {
  const t = useTranslations("Customer.components_commerce_book_offer");
  // Page numbers of the open spread: leaf k carries pages 2k+1 (front) and 2k+2 (back). The cover has none.
  const readout = spread <= 0 ? "" : spread >= leaves ? String(2 * spread) : 2 * spread + "–" + (2 * spread + 1);
  return <div data-book-ui role="group" aria-label={t("lookInside")}
    // Clicks on the bar never reach the book (stripe.press stops pointerdown and click on its inner bar).
    onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}
    className="pointer-events-auto flex items-center gap-1.5 rounded-[5px] bg-muted pt-2 pr-3.5 pb-3 pl-3.5 text-foreground transition-opacity duration-200 ease-out starting:opacity-0 group-data-[hidden=true]/layer:pointer-events-none group-data-[hidden=true]/layer:opacity-0 max-lg:w-full max-lg:justify-between max-lg:gap-0.5 max-lg:rounded-none max-lg:border-b max-lg:border-current max-lg:py-2">
    <Group>
      <BarItem index={0}><BarButton aria-label={t("previousPage")} onClick={onBack} className="lg:pl-1"><Bracketed><Arrow /></Bracketed></BarButton></BarItem>
      <BarItem index={1}><span className="px-1 text-[10px] tracking-[0.03em] tabular-nums max-lg:px-0.5 max-lg:text-[11.2px]">{readout || "–"}</span></BarItem>
      <BarItem index={2}><BarButton aria-label={t("nextPage")} onClick={onForward}><Bracketed><Arrow className="-scale-x-100" /></Bracketed></BarButton></BarItem>
    </Group>
    <Group>
      <BarItem index={3}>
        <BarButton aria-label={t("magnifier")} aria-pressed={magnifier} onClick={onMagnifier} className="group/lens"><Lens on={magnifier} /></BarButton>
      </BarItem>
      {/* TEMPORARY: Stripe Press's two ink colours; colours are on hold for the owner. */}
      <BarItem index={4}><span className="flex items-stretch">
        <Swatch aria-label={t("highlighterPink")} on={ink === "pink"} onClick={() => onInk("pink")} className="justify-end pl-3.5 text-[#ff5fa8] max-lg:pl-2" />
        <Swatch aria-label={t("highlighterYellow")} on={ink === "yellow"} onClick={() => onInk("yellow")} className="justify-start pr-3.5 text-[#f4e400] max-lg:pr-2" />
      </span></BarItem>
    </Group>
    <Group>
      <BarItem index={5}><BarButton aria-label={t("closeBook")} onClick={onClose} className="lg:pr-1"><Bracketed>X</Bracketed></BarButton></BarItem>
    </Group>
  </div>;
}

/** Desktop: the groups dissolve into the bar's row. Phone: three groups at the left, centre and right. */
function Group({ children }: { children: ReactNode }) {
  return <span className="contents max-lg:flex max-lg:items-center max-lg:gap-0.5">{children}</span>;
}

/** Each item fades in on its own beat when the bar mounts (it remounts on every open, so the stagger replays). */
function BarItem({ index, children }: { index: number; children: ReactNode }) {
  return <span style={{ transitionDelay: 80 + 60 * index + "ms" }} className="flex items-center transition-opacity duration-[320ms] ease-out starting:opacity-0">{children}</span>;
}

function BarButton({ className, ...props }: ComponentProps<"button">) {
  return <button type="button" {...props}
    className={cn("inline-flex items-center justify-center gap-[1ch] rounded-full px-3.5 pt-[5px] pb-[7px] text-[11px] tracking-[0.02em] whitespace-nowrap transition-opacity duration-150 ease-out hover:opacity-70 max-lg:px-[9px] max-lg:text-[12.3px]", className)} />;
}

function Bracketed({ children }: { children: ReactNode }) {
  return <><span aria-hidden="true">[</span>{children}<span aria-hidden="true">]</span></>;
}

function Arrow({ className }: { className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 20 19" fill="none" stroke="currentColor" strokeWidth={2} className={cn("size-2 max-lg:size-[11.2px]", className)}>
    <path d="M19 9.5H2.5M10 17.5 2 9.5 10 1.5" />
  </svg>;
}

/** The lens: on (or hovered) it grows, its plus turns to a cross and the handle shrinks away (0.3 s, standard easing). */
function Lens({ on }: { on: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.4} data-on={on}
    className="group/glyph relative top-px size-[12.75px] overflow-visible max-lg:size-[17.85px]">
    <circle cx="6.3" cy="6.7" r="5.6" className="origin-[0_0] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover/lens:scale-[1.35] group-data-[on=true]/glyph:scale-[1.35]" />
    <path d="M6.3 4.2v5.3M3.65 6.85h5.3" className="origin-[6.3px_6.85px] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-data-[on=true]/glyph:scale-[1.3] group-data-[on=true]/glyph:rotate-45" />
    <path d="M17 17.4 10.6 11" className="origin-[10.6px_11px] transition-[scale,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover/lens:scale-0 group-hover/lens:opacity-0 group-data-[on=true]/glyph:scale-0 group-data-[on=true]/glyph:opacity-0" />
  </svg>;
}

/** One half of the ink pair: a filled square; when picked it turns hollow with a red slash (click again to stop). */
function Swatch({ on, className, ...props }: ComponentProps<"button"> & { on: boolean }) {
  return <button type="button" aria-pressed={on} {...props}
    className={cn("flex min-h-[calc(12.75px+12px)] items-center pt-[5px] pb-[7px] transition-opacity duration-150 ease-out hover:opacity-70 max-lg:min-h-[calc(17.85px+12px)]", className)}>
    <svg aria-hidden="true" viewBox="0 0 14 14" className="size-[13.7px] overflow-visible">
      <rect x="0.5" y="0.5" width="13" height="13" stroke="currentColor" className={cn("transition-[fill] duration-150 ease-out", on ? "fill-transparent" : "fill-current")} />
      {on && <path d="M1 13 13 1" stroke="#e5322d" strokeWidth={1.4} />}
    </svg>
  </button>;
}

/**
 * The centre pill (stripe.press's PeekPill): a filled capsule in the sans, "+ Look inside +" over the closed book
 * (anchored on the book, it types itself in at 28 ms a character), "- Close -" at the cover or the last spread. Hover
 * swaps its colours over 200 ms. Fine pointers only.
 */
export function BookPill({ sign, label, typed = false, shown, className, ...props }: ComponentProps<"button"> & {
  sign: "+" | "-"; label: string; typed?: boolean; shown: boolean;
}) {
  const [count, setCount] = useState(typed ? 0 : label.length);
  useEffect(() => {
    if (!typed) return;
    // Typed in at 28 ms a character while shown; reset 240 ms after it hides, so the next hover types it again.
    if (!shown) { const id = setTimeout(() => setCount(0), 240); return () => clearTimeout(id); }
    const id = setInterval(() => setCount((n) => { if (n >= label.length) { clearInterval(id); return n; } return n + 1; }), 28);
    return () => clearInterval(id);
  }, [typed, shown, label]);
  return <button type="button" data-book-ui data-shown={shown} aria-label={label} {...props}
    className={cn("inline-flex items-center gap-[0.5ch] rounded-full bg-muted px-2.5 py-[7.2px] text-[15px] leading-[1.4] tracking-[-0.01em] whitespace-nowrap text-foreground transition-[background-color,color] duration-200 ease-out hover:bg-foreground hover:text-muted pointer-coarse:hidden max-lg:hidden", className)}>
    <span aria-hidden="true">{sign}</span>
    <span aria-hidden="true">{label.slice(0, count)}<span className="invisible">{label.slice(count)}</span></span>
    <span aria-hidden="true">{sign}</span>
  </button>;
}
