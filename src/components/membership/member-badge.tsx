"use client";

import { useRef } from "react";
import { Center, PerspectiveCamera, useGLTF, View } from "@react-three/drei";
import { useInView } from "motion/react";
import { useCanvasClaim } from "@/components/gl/canvas-frameloop";
import { MEMBER_BADGE_URL } from "@/lib/content/assets";
import { cn } from "@/lib/utils";

function BadgeMesh({ modelUrl }: { modelUrl: string }) {
  const model = useGLTF(modelUrl);
  return <primitive object={model.scene} />;
}

/**
 * The 3D member badge as a scene for the site's one shared canvas (owner, 24 Nov: off the reading page, "make it their
 * own, like, actually usable components"; "it doesn't bring its own canvas. Maybe it brings the stuff inside its
 * canvas"). Like the menu gradient, it marks out its area and enters the shared canvas through drei's `<View>`; the (site)
 * layout mounts that canvas. The model suspends while it loads, so the caller wraps it in Suspense and, for a lost WebGL
 * context, CanvasBoundary. Rope physics and the plaque set stay in Hideaway.
 */
export function MemberBadge({
  modelUrl = MEMBER_BADGE_URL,
  className
}: {
  modelUrl?: string;
  className?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const inView = useInView(frame, { margin: "200px 0px" });
  useCanvasClaim(inView);
  return (
    <div
      ref={frame}
      className={cn("relative h-80 w-full overflow-hidden", className)}
    >
      <View className="absolute inset-0">
        <PerspectiveCamera makeDefault position={[0, 0, 2.4]} fov={32} />
        <ambientLight intensity={1.4} />
        <directionalLight position={[2, 3, 4]} intensity={2.2} />
        <Center>
          <BadgeMesh modelUrl={modelUrl} />
        </Center>
      </View>
    </div>
  );
}

useGLTF.preload(MEMBER_BADGE_URL);
