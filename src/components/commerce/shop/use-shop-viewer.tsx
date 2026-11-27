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

/** A fresh read. It resolves to the answer only if no later read or conceal superseded it; otherwise undefined. */
async function read(): Promise<Viewer> {
  const mine = ++epoch;
  const next = await readSignedInMemberID();
  if (mine !== epoch) return undefined;
  set(next);
  return next;
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

/** Verify the viewer afresh before a change. Undefined means it could not be confirmed: change nothing. */
export const verifyShopViewer = read;

/** The viewer now, for checking after an await that the same viewer is still looking. */
export const currentShopViewer = (): Viewer => viewer;
