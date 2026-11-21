"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

/**
 * The touch-phone Controlbar's centre slot: a page can put its own control in the strip's centre (the home
 * teaser puts its chapter pill there) without the shell knowing anything about it. The strip registers its
 * centre element with `controlbarCentreRef`; a page renders `<ControlbarCentre>` and its children are
 * portalled there. While a page fills the slot, the strip leaves out its own centre control (Search).
 *
 * The slot exists only while the strip is on screen (touch phones), so `useControlbarCentre()` also tells a
 * page whether to show its own fallback instead. Owner-modular by design (owner, 2026-11-19: "modular so
 * that my edits don't cause cascading failure"): the only contract between the shell and a page is this
 * file.
 */
const slot = createStore<{ target: HTMLElement | null; occupants: number }>(() => ({ target: null, occupants: 0 }));

/** The strip's centre element: a ref callback with cleanup (React 19). */
export function controlbarCentreRef(element: HTMLElement | null) {
  slot.setState({ target: element });
  return () => {
    if (slot.getState().target === element) slot.setState({ target: null });
  };
}

/** The strip's centre element, or null when there is no strip (server, desktop, fine pointers). */
export function useControlbarCentre() {
  return useStore(slot, (state) => state.target);
}

/** Whether a page fills the centre, so the strip leaves out its own control. */
export function useControlbarCentreFilled() {
  return useStore(slot, (state) => state.occupants > 0);
}

/** Renders its children in the strip's centre while the strip is on screen; nothing otherwise. */
export function ControlbarCentre({ children }: { children: ReactNode }) {
  const target = useControlbarCentre();
  useEffect(() => {
    if (!target) return;
    slot.setState((state) => ({ occupants: state.occupants + 1 }));
    return () => slot.setState((state) => ({ occupants: state.occupants - 1 }));
  }, [target]);
  return target ? createPortal(children, target) : null;
}

/**
 * The strip's Help place (owner, 21 Nov: "for the mobile, we move it into the bottom bar, but it's going to have to
 * be an in row item"). The Help pill renders itself here, in the row, while the strip is on screen; elsewhere it
 * floats as before.
 */
const helpSlot = createStore<{ target: HTMLElement | null }>(() => ({ target: null }));

/** The strip's Help element: a ref callback with cleanup (React 19). */
export function controlbarHelpRef(element: HTMLElement | null) {
  helpSlot.setState({ target: element });
  return () => {
    if (helpSlot.getState().target === element) helpSlot.setState({ target: null });
  };
}

/** The strip's Help element, or null when there is no strip (server, desktop, fine pointers). */
export function useControlbarHelp() {
  return useStore(helpSlot, (state) => state.target);
}
