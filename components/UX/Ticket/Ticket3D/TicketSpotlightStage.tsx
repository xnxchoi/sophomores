"use client";

import { Canvas } from "@react-three/fiber";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { cn } from "@/lib/utils";
import { TicketMesh } from "./TicketMesh";
import type { TicketTextureInput } from "./makeTicketTexture";

export interface TicketSpotlightStageProps extends TicketTextureInput {
  flipped: boolean;
  onFlip: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * The spotlight uses its own dedicated <Canvas> rather than rendering
 * into the project's shared canvas via drei's <View>.
 *
 * Why: the spotlight overlay sits in front of the shared canvas with a
 * backdrop-blur on it. Anything rendered into the shared canvas (i.e. the
 * page-level Ticket3D, AND a spotlight Ticket3D-via-View) gets blurred
 * along with the page. Giving the spotlight its own Canvas at z-index
 * above the backdrop fixes that.
 *
 * The interaction model here is the same as Ticket3D: hover-tilt on
 * hover-capable inputs, tap-to-flip everywhere.
 */
export function TicketSpotlightStage({
  className,
  style,
  flipped,
  onFlip,
  ...textureInput
}: TicketSpotlightStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [pointerActive, setPointerActive] = useState(false);

  // Hover tilt — mouse-only.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      setPointer({ x, y });
    };
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      setPointerActive(true);
    };
    const onLeave = () => {
      setPointerActive(false);
      setPointer({ x: 0, y: 0 });
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const handleClick = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // Don't fire on text-selection drags.
      if (e.detail === 0) return;
      onFlip();
    },
    [onFlip]
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative aspect-[2/1] w-full select-none", className)}
      style={{
        touchAction: "manipulation",
        cursor: "pointer",
        filter:
          "drop-shadow(0 36px 48px rgba(20, 14, 8, 0.32)) drop-shadow(0 12px 22px rgba(20, 14, 8, 0.18))",
        ...style
      }}
      onPointerUp={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onFlip();
        }
      }}
    >
      <Canvas
        className="absolute inset-0"
        gl={{
          alpha: true,
          antialias: true,
          premultipliedAlpha: false,
          powerPreference: "high-performance"
        }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <TicketMesh
            {...textureInput}
            pointer={pointer}
            pointerActive={pointerActive}
            interactive
            flipped={flipped}
            cameraActive
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
