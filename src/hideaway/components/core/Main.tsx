"use client";
import { MainInternal } from "./MainInternal";
import { Linus } from "@/hideaway/components/UX/Scroll";
import { useTourStore } from "@/hideaway/components/UX/Tour/TourProvider";
import { useRPStore } from "@/hideaway/providers/RP_Pro";
import { ReactNode, Suspense, useRef } from "react";
import { useShallow } from "zustand/shallow";
import { useResolvedFrameloop } from "@/hideaway/stores/CanvasFrameloop";

export const Main = ({ children }: { children: ReactNode }) => {
  const mainRef = useRef<HTMLElement>(null!);
  const navIsOpen = useRPStore(useShallow((l) => l.navIsOpen));
  // Frameloop resolution — priority order:
  //   1. Menu open             → "always"  (the menu preview gradient
  //                                          renders through the shared
  //                                          canvas and must keep ticking)
  //   2. Tour active           → "never"   (the registration tour's heavy
  //                                          DOM animations risk a
  //                                          WebGL context-loss on
  //                                          weak GPUs)
  //   3. Any 3D consumer       → "always"  (consumers call
  //                                          useCanvasClaim() while
  //                                          mounted; see
  //                                          stores/CanvasFrameloop.ts)
  //   4. No claims             → "demand"  (idle — only renders on
  //                                          explicit invalidate())
  const regActive = useTourStore((s) => s.regActive);
  const resolvedFrameloop = useResolvedFrameloop();
  const frameloop = navIsOpen
    ? "always"
    : regActive
      ? "never"
      : resolvedFrameloop;
  return (
    <main ref={mainRef} className={"root"}>
      {children}
      <Suspense>
        <MainInternal
          eventSource={mainRef}
          data-frameloop={frameloop}
          frameloop={frameloop}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: navIsOpen ? 247 : 40,
            width: "100vw",
            height: "100vh"
          }}
        />
      </Suspense>
      <Linus root={true} />
    </main>
  );
};
