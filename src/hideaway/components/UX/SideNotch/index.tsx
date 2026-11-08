"use client";
import { useDomCursor } from "@/hideaway/components/core/cursorWrapper";
import { SPRING_EASE } from "@/hideaway/constants/animations";
import { useIsMobile } from "@/hideaway/providers/MiddleMan";
import { useHasRadio } from "@/hideaway/providers/HideawayFM/hooks";
import { useCursor, useFrameState, useRPStore } from "@/hideaway/providers/RP_Pro";
import {
  useMotionValue,
  useSpring,
  useTransform,
  Variants
} from "motion/react";
import * as m from "motion/react-m";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { SoundBar } from "../../content/Radio/soundBar";
import { TimeComponent } from "./TimeComponent";

type SideNotchProps = {
  sideDrawer?: boolean;
};
export const SideNotch = (props: SideNotchProps) => {
  const { sideDrawer = false } = props;
  const { isMobile } = useIsMobile();
  const lastMobile = useRef(isMobile);
  const [wantMobile, setWantMobile] = useState(isMobile);
  useEffect(() => {
    if (lastMobile.current !== isMobile) {
      setWantMobile(isMobile);
    }
    lastMobile.current = isMobile;
  }, [isMobile]);
  return wantMobile ? null : <DeskNotch sideDrawer={sideDrawer} />;
};
const DeskNotch = (props: SideNotchProps) => {
  const { sideDrawer = false } = props;
  const navIsOpen = useRPStore(useShallow((state) => state.navIsOpen));
  const setSidebarOpen = useRPStore((state) => state.setSideDrawerOpen);
  const sidedrawervalue = useMotionValue(sideDrawer);
  useEffect(() => {
    sidedrawervalue.set(sideDrawer);
  }, [sideDrawer, sidedrawervalue]);
  const isOpen = useRPStore(useShallow((state) => state.sidebarOpen));
  const setCurTheme = useCursor((state) => state.setCursorTheme);
  const resetCursorTheme = useCursor((state) => state.resetCursorTheme);
  const onEnter = useCallback(() => {
    setCurTheme("dark");
  }, [setCurTheme]);
  const lastSidebarState = useRef(isOpen);
  const inited = useRef(false);
  useEffect(() => {
    if (navIsOpen) {
      setSidebarOpen(false);
    }
  }, [navIsOpen, setSidebarOpen]);

  const notchRef = useRef<HTMLDivElement>(null);
  const viewportWidth = useRPStore(useShallow((r) => r.viewportWidth));
  const vw = useMotionValue(viewportWidth);
  useEffect(() => {
    vw.set(viewportWidth);
  }, [viewportWidth, vw]);
  const hasRadio = useHasRadio();
  const { left } = useFrameState();
  const notchLeft = useTransform(() =>
    sidedrawervalue.get() ? vw.get() * 0.24 - 1 : 2 * left.get()
  );
  const notchSpring = useSpring(notchLeft, {
    ...SPRING_EASE.power2.inOut,
    visualDuration: 0.6
  });
  // useEffect(() => {
  //   notchSpring.set(sideDrawer ? viewportWidth * 0.24 - 1 : 2 * left);
  // }, [left, viewportWidth, sideDrawer, notchSpring]);
  // useGSAP(
  //   () => {
  //     gsap.to(notchRef.current, {
  //       duration: 0.6,
  //       delay: 0.3,
  //       ease: "power2.inOut",
  //       left: sideDrawer ? viewportWidth * 0.24 - 1 : 2 * left
  //     });
  //   },
  //   { dependencies: [viewportWidth, left] }
  // );
  const variants: Variants = {
    hidden: {
      opacity: 0,
      x: "-100%"
    },
    exit: {
      opacity: 0,
      x: "-100%",
      transition: {
        type: "tween",
        duration: 1.2,
        ease: [0.77, 0.0, 0.175, 1]
      }
    },
    idle: {
      opacity: 1,
      x: 0,
      transition: {
        type: "tween",
        duration: 1.2,
        ease: "easeInOut",
        delay: 0.6
      }
    },
    init: {
      opacity: 1,
      x: 0,
      transition: {
        type: "tween",
        duration: 1.2,
        ease: "easeInOut"
      }
    }
  };

  const getVariant = useCallback((iO: boolean) => {
    lastSidebarState.current = iO;
    if (!inited.current) {
      inited.current = true;
      return "init";
    } else {
      return "idle";
    }
  }, []);
  const [v, setV] = useState("hidden");
  useEffect(() => {
    setV(getVariant(isOpen));
  }, [getVariant, isOpen]);
  const toggleSideDrawer = useRPStore((state) => state.toggleSideDrawer);
  const cursorState = useCursor(useShallow((state) => state.cursorState));
  const { onMouseEnter, onMouseLeave } = useDomCursor({
    enterCondition: () => (isOpen ? cursorState || "FOCUS" : "FOCUS"),
    leaveCondition: () => null
  });
  return (
    <m.div
      className="fixed bottom-[80px] z-[239] h-[17vh] w-[35px] p-0"
      data-tour="side-notch"
      ref={notchRef}
      variants={variants}
      animate={v}
      initial={"idle"}
      style={{
        left: notchSpring
      }}
      exit={{
        opacity: 0,
        x: "-100%",
        transition: {
          type: "tween",
          duration: 1.2,
          ease: [0.77, 0.0, 0.175, 1]
        }
      }}
    >
      <m.div
        className={
          "relative flex h-full w-full items-center justify-center bg-nav-background mask-[url(/assets/notch.png)] mask-size-[100%_100%] px-[5px] py-[15px] min-lg:mask-[url(/assets/notch@2x.png)]"
        }
        onMouseEnter={onEnter}
        onMouseLeave={resetCursorTheme}
        data-themed="background-color, color"
      >
        <m.div
          className={
            "flex h-full w-full max-w-full flex-col items-center justify-around gap-0 overflow-hidden bg-transparent pr-[5px] pl-[0px]"
          }
        >
          <m.span
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={toggleSideDrawer}
            className="z-[100] flex items-center justify-center gap-[6px] font-sans text-xs font-bold text-nav-foreground"
          >
            <span className="relative flex h-full w-full items-center justify-start overflow-hidden"></span>
          </m.span>
          {hasRadio && <SoundBar />}
        </m.div>
      </m.div>
    </m.div>
  );
};
const MobileNotch = (props: SideNotchProps) => {
  const { sideDrawer = false } = props;
  const navIsOpen = useRPStore(useShallow((state) => state.navIsOpen));
  const setSidebarOpen = useRPStore((state) => state.setSideDrawerOpen);
  const setSidebarIsTransitioning = useRPStore(
    (state) => state.setSideDrawerIsTransitioning
  );
  const isOpen = useRPStore(useShallow((state) => state.sidebarOpen));

  const lastSidebarState = useRef(isOpen);
  const inited = useRef(false);
  useEffect(() => {
    if (navIsOpen) {
      setSidebarOpen(false);
    }
  }, [navIsOpen, setSidebarOpen]);
  const { bottom: b } = useFrameState();
  const side = useMotionValue(sideDrawer);
  const btm = useTransform(() => {
    return side.get() ? window.innerHeight * 0.1 : b.get();
  });
  const bottom = useSpring(btm, {
    ...SPRING_EASE.power2.inOut,
    visualDuration: 0.6
  });
  useEffect(() => {
    side.set(sideDrawer);
  }, [sideDrawer, side]);
  const notchRef = useRef<HTMLDivElement>(null);

  const hasRadio = useHasRadio();

  const variants: Variants = useMemo(
    () => ({
      hidden: {
        opacity: 0,
        y: "100%"
      },
      exit: {
        opacity: 0,
        y: "100%",
        transition: {
          type: "tween",
          duration: 1.2,
          ease: [0.77, 0.0, 0.175, 1]
        }
      },
      idle: {
        opacity: 1,
        x: 0,
        y: 0,
        transition: {
          type: "tween",
          duration: 1.2,
          ease: [0.77, 0.0, 0.175, 1]
        }
      },
      init: {
        opacity: 1,
        x: 0,
        y: 0,
        transition: {
          type: "tween",
          duration: 1.2,
          ease: "easeInOut"
        }
      }
    }),
    []
  );

  const getVariant = useCallback((iO: boolean) => {
    lastSidebarState.current = iO;
    if (!inited.current) {
      inited.current = true;
      return "init";
    } else {
      return "idle";
    }
  }, []);

  const [v, setV] = useState<"init" | "idle" | "exit" | "hidden">("hidden");
  useEffect(() => {
    setV(getVariant(isOpen));
  }, [getVariant, isOpen]);
  const toggleSideDrawer = useRPStore((state) => state.toggleSideDrawer);
  const cursorState = useCursor(useShallow((state) => state.cursorState));
  const { onMouseEnter, onMouseLeave } = useDomCursor({
    enterCondition: () => (isOpen ? cursorState || "FOCUS" : "FOCUS"),
    leaveCondition: () => null
  });
  return (
    <m.div
      className="fixed bottom-[30px] z-[239] h-[70px] w-[45vw] p-0"
      ref={notchRef}
      variants={variants}
      style={{
        bottom
      }}
      animate={v}
      initial={"idle"}
      exit={"exit"}
    >
      <m.div
        className={
          "relative flex h-full w-full items-center justify-center bg-nav-background mask-[url(/assets/notch.png)] mask-size-[100%_100%] px-[15px] py-[5px]"
        }
        data-themed="background-color, color"
      >
        <m.div
          className={
            "flex h-full w-full max-w-full items-center justify-evenly gap-0 overflow-hidden bg-transparent pr-[5px] pl-[0px]"
          }
        >
          <m.span
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={toggleSideDrawer}
            className="z-[100] flex flex-col items-center justify-center gap-[2.5px] font-sans text-[12px] font-bold text-nav-foreground"
          >
            <div className="h-[2px] w-[8px] bg-nav-foreground"></div>
            <div className="h-[2px] w-[8px] bg-nav-foreground"></div>
            <div className="h-[2px] w-[8px] bg-nav-foreground"></div>
          </m.span>
          {hasRadio && <SoundBar />}
        </m.div>
      </m.div>
    </m.div>
  );
};
/**
 *
 *   {/* <m.svg
 *           xmlns="http://www.w3.org/2000/svg"
 *           preserveAspectRatio={"xMidYMid meet"}
 *           className={
 *             "absolute left-0 right-0 top-auto bottom-auto w-full h-auto blur-[.5px]"
 *           }
 *           viewBox="0 0 34.5 203"
 *         >
 *           <path
 *             d="M34.5 33.61s-.13-2.13-.42-3.16c-.37-1.29-1.03-2.96-2.25-4.42-1.63-1.96-5.28-3.91-8.39-4.76-5.8-1.59-10.59-4.53-13.34-6.6C3.24 9.53.93.95.19 0L0 101.48v.04L.19 203c.74-.95 3.05-9.53 9.91-14.66 2.76-2.06 7.55-5.01 13.34-6.6 3.1-.85 6.76-2.8 8.39-4.76 1.21-1.46 1.88-3.13 2.25-4.42.29-1.03.42-3.16.42-3.16s-.2-34.43-.23-67.89c.03-33.47.23-67.89.23-67.89Z"
 *             fill="oklch(from var(--n-s-bg) l c h/1)"
 *           />
 *         </m.svg>
 * </svg>
    <path
            fill="currentColor"
            d="M35.88 166.97v.02c-.3 2.86-.91 6.7-3.97 8.84-10.89 7.63-18.65 4.57-26.18 19.63-1.58 3.16-2.14 7.69-2.34 15.54H0V0h3.38c.2 7.85.76 12.38 2.34 15.54 7.53 15.06 15.3 12 26.18 19.63 3.06 2.15 3.67 5.98 3.97 8.84v.02c.04 1.56.08 3.79.12 6.52v109.89c-.04 2.73-.08 4.97-.12 6.52Z"
          />
 **
 ***
  sidebarOpening: {
      x: [null, leftOffset - 5 + 'px'],
      opacity: [0, 1],
      transition: {
        times: [0.1, 1],
        duration: 0.5,
        ease: [0.32, 0.72, 0, 1],
        type: "tween",
      },
    },
    sidebarClosing: {
      x: [null, 0],
      opacity: [0, 1],
      transition: {
        times: [0, 1],
        duration: 0.41,
        ease: [0.32, 0.72, 0, 1],
        type: "tween",
      },
    },
     if (lastSidebarState.current !== iO) {
        setSidebarIsTransitioning(true)
        delay(150).then(() => {
          setSidebarIsTransitioning(false)
        })
        toReturn = iO ? "sidebarOpening" : "sidebarClosing"
      } else {


 **/
