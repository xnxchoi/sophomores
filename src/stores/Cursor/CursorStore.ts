import type { CursorStates } from "@/components/UX/Cursor";
import { subscribeWithSelector } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

export type HA_CURSOR = {
  cursorState: CursorStates | string;
  mouseCoordinates: {
    x: number;
    y: number;
  };
  marquee: boolean;
  /** Who set the current state through claimCursor, if anyone; a plain setCursorState clears it. */
  cursorOwner: object | null;
  /** How the claimed text state leaves: "instant" (the site's default) or "fade", stripe.press's follower pill (fades out
   *  while growing to 1.1×). It belongs to the claim: any other state resets it, so it never applies to another label. */
  cursorExit: "instant" | "fade";
  cursorTheme: "light" | "dark";
  baseCursorTheme: "light" | "dark";
};
export type HA_CURSOR_ACT = {
  setCursorState: (nextState: HA_CURSOR["cursorState"]) => void;
  setMouseCoordinates: (coords: HA_CURSOR["mouseCoordinates"]) => void;
  setCursorTheme: (theme: "light" | "dark") => void;
  toggleCursorTheme: () => void;
  setBaseCursorTheme: (theme: "light" | "dark") => void;
  resetCursorTheme: () => void;
  setMarquee: (marquee: boolean) => void;
  /** Set a state as its owner. */
  claimCursor: (owner: object, nextState: HA_CURSOR["cursorState"], exit?: HA_CURSOR["cursorExit"]) => void;
  /** Clear the state only if this owner still holds it (compare-and-release); the exit stays for the leaving pill. */
  releaseCursor: (owner: object) => void;
};

const curInit: HA_CURSOR = {
  cursorState: null,
  mouseCoordinates: {
    x: 0,
    y: 0
  },
  baseCursorTheme: "light",
  cursorTheme: "light",
  marquee: false,
  cursorOwner: null,
  cursorExit: "instant"
};

export type HA_CURS = HA_CURSOR & HA_CURSOR_ACT;
export const createCursorStore = (initState: HA_CURSOR = curInit) => {
  return createStore<HA_CURS>()(
    subscribeWithSelector((set, get) => ({
      ...initState,

      setMouseCoordinates: (mouseCoordinates) => set({ mouseCoordinates }),
      setCursorState: (cursorState) => set({ cursorState, cursorOwner: null, cursorExit: "instant" }),
      claimCursor: (owner, cursorState, exit = "instant") => set({ cursorState, cursorOwner: owner, cursorExit: exit }),
      releaseCursor: (owner) => { if (get().cursorOwner === owner) set({ cursorState: null, cursorOwner: null }); },
      setCursorTheme: (l: "light" | "dark") => set({ cursorTheme: l }),
      setBaseCursorTheme: (l: "light" | "dark") => set({ baseCursorTheme: l }),
      toggleCursorTheme: () =>
        set((state) => ({
          cursorTheme: state.cursorTheme === "light" ? "dark" : "light"
        })),
      resetCursorTheme: () =>
        set((state) => ({
          ...state,
          cursorTheme: state.baseCursorTheme,
          marquee: false
        })),
      setMarquee: (marquee) => set({ marquee })
    }))
  );
};
