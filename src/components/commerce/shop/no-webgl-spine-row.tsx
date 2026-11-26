"use client";

import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Vendored } from "./stripe-scene";
import { fallbackImagesFor, type FallbackImage } from "./_shared/fallback-images";

/**
 * stripe.press's no-WebGL spine row (`NoWebglSpineRow`, module 27511, 2k0q1kp4qmm_6.js:20-695), ported as written: when
 * the browser has no WebGL2 their page swaps the 3D shelf for this row of pre-rendered spines, the selected book shown
 * by its cover. It drives the same hub state as their 3D row (selection, drag, settle, seat geometry, touch band), so
 * the page's shelf code works unchanged; it also writes module 44870's state, which their page reads for the seat
 * (06w9:11117) and the title fade (06w9:11870-11878). Images come from our manifest (fallback-images.ts), not 24750.
 */

type Ref<T> = { current: T };
type Edge = { seatBottomPx: number; pxPerWorld: number };
type TopEdge = { seatTopPx: number; pxPerWorld: number };
type SeatGeom = { lock: boolean; t: number; edges: Edge[]; topEdges: TopEdge[]; seatBottomPx: number; exitTarget: number; valid: boolean };
type Selection = { to: number; settled: boolean; nonce: number };
type Settled = { leftPx: number; rightPx: number; centerPx: number; seatDyPx: number; valid: boolean; nonce: number; to: number };
/** What 27511 uses of their hub (module 50016). */
type RowHub = {
  MOBILE_BOOK_SCALE: number; MOBILE_SPINE_BOOK_SCALE_BOOST: number; MOBILE_SPINE_ROW_SCALE: number;
  SPINE_COVERFLOW_WIDTH_WORLD: number; SPINE_ROW_GAP_MOBILE_WORLD: number; MOBILE_COVERFLOW_SLOT_SCALE: number;
  SPINE_ROW_EDGE_GAP_SPINES: number; SPINE_ROW_EDGE_GAP_EXTRA_WORLD: number; SPINE_ROW_WEBSITES_GAP_PX: number;
  spineDisplayOrder: number[]; spineSlotForIndex: number[];
  spineCoverflowZ: (faceOut: number, power: number) => number; spineCoverflowWidthScale: () => number;
  homeStackIsMobileLiveRef: Ref<boolean>; homeTitlesClearLinePxLiveRef: Ref<number | null>;
  spinePxPerWorldXLiveRef: Ref<number>; spineRowSlotsXLiveRef: Ref<number[]>; spineRowSeatGeomLiveRef: Ref<SeatGeom>;
  spineRowTouchBandLiveRef: Ref<{ top: number; bottom: number }>; spineSelectedSettledLiveRef: Ref<Settled>;
  scrollProgressDirectLiveRef: Ref<number>; bookOpenTransitionLiveRef: Ref<{ active: boolean }>; spineViewRestoringLiveRef: Ref<boolean>;
  homeWebsitesSectionElLiveRef: Ref<HTMLElement | null>;
  spineSelectionLiveRef: Ref<Selection>; spineSelectionSeedLiveRef: Ref<number | null>;
  spineRowAssembleLiveRef: Ref<number>; spineRowReleasedLiveRef: Ref<boolean>; spineYawBySlotLiveRef: Ref<number[]>;
  spineDragLiveRef: Ref<{ dragging: boolean; offset: number }>; bookHoverIndexLiveRef: Ref<number>;
  flushSpineSelectQueue: () => void; advanceSpineDrag: (time: number, dt: number) => void;
  setSpineSelectionSettled: (settled: boolean) => void;
  selectSpineBook: (index: number, count: number, options?: { force?: boolean }) => boolean;
  glideSpineRowToSelection: () => void;
  beginSpineDrag: () => void; moveSpineDrag: (dx: number) => void; endSpineDrag: (velocity: number) => void;
};
type CatalogueBook = { title: string; author?: string; material: { slug: string; material: { thickness: number } } };
/** Their spine slot helpers (module 11899): slot layout `h`, spine widths `n`, slot width `O`, row plane `u`, camera z `M`,
 * the seat line `I`. */
type Slots = { h: (order: number[]) => { order: number[]; displayOf: number[]; slotX: number[] }; n: number[]; O: number; u: number; M: number;
  I: (height: number, innerHeight: number, fovDeg: number) => number };
/** Module 94086 `c`: centred slot positions for widths and a gap. */
type Stacks = { c: (widths: number[], gap?: number) => number[] };
/** Module 44535 `f`: a release-velocity tracker. */
type Velocity = { f: (windowMs?: number) => { reset: (x: number, t: number) => void; add: (x: number, t: number) => void; release: (t: number) => number } };
type SeatState = { visible: boolean; settled: boolean; topPx: number; bottomPx: number; dyPx: number; seatScrollY: number | null };
type BookRect = { index: number; kind: string; leftPx: number; topPx: number; widthPx: number; heightPx: number; interactive: boolean; spineRow?: boolean };

type RowGeometry = { slotX: number[]; displayOf: number[]; widths: number[]; slotWidth: number; coverWidth: number; halfHeight: number;
  spineZ: number; coverZ: number };
type Box = { width: number; height: number; top: number };

/** tan of half their 18° field of view (2k0q:32). */
const TAN_HALF_FOV = Math.tan((9 * Math.PI) / 180);
/** The row's easing, slide time and cover/yaw smoothing (2k0q:101-104, 145-146; their reduced-motion zeroes dropped). */
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)", SLIDE_MS = 420, YAW_MS = 160, SEAT_DELAY_MS = 120;

/** Desktop and phone row geometry (their `p`, 2k0q:33-70). */
function rowGeometry(mobile: boolean, hub: RowHub, books: CatalogueBook[], featured: number, slots: Slots, stacks: Stacks): RowGeometry {
  const spineZ = slots.u + hub.spineCoverflowZ(0, 1), coverZ = slots.u + hub.spineCoverflowZ(1, 1);
  if (!mobile) {
    const layout = slots.h(hub.spineDisplayOrder);
    return { slotX: layout.slotX, displayOf: layout.displayOf, widths: slots.n, slotWidth: slots.O, coverWidth: hub.SPINE_COVERFLOW_WIDTH_WORLD,
      halfHeight: 10.06, spineZ, coverZ };
  }
  const scale = hub.MOBILE_BOOK_SCALE * hub.MOBILE_SPINE_BOOK_SCALE_BOOST * hub.MOBILE_SPINE_ROW_SCALE;
  const placed = stacks.c(hub.spineDisplayOrder.map((index) => books[index].material.material.thickness * scale), hub.SPINE_ROW_GAP_MOBILE_WORLD);
  const slotX: number[] = Array(books.length).fill(0), displayOf: number[] = Array(books.length).fill(-1);
  hub.spineDisplayOrder.forEach((index, slot) => { slotX[index] = placed[slot]; displayOf[index] = slot; });
  const anchor = slotX[featured] ?? 0;
  return { slotX: slotX.map((x) => x - anchor), displayOf, widths: slots.n.map((width) => width * scale),
    slotWidth: hub.SPINE_COVERFLOW_WIDTH_WORLD * hub.spineCoverflowWidthScale() * scale * hub.MOBILE_COVERFLOW_SLOT_SCALE,
    coverWidth: hub.SPINE_COVERFLOW_WIDTH_WORLD * scale, halfHeight: 10.06 * scale, spineZ, coverZ };
}
/** Screen px per world unit at a depth, for a canvas height (their `u`, 2k0q:73-75). */
function pxPerWorldAt(z: number, height: number, camera: number) {
  return height / (2 * (camera - z) * TAN_HALF_FOV);
}
/** A book's x in the row: its slot, pushed half the open cover's extra width away from the selected one (their `b`, 2k0q:76-84). */
function slotOffset(geo: RowGeometry, index: number, selected: number | null) {
  let push = 0;
  if (selected != null && index !== selected) {
    const half = (geo.slotWidth - (geo.widths[selected] ?? 0)) * 0.5;
    push = (geo.displayOf[index] ?? -1) > (geo.displayOf[selected] ?? -1) ? half : -half;
  }
  return (geo.slotX[index] ?? 0) + push;
}
/** The row's x shift: centre the selected book, clamped so the row's ends keep their edge gaps (their `k`, 2k0q:85-99). */
function rowShift(hub: RowHub, geo: RowGeometry, index: number, selected: number, halfWorld: number) {
  const order = hub.spineDisplayOrder, first = order[0], last = order[order.length - 1];
  const half = (book: number) => (book === selected ? 0.5 * geo.slotWidth : (geo.widths[book] ?? 0) * 0.5);
  const left = slotOffset(geo, first, selected) - half(first), right = slotOffset(geo, last, selected) + half(last);
  const gapLeft = (geo.widths[first] ?? 0) * hub.SPINE_ROW_EDGE_GAP_SPINES + hub.SPINE_ROW_EDGE_GAP_EXTRA_WORLD;
  const gapRight = (geo.widths[last] ?? 0) * hub.SPINE_ROW_EDGE_GAP_SPINES + hub.SPINE_ROW_EDGE_GAP_EXTRA_WORLD;
  const min = -halfWorld + gapLeft - left, max = halfWorld - gapRight - right, centred = -(geo.slotX[index] ?? 0);
  return max > min ? (max + min) / 2 : Math.max(max, Math.min(min, centred));
}
/** An image's box at a height, or the world width when there is no image (their `R`, 2k0q:106-108). */
function boxFor(image: FallbackImage | undefined, height: number, width: number, top: number): Box {
  return { width: image ? (height * image.width) / image.height : width, height, top };
}
/** Fills a `{title}` placeholder in a label. */
function fill(label: string, title: string) {
  return label.replace("{title}", title);
}

export type NoWebglSpineRowProps = {
  vendored: Vendored;
  /** Our books in catalogue order (the same order as their catalogue `I`, change 7). */
  books: { id: string; title: string }[];
  /** Their `sA || tx || ty || iv` (06w9:17935): a book is open or opening, so the row stands down. */
  hidden: boolean;
  /** Opens a book by its catalogue index (their `h$`). */
  onBookOpen: (index: number) => void;
  /** The two book buttons' names (their `Open ${title}` / `Show ${title} on the bookshelf`), each with a `{title}`. */
  labels: { open: string; show: string };
};

export function NoWebglSpineRow({ vendored, books, hidden, onBookOpen, labels }: NoWebglSpineRowProps) {
  // Their module imports (2k0q:22-30, 100): the hub, the catalogue, the book rects (50883 `i`), 44535, 94086, 11899, 44870.
  const parts = useMemo(() => {
    const hub = vendored.hub as unknown as RowHub;
    const catalogue = vendored.catalogue as unknown as { I: CatalogueBook[]; J: number };
    const slots = vendored.module(11899) as Slots, stacks = vendored.module(94086) as Stacks;
    const velocity = vendored.module(44535) as Velocity;
    const seat = (vendored.module(44870) as { f: Ref<SeatState> }).f;
    const rects = (vendored.module(50883) as { i: Ref<Map<number, BookRect>> }).i;
    // Their module-scope `m` (desktop) and `h` (phone), 2k0q:71-72.
    const desk = rowGeometry(false, hub, catalogue.I, catalogue.J, slots, stacks), phone = rowGeometry(true, hub, catalogue.I, catalogue.J, slots, stacks);
    return { hub, catalogue, slots, velocity, seat, rects, desk, phone };
  }, [vendored]);
  // Their `E` (2k0q:105): a book's images, from our manifest by product id (their slug; equal under change 7).
  const images = useMemo(() => parts.catalogue.I.map((_, index) => {
    const id = books[index]?.id;
    return id ? fallbackImagesFor(id) : null;
  }), [parts, books]);

  const root = useRef<HTMLDivElement>(null), probe = useRef<HTMLDivElement>(null), sticky = useRef<HTMLDivElement>(null);
  const touchLayer = useRef<HTMLDivElement>(null), strip = useRef<HTMLDivElement>(null), buttons = useRef<HTMLDivElement>(null);
  const slotEls = useRef<(HTMLDivElement | null)[]>([]), spineEls = useRef<(HTMLElement | null)[]>([]);
  const coverEls = useRef<(HTMLElement | null)[]>([]), buttonEls = useRef<(HTMLButtonElement | null)[]>([]);
  const props = useRef({ hidden, onBookOpen });
  useEffect(() => { props.current = { hidden, onBookOpen }; });
  /** When the last touch drag ended: a click within 350 ms of it is the drag's own (2k0q:660). */
  const dragEndedAt = useRef(-Infinity);
  const [shown, setShown] = useState({ to: parts.catalogue.J, out: false });

  // The row's frame loop and touch drag (2k0q:155-468).
  useEffect(() => {
    const { hub, catalogue, slots, velocity, seat, rects, desk, phone } = parts;
    const count = catalogue.I.length, J = catalogue.J;
    const settleAt = J + 0.25, unsettleAt = J + 0.2;
    let applied: number | undefined, rowTop: number | null | undefined, frame = 0, last = -1, key = "";
    let height = 0, pxPerWorld = 0, spines: Box[] = [], covers: Box[] = [], top = 0, bottom = 0, stateKey = "";
    let started = false, visible: boolean | null = null, card: Element | null = null, docTop: number | null = null, past = false;
    let rowHeight = -1;
    const yaws: number[] = Array(count).fill(0);
    // Drops this row's entries from the book rects (their `q`, 2k0q:177-179).
    const clearRects = () => { for (const index of hub.spineDisplayOrder) if (rects.current.get(index)?.spineRow) rects.current.delete(index); };

    // Boxes and seat geometry for a canvas height, phone flag and titles' clear line (2k0q:197-252).
    const layout = (at: number, mobile: boolean, clear: number | null) => {
      const geo = mobile ? phone : desk;
      height = at; pxPerWorld = pxPerWorldAt(geo.spineZ, at, slots.M);
      const coverPx = pxPerWorldAt(geo.coverZ, at, slots.M);
      const seatY = clear == null ? slots.I(at, window.innerHeight || at, 18)
        : Math.min(...[geo.spineZ, geo.coverZ].map((z) => (at / 2 - clear) / pxPerWorldAt(z, at, slots.M) - geo.halfHeight));
      const spineTop = at / 2 - (seatY + geo.halfHeight) * pxPerWorld, coverTop = at / 2 - (seatY + geo.halfHeight) * coverPx;
      const spineBottom = at / 2 - (seatY - geo.halfHeight) * pxPerWorld, coverBottom = at / 2 - (seatY - geo.halfHeight) * coverPx;
      top = Math.min(spineTop, coverTop); bottom = Math.max(spineBottom, coverBottom);
      spines = catalogue.I.map((_, index) => boxFor(images[index]?.spine, spineBottom - spineTop, (geo.widths[index] ?? 0) * pxPerWorld, spineTop));
      covers = catalogue.I.map((_, index) => boxFor(images[index]?.cover, coverBottom - coverTop, geo.coverWidth * coverPx, coverTop));
      catalogue.I.forEach((_, index) => {
        const place = (element: HTMLElement | null, box: Box) => {
          if (!element) return;
          element.style.width = box.width + "px"; element.style.height = box.height + "px";
          element.style.left = -box.width / 2 + "px"; element.style.top = box.top - top + "px";
        };
        place(spineEls.current[index], spines[index]); place(coverEls.current[index], covers[index]);
      });
      if (touchLayer.current) touchLayer.current.style.height = bottom - top + "px";
      if (sticky.current) { sticky.current.style.top = top + "px"; sticky.current.style.height = bottom - top + "px"; }
      docTop = null; past = false;
      hub.spinePxPerWorldXLiveRef.current = pxPerWorld;
      hub.spineRowSlotsXLiveRef.current = geo.slotX;
      const geom = hub.spineRowSeatGeomLiveRef.current;
      geom.lock = true; geom.t = performance.now();
      geom.edges[0].seatBottomPx = coverBottom; geom.edges[1].seatBottomPx = spineBottom;
      geom.topEdges[0].seatTopPx = coverTop; geom.topEdges[1].seatTopPx = spineTop;
      for (const edge of geom.edges) edge.pxPerWorld = pxPerWorld;
      for (const edge of geom.topEdges) edge.pxPerWorld = pxPerWorld;
      geom.seatBottomPx = bottom; geom.exitTarget = (bottom + 40) / pxPerWorld; geom.valid = pxPerWorld > 0;
    };

    const tick = (time: number) => {
      frame = requestAnimationFrame(tick);
      const dt = last < 0 ? 0 : Math.min(0.05, (time - last) / 1000);
      last = time;
      const el = root.current, stick = sticky.current;
      if (!el || !stick) return;
      const width = window.innerWidth || 1, at = probe.current?.offsetHeight || window.innerHeight || 1;
      const mobile = hub.homeStackIsMobileLiveRef.current, clear = hub.homeTitlesClearLinePxLiveRef.current;
      // Their key also carries which books have images (`ag`); ours are fixed for the mount, so it is left out.
      const nextKey = width + "|" + +!!mobile + "|" + at + "|" + (clear == null ? "-" : Math.round(clear));
      if (nextKey !== key) { key = nextKey; layout(at, mobile, clear); applied = undefined; }
      const geo = mobile ? phone : desk;
      if (props.current.hidden) {
        if (visible !== false) {
          visible = false; el.style.visibility = "hidden"; clearRects();
          hub.spineRowTouchBandLiveRef.current.top = 0; hub.spineRowTouchBandLiveRef.current.bottom = -1;
          seat.current.visible = false; hub.spineSelectedSettledLiveRef.current.valid = false;
        }
        return;
      }
      hub.flushSpineSelectQueue(); hub.advanceSpineDrag(time, dt);
      const scrollY = window.scrollY, progress = hub.scrollProgressDirectLiveRef.current;
      const busy = hub.bookOpenTransitionLiveRef.current.active || hub.spineViewRestoringLiveRef.current;
      // The row's document top: 32 px under the last featured card once it is near (2k0q:263-272).
      if (!(card && card.isConnected)) card = document.querySelector('[data-bg-index="' + J + '"]');
      if (!busy && !past && card && progress > J - 1 && progress < J + 1.5) {
        const rect = card.getBoundingClientRect();
        if (rect.height > 10 && rect.bottom > 0) docTop = Math.max(docTop ?? -Infinity, scrollY + rect.bottom + 32);
        if (docTop != null && rect.height > 10 && rect.bottom < top) past = true;
      }
      if (docTop == null && progress >= J + 0.5) { docTop = scrollY + top; past = true; }
      // It runs on down to the next section's top less their gap (2k0q:273-285).
      const section = hub.homeWebsitesSectionElLiveRef.current;
      const end = section ? section.getBoundingClientRect().top + scrollY - hub.SPINE_ROW_WEBSITES_GAP_PX : Infinity;
      const parentTop = (el.parentElement?.getBoundingClientRect().top ?? 0) + scrollY;
      const nextTop = docTop == null ? null : Math.round(docTop - parentTop);
      const nextHeight = docTop == null ? 0 : Math.max(bottom - top, Math.round(Math.min(end, docTop + 1e6) - docTop));
      if (nextTop !== rowTop || nextHeight !== rowHeight) {
        rowTop = nextTop; rowHeight = nextHeight;
        el.style.display = nextTop == null ? "none" : "";
        el.style.top = (nextTop ?? 0) + "px"; el.style.height = nextHeight + "px";
      }
      const stickyTop = nextTop == null ? 2 * height : stick.getBoundingClientRect().top;
      const dy = stickyTop - top, below = Math.max(0, dy);
      let selection = hub.spineSelectionLiveRef.current;
      // Settles once past J + 0.25 with the row on screen, unsettles under J + 0.2; a seeded selection wins (2k0q:298-306).
      if (!busy) {
        if (!selection.settled && progress >= settleAt && stickyTop < height) hub.setSpineSelectionSettled(true);
        else if (selection.settled && progress < unsettleAt) hub.setSpineSelectionSettled(false);
        const seed = hub.spineSelectionSeedLiveRef.current;
        if (seed != null && seed !== selection.to) hub.selectSpineBook(seed, count, { force: true });
        selection = hub.spineSelectionLiveRef.current;
      }
      hub.spineRowAssembleLiveRef.current = Math.max(0, Math.min(1, 1 - below / Math.max(1, 0.5 * height)));
      hub.spineRowReleasedLiveRef.current = selection.settled;
      // The selected book faces out, smoothed over 160 ms (2k0q:309-317).
      const selected = selection.to, ease = dt > 0 ? 1 - Math.exp(-dt / (YAW_MS / 1000 / 3 || 0.001)) : 1;
      const yawRef = hub.spineYawBySlotLiveRef.current;
      for (let index = 0; index < yaws.length; index += 1) {
        const target = +(index === selected);
        let value = (yaws[index] ?? 0) + (target - (yaws[index] ?? 0)) * ease;
        if (Math.abs(target - value) < 0.001) value = target;
        yaws[index] = value; yawRef[index] = value;
      }
      // The row slides to centre the selection (420 ms, theirs), following a drag 1:1 (2k0q:318-333).
      const halfWorld = width / 2 / Math.max(0.001, pxPerWorld), shift = rowShift(hub, geo, selected, selected, halfWorld);
      const drag = hub.spineDragLiveRef.current, dragging = drag.dragging || drag.offset !== 0;
      const x = (shift + drag.offset) * pxPerWorld, transform = "translate3d(" + x.toFixed(2) + "px,0,0)";
      const transition = started && !dragging ? "transform " + SLIDE_MS + "ms " + EASE : "none";
      if (strip.current) {
        if (strip.current.style.transition !== transition) strip.current.style.transition = transition;
        if (strip.current.style.transform !== transform) strip.current.style.transform = transform;
      }
      if (buttons.current && buttons.current.style.transform !== transform) buttons.current.style.transform = transform;
      // A new selection: slots open around it, its spine gives way to its cover, the buttons follow (2k0q:334-356).
      if (selected !== applied) {
        applied = selected;
        catalogue.I.forEach((_, index) => {
          const isSelected = index === selected, slotX = slotOffset(geo, index, selected) * pxPerWorld;
          const slot = slotEls.current[index];
          if (slot) {
            const slide = started ? "transform " + SLIDE_MS + "ms " + EASE : "none";
            if (slot.style.transition !== slide) slot.style.transition = slide;
            slot.style.transform = "translate3d(" + slotX.toFixed(2) + "px,0,0)";
            slot.style.zIndex = isSelected ? "2" : "1";
          }
          const spine = spineEls.current[index], cover = coverEls.current[index];
          if (spine) spine.style.opacity = isSelected ? "0" : "1";
          if (cover) cover.style.opacity = isSelected ? "1" : "0";
          const button = buttonEls.current[index], box = isSelected ? covers[index] : spines[index];
          if (button && box) {
            button.style.transform = "translate3d(" + (slotX - box.width / 2).toFixed(2) + "px," + (box.top - top).toFixed(2) + "px,0)";
            button.style.width = box.width + "px"; button.style.height = box.height + "px";
          }
        });
      }
      const nextState = selected + "|" + +(selected != null);
      if (nextState !== stateKey) { stateKey = nextState; setShown({ to: selected, out: selected != null }); }
      if (!started) { started = true; applied = undefined; }
      // On screen while any of it is in the window (2k0q:358-365).
      const rowTopPx = top + dy, rowBottomPx = bottom + dy, onScreen = rowBottomPx > 0 && rowTopPx < height;
      if (onScreen !== visible) { visible = onScreen; el.style.visibility = onScreen ? "visible" : "hidden"; if (!onScreen) clearRects(); }
      const layer = touchLayer.current;
      if (layer) {
        const events = selection.settled ? "auto" : "none";
        if (layer.style.pointerEvents !== events) layer.style.pointerEvents = events;
      }
      // The touch band, 44870's state, each book's rect for the page's pills, and the settled cover (2k0q:366-408).
      const band = hub.spineRowTouchBandLiveRef.current;
      band.top = onScreen ? Math.max(0, rowTopPx) : 0; band.bottom = onScreen ? Math.min(height, rowBottomPx) : -1;
      Object.assign(seat.current, { visible: onScreen, settled: selection.settled, topPx: rowTopPx, bottomPx: rowBottomPx, dyPx: dy,
        seatScrollY: docTop == null ? null : Math.round(docTop - top) });
      if (onScreen) for (const index of hub.spineDisplayOrder) {
        const box = index === selected ? covers[index] : spines[index];
        if (!box) continue;
        const centre = width / 2 + (slotOffset(geo, index, selected) + shift + drag.offset) * pxPerWorld;
        rects.current.set(index, { index, kind: "browse", leftPx: centre - box.width / 2, topPx: box.top + dy, widthPx: box.width,
          heightPx: box.height, interactive: true, spineRow: true });
      }
      const settled = hub.spineSelectedSettledLiveRef.current;
      const centre = width / 2 + (slotOffset(geo, selected, selected) + rowShift(hub, geo, selected, selected, halfWorld)) * pxPerWorld;
      const coverWidth = covers[selected]?.width ?? 0;
      settled.leftPx = centre - coverWidth / 2; settled.rightPx = centre + coverWidth / 2; settled.centerPx = centre;
      settled.seatDyPx = dy; settled.valid = onScreen; settled.nonce = selection.nonce; settled.to = selected;
    };
    frame = requestAnimationFrame(tick);

    // A horizontal touch drag on the settled row moves it, released with the finger's speed (2k0q:410-452).
    const surface = sticky.current, tracker = velocity.f();
    let tracking = false, horizontal = false, startX = 0, startY = 0, lastX = 0;
    const touchStart = (event: TouchEvent) => {
      if (tracking && horizontal) hub.endSpineDrag(0);
      tracking = false;
      if (event.touches.length !== 1 || !hub.spineSelectionLiveRef.current.settled) return;
      const touch = event.touches[0];
      startX = lastX = touch.clientX; startY = touch.clientY; tracking = true; horizontal = false;
    };
    const touchMove = (event: TouchEvent) => {
      if (!tracking) return;
      const touch = event.touches[0];
      if (!touch) return;
      if (!horizontal) {
        const dx = touch.clientX - startX, dyTouch = touch.clientY - startY;
        if (Math.hypot(dx, dyTouch) < 8) return;
        horizontal = Math.abs(dx) > Math.abs(dyTouch);
        if (!horizontal) { tracking = false; return; }
        hub.beginSpineDrag(); tracker.reset(touch.clientX, performance.now()); lastX = touch.clientX;
      }
      hub.moveSpineDrag(touch.clientX - lastX); tracker.add(touch.clientX, performance.now()); lastX = touch.clientX;
    };
    const touchEnd = (event: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      if (horizontal) { dragEndedAt.current = performance.now(); hub.endSpineDrag(event.type === "touchcancel" ? 0 : tracker.release(performance.now())); }
    };
    surface?.addEventListener("touchstart", touchStart, { passive: true });
    surface?.addEventListener("touchmove", touchMove, { passive: true });
    surface?.addEventListener("touchend", touchEnd);
    surface?.addEventListener("touchcancel", touchEnd);
    return () => {
      cancelAnimationFrame(frame);
      surface?.removeEventListener("touchstart", touchStart);
      surface?.removeEventListener("touchmove", touchMove);
      surface?.removeEventListener("touchend", touchEnd);
      surface?.removeEventListener("touchcancel", touchEnd);
      if (tracking && horizontal) hub.endSpineDrag(0);
      clearRects();
      hub.spineSelectedSettledLiveRef.current.valid = false;
      seat.current.visible = false;
    };
  }, [parts, images]);

  // The seat: 120 ms after a scroll stops (50 ms after scrollend), within 2.5 s of the visitor's own input and a
  // quarter-screen of it, the page glides onto 44870's seatScrollY (2k0q:469-526; always smooth here).
  useEffect(() => {
    const { hub, seat } = parts;
    let timer = 0, touching = false, inputAt = -Infinity;
    const snap = () => {
      window.clearTimeout(timer);
      if (touching || props.current.hidden || performance.now() - inputAt > 2500 || hub.bookOpenTransitionLiveRef.current.active
        || hub.spineViewRestoringLiveRef.current || document.documentElement.hasAttribute("data-shelf-scroll-lock")) return;
      const target = seat.current.seatScrollY;
      if (target == null) return;
      const distance = target - window.scrollY;
      if (Math.abs(distance) < 1 || Math.abs(distance) > 0.25 * (window.innerHeight || 1)) return;
      window.scrollTo({ top: target, behavior: "smooth" });
    };
    const schedule = (delay = SEAT_DELAY_MS) => { window.clearTimeout(timer); timer = window.setTimeout(snap, delay); };
    const scrolled = () => schedule(), ended = () => schedule(50), input = () => { inputAt = performance.now(); };
    const key = (event: KeyboardEvent) => { if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "j", "k"].includes(event.key)) input(); };
    const touchStart = () => { touching = true; input(); window.clearTimeout(timer); };
    const touchEnd = () => { touching = false; input(); schedule(); };
    const hasScrollEnd = "onscrollend" in window;
    window.addEventListener("scroll", scrolled, { passive: true });
    if (hasScrollEnd) window.addEventListener("scrollend", ended);
    window.addEventListener("wheel", input, { passive: true });
    window.addEventListener("keydown", key);
    window.addEventListener("touchstart", touchStart, { passive: true });
    window.addEventListener("touchend", touchEnd, { passive: true });
    window.addEventListener("touchcancel", touchEnd, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", scrolled);
      if (hasScrollEnd) window.removeEventListener("scrollend", ended);
      window.removeEventListener("wheel", input);
      window.removeEventListener("keydown", key);
      window.removeEventListener("touchstart", touchStart);
      window.removeEventListener("touchend", touchEnd);
      window.removeEventListener("touchcancel", touchEnd);
    };
  }, [parts]);

  const { hub, catalogue } = parts, count = catalogue.I.length;
  const shownSlot = hub.spineSlotForIndex[shown.to] ?? 0;
  // The markup (2k0q:527-693). The frame loop owns display, visibility, top and height, so they start inline.
  return <div ref={root} data-no-webgl-spine-row="" className="pointer-events-none absolute top-0 left-0 z-[10300] h-0 w-full"
    style={{ display: "none", visibility: "hidden" }}>
    {/* The large-viewport height probe. */}
    <div ref={probe} aria-hidden="true" className="invisible fixed top-0 left-0 h-lvh w-0" />
    <div ref={sticky} className="sticky top-0 left-0 w-full touch-pan-y overflow-hidden">
      <div ref={touchLayer} className="pointer-events-none absolute top-0 left-0 w-full touch-pan-y" />
      <div ref={strip} aria-hidden="true" className="absolute top-0 left-1/2 h-full w-0 will-change-transform">
        {hub.spineDisplayOrder.map((index) => {
          const book = catalogue.I[index], set = images[index], title = books[index]?.title ?? book.title;
          const near = Math.abs((hub.spineSlotForIndex[index] ?? 0) - shownSlot) <= 2;
          return <div key={books[index]?.id ?? index} ref={(element) => { slotEls.current[index] = element; }} className="absolute top-0 left-0">
            {set ? <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={(element) => { spineEls.current[index] = element; }} src={set.spine.src} alt="" draggable={false} decoding="async"
                className="absolute block max-w-none select-none transition-opacity duration-160 ease-[ease]" />
            </> : <div ref={(element) => { spineEls.current[index] = element; }}
              className="absolute flex items-center justify-center overflow-hidden rounded-[2px] bg-muted text-[11px] leading-none font-semibold tracking-[0.02em] whitespace-nowrap text-foreground transition-opacity duration-160 ease-[ease] [writing-mode:vertical-rl]">
              {title}
            </div>}
            {set ? <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={(element) => { coverEls.current[index] = element; }} src={set.cover.src} alt="" draggable={false} decoding="async"
                loading={near ? "eager" : "lazy"} className="absolute block max-w-none opacity-0 select-none transition-opacity duration-160 ease-[ease]" />
            </> : <div ref={(element) => { coverEls.current[index] = element; }}
              className="absolute box-border flex flex-col items-center justify-center gap-2 rounded-[3px] bg-muted p-4 text-center text-[18px] leading-[1.2] font-semibold text-foreground opacity-0 transition-opacity duration-160 ease-[ease]">
              <span>{title}</span>
              {book.author ? <span className="text-[13px] font-normal">{book.author}</span> : null}
            </div>}
          </div>;
        })}
      </div>
      <div ref={buttons} className="absolute top-0 left-1/2 h-full w-0">
        {hub.spineDisplayOrder.map((index) => {
          const title = books[index]?.title ?? catalogue.I[index].title, isShown = index === shown.to;
          return <button key={books[index]?.id ?? index} ref={(element) => { buttonEls.current[index] = element; }} type="button"
            aria-label={fill(isShown && shown.out ? labels.open : labels.show, title)} tabIndex={isShown ? 0 : -1}
            onClick={(event) => {
              if (event.timeStamp - dragEndedAt.current < 350) return;
              if (index !== hub.spineSelectionLiveRef.current.to) {
                if (hub.selectSpineBook(index, count, { force: true })) hub.glideSpineRowToSelection();
              } else props.current.onBookOpen(index);
            }}
            onPointerEnter={() => { hub.bookHoverIndexLiveRef.current = index; }}
            onPointerLeave={() => { if (hub.bookHoverIndexLiveRef.current === index) hub.bookHoverIndexLiveRef.current = -1; }}
            className="pointer-events-auto absolute top-0 left-0 m-0 touch-pan-y border-0 bg-transparent p-0 [-webkit-tap-highlight-color:transparent] pointer-coarse:min-h-11 pointer-coarse:min-w-11 group/focus">
            <FocusShape aria-hidden="true" className="pointer-events-none absolute inset-0 block rounded-[2px]" />
          </button>;
        })}
      </div>
    </div>
  </div>;
}
