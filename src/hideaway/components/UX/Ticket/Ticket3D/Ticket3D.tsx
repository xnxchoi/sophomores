"use client";

import { View } from "@react-three/drei";
import {
  type CSSProperties,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";
import { useCanvasClaim } from "@/hideaway/stores/CanvasFrameloop";
import { TicketMesh } from "./TicketMesh";
import type { TicketTextureInput } from "./makeTicketTexture";

export interface Ticket3DProps extends TicketTextureInput {
  /**
   * When false, the ticket is purely visual — no hover tilt, no flip,
   * just an idle wobble. Use for list/pager views where multiple flashy
   * tickets would be distracting (and on mobile, downright hostile).
   * Default true.
   */
  interactive?: boolean;
  /**
   * Optional controlled flipped state (lifted by the parent). When omitted
   * the component manages its own internal state.
   */
  flipped?: boolean;
  /**
   * Called when the user taps the ticket (only fires when interactive).
   * Use this to lift the flipped state or trigger focused mode.
   */
  onFlip?: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Detect hover-capable input (i.e. a mouse). Touch-only devices return
 * false so we don't pin a hover-tilt that depends on a hover state which
 * never resolves.
 */
function useHoverCapable(): boolean {
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanHover(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return canHover;
}

/**
 * The 3D ticket — a holographic, iridescent paper-card object rendered
 * into the project's shared canvas via drei's <View>.
 *
 * Interaction model:
 *   - Hover-capable devices: the cursor tilts the ticket; tapping flips it.
 *   - Touch devices: tapping flips it. No continuous tilt (touch users
 *     don't have a persistent hover state, so the tilt would feel broken).
 *   - When `interactive=false`: neither — the ticket just idles.
 */
export function Ticket3D({
  className,
  style,
  interactive = true,
  flipped: flippedProp,
  onFlip,
  ...textureInput
}: Ticket3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { ref: inViewRef, inView } = useInView({ threshold: 0.1 });
  // Claim continuous frameloop on the shared canvas while the ticket
  // is on screen — idle wobble + hover tilt + flip animation all
  // rely on useFrame.
  useCanvasClaim(inView);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      inViewRef(node);
    },
    [inViewRef]
  );

  const canHover = useHoverCapable();
  const hoverTiltActive = interactive && canHover;

  // Internal flip state used when the parent doesn't provide one.
  const [internalFlipped, setInternalFlipped] = useState(false);
  const flipped = flippedProp ?? internalFlipped;

  const handleClick = useCallback(() => {
    if (!interactive) return;
    if (onFlip) {
      onFlip();
    } else {
      setInternalFlipped((f) => !f);
    }
  }, [interactive, onFlip]);

  // ── Pointer move (hover tilt) — only on hover-capable inputs ────────────
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [pointerActive, setPointerActive] = useState(false);

  useEffect(() => {
    if (!hoverTiltActive) {
      setPointer({ x: 0, y: 0 });
      setPointerActive(false);
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      // Ignore touch/pen — pointer-tilt is mouse-only.
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
  }, [hoverTiltActive]);

  return (
    <div
      ref={setRefs}
      className={cn("relative aspect-[2/1] w-full select-none", className)}
      style={{
        touchAction: "manipulation",
        cursor: interactive ? "pointer" : "default",
        // CSS drop-shadow follows the rendered alpha of the View, so the
        // shadow stretches and tilts with the card — much better than a
        // flat orthogonal contact shadow on a ground plane.
        filter:
          "drop-shadow(0 28px 36px rgba(20, 14, 8, 0.18)) drop-shadow(0 8px 14px rgba(20, 14, 8, 0.10))",
        ...style
      }}
      onClick={handleClick}
      // a11y: a flippable ticket is effectively a button.
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : -1}
      onKeyDown={(e) => {
        if (!interactive) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <View className="absolute inset-0">
        <Suspense fallback={null}>
          <TicketMesh
            {...textureInput}
            pointer={pointer}
            pointerActive={pointerActive && hoverTiltActive}
            interactive={interactive}
            flipped={flipped}
            cameraActive={inView}
          />
        </Suspense>
      </View>
    </div>
  );
}
