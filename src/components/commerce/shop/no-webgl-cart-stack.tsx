"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { fallbackImagesFor, type FallbackImage } from "./_shared/fallback-images";

type Copy = { key: string; units: number; image: FallbackImage | null; leaving: boolean };

/**
 * The cart's stack without WebGL, ported from stripe.press's NoWebglCartStack (module 60193, chunk 395kh180as4l1): one
 * image of the book lying flat per copy in the cart, stacked in a column centred on the desktop card (16 px in, 60 % of
 * the padded width) and on the window's middle, faded with the backdrop. Each copy is as tall as its share of a width
 * that fits the whole stack: the card's 92 %, at most 76.28vh, and the stack within the window less the card's top and
 * 24 px, twice. A new copy grows in over 320 ms; a removed one collapses over 320 ms (its opacity in 192 ms) before it
 * goes. Theirs sizes a copy by the book's board thickness; ours by its flat image (one model for every book). Desktop
 * only, as theirs.
 */
export function NoWebglCartStack({ ids, quantities, cardTop }: { ids: readonly string[]; quantities: Readonly<Record<string, number>>; cardTop: number }) {
  const copies = useMemo(() => ids.flatMap((id) => {
    const count = Math.max(0, quantities[id] ?? 0), image = fallbackImagesFor(id)?.cart ?? null;
    const units = image ? image.height / image.width : 0.12;
    return Array.from({ length: count }, (_, index) => ({ key: id + ":book:" + index, units, image }));
  }), [ids, quantities]);
  const shown = useLeaving(copies);
  if (shown.length === 0) return null;
  const units = copies.reduce((sum, copy) => sum + copy.units, 0);
  const width = "min(76.28vh, (100vw - 32px) * 0.6 * 0.92" + (units > 0 ? ", (100vh - " + 2 * (cardTop + 24) + "px) / " + units.toFixed(4) : "") + ")";
  return <div aria-hidden="true" style={{ ["--no-webgl-cart-spine-w" as string]: width, opacity: "var(--cart-backdrop-opacity, 0)" }}
    className="pointer-events-none fixed top-1/2 left-[calc(16px+(100vw-32px)*0.3)] z-10 flex -translate-1/2 flex-col items-center">
    {shown.map((copy) => <Slot key={copy.key} copy={copy} />)}
  </div>;
}

function Slot({ copy }: { copy: Copy }) {
  const [broken, setBroken] = useState(false);
  return <div style={{ height: "calc(var(--no-webgl-cart-spine-w) * " + copy.units.toFixed(5) + ")" }}
    className={cn("relative w-(--no-webgl-cart-spine-w) flex-none transition-[height,opacity] duration-[320ms,192ms] ease-[ease-in-out,ease-out]",
      copy.leaving ? "h-0! opacity-0" : "starting:h-0! starting:opacity-0")}>
    {copy.image && !broken
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={copy.image.src} width={copy.image.width} height={copy.image.height} alt="" draggable={false} decoding="async" onError={() => setBroken(true)}
        className="absolute top-1/2 left-0 block h-auto w-full -translate-y-1/2" />
      : <div className="absolute inset-x-0 top-0 bottom-px rounded-[2px] bg-muted" />}
  </div>;
}

/** Theirs: a removed copy stays where it was, marked leaving, for 320 ms; kept copies and new ones take their order. */
function useLeaving(next: readonly Omit<Copy, "leaving">[]): Copy[] {
  const [list, setList] = useState<Copy[]>(() => next.map((copy) => ({ ...copy, leaving: false })));
  const [seen, setSeen] = useState(next);
  if (seen !== next) {
    setSeen(next);
    const keep = new Set(next.map((copy) => copy.key)), after = new Map<string | null, Copy[]>();
    let previous: string | null = null;
    for (const copy of list) {
      if (keep.has(copy.key)) { previous = copy.key; continue; }
      after.set(previous, [...(after.get(previous) ?? []), { ...copy, leaving: true }]);
    }
    setList([...(after.get(null) ?? []), ...next.flatMap((copy) => [{ ...copy, leaving: false }, ...(after.get(copy.key) ?? [])])]);
  }
  const timers = useRef(new Map<string, number>());
  useEffect(() => {
    const pending = timers.current;
    for (const copy of list) if (copy.leaving && !pending.has(copy.key)) pending.set(copy.key, window.setTimeout(() => {
      pending.delete(copy.key);
      setList((current) => current.filter((entry) => entry.key !== copy.key || !entry.leaving));
    }, 320));
  }, [list]);
  useEffect(() => () => { for (const timer of timers.current.values()) window.clearTimeout(timer); }, []);
  return list;
}
