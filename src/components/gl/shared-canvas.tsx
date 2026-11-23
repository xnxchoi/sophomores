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
      dpr={[1, 1.5]}
      performance={{ min: 0.2 }}
      // PCF soft shadow maps on the renderer, as The Hideaway's MainInternal: a View opts in through castShadow and
      // receiveShadow (the book's dark-theme spotlight, UI-Commerce 24 Nov); Views that set neither draw no shadow pass.
      shadows="soft"
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
