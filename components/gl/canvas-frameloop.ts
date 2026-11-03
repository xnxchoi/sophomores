"use client";

import { useEffect } from "react";
import { create } from "zustand";
import type { Frameloop } from "@react-three/fiber";

interface CanvasFrameloopState {
  activeClaims: number;
  acquire: () => void;
  release: () => void;
}

export const useCanvasFrameloopStore = create<CanvasFrameloopState>((set) => ({
  activeClaims: 0,
  acquire: () => set((state) => ({ activeClaims: state.activeClaims + 1 })),
  release: () =>
    set((state) => ({ activeClaims: Math.max(0, state.activeClaims - 1) }))
}));

/** "always" while any view holds a claim, otherwise "demand". */
export function useResolvedFrameloop(): Frameloop {
  return useCanvasFrameloopStore((state) =>
    state.activeClaims > 0 ? "always" : "demand"
  );
}

export function useCanvasClaim(active: boolean = true): void {
  const acquire = useCanvasFrameloopStore((state) => state.acquire);
  const release = useCanvasFrameloopStore((state) => state.release);
  useEffect(() => {
    if (!active) return;
    acquire();
    return () => release();
  }, [active, acquire, release]);
}
