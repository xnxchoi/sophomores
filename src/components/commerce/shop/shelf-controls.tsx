"use client";

import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/core/Button";

type Ref<T> = { current: T };
type BookRect = { leftPx: number; topPx: number; widthPx: number; heightPx: number };
/** The scene's state the shelf controls read (their hub, 12s2; the book rects, module 50883 `i`). */
export type ShelfHub = {
  spineSelectionLiveRef: Ref<{ to: number; settled: boolean }>;
  spineSelectedSettledLiveRef: Ref<{ valid: boolean; to: number; seatDyPx: number }>;
  spineYawBySlotLiveRef: Ref<number[]>;
  spineRowSeatGeomLiveRef: Ref<{ valid: boolean; seatBottomPx: number }>;
  bookHoverIndexLiveRef: Ref<number>;
  bookOpenTransitionLiveRef: Ref<{ active: boolean }>;
  stepSpineSelection: (step: number, count: number) => void;
};

/**
 * The desktop pills over the face-out book on the shelf (HomeBookCornerButtons, 06w9:9624-9846; mounted 17969-17998):
 * "+ View details +" and, with WebGL, "+ Open book +", centred on the selected cover where it sits once seated. They
 * show 500 ms after a selection, once the cover has turned to at least 0.85 of face-out and only while the pointer is on
 * the book or the pills (always on a coarse pointer); they fade in over 240 ms and cut out at once.
 */
export function ShelfPills({ shown, hub, rects, labels, onDetails, onOpenBook }: { shown: boolean; hub: ShelfHub;
  rects: Ref<Map<number, BookRect>>; labels: { details: string; openBook: string };
  onDetails: (index: number) => void;
  /** Omitted without WebGL (their `onLookInside: et ? void 0 : …`). */
  onOpenBook?: (index: number) => void }) {
  const row = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null), coarse = useRef(false), hovered = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(hover: none), (pointer: coarse)");
    const read = () => { coarse.current = media.matches; };
    read(); media.addEventListener("change", read);
    const move = (event: PointerEvent) => { if (!event.pointerType || event.pointerType === "mouse") pointer.current = { x: event.clientX, y: event.clientY }; };
    const out = (event: PointerEvent) => { if (!event.relatedTarget) pointer.current = null; };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerout", out, { passive: true });
    return () => { media.removeEventListener("change", read); window.removeEventListener("pointermove", move); document.removeEventListener("pointerout", out); };
  }, []);

  useEffect(() => {
    if (!shown) return;
    let frame = 0, key = hub.spineSelectionLiveRef.current.to, readyAt = 0, on = false;
    let top: number | null = null, left: number | null = null;
    const reset = () => { top = null; left = null; };
    window.addEventListener("resize", reset);
    const tick = () => {
      const now = performance.now(), to = hub.spineSelectionLiveRef.current.to;
      if (to !== key) { key = to; readyAt = now + 500; left = null; }
      const rect = rects.current.get(to), at = pointer.current;
      const inside = Boolean(at && rect && at.x >= rect.leftPx && at.x <= rect.leftPx + rect.widthPx && at.y >= rect.topPx && at.y <= rect.topPx + rect.heightPx);
      const ready = (hub.spineYawBySlotLiveRef.current[to] ?? 0) >= 0.85 && !hub.bookOpenTransitionLiveRef.current.active && now >= readyAt;
      if (top == null && rect && ready) {
        const settled = hub.spineSelectedSettledLiveRef.current;
        if (settled.valid && settled.to === to) top = rect.topPx + rect.heightPx / 2 - settled.seatDyPx;
      }
      if (rect && ready && (!on || left == null)) left = rect.leftPx + rect.widthPx / 2;
      const half = (row.current?.offsetHeight ?? 0) / 2;
      const fits = Boolean(rect && top != null && left != null && top - half >= rect.topPx && top + half <= rect.topPx + rect.heightPx);
      const show = (coarse.current || hub.bookHoverIndexLiveRef.current === to || hovered.current || inside) && fits && ready;
      if (show !== on) { on = show; setVisible(show); }
      const element = row.current;
      if (element) {
        if (rect) { if (left != null) element.style.left = left + "px"; if (top != null) element.style.top = top + "px"; element.style.visibility = "visible"; }
        else element.style.visibility = "hidden";
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", reset); setVisible(false); };
  }, [shown, hub, rects]);

  // While shown, the pointer within 50 px of the pills keeps them (their onHoverChange); below that it lets go.
  useEffect(() => {
    if (!visible) return;
    const move = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      const box = row.current?.getBoundingClientRect();
      if (!box) return;
      if (event.clientX >= box.left - 50 && event.clientX <= box.right + 50 && event.clientY >= box.top - 50 && event.clientY <= box.bottom + 50) hovered.current = true;
      else if (event.clientY > box.bottom + 50) hovered.current = false;
    };
    const out = (event: PointerEvent) => { if (!event.relatedTarget) hovered.current = false; };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerout", out, { passive: true });
    return () => { window.removeEventListener("pointermove", move); document.removeEventListener("pointerout", out); hovered.current = false; };
  }, [visible]);

  const to = () => hub.spineSelectionLiveRef.current.to;
  return <div aria-hidden={!visible} className={cn("pointer-events-none fixed inset-0 z-30 max-[900px]:hidden", visible ? "opacity-100 transition-opacity duration-240 ease-[ease-out]" : "opacity-0")}>
    <div ref={row} className="fixed top-0 left-0 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3">
      <ShelfPill visible={visible} label={labels.details} onEnter={() => { hovered.current = true; }} onPress={() => onDetails(to())} />
      {onOpenBook && <ShelfPill visible={visible} label={labels.openBook} onEnter={() => { hovered.current = true; }} onPress={() => onOpenBook(to())} />}
    </div>
  </div>;
}

/** One pill (HomeBookCornerButtons__CornerButton): 15 px, 7.2 × 16 px padding, 40 px radius; hover swaps its colours. */
function ShelfPill({ visible, label, onEnter, onPress }: { visible: boolean; label: string; onEnter: () => void; onPress: () => void }) {
  return <Button variant="bare" type="button" tabIndex={visible ? 0 : -1} onMouseEnter={onEnter}
    onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
    onClick={(event) => { event.stopPropagation(); onPress(); }}
    className={cn("inline-flex items-center rounded-[40px] bg-background px-4 py-[7.2px] text-[15px] leading-[1.4] whitespace-nowrap text-foreground transition-colors duration-150 ease-[ease] hover:bg-foreground hover:text-background outline-offset-2 focus-visible:outline-2 focus-visible:outline-current",
      visible ? "pointer-events-auto" : "pointer-events-none")}>+ {label} +</Button>;
}

/**
 * The phone pager under the face-out book (CoverflowPager, 06w9:9847-10030; mounted 18015-18042): "[←] n / total [→]",
 * 42 px under the seated cover and as wide as it plus 18 px, once the cover is fully face-out and seated above it, and
 * not over the section after the shelf; fades in over 240 ms, cuts out. Sans and 44 px targets here (ours: no mono).
 */
export function ShelfPager({ shown, hub, rects, count, slotOf, sectionTop, labels }: { shown: boolean; hub: ShelfHub;
  rects: Ref<Map<number, BookRect>>; count: number;
  /** A book's place in the row (their spineSlotForIndex). */
  slotOf: (index: number) => number;
  /** The top of the section after the shelf (px), or null. */
  sectionTop: () => number | null;
  labels: { group: string; previous: string; next: string } }) {
  const row = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState(() => slotOf(hub.spineSelectionLiveRef.current.to) + 1);

  useEffect(() => {
    if (!shown) return;
    let frame = 0, on = false, shownAt = -1, top: number | null = null, width = 0, placedTop: number | null = null, placedWidth = 0, below = false;
    const reset = () => { top = null; };
    window.addEventListener("resize", reset);
    const tick = () => {
      const to = hub.spineSelectionLiveRef.current.to, at = slotOf(to) + 1;
      if (at !== shownAt) { shownAt = at; setPosition(at); }
      const settled = hub.spineSelectedSettledLiveRef.current, seat = hub.spineRowSeatGeomLiveRef.current;
      const rest = settled.valid && settled.to === to && seat.valid ? seat.seatBottomPx : null;
      const rect = rects.current.get(to);
      const suppressed = hub.bookOpenTransitionLiveRef.current.active;
      if (!on && rest != null && rect && !suppressed && (hub.spineYawBySlotLiveRef.current[to] ?? 0) >= 0.98) {
        top = Math.round(rest + 42); width = Math.round(rect.widthPx + 18);
      }
      const element = row.current, height = element?.offsetHeight ?? 0, gap = 16 + (on ? 0 : 4);
      if (rect && top != null) below = rect.topPx + rect.heightPx <= top - gap;
      const section = sectionTop();
      const clear = top == null || section == null || section >= top + height + gap;
      const show = top != null && below && clear && !suppressed;
      if (element && top != null && (top !== placedTop || width !== placedWidth)) {
        placedTop = top; placedWidth = width; element.style.top = top + "px"; element.style.width = width + "px";
      }
      if (show !== on) { on = show; setVisible(show); }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", reset); setVisible(false); };
  }, [shown, hub, rects, slotOf, sectionTop]);

  return <div aria-hidden={!visible} className={cn("pointer-events-none fixed inset-0 z-30 min-[900px]:hidden", visible ? "opacity-100 transition-opacity duration-240 ease-[ease-out]" : "opacity-0")}>
    <div ref={row} role="group" aria-label={labels.group}
      className={cn("fixed top-0 left-1/2 flex -translate-x-1/2 items-center justify-between text-foreground select-none", visible ? "pointer-events-auto" : "pointer-events-none")}>
      <PagerButton visible={visible} label={labels.previous} disabled={position <= 1} onPress={() => hub.stepSpineSelection(-1, count)}>
        <ArrowLeftIcon aria-hidden="true" className="size-3" />
      </PagerButton>
      <span aria-live="polite" className="px-0.5 text-[11.2px] tracking-[0.03em] whitespace-nowrap tabular-nums">{position} / {count}</span>
      <PagerButton visible={visible} label={labels.next} disabled={position >= count} onPress={() => hub.stepSpineSelection(1, count)}>
        <ArrowRightIcon aria-hidden="true" className="size-3" />
      </PagerButton>
    </div>
  </div>;
}

/** CoverflowPager__ArrowButton: "[ arrow ]", 0.3 opacity when it can't move further. */
function PagerButton({ visible, label, disabled, onPress, children }: { visible: boolean; label: string; disabled: boolean; onPress: () => void; children: ReactNode }) {
  return <Button variant="bare" type="button" tabIndex={visible ? 0 : -1} disabled={disabled} aria-label={label}
    onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onPress(); }}
    className="group/focus inline-flex min-h-11 min-w-11 items-center justify-center gap-[1ch] px-[9px] text-[12.3px] leading-4 tracking-[0.02em] whitespace-nowrap transition-opacity duration-150 ease-[ease] disabled:opacity-30">
    <FocusShape className="inline-flex items-center gap-[1ch]"><span aria-hidden="true">[</span>{children}<span aria-hidden="true">]</span></FocusShape>
  </Button>;
}
