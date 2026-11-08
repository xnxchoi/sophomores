"use client";

import { OrthographicCamera, View } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { ComponentProps, RefObject } from "react";
import { useSiteMenu } from "@/lib/content/menu";
import { useResolvedFrameloop } from "./canvas-frameloop";
import { siteLayer } from "./layers";

type SharedCanvasProps = Omit<ComponentProps<typeof Canvas>, "frameloop"> & {
  eventSource: RefObject<HTMLElement | null>;
};

/** One WebGL canvas. Scenes enter through drei `<View>`. */
export function SharedCanvas({ eventSource, children, style, ...props }: SharedCanvasProps) {
  const frameloop = useResolvedFrameloop();
  const menuOpen = useSiteMenu((state) => state.open);
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
