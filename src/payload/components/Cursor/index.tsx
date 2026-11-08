"use client";

import { useCoordinator } from "@/providers/CoordinatorCtx";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { useCursor, useDeviceInfo } from "@/providers/RP_Pro";
import { useTheme } from "@/providers/Theme";

import { EASING } from "@/constants/animations";
import { useVault } from "@/payload/providers/Admins";
import { useIsMobile } from "@/providers/MiddleMan";
import { clamp } from "@/utilities/mathUtilities";
import {
  AnimatePresence,
  useMotionValue,
  useSpring,
  type Variant
} from "motion/react";
import * as m from "motion/react-m";
import { useShallow } from "zustand/shallow";

type FOCUS = "FOCUS";
type DRAG = "DRAG";
type DEFAULT = null;
export type CursorStates = FOCUS | DRAG | DEFAULT;
// Initialize cursor
export default function Admin_Cursor() {
  const cursorX = useCoordinator((r) => r.x);
  const cursorY = useCoordinator((r) => r.y);
  const { isMobile } = useIsMobile();
  const textWidth = useRef(12);
  const c = useMemo(
    () => ({
      LARGE: 48,
      MEDIUM: 17,
      SMALL: 6
    }),
    []
  );

  // useEffect(() => {
  // 	const updatePosition = (e: MouseEvent) => {
  // 		cursorX.set(e.clientX);
  // 		cursorY.set(e.clientY);
  // 	};
  // 	document.addEventListener("mousemove", updatePosition);
  // 	return () => {
  // 		document.removeEventListener("mousemove", updatePosition);
  // 	};
  // }, [cursorX, cursorY]);
  const springConfig = useMemo(() => ({ duration: 0 }), []);
  const isTouchDevice = useDeviceInfo(useShallow((r) => r.isTouchDevice));
  const [isTextCursor, setIsTextCursor] = useState(!1);
  const marquee = useCursor(useShallow((l) => l.marquee));
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
  const cursorXSpring = useSpring(cursorX, springConfig || { duration: 0 });
  const cursorYSpring = useSpring(cursorY, springConfig || { duration: 0 });

  const cursorState = useCursor(useShallow((l) => l.cursorState));
  const oCircle = useRef(null);
  const iCircle = useRef(null);
  const cursr = useRef<HTMLSpanElement>(null!);
  const domEl = useRef<HTMLSpanElement>(null!);
  const [mqArr, setMqArr] = useState(
    Math.ceil(120 / ((cursorState?.length || 12) + 1))
  );
  const pageIsTransitioning = useVault(
    useShallow((l) => l.pageIsTransitioning)
  );
  const cursorTheme = useCursor(useShallow((l) => l.cursorTheme));
  const baseTheme = useCursor(useShallow((l) => l.baseCursorTheme));

  const colors = useMemo(
    () => ({
      rouge: "62.41% 0.246 28.34",
      dark: "0.9735 0.0013 218.99",
      light: "10.17% 0.0013 218.99"
    }),
    []
  );
  const { rouge } = colors;
  const [currentBase, setCurrentBase] = useState(colors[cursorTheme]);

  useEffect(() => {
    setCurrentBase(colors[cursorTheme]);
  }, [cursorTheme, colors]);
  const theme = useTheme((r) => r.theme);
  const navIsOpen = useVault(useShallow((l) => l.navIsOpen));

  const [isEnabled, setIsEnabled] = useState(!(isTouchDevice && isMobile));
  useEffect(() => {
    setIsEnabled(!(isTouchDevice && isMobile));
  }, [isTouchDevice, isMobile]);

  const lastTextCursor = useRef(isTextCursor);
  const easeLikeSpring = useMemo(
    () => ({
      visualDuration: 0.3,
      stiffness: 500,
      damping: 30
    }),
    []
  );
  const containerWidth = useMotionValue(100);
  const containerHeight = useMotionValue(40);
  const outerRad = useMotionValue(c.SMALL);
  const innerRad = useMotionValue(c.SMALL);

  const outerRadius = useSpring(outerRad, easeLikeSpring);
  const innerRadius = useSpring(innerRad, easeLikeSpring);

  const circleVariants = useMemo(
    () => ({
      hidden: {
        opacity: 0,
        visibility: "hidden",
        scale: 0
      },
      DRAG: {
        scale: 0.9,
        opacity: 1,
        visibility: "visible"
      },
      FOCUS: {
        opacity: 1,
        visibility: "visible",
        scale: 1
      },
      DEFAULT: {
        opacity: 1,
        visibility: "visible",
        scale: 1
      }
    }),
    []
  );
  const strokeColor = useMotionValue(`oklch(${colors[cursorTheme]}/1)`);

  const outerVariants = useMemo(
    () => ({
      ...circleVariants
    }),
    [circleVariants]
  );
  const innerVariants = useMemo(
    () => ({ ...circleVariants }),
    [circleVariants]
  );

  type CircleKeys = keyof typeof circleVariants;

  const [circleVariant, setCircleVariant] = useState<CircleKeys>("hidden");

  useEffect(() => {
    const isFocus = cursorState === "FOCUS";
    const isDrag = cursorState === "DRAG";
    const isTC = !(isFocus || isDrag) && !!cursorState;
    const target = isFocus || isDrag ? rouge : currentBase;
    strokeColor.set(`oklch(${target}/1)`);
    const rr = isFocus || isDrag ? c.MEDIUM : c.SMALL;
    const ii = isDrag ? 0 : isFocus ? 1 : rr;
    outerRad.set(rr);
    innerRad.set(ii);
    const width = !isTC
      ? 1
      : clamp(((cursorState.length * 5 + 7) / 4) * textWidth.current, 85, 120);
    const height = !isTC ? 1 : 40;
    const currentW = containerWidth.get();
    const currentH = containerHeight.get();
    if (width !== currentW) {
      containerWidth.set(width);
    }
    if (height !== currentH) {
      containerHeight.set(height);
    }
    lastTextCursor.current !== isTC && setIsTextCursor(isTC);
    setCircleVariant(isFocus ? "FOCUS" : isDrag ? "DRAG" : "DEFAULT");
    lastTextCursor.current = isTC;
  }, [
    cursorState,
    setCircleVariant,
    containerWidth,
    containerHeight,
    c,
    innerRad,
    outerRad,
    rouge,
    currentBase,
    strokeColor
  ]);
  const textCursorVariants = useMemo(
    () => ({
      hidden: { opacity: 0, visibility: "hidden", scale: 0 },
      animate: {
        opacity: 1,
        visibility: "visible",
        scale: 1
      }
    }),
    []
  );

  // useGSAP(
  //   () => {
  //     const isFocus = cursorState === "FOCUS";
  //     const isTC = !!cursorState && !isFocus;

  //     const outerRad = isFocus ? c.MEDIUM : c.SMALL;
  //     const innerRad = isFocus ? 1 : outerRad;

  //     setIsTextCursor(isTC);
  //     if (!isTC) {
  //       gsap.killTweensOf([oCircle.current, iCircle.current, domEl.current]);
  //       lastTextCursor.current &&
  //         (gsap.set([oCircle.current, iCircle.current], {
  //           autoAlpha: 0,
  //           attr: {
  //             r: 0
  //           }
  //         }),
  //         gsap.to(domEl.current, {
  //           width: 1,
  //           height: 1,
  //           autoAlpha: 0,

  //           delay: 0.1,
  //           duration: 0.3,
  //           ease: "power3.out"
  //         }),
  //         gsap.to([oCircle.current, iCircle.current], {
  //           autoAlpha: 1,
  //           duration: 0.12,
  //           ease: "power3.out",
  //           delay: 0.1
  //         }));
  //       (gsap.to(oCircle.current, {
  //         attr: {
  //           r: outerRad
  //         },
  //         autoAlpha: 1,
  //         ease: "power3.out",
  //         duration: 0.3,
  //         delay: lastTextCursor.current ? 0.12 : 0
  //       }),
  //         gsap.to(iCircle.current, {
  //           attr: {
  //             r: innerRad
  //           },
  //           autoAlpha: 1,
  //           ease: "power3.out",
  //           duration: 0.3,
  //           delay: lastTextCursor.current ? 0.12 : 0
  //         }));
  //     } else {
  //       gsap.set(domEl.current, {
  //         autoAlpha: 1,
  //         delay: 0.1
  //       });
  //       const width =
  //         textWidth.current * cursorState.length +
  //         0.25 * textWidth.current * (cursorState.length - 1) +
  //         2 * textWidth.current;
  //       if (!lastTextCursor.current) {
  //         gsap.set(domEl.current, {
  //           width: outerRad,
  //           height: outerRad
  //         });

  //         gsap.set([oCircle.current, iCircle.current], {
  //           autoAlpha: 0,
  //           delay: 0.12
  //         });
  //         gsap.to(domEl.current, {
  //           duration: 0.3,

  //           height: 40,
  //           delay: 0.14,
  //           ease: "power3.out"
  //         });
  //       }
  //       gsap.to(domEl.current, {
  //         width: clamp(85, width, 120),
  //         delay: 0.14,
  //         duration: 0.3,
  //         ease: "power3.out"
  //       });
  //     }
  //     lastTextCursor.current = isTC;
  //   },
  //   { dependencies: [cursorState], scope: cursr }
  // );

  const setBaseCursorTheme = useCursor((l) => l.setBaseCursorTheme);
  const resetCursorTheme = useCursor((l) => l.resetCursorTheme);

  useEffect(() => {
    theme && (setBaseCursorTheme(theme), !navIsOpen && resetCursorTheme());
  }, [
    navIsOpen,
    resetCursorTheme,
    setBaseCursorTheme,
    theme,
    pageIsTransitioning
  ]);

  const [textMarq, setTextMarq] = useState(false);
  useEffect(() => {
    setTextMarq(Boolean(cursorState) && isTextCursor && marquee);
    setDirection((r) => (r === "ltr" ? "rtl" : "ltr"));
  }, [marquee, cursorState, isTextCursor]);

  return (
    <m.span
      className={cn("cursor rp__cursor", {
        text__cursor: isTextCursor,
        "show_cursor cursor-none": isEnabled
      })}
      style={{
        x: cursorXSpring,
        y: cursorYSpring,
        translateX: "-50%",
        translateY: "-50%"
      }}
      data-theme={cursorTheme}
      data-state={cursorState || "null"}
      ref={cursr}
      aria-hidden={!0}
    >
      <AnimatePresence mode="sync" propagate={true} initial={true}>
        {!isEnabled ? (
          <></>
        ) : (
          <>
            {(isTextCursor && (
              <m.span
                key={"wrap"}
                className={cn(
                  "pointer-events-none flex shrink-0 cursor-none flex-col items-center justify-center overflow-hidden outline-none",
                  "rounded-[8px] bg-nav-button/10 font-dots backdrop-blur-xs perspective-distant"
                )}
                style={{ width: containerWidth, height: containerHeight }}
                variants={textCursorVariants}
                data-themed="color, border-color, background-color, outline-color,box-shadow"
                initial="hidden"
                animate={"animate"}
                exit="hidden"
              >
                <m.span
                  data-themed="color, background-color"
                  className="pointer-events-none relative inline-block w-full origin-[50%_50%_0] text-center font-dots text-sm leading-none font-bold tracking-[0.05rem] whitespace-nowrap text-nav-foreground mix-blend-difference"
                  key={cursorState}
                  style={{
                    fontFeatureSettings: "normal",
                    fontVariationSettings: "normal"
                  }}
                  data-theme={cursorTheme}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    transition: {
                      type: "tween",
                      duration: 0.225,
                      ease: [0.55, 0.055, 0.675, 0.19],
                      delay: 0.15
                    }
                  }}
                  exit={{
                    opacity: 0,
                    transition: {
                      type: "tween",
                      duration: 0.25,
                      ease: [0.55, 0.055, 0.675, 0.19]
                    }
                  }}
                >
                  {textMarq ? (
                    <Marquee caption={cursorState || ""} />
                  ) : (
                    cursorState || <></>
                  )}
                </m.span>
              </m.span>
            )) || (
              <m.svg
                key={"not_text"}
                viewBox="0 0 100 100"
                style={{ backgroundColor: "transparent" }}
                className="absolute top-0 left-0 z-[999] h-full w-full cursor-none"
              >
                <m.circle
                  ref={oCircle}
                  className="inline bg-transparent fill-transparent stroke-nav-button transition-[stroke] duration-150 ease-out-power3 data-[FOCUS]:stroke-rouge-400"
                  cx={50}
                  cy={50}
                  r={outerRadius}
                  strokeWidth={1}
                  {...((cursorState === "FOCUS" || cursorState === "DRAG") && {
                    "data-focus": true
                  })}
                  variants={outerVariants}
                  initial={"hidden"}
                  animate={circleVariant}
                  style={{ stroke: strokeColor }}
                  exit={{
                    opacity: 0,
                    visibility: "hidden",
                    scale: 0,
                    transition: {
                      type: "tween",
                      delay: 0.1,
                      duration: 0.2,
                      ease: EASING.power3.out
                    }
                  }}
                  fill="transparent"
                />
                <m.circle
                  ref={iCircle}
                  className="inline stroke-0"
                  cx={50}
                  cy={50}
                  style={{
                    fill: strokeColor
                  }}
                  variants={innerVariants}
                  initial={"hidden"}
                  animate={circleVariant}
                  exit={"hidden"}
                  r={innerRadius}
                  strokeWidth={0}
                  data-themed="fill"
                />
              </m.svg>
            )}
          </>
        )}
      </AnimatePresence>
    </m.span>
  );
}
const Marquee = ({
  caption,

  reverse = false,
  className
}: {
  caption: string;

  reverse?: boolean;
  className?: string;
}) => {
  const variants: Record<"initial" | "animate" | "exit", Variant> =
    useMemo(() => {
      return {
        initial: {
          opacity: 0
        },
        animate: {
          opacity: 1,
          transition: {
            type: "tween",
            duration: 0.225,
            ease: [0.55, 0.055, 0.675, 0.19],
            delay: 0.15
          }
        },
        exit: {
          opacity: 0,
          transition: {
            type: "tween",
            duration: 0.25
          }
        }
      };
    }, []);
  const mqArr = useMemo(() => {
    return [...Array(Math.ceil(120 / (caption.length + 1)))];
  }, [caption]);
  return (
    <m.span
      className={cn(
        "absolute flex h-full items-center justify-start text-nowrap whitespace-nowrap will-change-transform",
        !reverse ? "marquee-horizontal-ltr" : "marquee-horizontal-rtl",
        className
      )}
    >
      {mqArr.map((_, idex) => (
        <m.span
          key={idex + caption}
          className={cn(
            "mr-[12px] inline-block flex-[0_0_auto] font-dots text-[1.2rem] font-bold uppercase"
          )}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{
            type: "tween",
            ease: [0.55, 0.055, 0.675, 0.19]
          }}
        >
          {caption}
        </m.span>
      ))}
    </m.span>
  );
};
