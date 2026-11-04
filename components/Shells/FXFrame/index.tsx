"use client";
import { SPRING_EASE, TWEEN_EASE } from "src/constants/animations";
import { cn } from "src/lib/utils";
import { useFrameState, useRPStore } from "src/providers/RP_Pro";
import { AnimatePresence, useMotionValue, useSpring } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useRef } from "react";
import { useShallow } from "zustand/shallow";

export const FXFrame = () => {
  const showFXFrame = useRPStore(useShallow((l) => l.showFXFrame));
  const fxVisibileValue = useMotionValue(showFXFrame);
  useEffect(() => {
    fxVisibileValue.set(showFXFrame);
  }, [fxVisibileValue, showFXFrame]);
  const setShowFXFrame = useRPStore((l) => l.setFXFrameVisibility);
  const fxWrapperRef = useRef<HTMLDivElement>(null!);
  const { left, right, bottom } = useFrameState();
  const showHeader = useRPStore(useShallow((r) => r.showHeader));

  const l = useSpring(left, {
    ...SPRING_EASE.power3.inOut,
    visualDuration: 0.4
  });
  const r = useSpring(right, {
    ...SPRING_EASE.power3.inOut,
    visualDuration: 0.4
  });
  const b = useSpring(bottom, {
    ...SPRING_EASE.power3.inOut,
    visualDuration: 0.4
  });
  return (
    <AnimatePresence>
      {showFXFrame && showHeader && (
        <m.div
          ref={fxWrapperRef}
          initial={{ visibility: "hidden", opacity: 0 }}
          animate={{
            visibility: "visible",
            opacity: 1,
            transition: {
              duration: 0.3,
              ease: TWEEN_EASE.power3.inOut,
              type: "tween"
            }
          }}
          exit={{
            opacity: 0,
            transition: {
              duration: 0.2,
              ease: TWEEN_EASE.power2.out,
              type: "tween"
            }
          }}
          className={cn(
            "pointer-events-none fixed inset-0 z-10 mx-auto data-[visible=false]:animate-out data-[visible=false]:fade-out-0 data-[visible=true]:animate-in data-[visible=true]:fade-in-0"
          )}
          style={{
            left: l,
            right: r,
            bottom: b
          }}
        >
          {/*bottom-fx soft */}
          <m.div
            data-footer-fx
            data-themed={"background-color"}
            className="pointer-events-none absolute fixed top-auto z-10 h-[80px] w-full bg-black/0 mask-[linear-gradient(transparent,oklch(from_var(--n-s-menu)_l_c_h/70%))] opacity-75 backdrop-filter-[brightness(100%)_blur(5px)_contrast(500%)_saturate(1500%)]"
            style={{
              bottom: b
            }}
          ></m.div>
          <m.div
            data-footer-fx
            data-themed={"background-color"}
            className="pointer-events-none fixed top-auto z-10 h-[60px] w-full mask-[linear-gradient(transparent,oklch(from_var(--n-s-menu)_l_c_h/70%))] opacity-75 backdrop-filter-[hue-rotate(0deg)_brightness(110%)_blur(5px)_contrast(500%)_saturate(1500%)]"
            style={{
              bottom: b
            }}
          ></m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
