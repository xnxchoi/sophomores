"use client";

import { useCanvasClaim } from "@/components/gl/canvas-frameloop";
import { View } from "@react-three/drei";
import { useInView } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Color as ThreeColor } from "three";
import { DEFAULT_FIELD_CONFIG, type FieldConfig } from "./_shared/field-config";
import { LineFieldMesh } from "./LineFieldMesh";
import { useBezelDisplacementTexture } from "./useBezelDisplacementTexture";

interface TickerCrownClientProps {
  /** Override the default field configuration. */
  config?: Partial<FieldConfig>;
}

/**
 * Footer line-field — a constrained, right-aligned atmospheric motif at the
 * page foot. Sized to mirror the original nogram reference's modest framing
 * (a panel on the right, not a full-bleed slab).
 *
 * Architecture: renders into the project's shared `<Canvas>` (mounted by
 * `MainInternal`) via drei's `<View>`. The shader draws N rows of vertical
 * lines whose widths are modulated by the H logo (rendered to a CanvasTexture
 * with heavy blur), so the mark sits anchored on screen as a soft silhouette
 * while lines flow past — creating the counterflow perception (lines one way,
 * H stationary / appearing to drift the other).
 */
export function TickerCrownClient({
  config: configOverrides
}: TickerCrownClientProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const config: FieldConfig = useMemo(
    () => ({ ...DEFAULT_FIELD_CONFIG, ...configOverrides }),
    [configOverrides]
  );

  // Responsive size — switches at sm breakpoint. A null `widthPx*` means
  // full-width on that breakpoint (used for mobile by default).
  const [bandHeight, setBandHeight] = useState<number>(config.heightPxDesktop);
  const [maxBandWidth, setMaxBandWidth] = useState<number | null>(
    config.widthPxDesktop
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 640px)");
    const update = () => {
      const desktop = mql.matches;
      setBandHeight(desktop ? config.heightPxDesktop : config.heightPxMobile);
      setMaxBandWidth(desktop ? config.widthPxDesktop : config.widthPxMobile);
    };
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [
    config.heightPxDesktop,
    config.heightPxMobile,
    config.widthPxDesktop,
    config.widthPxMobile
  ]);

  // Track the section's actual rendered width so the shader's pixel math is
  // correct. ResizeObserver on the section.
  const [bandWidth, setBandWidth] = useState<number>(0);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setBandWidth(el.offsetWidth);
    });
    setBandWidth(el.offsetWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Viewport gate — pause all per-frame work while the bezel is offscreen.
  // `margin: "200px 0px"` warms the animation up 200px before the strip
  // actually enters the visual viewport so it's running smoothly by the
  // time the user can see it (no first-frame snap into place).
  const inView = useInView(wrapperRef, { margin: "200px 0px" });
  // Claim continuous frameloop on the shared canvas only while the
  // crown is on screen. Routes that hide the header via CSS (e.g.
  // /day-n-night sets `#rp-header { display: none }`) keep this
  // component mounted, so we gate on inView — not mount — to let
  // those routes drop the canvas to "demand" when nothing else
  // is claiming.
  useCanvasClaim(inView);

  // Page-transition gate — during a navigation, the outgoing page goes
  // `position: fixed` (see `RPage` / `TransitionProvider`) which removes
  // it from flow. The LegalFooter (a sibling at layout root) then reflows
  // up to the top of the document, dragging the bezel's wrapper to mid-
  // screen. drei's `<View>` would faithfully track to that new position
  // and render the bezel floating in the middle of the viewport, on top
  // of the fixed outgoing page. Detecting `transitionOutType !== null`
  // and unmounting the View for the duration of the transition prevents
  // the visual artifact entirely.
  const driftEnabled = inView;

  // Spin trigger — bezel turns while hovered (desktop) or briefly on tap
  // (touch). pointerenter/leave handle hover; pointerdown explicitly opens
  // a fixed window so tap-then-leave (no `pointerleave` on some touch
  // devices) still releases the spin.
  const [spinActive, setSpinActive] = useState<boolean>(false);
  const tapTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current !== null) {
        window.clearTimeout(tapTimerRef.current);
      }
    };
  }, []);

  const handlePointerEnter = () => setSpinActive(true);
  const handlePointerLeave = () => {
    if (tapTimerRef.current === null) setSpinActive(false);
  };
  const handlePointerDown = () => {
    setSpinActive(true);
    if (tapTimerRef.current !== null) {
      window.clearTimeout(tapTimerRef.current);
    }
    tapTimerRef.current = window.setTimeout(() => {
      tapTimerRef.current = null;
      setSpinActive(false);
    }, 1400);
  };

  // Theme-aware foreground color (monochrome — no accent). Resolved by
  // round-tripping the CSS color through a 1×1 canvas; Chrome resolves
  // --foreground's oklch chain to lab(...) which Three's Color parser
  // rejects, so the canvas normalizes to sRGB bytes.
  const baseColor = useMemo(() => new ThreeColor("#000000"), []);
  const probeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const probe = probeRef.current;
    if (!probe) return;

    const probeCanvas = document.createElement("canvas");
    probeCanvas.width = probeCanvas.height = 1;
    const probeCtx = probeCanvas.getContext("2d", {
      willReadFrequently: true
    });

    const cssToRgb = (css: string): [number, number, number] | null => {
      if (!probeCtx) return null;
      probeCtx.clearRect(0, 0, 1, 1);
      probeCtx.fillStyle = "#000000";
      probeCtx.fillStyle = css;
      probeCtx.fillRect(0, 0, 1, 1);
      const data = probeCtx.getImageData(0, 0, 1, 1).data;
      return [data[0] / 255, data[1] / 255, data[2] / 255];
    };

    const refreshColors = () => {
      const fg = getComputedStyle(probe).color;
      const rgb = cssToRgb(fg);
      if (rgb) baseColor.setRGB(rgb[0], rgb[1], rgb[2]);
    };

    refreshColors();
    const mo = new MutationObserver(refreshColors);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"]
    });
    return () => mo.disconnect();
  }, [baseColor]);

  // Texture sized 1:1 with the band — the displacement is now procedural
  // (horizontal Gaussian + sharp triangle pip), so there's no SVG detail
  // that benefits from upsampling. Internal DPR scaling in the hook
  // handles retina sharpness for the triangle's anti-aliased edges.
  const displacementTexture = useBezelDisplacementTexture({
    width: bandWidth || maxBandWidth || 220,
    height: bandHeight
  });

  // Outer container: full-width, centered. The component is mounted inside
  // the LegalFooter's centered editorial column directly above the wordmark,
  // so it inherits that horizontal centering context.
  return (
    <>
      {/* Hidden probe used to resolve --foreground (handles var() chains and
          modern color spaces by routing through a canvas pixel). */}
      <span
        ref={probeRef}
        aria-hidden
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          color: "var(--foreground)",
          pointerEvents: "none"
        }}
      />
      <div aria-hidden className="relative z-0 flex w-full justify-center">
        <div
          ref={wrapperRef}
          aria-hidden
          className="relative cursor-pointer overflow-hidden"
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onPointerDown={handlePointerDown}
          style={{
            height: bandHeight,
            // null cap = full-width on this breakpoint (mobile default).
            width: maxBandWidth ?? "100%",
            touchAction: "manipulation"
          }}
        >
          {displacementTexture && bandWidth > 0 ? (
            <View
              // Explicit pixel dimensions — drei's View tracks its element via
              // getBoundingClientRect, and `absolute inset-0` was reading as
              // sub-pixel-height in our setup. Pinning width/height fixes it.
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: bandWidth,
                height: bandHeight,
                pointerEvents: "none"
              }}
            >
              {/* No local camera: drei's View provides one and ScreenQuad
                  fills whatever frustum is active. */}
              <LineFieldMesh
                config={config}
                displacementMap={displacementTexture}
                baseColor={baseColor}
                driftEnabled={driftEnabled}
                widthPx={bandWidth}
                heightPx={bandHeight}
                spinActive={spinActive}
              />
            </View>
          ) : null}
        </div>
      </div>
    </>
  );
}
