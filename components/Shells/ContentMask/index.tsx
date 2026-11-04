"use client";
import { TWEEN_EASE } from "src/constants/animations";
import { cn } from "src/lib/utils";
import { useRPStore } from "src/providers/RP_Pro";
import { motionCallback } from "src/utilities/motionHelpers";
import { useWindowResize } from "src/utilities/use_window_resize";
import { animate, AnimationSequence } from "motion";
import { useMotionValue } from "motion/react";
import * as m from "motion/react-m";
import {
  Fragment,
  ReactNode,
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef
} from "react";
import { useShallow } from "zustand/shallow";

export function ContentMask(l: { children: ReactNode }) {
  const windowResize = useWindowResize({ detectHeightChange: true });

  const canInteract = useRPStore(useShallow((l) => l.canInteract));
  const clipType = "content-mask-clipping",
    k = 1.8,
    { children: c } = l,
    svgRef = useRef<SVGSVGElement>(null!),
    rectRef = useRef<SVGRectElement>(null!),
    middlePositioningRef = useRef<HTMLDivElement>(null!),
    contentMaskRef = useRef<HTMLDivElement>(null!),
    contentRef = useRef<HTMLDivElement>(null!),
    isPreloader = useRPStore(useShallow((l) => l.isPreloader)),
    setIsPreloader = useRPStore((l) => l.setIsPreloader),
    setIsAnimatingOutPreloader = useRPStore(
      (l) => l.setIsAnimatingOutPreloader
    ),
    enablePreloaderAnimation = useRPStore((l) => l.enablePreloaderAnimation),
    // timelineRef = useRef<GSAPTimeline>(null),
    preloaderAnimationType = useRPStore(
      useShallow((l) => l.preloaderAnimationType)
    );
  const svgWidth = useMotionValue(1440);
  const svgHeight = useMotionValue(950);
  const rectWidth = useMotionValue(0);
  const rectHeight = useMotionValue(0);
  const rectX = useMotionValue(0);
  const rectY = useMotionValue(0);
  const rectRX = useMotionValue(0);
  const initializeDimensions = useEffectEvent(() => {
    svgWidth.set(window.innerWidth);
    svgHeight.set(window.innerHeight);
    document.documentElement.style.setProperty(
      "--vh",
      window.innerHeight * 0.01 + "px"
    );
  });
  useEffect(() => {
    initializeDimensions();
  }, [windowResize]);
  useLayoutEffect(() => {
    initializeDimensions();
  });
  // const setPositioningRectDimensions = useCallback(() => {
  //   if (
  //     !svgRef.current ||
  //     !rectRef.current ||
  //     !middlePositioningRef.current ||
  //     !contentMaskRef.current
  //   )
  //     return;
  //
  //   const c = middlePositioningRef.current.offsetHeight,
  //     h = middlePositioningRef.current.getBoundingClientRect().top;
  //   gsap.set(rectRef.current, {
  //     width: 0,
  //     height: c,
  //     attr: {
  //       y: h,
  //       x: 0.5 * window.innerWidth,
  //       rx: 0
  //     }
  //   });
  // }, []);
  const setPositioningRectDimensions = useEffectEvent(() => {
    if (
      !svgRef.current ||
      !rectRef.current ||
      !middlePositioningRef.current ||
      !contentMaskRef.current
    )
      return;

    const c = middlePositioningRef.current.offsetHeight,
      h = middlePositioningRef.current.getBoundingClientRect().top;
    rectWidth.set(0);
    rectHeight.set(c);
    rectY.set(h);
    rectX.set(0.5 * window.innerWidth);
    rectRX.set(0);
  });
  const setPreloaderAnimation = useCallback(() => {
    if (!middlePositioningRef.current) return;
    // (timelineRef.current && timelineRef.current.kill(),
    //   (timelineRef.current = gsap.timeline({
    //     onComplete: () => {
    //       setIsPreloader(!1);
    //     }
    //   })));
    const middle = middlePositioningRef.current;
    const d = middle.offsetWidth,
      { left } = middle.getBoundingClientRect();
    // "FAST" === preloaderAnimationType
    //   ? gsap.set(rectRef.current, {
    //       attr: {
    //         rx: 15
    //       }
    //     })
    //   : timelineRef.current.to(rectRef.current, {
    //       width: d,
    //       attr: {
    //         x: left,
    //         rx: 15
    //       },
    //       delay: 0.2,
    //       duration: 1,
    //       ease: "power3.inOut"
    //     });
    const sequence: AnimationSequence = [];
    const transition = {
      duration: 1,
      type: "tween" as const,
      ease: TWEEN_EASE.power3.inOut,
      delay: 0.2,
      at: 0
    };
    const dlay = "FAST" === preloaderAnimationType ? 0 : 3;
    if (preloaderAnimationType === "FAST") {
      rectRX.set(15);
    } else {
      sequence.push(
        [rectWidth, d, transition],
        [rectX, left, transition],
        [rectRX, 15, transition]
      );
    }
    sequence.push(
      [
        motionCallback(
          () => setIsAnimatingOutPreloader(false),
          () => setIsAnimatingOutPreloader(true)
        ),
        { duration: 0 }
      ],
      [
        rectWidth,
        window.innerWidth,
        {
          duration: k,
          ease: TWEEN_EASE.power3.inOut,
          delay: dlay,
          at: 0
        }
      ],
      [
        rectHeight,
        window.innerHeight,
        {
          duration: k,
          ease: TWEEN_EASE.power3.inOut,
          delay: dlay,
          at: 0
        }
      ],
      [
        rectY,
        0,
        {
          duration: k,
          ease: TWEEN_EASE.power3.inOut,
          delay: dlay,

          at: 0
        }
      ],
      [
        rectX,
        0,
        {
          duration: k,
          ease: TWEEN_EASE.power3.inOut,
          delay: dlay,
          at: 0
        }
      ],
      [
        rectRX,
        0,
        {
          duration: k,
          ease: TWEEN_EASE.power3.inOut,
          delay: dlay,
          at: 0
        }
      ],
      [
        motionCallback(() => {
          setIsAnimatingOutPreloader(false);
          setIsPreloader(false);
        }),
        {
          duration: 0
        }
      ]
    );
    animate(sequence);
    //
    // timelineRef.current.to(
    //   rectRef.current,
    //   {
    //     width: window.innerWidth,
    //     height: window.innerHeight,
    //     attr: {
    //       y: 0,
    //       x: 0,
    //       rx: 0
    //     },
    //     duration: k,
    //     ease: "power3.inOut",
    //     delay: "FAST" === preloaderAnimationType ? 0 : 3,
    //     onStart: () => {
    //       setIsAnimatingOutPreloader(!0);
    //     }
    //   },
    //   0
    // );
  }, [
    preloaderAnimationType,
    setIsPreloader,
    rectRX,
    rectWidth,
    rectX,
    rectHeight,
    rectY,
    setIsAnimatingOutPreloader
  ]);

  useEffect(() => {
    (setPositioningRectDimensions(),
      enablePreloaderAnimation && setPreloaderAnimation());
  }, [
    setPreloaderAnimation,
    windowResize,
    enablePreloaderAnimation,
    setPositioningRectDimensions
  ]);
  return (
    <Fragment>
      {isPreloader && (
        <div ref={middlePositioningRef} className="middlePositioning" />
      )}
      <m.div
        ref={contentMaskRef}
        className={cn("content-mask", { ["isPreloader"]: isPreloader })}
        style={isPreloader ? { clipPath: `url("#${clipType}")` } : undefined}
      >
        <div
          ref={contentRef}
          className={cn(
            "mask__content",
            canInteract ? "pointer-events-auto" : "pointer-events-none"
          )}
        >
          {c}
        </div>
        {isPreloader && (
          <m.svg
            ref={svgRef}
            style={{
              width: svgWidth,
              height: svgHeight
            }}
            className="svg-content"
          >
            <defs>
              <clipPath id={clipType}>
                <m.rect
                  className="rect"
                  ref={rectRef}
                  fill="white"
                  y={rectY}
                  x={rectX}
                  rx={rectRX}
                  width={rectWidth}
                  height={rectHeight}
                />
              </clipPath>
            </defs>
          </m.svg>
        )}
      </m.div>
    </Fragment>
  );
}
