"use client";

import { OrthographicCamera, View } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { ComponentProps, RefObject } from "react";
import { useResolvedFrameloop } from "./canvas-frameloop";
import { siteLayer } from "./layers";

type SharedCanvasProps = Omit<ComponentProps<typeof Canvas>, "frameloop"> & {
  eventSource: RefObject<HTMLElement | null>;
};

/** One WebGL canvas. Scenes enter through drei `<View>`. */
export function SharedCanvas({ eventSource, children, style, ...props }: SharedCanvasProps) {
  const frameloop = useResolvedFrameloop();
  return (
    <Canvas
      frameloop={frameloop}
      eventSource={eventSource}
      data-frameloop={frameloop}
      dpr={[1, 1.5]}
      performance={{ min: 0.2 }}
      gl={{ alpha: true, premultipliedAlpha: false, powerPreference: "high-performance" }}
      {...props}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: siteLayer.canvas,
        width: "100vw",
        height: "100vh",
        ...style
      }}
    >
      <OrthographicCamera makeDefault position={[0, 0, 1]} />
      <View.Port />
      {children}
    </Canvas>
  );
}
