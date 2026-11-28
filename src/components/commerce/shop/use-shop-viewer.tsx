"use client";

import { useSyncExternalStore } from "react";
import { readSignedInMemberID, watchPrivateView } from "@/lib/member-auth/private-view";

/**
 * Who is viewing the shop, for the browser-cart selections it shows outside the private cart page (the details' add row
 * and the stack's counts). Auth-editions, 28 Nov (Review-B HOLD on 0336e57b): one shared state read through Auth's
 * client boundary (readSignedInMemberID, no-store) and kept fresh by watchPrivateView, never a read per product.
 * - a string: the verified signed-in member;
 * - null: verified signed out (the plain browser cart);
 * - undefined: checking or unavailable. Scoped selections are hidden and nothing is changed; there is no silent fallback
 *   to the guest cart.
 * Concealing (page hidden, frozen or restored) and every lifecycle recheck drop back to undefined; an answer from before
 * the latest one is ignored.
 */
type Viewer = string | null | undefined;

let viewer: Viewer = undefined;
let epoch = 0;
let stop: (() => void) | null = null;
const listeners = new Set<() => void>();

function set(next: Viewer) {
  if (next === viewer) return;
  viewer = next;
  for (const listener of listeners) listener();
}

/**
 * A fresh read. It resolves to the answer and the generation that read it, only if no later read or conceal superseded
 * it; otherwise undefined. The generation is this read's own (Auth-editions HOLD on 84156a131), never one taken later.
 */
async function read(): Promise<{ viewer: string | null; generation: number } | undefined> {
  const mine = ++epoch;
  const next = await readSignedInMemberID();
  if (mine !== epoch) return undefined;
  set(next);
  return next === undefined ? undefined : { viewer: next, generation: mine };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    void read();
    // A lifecycle recheck (visible again, focus, restore) drops the viewer to unknown first, so nothing scoped to the
    // previous viewer stays shown or answers while the server is asked again (Review-B/Auth-editions HOLD on ef2e63eac).
    // An action's own check (verifyShopViewer) does not: it confirms the viewer it already shows.
    const invalidate = () => { epoch += 1; set(undefined); };
    stop = watchPrivateView({ conceal: invalidate, reveal: () => { invalidate(); void read(); }, recheckOnFocus: true });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    stop?.();
    stop = null;
    epoch += 1;
    viewer = undefined;
  };
}

/** The shop's current viewer (see above), shared by every caller. */
export function useShopViewer(): Viewer {
  return useSyncExternalStore(subscribe, () => viewer, () => undefined);
}

/**
 * Verify the viewer afresh before a change. Undefined means it could not be confirmed: change nothing. Otherwise the
 * confirmed viewer with its generation; `isCurrent` stays true only while that same check is the latest one (no later
 * read, conceal or lifecycle recheck), so a recheck that lands on the same member still retires a queued action.
 */
export async function verifyShopViewer(): Promise<{ viewer: string | null; isCurrent: () => boolean } | undefined> {
  const checked = await read();
  if (!checked) return undefined;
  const { viewer: confirmed, generation } = checked;
  return { viewer: confirmed, isCurrent: () => epoch === generation && viewer === confirmed };
}
