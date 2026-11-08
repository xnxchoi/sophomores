"use client";

import { useRPStore } from "@/hideaway/providers/RP_Pro";
import { useTheme } from "@/hideaway/providers/Theme";
import { useGSAP } from "@gsap/react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";

export const LoaderLottie = () => {
  const theme = useTheme((r) => r.theme);
  const [animationData, setAnimationData] = useState(
    theme === "dark"
      ? "/assets/lottie-dark.lottie"
      : "/assets/lottie-light.lottie"
  );
  useEffect(() => {
    setAnimationData(
      theme === "dark"
        ? "/assets/lottie-dark.lottie"
        : "/assets/lottie-light.lottie"
    );
  }, [theme]);
  const pageIsTransitioning = useRPStore(
    useShallow((l) => l.pageIsTransitioning)
  );
  const divRef = useRef<HTMLDivElement>(null!);

  useGSAP(
    () => {
      if (pageIsTransitioning) {
        gsap.to(divRef.current, {
          autoAlpha: 1,
          duration: 0.2,
          ease: "power4.out"
        });
      }
      // else {
      //   gsap.to(divRef.current, {
      //     autoAlpha: 0,
      //     duration: 0.2,
      //     ease: "power4.out",
      //   });
      // }
    },
    { dependencies: [pageIsTransitioning], scope: divRef }
  );
  return (
    <div
      data-themed="background-color,color"
      className={
	      "fixed inset-0 flex h-screen w-screen flex-col items-center justify-center bg-background"
      }
      ref={divRef}
    >
      <div className="contents-center m-auto flex h-[120px] w-[120px] flex-col items-center justify-center gap-x-2.5 gap-y-2.5 overflow-hidden xl:h-[24vw] xl:w-[24vw]">
        <div className="flex w-full">
          <DotLottieReact src={animationData} loop={true} autoplay={true} />
        </div>
      </div>
    </div>
  );
};
// variants = {{
//   start: { opacity: 0, visibility: 'hidden' }, enter: {
//     visibility: 'visible', opacity: 1, transition: {
//       ease: 'easeIn', duration: 0.3, zIndex: 244
//     },
//   }, exit: {
//     visibility: 'hidden', zIndex: 45, opacity: 0, transition: {
//       duration: 0.2, ease: 'easeOut', zIndex: 45
//     },

//   },
// }}
