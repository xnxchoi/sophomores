"use client";
import { cn } from "@/lib/utils";
import { View } from "@react-three/drei";
import { type ComponentProps, Suspense, useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { useCanvasClaim } from "@/stores/CanvasFrameloop";
import {
  TapeModel,
  type TapeCameraOverride,
  type TapeDisplayOverride,
  type TapeModelRotation
} from "./TapeModel";

interface Tape3DSceneProps {
  /**
   * The DOM element id used as the GSAP ScrollTrigger trigger.
   * The element should exist in the page at or near where the 3D model
   * is visible. Defaults to "webgl_trigger".
   */
  scrollTriggerId?: string;
  className?: string;
  style?: ComponentProps<"div">["style"];
  /**
   * Override the outer wrapper's sizing classes. Defaults to
   * `"relative h-screen w-full"` which suits the Radio surface but is
   * too tall for embedded cinematic frames. Cinematic surfaces should
   * pass their own height/width here (e.g. `"relative h-[280px] w-full"`).
   */
  outerClassName?: string;
  /** See TapeModel. Defaults to the HideawayFM-driven marquee. */
  displayOverride?: TapeDisplayOverride | null;
  /** See TapeModel. Defaults to the standard Radio frame. */
  cameraOverride?: TapeCameraOverride | null;
  /** See TapeModel. Defaults to scroll-driven rotation. */
  modelRotation?: TapeModelRotation | null;
}

/**
 * Responsive aspect ratios matching the original tape3d.js breakpoints:
 *   < 480px  → 9:16 (portrait mobile)
 *   480–991px → 1:1  (tablet)
 *   ≥ 992px  → 16:9 (desktop)
 */
function useResponsiveAspectRatio() {
  const [ratio, setRatio] = useState("16 / 9");

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 480) setRatio("9 / 16");
      else if (w <= 991) setRatio("1 / 1");
      else setRatio("16 / 9");
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return ratio;
}

/**
 * Renders the tape player 3D model into the project's shared Canvas
 * (MainInternal) via drei's View system.
 *
 * The container div controls the responsive aspect ratio; the View
 * fills it with `position: absolute, inset: 0`. Visibility is tracked
 * via useInView so the PerspectiveCamera inside only becomes the
 * default camera while the component is on-screen.
 */
export function Tape3DScene({
  scrollTriggerId = "webgl_trigger",
  className,
  style,
  outerClassName,
  displayOverride,
  cameraOverride,
  modelRotation
}: Tape3DSceneProps) {
  const aspectRatio = useResponsiveAspectRatio();
  const { ref, inView } = useInView({ threshold: 0.1 });
  // Claim continuous frameloop on the shared canvas while the cassette
  // is actually on screen — disk-spin, marquee scroll, and camera lerps
  // all rely on useFrame ticking. Gated on `inView` so an off-screen
  // mount (e.g. a route that has the component in tree but scrolled
  // out) doesn't keep the canvas at "always".
  useCanvasClaim(inView);
  // When the caller overrides the outer sizing (cinematic embeds), we
  // also drop the View's hard h-screen — otherwise the canvas keeps
  // its full-viewport height and overflows the host frame. Callers
  // that use the default sizing keep the existing Radio behaviour.
  const usingCustomOuter = !!outerClassName;

  return (
    <div
      ref={ref}
      className={cn(outerClassName ?? "relative h-screen w-full")}
      style={{ aspectRatio, ...style }}
    >
      <View
        className={cn(
          "absolute inset-[auto_0%_.5%] w-full",
          usingCustomOuter ? "h-full" : "h-screen",
          className
        )}
      >
        <Suspense fallback={null}>
          <TapeModel
            scrollTriggerId={scrollTriggerId}
            inView={inView}
            displayOverride={displayOverride}
            cameraOverride={cameraOverride}
            modelRotation={modelRotation}
          />
        </Suspense>
      </View>
      {displayOverride?.tickerMode === "static" ? (
        <div
          aria-hidden
          data-dn-tape-crt
          className="pointer-events-none absolute inset-0 z-[1] [mix-blend-mode:screen] [background:repeating-linear-gradient(0deg,rgba(8,16,18,0)_0px,rgba(8,16,18,0)_2px,rgba(150,247,255,0.07)_2px,rgba(150,247,255,0.07)_3px)]"
        />
      ) : null}
    </div>
  );
}
