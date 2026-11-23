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
  /** How a text cursor leaves: "shrink" (default) or "fade", stripe.press's follower pill (fades out while growing to 1.1×). */
  textExit: "shrink" | "fade";
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
  setTextExit: (textExit: HA_CURSOR["textExit"]) => void;
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
  textExit: "shrink"
};

export type HA_CURS = HA_CURSOR & HA_CURSOR_ACT;
export const createCursorStore = (initState: HA_CURSOR = curInit) => {
  return createStore<HA_CURS>()(
    subscribeWithSelector((set, get) => ({
      ...initState,

      setMouseCoordinates: (mouseCoordinates) => set({ mouseCoordinates }),
      setCursorState: (cursorState) => set({ cursorState }),
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
      setMarquee: (marquee) => set({ marquee }),
      setTextExit: (textExit) => set({ textExit })
    }))
  );
};
