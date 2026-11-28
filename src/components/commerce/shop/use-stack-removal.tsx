"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The stage book's removal motion (their cart-motion hook, 06w9:621355-622500): outside the cart, the stage's book leaving
 * the cart (its count falling to 0 while it stays the stage's book) sends it off, as a counter the scene watches.
 * The baseline is the stage book's count from one source, seen outside the cart:
 * - opening the cart drops it, so a book removed in the cart doesn't fire on close (Review-B HOLD on 16920259);
 * - a switch of source (the column's lines arriving or going) starts a new one instead of reading as a removal;
 * - a source of null (the shop's viewer unknown: checking, concealed, or a recheck) clears it, and the viewer is part of
 *   the source, so a focus or restore recheck, with the same viewer or another, reseeds the count it then reads and
 *   never animates (Review-B HOLD on 62bad1b8c). Only a real fall from >0 to 0 for the same viewer fires.
 */
export function useStackRemoval({ cartMode, stageIndex, stageID, count, source }: {
  cartMode: boolean; stageIndex: number; stageID: string | undefined; count: number; source: string | null;
}) {
  const [removal, setRemoval] = useState({ trigger: 0, index: 0 });
  const seen = useRef<{ id: string | undefined; count: number; source: string } | null>(null);
  useEffect(() => {
    if (cartMode || source === null) { seen.current = null; return; }
    const before = seen.current;
    seen.current = { id: stageID, count, source };
    if (stageID && before && before.source === source && before.id === stageID && before.count > 0 && count === 0)
      setRemoval((current) => ({ trigger: current.trigger + 1, index: stageIndex }));
  }, [cartMode, stageIndex, stageID, count, source]);
  return removal;
}
