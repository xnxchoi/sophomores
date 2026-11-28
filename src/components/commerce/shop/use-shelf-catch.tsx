import { useEffect } from "react";
import { cartOwnsInput } from "./cart-column";
import type { SceneCatalogue, SceneHub } from "./stripe-scene";

type Selection = { to?: number; settled?: boolean };
/** What the hook reads from its page on every frame: the seat's scroll position, whether the page itself is driving
 * the scroll (and how to stop it), and the title rail to measure. */
export type ShelfCatchSource = { seatY: () => number | null; driving: () => boolean; stopDriving: () => void;
  /** True while the page holds still (a book is open): the catch stands down. */
  held: () => boolean;
  titles: () => HTMLElement | null;
  /** The seated row's bottom (px from the viewport top) while the seat is locked, or null: the page places its next
   * section by it (their `lq`). */
  seatBottom: (px: number | null) => void };

/** The bottom of the title rail's lowest line of text (their `ap`, 06w9:10032-10051). */
function titlesBottom(element: HTMLElement | null) {
  if (!element) return null;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT), range = document.createRange();
  let bottom = -Infinity;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue;
    range.selectNodeContents(node);
    for (const rect of Array.from(range.getClientRects())) if (rect.height > 0) bottom = Math.max(bottom, rect.bottom);
  }
  return Number.isFinite(bottom) ? bottom : null;
}
/** Their clearance under the titles (`am`): 12 px, up to 20 px on tall narrow windows. */
export function titleClearance(width: number, height: number) {
  return 12 + 8 * Math.max(0, Math.min(1, (height / Math.max(1, width) - 0.7) / 0.7));
}

/**
 * Their shelf catch (06w9:15395-15690), ported as written: while the shelf is near, a wheel or touch fling that would
 * cross the shelf's seat is caught there: the page stops native scrolling (their scroll lock), glides onto the seat
 * (ease-out 220–650 ms, sped by the fling), and swallows the fling's remaining momentum before letting go. On the shelf,
 * a new selection or a settled row re-seats the page the same way. Also writes the titles' clear line (rail text bottom
 * + clearance) every 500 ms of stillness, which the scene uses to lift the spine row clear of the titles.
 */
export function useShelfCatch(hub: SceneHub, catalogue: SceneCatalogue, source: { current: ShelfCatchSource }) {
  useEffect(() => {
    const root = document.documentElement, coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    let frame = 0, glide = 0, wrote: number | null = null, glideTarget: number | null = null, inputAt = -Infinity;
    let touching = false, reseatPending = false, activation = false, settledBefore: boolean | null = null;
    let seatBottomBefore: number | null = null;
    let selectionBefore: number | null = null, lastY = -1, movedAt = -Infinity, hint = false, hinted = false, clearAt = -Infinity;
    let armed: boolean | null = null, lockedAt = -1, kind: "wheel" | "touch" = "wheel", inertia = false, minDelta = Infinity;
    let bigger = 0, wheelAt = -Infinity, wheelVelocity = 0, touchMoved = false, touchUntil = -Infinity, touchPending = false;
    let sampleY: number | null = null, sampleAt = 0, velocity = 0;
    const ih = () => window.innerHeight || 1;
    const onShelf = () => catalogue.E(hub.scrollProgressDirectLiveRef.current as number);
    const busy = () => source.current.held() || Boolean(hub.spineViewRestoringLiveRef.current)
      || Boolean((hub.bookOpenTransitionLiveRef.current as { active?: boolean } | null)?.active);

    const stopGlide = () => { if (glide) cancelAnimationFrame(glide); glide = 0; wrote = null; glideTarget = null; };
    const input = () => { inputAt = performance.now(); if (lockedAt < 0) stopGlide(); };
    const glideTo = (speed = 0, owned = false) => {
      const target = source.current.seatY();
      if (target == null || (glide && glideTarget != null && Math.abs(glideTarget - target) < 1) || (!owned && Math.abs(target - window.scrollY) < 8)) return;
      if (!owned && source.current.driving()) { inputAt = performance.now(); return; }
      stopGlide(); source.current.stopDriving(); glideTarget = target;
      let from = window.scrollY, distance = 0, ms = 0, easeOut = false, start = 0;
      const begin = (time: number) => {
        distance = target - (from = window.scrollY);
        const toward = speed * Math.sign(distance);
        easeOut = toward > 0;
        ms = easeOut ? Math.min(650, Math.max(220, ((3 * Math.abs(distance)) / toward) * 1000))
          : Math.min(owned ? 650 : 520, Math.max(owned ? 220 : 180, 0.6 * Math.abs(distance)));
        start = time; wrote = from;
      };
      if (!owned) begin(performance.now());
      const step = (time: number) => {
        if (owned && start === 0) begin(time);
        if (!owned && wrote != null && Math.abs(window.scrollY - wrote) > 2) { inputAt = time; stopGlide(); return; }
        const k = ms > 0 ? Math.min(1, (time - start) / ms) : 1;
        const eased = easeOut ? 1 - (1 - k) ** 3 : k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        window.scrollTo(0, from + distance * eased);
        wrote = window.scrollY;
        if (k < 1) glide = requestAnimationFrame(step); else { glide = 0; wrote = null; glideTarget = null; }
      };
      glide = requestAnimationFrame(step);
    };

    // Their lock is the html attribute (their touch momentum yields to it); the root layout's classes hide the overflow under it.
    const unlock = () => {
      lockedAt = -1; inertia = false; root.removeAttribute("data-shelf-scroll-lock");
    };
    const near = () => { const target = source.current.seatY(); return target != null && Math.abs(window.scrollY - target) < 2 * ih(); };
    const canCatch = () => armed === true && lockedAt < 0 && near() && !busy() && !source.current.driving();
    const crosses = (y: number, delta: number) => {
      const target = source.current.seatY();
      return target != null && delta !== 0 && (delta > 0 ? y < target - 2 && y + delta >= target : y > target + 2 && y + delta <= target);
    };
    const catchAt = (speed: number, by: "wheel" | "touch") => {
      armed = false; touchPending = false; touchUntil = -Infinity; activation = false;
      root.setAttribute("data-shelf-scroll-lock", "");
      lockedAt = performance.now(); kind = by;
      if (by === "wheel") { inertia = true; minDelta = Infinity; bigger = 0; }
      glideTo(speed, true);
    };

    const wheel = (event: WheelEvent) => {
      if (cartOwnsInput()) return;   // the cart owns input: no catch under it
      const now = performance.now(), gap = now - wheelAt;
      const delta = event.deltaMode === 1 ? 16 * event.deltaY : event.deltaMode === 2 ? event.deltaY * (window.innerHeight || 800) : event.deltaY;
      wheelAt = now;
      wheelVelocity = gap > 120 ? 0 : wheelVelocity + ((delta / Math.min(50, Math.max(8, gap))) * 1000 - wheelVelocity) * 0.5;
      if (lockedAt >= 0) {
        if (inertia) {
          const size = Math.abs(delta);
          if (gap > 120) inertia = false;
          else if (size > 1.6 * minDelta + 4) { bigger += 1; if (bigger >= 3) inertia = false; }
          else { bigger = 0; minDelta = Math.min(minDelta, size); }
        }
        if (event.cancelable) event.preventDefault();
        return;
      }
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      input();
      if (canCatch() && crosses(window.scrollY, 1.5 * delta)) { if (event.cancelable) event.preventDefault(); catchAt(wheelVelocity, "wheel"); }
    };
    const touchStart = () => { touching = true; touchMoved = false; reseatPending = false; input(); };
    const touchMove = () => { touchMoved = true; };
    const touchEnd = (event: TouchEvent) => {
      if (event.touches.length === 0) { touching = false; if (touchMoved) touchUntil = performance.now() + 2500; }
      inputAt = performance.now();
    };

    const loop = () => {
      const now = performance.now(), y = window.scrollY, target = source.current.seatY();
      const away = target == null || Math.abs(y - target) > 0.6 * ih();
      if (armed === null) armed = away; else if (!armed && away && !glide && lockedAt < 0) armed = true;
      if (sampleY != null && now > sampleAt) velocity += (((y - sampleY) / (now - sampleAt)) * 1000 - velocity) * 0.5;
      sampleY = y; sampleAt = now;
      if (lockedAt >= 0) {
        if ((!glide && (kind === "touch" || !inertia || now - wheelAt > 120)) || busy() || now - lockedAt > 2500) unlock();
      } else if (!glide && canCatch()) {
        const crossing = crosses(y, 0.034 * velocity);
        if (now - wheelAt < 120) { if (crossing) catchAt(velocity, "wheel"); }
        else if (touching) { if (touchMoved && crossing) touchPending = true; }
        else if (now < touchUntil && crossing) catchAt(velocity, "touch");
        else if (touchPending) { touchPending = false; if (now < touchUntil && Math.abs(velocity) > 300) catchAt(velocity, "touch"); }
      } else if (!touching) touchPending = false;

      const selection = hub.spineSelectionLiveRef.current as Selection;
      if ((selection.to ?? null) !== selectionBefore) {
        const first = selectionBefore === null;
        selectionBefore = selection.to ?? null;
        if (!first) hint = false;
        if (!first && onShelf() && !busy()) { if (touching || source.current.driving()) reseatPending = true; else glideTo(); }
      }
      const settled = Boolean(selection.settled);
      if (settled !== settledBefore) {
        const justSettled = settledBefore === false && settled && onShelf() && !busy();
        settledBefore = settled; activation = justSettled;
        if (justSettled && coarse && !hinted) hint = true;
        if (!settled) hint = false;
      }
      if (y !== lastY) { lastY = y; movedAt = now; }
      const assembled = (hub.spineRowAssembleLiveRef.current as number) > 0.95;
      if (activation) {
        const seat = source.current.seatY();
        if (seat != null && seat > window.scrollY + 8 && onShelf() && !busy()) {
          if (assembled && !glide && !touching && now - inputAt > 100 && now - movedAt > 80) glideTo();
        } else activation = false;
      }
      const dragging = Boolean((hub.spineDragLiveRef.current as { dragging?: boolean } | null)?.dragging);
      if (dragging) hint = false;
      if (hint && !activation && !glide && !touching && assembled && now - inputAt > 250 && now - movedAt > 250) {
        hint = false;
        if (onShelf() && !busy()) { hinted = true; hub.hintSpineRow(); }
      }
      if (dragging && onShelf()) reseatPending = true;
      if (reseatPending && !touching && !dragging && !source.current.driving() && now - movedAt > 80) {
        reseatPending = false;
        if (onShelf() && !busy()) glideTo();
      }

      // The titles' clear line, measured only while the page is still (their 500 ms cadence).
      if (!touching && now - movedAt > 250 && now - inputAt > 250 && now - clearAt > 500) {
        clearAt = now;
        const bottom = titlesBottom(source.current.titles());
        if (bottom != null) hub.homeTitlesClearLinePxLiveRef.current = bottom + titleClearance(window.innerWidth || 1, ih());
      }
      // The seated row's bottom (06w9:15666-15669): passed on when the seat locks or lets go, or when it moves 2 px or
      // more while the page is still.
      const geom = hub.spineRowSeatGeomLiveRef.current as { valid?: boolean; lock?: boolean; seatBottomPx?: number } | null;
      const seatBottom = geom?.valid && geom.lock && typeof geom.seatBottomPx === "number" ? Math.round(geom.seatBottomPx) : null;
      const still = !touching && now - movedAt > 250 && now - inputAt > 250;
      if (seatBottom !== seatBottomBefore && (seatBottom == null || seatBottomBefore == null || (still && Math.abs(seatBottom - seatBottomBefore) >= 2))) {
        seatBottomBefore = seatBottom; source.current.seatBottom(seatBottom);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    window.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("touchstart", touchStart, { passive: true });
    window.addEventListener("touchmove", touchMove, { passive: true });
    window.addEventListener("touchend", touchEnd, { passive: true });
    window.addEventListener("touchcancel", touchEnd, { passive: true });
    return () => {
      cancelAnimationFrame(frame); stopGlide(); if (lockedAt >= 0) unlock();
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("touchstart", touchStart);
      window.removeEventListener("touchmove", touchMove);
      window.removeEventListener("touchend", touchEnd);
      window.removeEventListener("touchcancel", touchEnd);
    };
  }, [hub, catalogue, source]);
}
