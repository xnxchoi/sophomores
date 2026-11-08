"use client";

import { useEffect } from "react";
import { create } from "zustand";
import type { Frameloop } from "@react-three/fiber";

/**
 * Claim-based controller for the project's shared <Canvas> frameloop.
 *
 * React Three Fiber's `<Canvas>` accepts a `frameloop` prop with three
 * values:
 *
 *   - "always"  : the render loop ticks every frame (default for
 *                 continuous animations — disk-spin, marquee scroll,
 *                 camera lerps).
 *   - "demand"  : the canvas only renders when `invalidate()` is
 *                 called. Idle main-thread cost drops to ~zero.
 *   - "never"   : the loop is suspended entirely (used by the
 *                 registration tour to avoid WebGL context-loss on
 *                 weak GPUs while a heavy DOM animation runs over the
 *                 canvas).
 *
 * Most surfaces in this codebase rely on continuous `useFrame` ticking
 * for their animations — switching the canvas to "demand" silently
 * freezes those animations. So we can't unilaterally flip the default.
 *
 * The store below tracks active "claims" — each consumer that needs
 * continuous rendering calls `useCanvasClaim()` on mount, which
 * increments `activeClaims`; the unmount cleanup decrements it. The
 * `frameloop` selector resolves to:
 *
 *   activeClaims > 0  →  "always"
 *   activeClaims = 0  →  "demand"
 *
 * Higher-priority signals (the registration tour's "never" override)
 * are layered on top inside the Main component's resolver — see
 * `components/core/Main.tsx`.
 *
 * Migration: ANY component that renders 3D content into the shared
 * canvas (via drei's `<View>`) MUST call `useCanvasClaim()` while
 * mounted, or its animations will freeze whenever it's the only 3D
 * surface on the page. Current migrated consumers:
 *
 *   - LiminalHandoff (Day n Night cassette)
 *
 * Pending migration (still safe today because at least one of them is
 * usually mounted alongside others, but should be wired explicitly to
 * unlock demand-mode savings):
 *
 *   - TickerCrown
 *   - DemimondeTurntable / DemimondeRecord / DemimondeMarble
 *   - TapePlayer (Radio surface)
 *   - Ticket3D
 *
 * As consumers migrate, the canvas naturally drops to "demand" mode
 * whenever none of them are on screen (between routes, while the
 * cassette is off-stage during Night/Closing/Opening, etc.).
 */

interface CanvasFrameloopState {
  /** Count of mounted consumers requesting continuous rendering. */
  activeClaims: number;
  acquire: () => void;
  release: () => void;
}

export const useCanvasFrameloopStore = create<CanvasFrameloopState>((set) => ({
  activeClaims: 0,
  acquire: () => set((s) => ({ activeClaims: s.activeClaims + 1 })),
  release: () => set((s) => ({ activeClaims: Math.max(0, s.activeClaims - 1) }))
}));

/**
 * Resolves the current frameloop value from the live claim count.
 * Subscribe via a boolean-coercing selector so consumers only
 * re-render on the "always" ↔ "demand" transition, not on every
 * acquire/release inside the same mode.
 */
export function useResolvedFrameloop(): Frameloop {
  return useCanvasFrameloopStore((s) =>
    s.activeClaims > 0 ? "always" : "demand"
  );
}

/**
 * React hook — claims a slot of "always" frameloop while the calling
 * component is mounted. Drop the claim by letting the component
 * unmount.
 *
 *   const stageRendered = ... // gates the heavy 3D
 *   if (!stageRendered) return null;
 *   // Hook order is stable because the early-return runs above this:
 *   useCanvasClaim();
 *
 * For surfaces with conditional 3D content inside a single component
 * (i.e. the wrapper stays mounted but the 3D portion toggles), gate
 * with the `active` overload below instead.
 */
export function useCanvasClaim(active: boolean = true): void {
  const acquire = useCanvasFrameloopStore((s) => s.acquire);
  const release = useCanvasFrameloopStore((s) => s.release);
  useEffect(() => {
    if (!active) return;
    acquire();
    return () => release();
  }, [active, acquire, release]);
}
