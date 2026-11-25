"use client";

import { easing } from "maath";
import { useEffect, useRef, useState } from "react";

/**
 * The colophon band's big image (their ProductionGallery `e3`, 06w:1473-1524; notes slice-G-detail-layout.md §3.6, §4):
 * a 1075:1433 frame whose images cross-wipe on change (their `e5`, 06w:1259-1472). The incoming image is clipped in
 * from the stepping side while it settles from scale 1.08, and the one under it drifts 4 % the other way; both ride
 * SmoothDamp at 0.14 s with frame steps capped at 50 ms (theirs `eG.I`; maath's `easing.damp` is the same SmoothDamp).
 * A horizontal wheel steps once per gesture after 36 px, a horizontal swipe of 40 px (|dx| ≥ 1.5·|dy|) steps once
 * (their `e0`, 06w:1202-1258). Their wheel-gesture tracker (module 15124) wasn't traced: here a 200 ms pause in wheel
 * events starts a new gesture.
 */
type Layer = { id: number; index: number; src: string; alt: string; direction: 1 | -1; t: number; loaded: boolean };
type Image = { url: string; alt: string };

const clipFor = (layer: Layer) => {
  if (layer.t >= 1) return "none";
  const rest = ((1 - layer.t) * 100).toFixed(3) + "%";
  return layer.direction === 1 ? "inset(0 0 0 " + rest + ")" : "inset(0 " + rest + " 0 0)";
};
const transformFor = (layer: Layer, above: Layer | undefined) => {
  const scale = 1 + 0.08 * (1 - layer.t), shift = above ? -4 * above.direction * above.t : 0;
  return scale === 1 && shift === 0 ? "none" : "translateX(" + shift.toFixed(3) + "%) scale(" + scale.toFixed(4) + ")";
};

export function DetailGallery({ images, index, onStep }: { images: Image[]; index: number; onStep: (direction: 1 | -1) => void }) {
  const frame = useRef<HTMLDivElement>(null), nextId = useRef(1), step = useRef(onStep);
  useEffect(() => { step.current = onStep; });
  const first = images[index];
  const [layers, setLayers] = useState<Layer[]>(() => [{ id: 0, index, src: first?.url ?? "", alt: first?.alt ?? "", direction: 1, t: 1, loaded: true }]);
  const live = useRef(layers), nodes = useRef(new Map<number, { layer: HTMLDivElement | null; content: HTMLDivElement | null }>());
  const frameId = useRef(0), last = useRef<number | null>(null);

  const paint = () => live.current.forEach((layer, at) => {
    const node = nodes.current.get(layer.id);
    if (node?.layer) node.layer.style.clipPath = clipFor(layer);
    if (node?.content) node.content.style.transform = transformFor(layer, live.current[at + 1]);
  });
  const tick = (now: number) => {
    const dt = last.current == null ? 1 / 60 : Math.min(0.05, (now - last.current) / 1000);
    last.current = now;
    let moving = false;
    for (const layer of live.current.slice(1)) {
      if (!layer.loaded) { moving = true; continue; }
      if (easing.damp(layer, "t", 1, 0.14, dt)) moving = true; else layer.t = 1;
    }
    // Layers under the topmost fully revealed one are covered: drop them.
    const covered = live.current.reduce((at, layer, i) => (layer.t === 1 ? i : at), 0);
    if (covered > 0) { live.current = live.current.slice(covered); setLayers(live.current); }
    paint();
    if (moving) frameId.current = requestAnimationFrame(tick); else { frameId.current = 0; last.current = null; }
  };
  const run = () => { if (!frameId.current) frameId.current = requestAnimationFrame(tick); };
  useEffect(() => () => cancelAnimationFrame(frameId.current), []);

  // A new index pushes a layer that wipes in from its side (forward from the right, back from the left).
  useEffect(() => {
    const top = live.current[live.current.length - 1], image = images[index];
    if (!image || (top && top.index === index && top.src === image.url)) return;
    const layer: Layer = { id: nextId.current++, index, src: image.url, alt: image.alt, direction: index >= (top?.index ?? 0) ? 1 : -1, t: 0, loaded: false };
    live.current = [...live.current, layer]; setLayers(live.current); run();
  }, [index, images]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Their stepper: horizontal wheel (one step per gesture after 36 px) and horizontal swipe.
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    let total = 0, spent = false, lastWheel = 0, swipe: { id: number; x: number; y: number } | null = null, swallow = false;
    const wheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      if (event.timeStamp - lastWheel > 200) { total = 0; spent = false; }
      lastWheel = event.timeStamp;
      if (spent || Math.abs((total += event.deltaX)) < 36) return;
      const direction = total > 0 ? 1 : -1;
      total = 0; spent = true; step.current(direction);
    };
    const down = (event: PointerEvent) => { if (event.pointerType !== "mouse" || event.button === 0) swipe = { id: event.pointerId, x: event.clientX, y: event.clientY }; };
    const up = (event: PointerEvent) => {
      if (!swipe || swipe.id !== event.pointerId) return;
      const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
      swipe = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < 1.5 * Math.abs(dy)) return;
      swallow = true; window.setTimeout(() => { swallow = false; }, 0);
      step.current(dx < 0 ? 1 : -1);
    };
    const cancel = () => { swipe = null; };
    const click = (event: MouseEvent) => { if (swallow) { event.preventDefault(); event.stopPropagation(); } };
    element.addEventListener("wheel", wheel, { passive: false });
    element.addEventListener("pointerdown", down); element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", cancel); element.addEventListener("click", click, true);
    return () => {
      element.removeEventListener("wheel", wheel); element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointerup", up); element.removeEventListener("pointercancel", cancel);
      element.removeEventListener("click", click, true);
    };
  }, []);

  const topId = layers[layers.length - 1]?.id;
  return <div ref={frame} className="relative aspect-[1075/1433] w-full touch-pan-y overflow-hidden rounded-[6px] bg-foreground/10 select-none">
    {layers.map((layer, at) => <div key={layer.id} className="absolute -inset-px overflow-hidden" style={{ clipPath: clipFor(layer) }}
      ref={(element) => { const node = nodes.current.get(layer.id) ?? { layer: null, content: null }; node.layer = element; nodes.current.set(layer.id, node); }}>
      <div className="absolute inset-0" style={{ transform: transformFor(layer, layers[at + 1]) }}
        ref={(element) => { const node = nodes.current.get(layer.id) ?? { layer: null, content: null }; node.content = element; nodes.current.set(layer.id, node); }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={layer.src} alt={layer.id === topId ? layer.alt : ""} aria-hidden={layer.id !== topId || undefined} draggable={false}
          loading={layer.id === 0 ? "lazy" : "eager"} className="block size-full object-cover"
          onLoad={() => { if (!layer.loaded) { layer.loaded = true; run(); } }} onError={() => { if (!layer.loaded) { layer.loaded = true; run(); } }} />
      </div>
    </div>)}
  </div>;
}
