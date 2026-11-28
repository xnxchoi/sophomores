"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { fallbackImagesFor, type FallbackTurn } from "./_shared/fallback-images";
import type { Vendored } from "./stripe-scene";
import { Button } from "@/components/core/Button";

/**
 * stripe.press's NoWebglBookLayer (module 2548, 0jause8z1kh3y.js:20-598), ported. With no WebGL2 their BookStack is
 * replaced by this layer: each featured book is a pre-rendered hero image placed on its art card (it follows the card
 * plate's transform, read from the DOM), and a sideways drag scrubs a 36-frame turn, which eases back to the hero pose
 * when the book leaves and returns. Images come from our manifest (fallbackImagesFor) instead of their 24750.
 */

/** A turn worth playing: two frames or more, a hero box and a size (their `c`, 0jause:29-33). */
function validTurn(turn: FallbackTurn | null | undefined) {
  if (!turn || !Array.isArray(turn.frames) || turn.frames.length < 2) return null;
  const box = turn.heroBox;
  return box && box.width > 0 && box.height > 0 && Number(turn.width) > 0 && Number(turn.height) > 0 ? turn : null;
}

/** The turn's frames, decoded lazily three at a time from both ends towards the middle (their class `s`, 0jause:34-86).
 * Frame 0 is the hero pose, the still, so it counts as ready. */
class TurnFrames {
  turn: FallbackTurn;
  ready: boolean[];
  images: (HTMLImageElement | null)[];
  started = false;
  disposed = false;
  constructor(turn: FallbackTurn) {
    this.turn = turn;
    this.ready = turn.frames.map((_, index) => index === 0);
    this.images = turn.frames.map(() => null);
  }
  get count() {
    return this.turn.frames.length;
  }
  start() {
    if (this.started || this.disposed) return;
    this.started = true;
    const count = this.count, order: number[] = [];
    // 1, n-1, 2, n-2, … (0jause:51-52).
    for (let step = 1; order.length < count - 1; step += 1) {
      if (step < count) order.push(step);
      if (count - step !== step && count - step > 0 && order.length < count - 1) order.push(count - step);
    }
    let next = 0;
    const load = () => {
      if (this.disposed || next >= order.length) return;
      const index = order[next++], image = new Image();
      image.fetchPriority = "low";
      image.decoding = "async";
      image.src = this.turn.frames[index];
      this.images[index] = image;
      image.decode().then(() => { if (!this.disposed) this.ready[index] = true; }).catch(() => {}).finally(load);
    };
    for (let lane = 0; lane < 3; lane += 1) load();
  }
  /** The ready frame nearest the angle (in turns), searching both ways (0jause:72-82). */
  frameFor(angle: number) {
    const count = this.count, want = ((Math.round(angle * count) % count) + count) % count;
    for (let step = 0; step <= count / 2; step += 1) {
      const up = (want + step) % count;
      if (this.ready[up]) return up;
      const down = (want - step + count) % count;
      if (this.ready[down]) return down;
    }
    return 0;
  }
  dispose() {
    this.disposed = true;
    this.images.fill(null);
  }
}

/** The carry's resting keyframes (their `f`, 0jause:88). */
const STILL_KEYFRAMES: Keyframe[] = [{ translate: "0 0px" }, { translate: "0 0px" }];

/** A plate's translateY in px from its inline transform; NaN when none (their `u`, 0jause:161-164). */
function translateYOf(transform: string) {
  const match = /translate3d\(\s*[-\d.e]+(?:px)?\s*,\s*([-\d.e]+)px/.exec(transform);
  return match ? Number(match[1]) : NaN;
}

type Drag = { id: number; x0: number; y0: number; a0: number; widthPx: number; scrubbing: boolean };
type Returning = { from: number; delta: number; t0: number; durMs: number };
/** One hero's live state, outside React (their per-index object, 0jause:457-502). */
type Slot = {
  index: number; el: HTMLButtonElement | null; still: HTMLImageElement | null; frameA: HTMLImageElement | null; frameB: HTMLImageElement | null;
  plate: HTMLElement | null; loaded: boolean; shown: boolean; interactive: boolean; x: number; y: number; stillSince: number;
  carryAnim: Animation | null; carryKey: string; plateTy: number; plateTySince: number; frames: TurnFrames | null; angle: number;
  shownFrame: number; wantFrame: number; front: "a" | "b"; decoding: boolean; drag: Drag | null; suppressClickUntil: number;
  away: boolean; returning: Returning | null;
  refHero: (el: HTMLButtonElement | null) => void; refStill: (el: HTMLImageElement | null) => void;
  refFrameA: (el: HTMLImageElement | null) => void; refFrameB: (el: HTMLImageElement | null) => void;
};

/** Shows a turn frame: decodes it into the back image, then swaps it to the front; 0 shows the still (their `S`,
 * 0jause:220-255). A frame wanted while one decodes is shown after it. */
function showFrame(slot: Slot, frame: number) {
  slot.wantFrame = frame;
  const { still, frameA, frameB } = slot;
  if (!still || !frameA || !frameB || frame === 0 || !slot.frames) {
    slot.wantFrame = 0;
    if (slot.shownFrame !== 0) {
      if (still) still.style.visibility = "";
      if (frameA) frameA.style.visibility = "hidden";
      if (frameB) frameB.style.visibility = "hidden";
      slot.shownFrame = 0;
    }
    return;
  }
  if (slot.shownFrame === frame || slot.decoding) return;
  const back = slot.front === "a" ? frameB : frameA, front = slot.front === "a" ? frameA : frameB, src = slot.frames.turn.frames[frame];
  slot.decoding = true;
  if (back.getAttribute("src") !== src) back.src = src;
  back.decode().then(() => true, () => false).then((ok) => {
    slot.decoding = false;
    if (ok && slot.wantFrame === frame) {
      back.style.visibility = "visible";
      front.style.visibility = "hidden";
      still.style.visibility = "hidden";
      slot.front = slot.front === "a" ? "b" : "a";
      slot.shownFrame = frame;
    }
    if (slot.wantFrame !== slot.shownFrame) showFrame(slot, slot.wantFrame);
  });
}
/** Back to the hero pose at once (their `T`, 0jause:256-258). */
function resetTurn(slot: Slot) {
  slot.returning = null;
  slot.angle = 0;
  showFrame(slot, 0);
}
/** Turned away from the hero pose (their `N`, 0jause:259). */
function turned(slot: Slot) {
  return slot.shownFrame !== 0 || slot.wantFrame !== 0;
}
/** Starts the ease back to the hero pose the short way round: 600 ms, up to 900 ms for half a turn (their `L`,
 * 0jause:260-266). */
function beginReturn(slot: Slot, now: number) {
  const count = slot.frames?.count ?? 0;
  if (count < 2) { resetTurn(slot); return; }
  const from = (((slot.angle * count) % count) + count) % count, delta = from <= count / 2 ? -from : count - from;
  slot.returning = { from, delta, t0: now, durMs: 600 + 300 * Math.min(1, Math.abs(delta) / (count / 2)) };
}
/** One frame of the ease back, cubic ease-out (their `R`, 0jause:267-275). */
function stepReturn(slot: Slot, now: number) {
  const back = slot.returning;
  if (!back || !slot.frames) return;
  const t = Math.min(1, (now - back.t0) / back.durMs);
  if (t >= 1) { resetTurn(slot); return; }
  slot.angle = (back.from + back.delta * (1 - (1 - t) ** 3)) / slot.frames.count;
  showFrame(slot, slot.frames.frameFor(slot.angle));
}

/** The plate's scroll-driven `translate` animation, if it has one (0jause:333-346). */
function scrollAnimationOf(plate: HTMLElement) {
  if (typeof plate.getAnimations !== "function") return null;
  for (const animation of plate.getAnimations()) {
    const effect = animation.effect as KeyframeEffect | null;
    if (animation.timeline && effect && typeof effect.getKeyframes === "function" && effect.getKeyframes().some((frame) => "translate" in frame))
      return animation;
  }
  return null;
}
/** Carries the plate's scroll-driven `translate` onto the hero on the same timeline, so it rides the card between
 * transform writes (0jause:329-359). */
function carry(slot: Slot) {
  const el = slot.el, plate = slot.plate;
  if (!el || !plate) return;
  const source = scrollAnimationOf(plate);
  const frames: Keyframe[] = source
    ? (source.effect as KeyframeEffect).getKeyframes().map((frame) => ({ offset: frame.offset, translate: frame.translate }))
    : STILL_KEYFRAMES;
  const key = source ? frames.map((frame) => frame.offset + ":" + frame.translate).join(",") : "0";
  if (key === slot.carryKey && !(source && slot.carryAnim?.timeline !== source.timeline)) return;
  slot.carryKey = key;
  if (!source) {
    (slot.carryAnim?.effect as KeyframeEffect | null | undefined)?.setKeyframes(STILL_KEYFRAMES);
    return;
  }
  if (slot.carryAnim && slot.carryAnim.timeline === source.timeline) (slot.carryAnim.effect as KeyframeEffect).setKeyframes(frames);
  else {
    slot.carryAnim?.cancel();
    slot.carryAnim = el.animate(frames, { timeline: source.timeline, fill: "both", easing: "linear" });
  }
}

export type NoWebglBookLayerProps = {
  vendored: Vendored;
  /** Every book, in catalogue order. */
  books: { id: string; title: string }[];
  /** A book is open in its details (their `ix`). */
  detailOpen: boolean;
  /** The open book's index, or null (their `ix ? uK : null`). */
  detailBookIndex: number | null;
  /** The stack's detail pose is up (their `!sA && (tx || ty || iv)`): false clears detailExitAnimatingLiveRef. */
  stackDetailOpen: boolean;
  /** Hide every hero (their `sA || ty || iv`). */
  hidden: boolean;
  /** Phone layout (their `ah`). */
  isMobile: boolean;
  /** Over the footer (their `l4`): z 20100 instead of 10300. */
  raised: boolean;
  onBookOpen: (index: number) => void;
  /** Called once: the first hero has loaded, none can show, or 1.5 s have passed. */
  onFirstBookReady: () => void;
  onBookDragStart?: () => void;
  onBookDragEnd?: () => void;
  /** The hero's accessible name (ours, from the catalogue): theirs is `Open <title>`, and the bare title while a book
   * is open (0jause:521). */
  openLabel: (title: string) => string;
};

type Latest = Pick<NoWebglBookLayerProps, "detailOpen" | "detailBookIndex" | "hidden" | "isMobile" | "onBookOpen" | "onBookDragStart" | "onBookDragEnd"> & {
  indices: number[] };

export const NoWebglBookLayer = memo(function NoWebglBookLayer({ vendored, books, detailOpen, detailBookIndex, stackDetailOpen, hidden, isMobile,
  raised, onBookOpen, onFirstBookReady, onBookDragStart, onBookDragEnd, openLabel }: NoWebglBookLayerProps) {
  const { hub, catalogue } = vendored;
  // The heroes in play: the open book and its neighbours, or the featured books; only those with images (0jause:179-184;
  // their zine-fan exclusion has no counterpart here: none of our books is a zine fan).
  const indices = useMemo(() => {
    const list: number[] = [];
    if (detailOpen && detailBookIndex != null)
      for (let index = Math.max(0, detailBookIndex - 1); index <= Math.min(books.length - 1, detailBookIndex + 1); index += 1) list.push(index);
    else for (let index = 0; index < Math.min(catalogue.t, books.length); index += 1) list.push(index);
    return list.filter((index) => books[index] != null && fallbackImagesFor(books[index].id) != null);
  }, [books, detailOpen, detailBookIndex, catalogue.t]);

  // The latest props for the frame loop and the handlers (theirs writes it during render, 0jause:185-204).
  const latest = useRef<Latest>({ detailOpen, detailBookIndex, hidden, isMobile, indices, onBookOpen, onBookDragStart, onBookDragEnd });
  const firstReady = useRef(onFirstBookReady);
  useLayoutEffect(() => {
    latest.current = { detailOpen, detailBookIndex, hidden, isMobile, indices, onBookOpen, onBookDragStart, onBookDragEnd };
    firstReady.current = onFirstBookReady;
  });
  // Once: marks the hero intro settled and tells the page (0jause:205-210).
  const settledOnce = useRef(false);
  const settle = useRef(() => {
    if (settledOnce.current) return;
    settledOnce.current = true;
    hub.heroIntroSettledLiveRef.current = true;
    firstReady.current();
  });
  // At once when no hero can show, else after 1.5 s at the latest (0jause:211-215).
  useEffect(() => {
    if (indices.length === 0) settle.current();
    const timer = window.setTimeout(settle.current, 1500);
    return () => window.clearTimeout(timer);
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (stackDetailOpen === false) hub.detailExitAnimatingLiveRef.current = false;
  }, [stackDetailOpen, hub]);

  // A phone's open book: how far above the plate's bottom the hero sits, measured once the plate holds still (0jause:219).
  const half = useRef<{ half: number; width: number } | null>(null);
  // Every hero's state by book index, created once per index (their `K`, 0jause:276).
  const [slots] = useState(() => new Map<number, Slot>());
  const slotFor = (index: number) => {
    const existing = slots.get(index);
    if (existing) return existing;
    const slot: Slot = {
      index, el: null, still: null, frameA: null, frameB: null, plate: null, loaded: false, shown: false, interactive: false, x: 0, y: 0,
      stillSince: 0, carryAnim: null, carryKey: "", plateTy: NaN, plateTySince: 0, frames: null, angle: 0, shownFrame: 0, wantFrame: 0,
      front: "a", decoding: false, drag: null, suppressClickUntil: 0, away: false, returning: null,
      refHero: (el) => {
        slot.el = el;
        if (!el) { slot.shown = false; slot.interactive = false; slot.carryAnim?.cancel(); slot.carryAnim = null; slot.carryKey = ""; }
      },
      refStill: (el) => {
        slot.still = el;
        if (el?.complete && el.naturalWidth > 0) { slot.loaded = true; settle.current(); }
      },
      refFrameA: (el) => { slot.frameA = el; },
      refFrameB: (el) => { slot.frameB = el; },
    };
    slots.set(index, slot);
    return slot;
  };

  // A drag ends: a scrub swallows the click that follows for 400 ms (their `E`, 0jause:277-286).
  const endDrag = (slot: Slot, event: PointerEvent<HTMLButtonElement>) => {
    const drag = slot.drag;
    if (!drag || drag.id !== event.pointerId) return;
    slot.drag = null;
    if (drag.scrubbing) {
      slot.suppressClickUntil = performance.now() + 400;
      if (slot.el) slot.el.dataset.scrubbing = "false";
      latest.current.onBookDragEnd?.();
    }
  };

  // The frame loop (0jause:288-443): finds the card plates ([data-bg-index], the page's) and their container, places
  // each hero on its plate, shows the ones on screen, eases turned books back, and starts a centred book's frames.
  useEffect(() => {
    // Their scrolling flag (module 50883 `R`): true while the page scrolls (their readScroll sets it, off 120 ms later).
    const scrolling = (vendored.module(50883) as { R: { current: boolean } }).R;
    let frame = 0, layer: HTMLElement | null = null, rect: DOMRect | null = null, measuredAt = 0, settleUntil = 0, dirty = true;
    let observed: HTMLElement | null = null;
    const measure = (now: number) => {
      if (!layer) return;
      rect = layer.getBoundingClientRect(); measuredAt = now; dirty = false;
    };
    // Where a hero sits: centred on its plate, 1.6 % of the window up (8 px on a phone); on a phone's open book, `half`
    // above the plate's bottom (0jause:301-318).
    const anchorOf = (slot: Slot) => {
      const plate = slot.plate;
      if (!plate || !rect) return null;
      const ty = translateYOf(plate.style.transform);
      if (!Number.isFinite(ty)) return null;
      const { detailOpen: open, isMobile: mobile } = latest.current;
      const height = parseFloat(plate.style.height) || rect.height, lift = mobile ? 8 : 0.016 * window.innerHeight;
      const top = rect.top + ty, x = rect.left + rect.width / 2;
      let y: number;
      if (open && mobile) {
        const measured = half.current;
        if (!measured) return null;
        y = top + height - measured.half - lift;
      } else y = top + height / 2 - lift;
      return { x, y, inFrame: top + height > rect.top + 1 && top < rect.bottom - 1 };
    };
    // Moves the hero onto its plate; a move of more than half a pixel restarts its stillness clock (0jause:319-360).
    const place = (slot: Slot, now: number) => {
      const el = slot.el;
      if (!el) return;
      const at = anchorOf(slot);
      if (!at) return;
      if (Math.abs(at.x - slot.x) > 0.5 || Math.abs(at.y - slot.y) > 0.5) slot.stillSince = now;
      slot.x = at.x; slot.y = at.y;
      const transform = "translate3d(" + at.x.toFixed(2) + "px, " + at.y.toFixed(2) + "px, 0) translate(-50%, -50%)";
      if (el.style.transform !== transform) el.style.transform = transform;
      carry(slot);
    };
    // A plate's style changes: re-place every hero at once, re-measuring the container if it changed (0jause:361-370).
    const plates = typeof MutationObserver === "function" ? new MutationObserver((records) => {
      const now = performance.now();
      let any = false;
      for (const record of records) {
        if (record.target === layer) { dirty = true; any = true; }
        else if ((record.target as HTMLElement).dataset?.bgIndex != null) any = true;
      }
      if (!any) return;
      if (dirty) measure(now);
      for (const slot of slots.values()) place(slot, now);
    }) : null;
    // The container's grandparent changes class or style: re-measure every frame for a second (0jause:371-376).
    const outer = typeof MutationObserver === "function" ? new MutationObserver(() => { settleUntil = performance.now() + 1e3; }) : null;
    const resize = () => { dirty = true; half.current = null; };
    window.addEventListener("resize", resize);
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const { detailOpen: open, detailBookIndex: openIndex, hidden: hide, isMobile: mobile, indices: inPlay } = latest.current;
      const vh = window.innerHeight;
      if (!(layer && layer.isConnected)) { layer = document.querySelector("[data-bg-index]")?.parentElement ?? null; dirty = true; }
      if (layer && observed !== layer) {
        plates?.disconnect(); outer?.disconnect();
        plates?.observe(layer, { attributes: true, attributeFilter: ["style"], subtree: true });
        const grand = layer.parentElement?.parentElement;
        if (grand) outer?.observe(grand, { attributes: true, attributeFilter: ["class", "style"] });
        observed = layer;
      }
      // Re-measure when dirty, while settling, or every 250 ms while the page isn't scrolling (0jause:396).
      if (layer && (dirty || now < settleUntil || (now - measuredAt > 250 && !scrolling.current))) measure(now);
      if (half.current && half.current.width !== window.innerWidth) half.current = null;
      for (const slot of slots.values()) {
        const el = slot.el;
        if (!el) continue;
        if (!(slot.plate && slot.plate.isConnected)) slot.plate = document.querySelector<HTMLElement>("[data-bg-index=\"" + slot.index + "\"]");
        const plate = slot.plate;
        // A phone's open book: once its plate's translate has held for 200 ms, measure `half` (0jause:403-411).
        if (open && mobile && slot.index === openIndex && plate && rect) {
          const ty = translateYOf(plate.style.transform);
          if (ty !== slot.plateTy) { slot.plateTy = ty; slot.plateTySince = now; }
          else if (!half.current && Number.isFinite(ty) && now - slot.plateTySince >= 200 && now >= settleUntil) {
            const height = parseFloat(plate.style.height) || rect.height, bottom = rect.top + ty + height;
            half.current = { half: Math.min(height / 2, Math.max(height / 4, (bottom - rect.top) / 2)), width: window.innerWidth };
          }
        }
        // Shown while in play, loaded, on a visible plate inside the container, and within a screen of the window (0jause:412-414).
        const at = plate && plate.style.visibility !== "hidden" ? anchorOf(slot) : null;
        const show = !hide && slot.loaded && inPlay.includes(slot.index) && at != null && at.inFrame && at.y > -vh && at.y < 2 * vh;
        if (at) place(slot, now);
        if (show !== slot.shown) { slot.shown = show; el.dataset.shown = String(show); }
        if (!show) {
          if (slot.interactive) { slot.interactive = false; el.dataset.interactive = "false"; el.tabIndex = -1; }
          if (turned(slot) || slot.returning) { slot.away = true; slot.returning = null; }
          continue;
        }
        // Back in view after leaving turned: ease back to the hero pose. Theirs snaps instead under reduced motion
        // (0jause:290, 419); full motion here, always the ease.
        if (slot.away) { slot.away = false; if (turned(slot) && !slot.drag) beginReturn(slot, now); }
        if (slot.returning && !slot.drag) stepReturn(slot, now);
        const centred = Math.abs(slot.y - vh / 2) < 0.3 * vh;
        if (!slot.interactive) { slot.interactive = true; el.dataset.interactive = "true"; }
        const tab = open ? -1 : 0;
        if (el.tabIndex !== tab) el.tabIndex = tab;
        // Centred and still for 400 ms (or the open book): load its turn (0jause:424-430).
        if (centred && (open ? slot.index === openIndex : now - slot.stillSince >= 400)) {
          if (!slot.frames) {
            const turn = validTurn(fallbackImagesFor(books[slot.index]?.id ?? "")?.turn);
            if (turn) slot.frames = new TurnFrames(turn);
          }
          slot.frames?.start();
        }
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      plates?.disconnect(); outer?.disconnect();
      window.removeEventListener("resize", resize);
      for (const slot of slots.values()) {
        slot.carryAnim?.cancel(); slot.carryAnim = null; slot.carryKey = "";
        slot.frames?.dispose(); slot.frames = null;
      }
    };
  }, [books, vendored, slots]);

  // Opening, closing or hiding: turned books ease back when next seen (0jause:444-446).
  useEffect(() => {
    for (const slot of slots.values()) if (!slot.drag && (turned(slot) || slot.returning)) slot.away = true;
  }, [detailOpen, detailBookIndex, hidden, slots]);

  // Fixed over the window, on the book canvas's ladder: over the nav and the details panel, over the footer when raised
  // (0jause:89-96).
  return <div data-nowebgl-books="" className={cn("pointer-events-none fixed inset-0 overflow-hidden", raised ? "z-[20100]" : "z-[10300]")}>
    {indices.map((index) => {
      const book = books[index], images = fallbackImagesFor(book.id);
      if (!images) return null;
      const turn = validTurn(images.turn), slot = slotFor(index);
      // A frame is larger than the hero: placed so its hero box covers the still (0jause:505-512).
      const frameBox: CSSProperties | undefined = turn ? {
        width: (turn.width / turn.heroBox.width) * 100 + "%", height: (turn.height / turn.heroBox.height) * 100 + "%",
        left: (-turn.heroBox.x / turn.heroBox.width) * 100 + "%", top: (-turn.heroBox.y / turn.heroBox.height) * 100 + "%",
      } : undefined;
      // The hero (0jause:97-151): its image's px × 0.632/900 lvh (× 0.77 under 900 px; theirs max-width 899.98px), in
      // and out over 320 ms, the scene's soft shadow from the upper left. Their grab cursors are left out.
      return <Button variant="bare" key={book.id} type="button" data-nowebgl-hero={index} data-shown={slot.shown ? "true" : "false"}
        data-interactive={slot.interactive ? "true" : "false"} tabIndex={slot.interactive && !detailOpen ? 0 : -1}
        aria-label={detailOpen ? book.title : openLabel(book.title)} ref={slot.refHero}
        style={{ "--nwgl-w": images.hero.width, "--nwgl-h": images.hero.height } as CSSProperties}
        className={cn("pointer-events-none invisible absolute top-0 left-0 box-border block opacity-0 select-none touch-pan-y will-change-[transform,opacity]",
          "h-[calc(var(--nwgl-h)*0.07022222222222223lvh)] w-[calc(var(--nwgl-w)*0.07022222222222223lvh)]",
          "max-[900px]:h-[calc(var(--nwgl-h)*0.05407111111111112lvh)] max-[900px]:w-[calc(var(--nwgl-w)*0.05407111111111112lvh)]",
          "[transition:opacity_320ms_ease,visibility_0s_linear_320ms] [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]",
          "[filter:drop-shadow(0.8vh_1.8vh_2.2vh_color-mix(in_oklab,var(--color-foreground)_26%,transparent))]",
          "data-[shown=true]:visible data-[shown=true]:opacity-100 data-[shown=true]:[transition:opacity_320ms_ease,visibility_0s]",
          "data-[interactive=true]:pointer-events-auto focus-visible:outline-1 focus-visible:outline-offset-[6px] focus-visible:outline-current")}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          if (!slot.el) return;
          slot.returning = null;
          slot.drag = { id: event.pointerId, x0: event.clientX, y0: event.clientY, a0: slot.angle, widthPx: slot.el.getBoundingClientRect().width || 1, scrubbing: false };
          slot.frames?.start();
        }}
        // Sideways past 6 px scrubs the turn, a turn per 1.5 hero widths; vertical first lets the page scroll (0jause:538-558).
        onPointerMove={(event) => {
          const drag = slot.drag;
          if (!drag || drag.id !== event.pointerId) return;
          const dx = event.clientX - drag.x0, dy = event.clientY - drag.y0;
          if (!drag.scrubbing) {
            if (Math.abs(dy) > 6 && Math.abs(dy) >= Math.abs(dx)) { slot.drag = null; return; }
            if (Math.abs(dx) <= 6 || !slot.frames) return;
            drag.scrubbing = true;
            slot.el?.setPointerCapture?.(event.pointerId);
            if (slot.el) slot.el.dataset.scrubbing = "true";
            latest.current.onBookDragStart?.();
          }
          event.preventDefault();
          slot.angle = drag.a0 + dx / (1.5 * drag.widthPx);
          if (slot.frames) showFrame(slot, slot.frames.frameFor(slot.angle));
        }}
        onPointerUp={(event) => endDrag(slot, event)} onPointerCancel={(event) => endDrag(slot, event)}
        onLostPointerCapture={(event) => endDrag(slot, event)}
        // A click opens the book unless a scrub just ended, a book is open, or the layer is hidden (0jause:562-567).
        onClick={(event) => {
          if (performance.now() < slot.suppressClickUntil) { event.preventDefault(); return; }
          const { detailOpen: open, hidden: hide, onBookOpen: openBook } = latest.current;
          if (!open && !hide) openBook(slot.index);
        }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={slot.refStill} src={images.hero.src} width={images.hero.width} height={images.hero.height} alt="" draggable={false} decoding="async"
          onLoad={() => { slot.loaded = true; settle.current(); }}
          className="pointer-events-none block size-full select-none [-webkit-user-drag:none]" />
        {turn && <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={slot.refFrameA} alt="" draggable={false} decoding="async" style={frameBox}
            className="pointer-events-none invisible absolute block max-w-none select-none [-webkit-user-drag:none]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={slot.refFrameB} alt="" draggable={false} decoding="async" style={frameBox}
            className="pointer-events-none invisible absolute block max-w-none select-none [-webkit-user-drag:none]" />
        </>}
      </Button>;
    })}
  </div>;
});
