"use client";

import { OrthographicCamera, View } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { ComponentProps, RefObject } from "react";
import { useRPStore } from "@/providers/RP_Pro";
import { useResolvedFrameloop } from "./canvas-frameloop";
import { siteLayer } from "@/constants/site-layers";

type SharedCanvasProps = Omit<ComponentProps<typeof Canvas>, "frameloop"> & {
  eventSource: RefObject<HTMLElement | null>;
};

/** One WebGL canvas. Scenes enter through drei `<View>`. */
export function SharedCanvas({ eventSource, children, style, ...props }: SharedCanvasProps) {
  const frameloop = useResolvedFrameloop();
  const menuOpen = useRPStore((state) => state.navIsOpen);
  return (
    <div
      data-shared-canvas=""
      style={{
        position: "fixed",
        inset: 0,
        zIndex: menuOpen ? siteLayer.menuCanvas : siteLayer.canvas,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none"
      }}
    >
    <Canvas
      frameloop={frameloop}
      eventSource={eventSource}
      data-frameloop={frameloop}
      // Capped at 2: retina stays sharp, a 3× phone draws 2× (stripe.press: [1, 2]). R3F owns the ratio; nothing in a
      // View may call gl.setPixelRatio or gl.setSize, which would override this on the next resize.
      dpr={[1, 2]}
      performance={{ min: 0.2 }}
      // Shadow maps on the renderer, as The Hideaway's MainInternal: a View opts in through castShadow and receiveShadow
      // (the book's dark-theme spotlight, UI-Commerce 24 Nov); Views that set neither draw no shadow pass. The Hideaway
      // asks for "soft" (PCFSoftShadowMap) on three r181; three 0.186 removed that type and falls back to PCFShadowMap
      // with a warning (WebGLShadowMap.js:99). Its PCF is the soft successor (Vogel-disk filtered taps), so ask for it.
      shadows="percentage"
      gl={{ alpha: true, premultipliedAlpha: false, powerPreference: "high-performance" }}
      {...props}
      style={{ width: "100%", height: "100%", ...style }}
    >
      <OrthographicCamera makeDefault position={[0, 0, 1]} />
      <View.Port />
      {children}
    </Canvas>
    </div>
  );
}
