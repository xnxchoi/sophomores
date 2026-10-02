"use client";

import dynamic from "next/dynamic";
import type { MotionValue } from "motion/react";

export type SceneProps = {
  progress: MotionValue<number>;
  reducedMotion: boolean;
  active: boolean;
  footer?: boolean;
  entryScale?: MotionValue<number>;
};

const Scene = dynamic(() => import("./scene"), {
  ssr: false,
  loading: () => null
});

export default function SceneLoader(props: SceneProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundColor: "#030504"
      }}
    >
      <Scene {...props} />
    </div>
  );
}
