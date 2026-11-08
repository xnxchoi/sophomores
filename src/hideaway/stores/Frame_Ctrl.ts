"use client";
import { Concat } from "@/hideaway/utilities/typeUtilities";
import { createStore } from "zustand/vanilla";

type VerticalFrame = "top" | "bottom";
type LateralFrame = "right" | "left";
export type FrameSide = VerticalFrame | LateralFrame;
export type CornerSide = Concat<[VerticalFrame, LateralFrame]>;

export type Viewport = {
  width: number;
  height: number;
};

type MenuStructure = {
  fullscreen: boolean;
  /**
   * Cached viewport dimensions, refreshed by the orchestrating provider
   * (see `AMG` in `providers/RP_Pro`). Consumers should read these via
   * the `FrameContext` motion values or via `viewportEpoch` to re-derive
   * geometry on resize.
   */
  viewport: Viewport;
  /**
   * Monotonically increasing counter. Bumped exactly once per real
   * dimension change. Frame-aware consumers (Menu, Transition, header
   * frames, etc.) should treat this as the single signal that frame
   * geometry must be recalculated.
   */
  viewportEpoch: number;
};

type MenuStructureActions = {
  setFullscreen: (l: boolean) => void;
  syncViewport: (v: Viewport) => void;
};

export type RP_BluePrint = MenuStructure & MenuStructureActions;

const INITIAL_VIEWPORT: Viewport = { width: 0, height: 0 };

export const createMenuStructure = () =>
  createStore<RP_BluePrint>()((set) => ({
    fullscreen: false,
    viewport: INITIAL_VIEWPORT,
    viewportEpoch: 0,
    setFullscreen: (fullscreen) => set({ fullscreen }),
    syncViewport: (next) =>
      set((state) => {
        if (
          state.viewport.width === next.width &&
          state.viewport.height === next.height
        ) {
          return state;
        }
        return {
          viewport: next,
          viewportEpoch: state.viewportEpoch + 1
        };
      })
  }));
