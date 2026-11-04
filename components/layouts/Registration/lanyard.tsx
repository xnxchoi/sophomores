"use client";
import { Plaque } from "@/components/layouts/Registration/MembershipBadge";
import { defaultOptions } from "@/components/UX/Tour/Onboard/Form";
import { useIsMobile } from "@/providers/MiddleMan";
import {
  Environment,
  Loader,
  PerspectiveCamera,
  View
} from "@react-three/drei";

import { Physics } from "@react-three/rapier";
import { useFormContext } from "react-hook-form";
import { useInView } from "react-intersection-observer";
import { useStore } from "@tanstack/react-form";
import { useAppForm, useTypedAppFormContext } from "@/components/UX/Tour/form";

export type MemberCardsType = "BADGE" | "PLATE";

export function Lanyard(props: { type: MemberCardsType }) {
  const { type } = props;
  return (
    <>
      <Registerer type={type} />
      <Loader
        barStyles={{
          backgroundColor: "oklch(54.74% 0.2224 29.01/.5)",
          borderRadius: "1px"
        }}
        containerStyles={{
          transition: "all 0.5s ease",
          zIndex: 247,
          backgroundColor: "rgba(0,0,0,.1)",
          backdropFilter: "blur(4px)",
          borderRadius: "10px",
          padding: "10px",
          position: "absolute"
        }}
      />
    </>
  );
}

function Registerer(
  props: {
    type: MemberCardsType | string;
  } = { type: "BADGE" as MemberCardsType }
) {
  const { type } = props;
  const { isMobile, isTouch } = useIsMobile();

  const isMouse = !isMobile && !isTouch;

  const { inView, ref } = useInView();
  const form = useTypedAppFormContext({
    ...defaultOptions
  });
  const name1 = useStore(form.store, (r) => r.values.profile.firstName);
  const name2 = useStore(form.store, (r) => r.values.profile.lastName);
  return (
    <div ref={ref} className="relative z-5 h-full flex-1">
      <View
        style={{
          right: "0",
          top: "0",
          bottom: "0",
          position: "absolute",
          left: "0"
        }}
      >
        <PerspectiveCamera
          position={[0, 0, 13]}
          fov={type === "BADGE" ? 25 : 35}
          makeDefault={inView}
        />
        <ambientLight intensity={Math.PI} />
        {(type === "BADGE" && (
          <Physics
            debug={false}
            interpolate={true}
            gravity={[0, -40, 0]}
            timeStep={1 / 60}
          >
            <Plaque name1={name1} name2={name2} />
          </Physics>
        )) || <></>}
        <Environment
          files={["env_hdr1.webp", "env_hdr1-gainmap.webp", "env_hdr1.json"]}
          path={"/assets/"}
        ></Environment>
      </View>
    </div>
  );
}
