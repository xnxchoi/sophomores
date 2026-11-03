"use client";

import { useCanvasClaim } from "@/components/gl/canvas-frameloop";
import { MEMBER_BADGE_URL } from "@/lib/content/assets";
import { Center, PerspectiveCamera, useGLTF, View } from "@react-three/drei";
import { useInView } from "motion/react";
import { useRef } from "react";

function BadgeMesh() {
  const model = useGLTF(MEMBER_BADGE_URL);
  return <primitive object={model.scene} />;
}

/** Static badge on the shared canvas. Rope physics and the plaque set stay in Hideaway. */
export function MemberBadge() {
  const frame = useRef<HTMLDivElement>(null);
  const inView = useInView(frame, { margin: "200px 0px" });
  useCanvasClaim(inView);

  return (
    <div ref={frame} className="relative h-80 overflow-hidden rounded-[10px] border border-border/20">
      <View className="absolute inset-0">
        <PerspectiveCamera makeDefault position={[0, 0, 2.4]} fov={32} />
        <ambientLight intensity={1.4} />
        <directionalLight position={[2, 3, 4]} intensity={2.2} />
        <Center>
          <BadgeMesh />
        </Center>
      </View>
    </div>
  );
}

useGLTF.preload(MEMBER_BADGE_URL);
