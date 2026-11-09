"use client";

import { useDomCursor } from "@/components/core/cursorWrapper";
import { MotionLink, useLinkPaths } from "@/components/core/Link/Link";
import { RPLinkPropsWithRef } from "@/components/core/Link/types";
import { useTransitionSetter } from "@/components/UX/Transition/useTransitionSetter";
import { EASING, TWEEN_EASE } from "@/constants/animations";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/providers/MiddleMan";
import {
  useCursor,
  useDeviceInfo,
  useFrameFactor,
  useFrameState,
  useMenu,
  useRPStore
} from "@/providers/RP_Pro";
import { useTheme } from "@/providers/Theme";
import { CornerSide, FrameSide } from "@/stores/Frame_Ctrl";

import { isInternalLink } from "@/utilities/isInternalLink";
import { motionCallback } from "@/utilities/motionHelpers";
import { useWindowResize } from "@/utilities/use_window_resize";
import { useLenis } from "lenis/react";
import { DateTime } from "luxon";
import { AnimationSequence } from "motion";
import {
  animate,
  AnimatePresence,
  type MotionValue,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type Variants
} from "motion/react";
import * as m from "motion/react-m";
import { Link as NextLink } from "next-transition-router";
import { usePathname } from "next/navigation";
import {
  ComponentProps,
  MouseEventHandler,
  SVGAttributes,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState
} from "react";
import { useShallow } from "zustand/shallow";

const B = "navWindow";
const LOST_BAG_FRAME_CLOSE_MS = 760;
const LOST_BAG_FRAME_REVEAL_MS = 680;
const LOST_BAG_FRAME_OVERLAP = "2px";
type LostBagFrameEvent = CustomEvent<{
  closeMs?: number;
  open: boolean;
  revealMs?: number;
}>;

export const RP_Menu = () => {
  const navIsOpen = useRPStore(useShallow((l) => l.navIsOpen));
  const { left: l, right: r, top: t, bottom: b, navState } = useFrameState();
  const { isMobile } = useIsMobile();
  const mobileState = useMotionValue(isMobile);
  useEffect(() => {
    mobileState.set(isMobile);
  }, [isMobile, mobileState]);
  const isAndroid = useDeviceInfo((r) => r.os.isAndroid);
  const androidState = useMotionValue(isAndroid);
  useEffect(() => {
    androidState.set(isAndroid);
  }, [isAndroid, androidState]);
  const frames: FrameSide[] = ["top", "right", "bottom", "left"];
  const keyedFrames = useRef<{ [x: string]: string }>({});
  const keyedCorners = useRef<{ [x: string]: string }>({});
  const keyedSvg = useRef<{ [x: string]: string }>({});
  const corners: CornerSide[] = [
    "topleft",
    "topright",
    "bottomright",
    "bottomleft"
  ];
  const corn = useMemo(
    () => ({
      mobile: {
        topright:
          // "M.07.01c50.62,2.79,51.7,3.82,56.01,56.12,0-.45,0-3.7,0-8.44,0-13.09.02-35.5-.01-47.69C40.43,0,14.98,0,0,0h.07Z",
          "M270 270V0H0c182.34 14.03 252.47 84.16 270 270",
        topleft:
          // "M56.07,0C41.09,0,15.65,0,.01,0,0,12.23,0,34.57,0,47.69c0,4.74,0,8,0,8.44C.92,3.75,2.1,2.82,56,.01h.07Z",
          "M270 0H0v270C14.03 87.66 84.16 17.53 270 0",
        bottomright:
          // "M0,56.13c14.99,0,40.42.01,56.06,0,.02-12.23.01-34.56.01-47.69,0-4.74,0-8,0-8.44C53.76,52.46,52.63,53.43.07,56.12h-.07Z",
          "M0 270h270V0C255.97 182.34 185.84 252.47 0 270",
        bottomleft:
          // "M0,0c.02,10.34-.01,29.22,0,40.94,0,8.72,0,15.31,0,15.18,2.85.03,7.55-.02,15.18,0,10.22,0,22.94,0,32.7,0,4.69,0,7.88,0,8.24,0,0,0,.05,0,0,0h-.3c-35.4-1.47-50.86,1.97-54.23-24.43C.39,22.32.28,10.22,0,.06v-.06Z"
          "M0 0v270h270C87.66 255.97 17.53 185.84 0 0"
      },
      desktop: {
        // topright: "M0,0q25.73,1.58,28.07,28.07V0H0Z",
        topright: "M270 270V0H0c182.34 14.03 252.47 84.16 270 270",
        topleft: "M270 0H0v270C14.03 87.66 84.16 17.53 270 0",

        // "M0,0v28.07h28.07Q.65,27.54,0,0Z",
        bottomleft: "M0 0v270h270C87.66 255.97 17.53 185.84 0 0",
        // bottomright: "M0,28.07h28.07V0Q26.73,26.54,0,28.07Z",
        bottomright: "M0 270h270V0C255.97 182.34 185.84 252.47 0 270"
        // topleft: "M28.07,0H0v28.07Q.65,1.58,28.07,0Z"
      }
    }),
    []
  );

  const _size = useTransform(() => (mobileState.get() ? 2 : (2.2 as number)));
  const size = useMotionTemplate`${_size}rem`;

  const activeIndexValue = useFrameFactor((r) => r.activeKey);
  const setNavOpeningElement = useRPStore((l) => l.setNavOpeningElement);
  /**
   * Ref Objects for Navigation Items
   *
   */
  const navigationList = useRef<HTMLUListElement>(null!);

  const navWindow = useRef<HTMLDivElement>(null!);
  /**
   *  Menu Frame ref Objects
   */
  const menuFrames = useRef<Array<HTMLDivElement>>([]);
  const menuCorners = useRef<Array<HTMLDivElement>>([]);
  const menuSVgs = useRef<Array<HTMLDivElement>>([]);
  const lostBagFrameStyles = useRef<
    Array<{ element: HTMLElement; style: string | null }>
  >([]);

  /**
   * Cursor Functions
   */
  const setCursorTheme = useCursor((l) => l.setCursorTheme);
  const resetCursorTheme = useCursor((l) => l.resetCursorTheme);
  /**
   *  Transition / UI Functions
   */

  const setNavIsTransitioning = useRPStore((l) => l.setNavIsTransitioning);
  const setNavIsOpen = useRPStore((l) => l.setNavIsOpen);
  const setNavIsOpenDebounced = useRPStore((l) => l.setNavIsOpenDebounced);
  const menuPageItemKeys = useRPStore(
    useShallow((l) => l.navigationPageItemKeys)
  );
  const lastAdjustRealTime = useMemo(() => DateTime.now().get("year"), []);

  const setNavItemHovered = useFrameFactor((r) => r.setFocusedKey);
  const menuWrap = useRef<HTMLDivElement>(null!);
  const pathVariants: Variants = useMemo(
    () => ({
      initial: {
        opacity: 0
      },
      animate: {
        opacity: 1
      },
      exit: {
        opacity: 0
      }
    }),
    []
  );
  const hoveredNavItemValue = useFrameFactor((r) => r.focusedKey);

  const activeTO = useRef<ReturnType<typeof setTimeout>>(null);
  useMotionValueEvent(hoveredNavItemValue, "change", (v) => {
    activeTO.current && clearTimeout(activeTO.current);
    activeTO.current =
      v === -1
        ? setTimeout(() => {
            setNavItemHovered(activeIndexValue.get());
          }, 400)
        : null;
  });

  const er = useRef(null),
    resizeTime = useWindowResize({ debounce: 100, detectHeightChange: true }),
    viewportEpoch = useMenu((s) => s.viewportEpoch),
    lastResize = useRef(0),
    sizeAdjust = useMotionValue(resizeTime);
  useEffect(() => {
    sizeAdjust.set(resizeTime);
  }, [resizeTime, sizeAdjust]);
  // Combined resize signal: any width/height change (incl. ones the local
  // useWindowResize hook gates out, e.g. mobile-chrome URL-bar) reaches us
  // through `viewportEpoch` from the centralized frame store.
  const resizeSignal = resizeTime + viewportEpoch;
  const focusResetTO = useRef<ReturnType<typeof setTimeout>>(null!);
  useEffect(() => {
    (focusResetTO.current && clearTimeout(focusResetTO.current),
      (focusResetTO.current = setTimeout(() => {
        setNavIsOpenDebounced(navIsOpen);
      }, 400)));
  }, [setNavIsOpenDebounced, navIsOpen]);

  const links = useRPStore(useShallow((r) => r.navigationPageItemData));

  const toggM = useEffectEvent(
    ({ needsResizing }: { needsResizing?: boolean }) => {
      if (!er.current || !navWindow.current) {
        return;
      }
      if (
        document.querySelector(".lost-commerce-root") &&
        (document.body.dataset.lostBagFrame === "open" ||
          document.body.dataset.lostBagFrame === "closing")
      ) {
        return;
      }
      const navo = navState.get();

      const top = t.get();
      const right = r.get();
      const bottom = b.get();
      const left = l.get();

      setNavIsTransitioning(!0);
      const navWClient = (
        navWindow.current as HTMLElement
      ).getBoundingClientRect();
      const windowHeight = (navWindow.current as HTMLElement).offsetHeight;
      const windowXOff = navWClient.left;
      const windowYOff = navWClient.top;
      const seq1: AnimationSequence = [];
      const seq2: AnimationSequence = [];
      menuFrames.current.forEach((frame, ind) => {
        if (!frame) {
          return;
        }
        let xOff: string | number = 0;
        let yOff: string | number = 0;
        const frameRect = frame.getBoundingClientRect();
        if (!navo) {
          switch (ind) {
            //top
            case 0:
              yOff = -frameRect.height + top;
              break;
            //right
            case 1:
              xOff = isMobile ? right - 3 : frame.offsetWidth - right;
              break;
            //bottom
            case 2:
              // yOff = isMobile && os.name === 'android' ? frame.offsetHeight : '100%'
              yOff = isMobile
                ? isAndroid
                  ? frameRect.height
                  : frameRect.height - 20
                : frameRect.height - bottom;
              break;
            //left
            case 3:
              xOff = isMobile ? -left + 3 : -frameRect.width + left;
          }
        }
        seq1.push([
          frame,
          {
            x: `${xOff}px`,
            y: `${yOff}px`,
            opacity: 1
          },
          {
            duration: needsResizing ? 0 : 1.2,
            ease: TWEEN_EASE[`power${navo ? 4 : 3}`].inOut,
            at: 0
          }
        ]);
      });
      menuCorners.current.forEach((corner, indx) => {
        let xoffse = 0;
        let yoffse = 0;
        if (!corner) {
          return;
        }
        if (!navo && isMobile && isAndroid) {
          const l = menuFrames.current[2];
          const c = l?.offsetHeight || 0;
          switch (indx) {
            case 2:
            case 3:
              yoffse = c - c / 1.5;
          }
        }
        switch (indx) {
          case 0:
            if (navo) {
              yoffse = windowYOff;
              xoffse = windowXOff;
            } else {
              yoffse = top;
              xoffse = left;
            }
            break;
          case 1:
            if (navo) {
              yoffse = windowYOff;
              xoffse = -windowXOff;
            } else {
              yoffse = top;
              xoffse = -right;
            }
            break;
          case 2:
            if (navo) {
              xoffse = -windowXOff;
              yoffse = isMobile
                ? -((window.innerHeight - (windowHeight + windowYOff)) * 1) + 1
                : -windowYOff;
            } else {
              yoffse = -bottom;
              xoffse = -right;
            }
            break;
          case 3:
            if (navo) {
              xoffse = windowXOff;
              yoffse = isMobile
                ? -((window.innerHeight - (windowHeight + windowYOff)) * 1) + 1
                : -windowYOff;
            } else {
              yoffse = -bottom;
              xoffse = left;
            }
        }

        seq1.push([
          corner,
          {
            x: `${xoffse}px`,
            y: `${yoffse}px`
          },
          {
            duration: needsResizing ? 0 : 1.2,
            ease: TWEEN_EASE[`power${navo ? 4 : 3}`].inOut,
            at: 0
          }
        ]);
      });
      menuSVgs.current.forEach((svg) => {
        if (svg) {
          seq2.push([
            svg,
            {
              transform: "translate(0,0)"
            },
            {
              type: "tween",
              duration: needsResizing ? 0 : 1.2,
              ease: TWEEN_EASE[`power${navo ? 4 : 3}`].inOut,
              at: 0
            }
          ]);
        }
      });
      const startLoc = isMobile ? 0 : -150;
      // seq2.push([
      //   navigationList.current,
      //   {
      //     x: navo ? 0 : `${startLoc}px`,
      //     visibility: navo ? "visible" : "hidden",
      //     opacity: navo ? 1 : 0
      //   },
      //   {
      //     type: "tween",
      //     duration: navo ? 1.2 : 1.2 * 0.75,
      //     ease: TWEEN_EASE.power3.out,
      //     at: 0,
      //     delay: navo ? 0.75 : 0
      //   }
      // ]);

      seq2.push(
        [
          er.current,
          {
            opacity: navo ? 1 : 0,
            visibility: navo ? "visible" : "hidden"
          },
          {
            delay: navo ? 0.5 : 0,
            duration: 1.2,
            at: 0
          }
        ],
        [
          motionCallback(
            () => {
              setNavIsTransitioning(false);
            },
            () => {
              setNavIsTransitioning(true);
            }
          )
        ]
      );
      animate(seq1);
      animate(seq2);
    }
  );

  const lastNavOpen = useRef(navIsOpen);

  const lenis = useLenis();
  useEffect(() => {
    lenis && lenis[navIsOpen ? "stop" : "start"]();
    document.body.classList[navIsOpen ? "add" : "remove"]("menu__open");
    const needsResizing =
      lastResize.current === 0 || lastResize.current !== resizeSignal;
    navState.set(navIsOpen);
    toggM({ needsResizing });
    if (lastNavOpen.current !== navIsOpen || needsResizing) {
      lastResize.current = resizeSignal;
    }
    lastNavOpen.current = navIsOpen;
    navIsOpen || setNavItemHovered(-1);
  }, [
    navIsOpen,
    navState,
    resizeSignal,
    isMobile,
    setNavItemHovered,
    lenis,
    isAndroid
  ]);

  // The nav window's own size can change without a `window.resize` (sticky
  // header collapse, font swap, content reflow). A ResizeObserver on the
  // element keeps the frame snap geometry in sync with the actual box.
  useEffect(() => {
    if (typeof ResizeObserver === "undefined" || !navWindow.current) return;
    let raf = 0;
    const tick = () => toggM({ needsResizing: true });
    const observer = new ResizeObserver(() => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    });
    observer.observe(navWindow.current);
    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const onMouseEnter = useCallback(() => {
    setCursorTheme("dark");
  }, [setCursorTheme]);
  const onMouseLeave = useCallback(() => {
    resetCursorTheme();
  }, [resetCursorTheme]);

  useEffect(() => {
    const captureLostBagStyles = () => {
      if (lostBagFrameStyles.current.length) return;
      lostBagFrameStyles.current = [
        ...menuFrames.current,
        ...menuCorners.current,
        ...menuSVgs.current
      ]
        .filter(Boolean)
        .map((element) => ({
          element,
          style: element.getAttribute("style")
        }));
    };
    const restoreLostBagStyles = () => {
      lostBagFrameStyles.current.forEach(({ element, style }) => {
        if (style === null) {
          element.removeAttribute("style");
          return;
        }
        element.setAttribute("style", style);
      });
      lostBagFrameStyles.current = [];
      document.body.dataset.lostBagFrame = "idle";
    };
    const resetCornersForLostBag = () => {
      menuCorners.current.forEach((corner) => {
        if (!corner) return;
        corner.style.opacity = "0";
        corner.style.pointerEvents = "none";
      });
      menuSVgs.current.forEach((svg) => {
        if (!svg) return;
        svg.style.transform = "scale(0)";
      });
    };
    const prepareFrame = (
      frame: HTMLDivElement | undefined,
      styles: Record<string, string>
    ) => {
      if (!frame) return;
      Object.assign(frame.style, styles);
      frame.style.opacity = "1";
      frame.style.outline = `${LOST_BAG_FRAME_OVERLAP} solid var(--n-s-bg)`;
      frame.style.pointerEvents = "none";
      frame.style.backgroundColor = "var(--n-s-bg)";
      frame.style.willChange = "transform";
    };
    const onLostBagFrame = (event: Event) => {
      if (!document.querySelector(".lost-commerce-root")) return;
      const detail = (event as LostBagFrameEvent).detail;
      const durationMs = detail.open
        ? (detail.revealMs ?? LOST_BAG_FRAME_REVEAL_MS)
        : (detail.closeMs ?? LOST_BAG_FRAME_CLOSE_MS);
      const transition = {
        duration: durationMs / 1000,
        ease: [0.6, 0, 0.3, 1] as const
      };
      const frameControls: Promise<unknown>[] = [];
      const animateFrame = (
        frame: HTMLDivElement | undefined,
        keyframes: Record<string, string | number>
      ) => {
        if (!frame) return;
        frameControls.push(animate(frame, keyframes, transition).finished);
      };

      if (detail.open) {
        captureLostBagStyles();
        document.body.dataset.lostBagFrame = "open";
        resetCornersForLostBag();
        prepareFrame(menuFrames.current[0], {
          bottom: "",
          height: `calc(var(--lost-bag-frame-y, 15svh) + ${LOST_BAG_FRAME_OVERLAP})`,
          left: `calc(-1 * ${LOST_BAG_FRAME_OVERLAP})`,
          right: "",
          top: "0",
          width: `calc(100% + (${LOST_BAG_FRAME_OVERLAP} * 2))`
        });
        prepareFrame(menuFrames.current[1], {
          bottom: `calc(-1 * ${LOST_BAG_FRAME_OVERLAP})`,
          height: "auto",
          left: "",
          right: `calc(-1 * ${LOST_BAG_FRAME_OVERLAP})`,
          top: `calc(-1 * ${LOST_BAG_FRAME_OVERLAP})`,
          width: `calc(var(--lost-bag-frame-right, 34.5vw) + ${LOST_BAG_FRAME_OVERLAP})`
        });
        prepareFrame(menuFrames.current[2], {
          bottom: "0",
          height: "auto",
          left: `calc(-1 * ${LOST_BAG_FRAME_OVERLAP})`,
          right: "",
          top: `calc(var(--lost-bag-frame-y, 15svh) + var(--lost-bag-frame-height, 62svh) - ${LOST_BAG_FRAME_OVERLAP})`,
          width: `calc(100% + (${LOST_BAG_FRAME_OVERLAP} * 2))`
        });
        prepareFrame(menuFrames.current[3], {
          bottom: `calc(-1 * ${LOST_BAG_FRAME_OVERLAP})`,
          height: "auto",
          left: `calc(-1 * ${LOST_BAG_FRAME_OVERLAP})`,
          right: "",
          top: `calc(-1 * ${LOST_BAG_FRAME_OVERLAP})`,
          width: `calc(var(--lost-bag-frame-x, 3.5vw) + ${LOST_BAG_FRAME_OVERLAP})`
        });
        animateFrame(menuFrames.current[0], { y: 0, opacity: 1 });
        animateFrame(menuFrames.current[1], { x: 0, opacity: 1 });
        animateFrame(menuFrames.current[2], { y: 0, opacity: 1 });
        animateFrame(menuFrames.current[3], { x: 0, opacity: 1 });
        return;
      }

      document.body.dataset.lostBagFrame = "closing";
      animateFrame(menuFrames.current[0], { y: "-100%" });
      animateFrame(menuFrames.current[1], { x: "100%" });
      animateFrame(menuFrames.current[2], { y: "100%" });
      animateFrame(menuFrames.current[3], { x: "-100%" });
      void Promise.all(frameControls).then(restoreLostBagStyles);
    };

    document.addEventListener("lost:bag-frame", onLostBagFrame);
    return () => {
      document.removeEventListener("lost:bag-frame", onLostBagFrame);
      restoreLostBagStyles();
    };
  }, []);

  return (
    <>
      <div
        ref={menuWrap}
        className={cn("menu__body", { menu__open: navIsOpen })}
      >
        <div
          className="menu__window-pos"
          ref={(el) => {
            el && ((navWindow.current = el), setNavOpeningElement(el));
          }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onClick={() => {
            setNavIsOpen(false);
            resetCursorTheme();
          }}
          id={B}
        />
        <nav className="menu__navigation">
          <AnimatePresence>
            {navIsOpen && (
              <m.ul
                className="menu__nav-items-list scroll__items"
                ref={navigationList}
                initial={{
                  opacity: 0,

                  x: "-150px"
                }}
                animate={{
                  opacity: 1,
                  visibility: "visible",
                  x: 0,
                  transition: {
                    delay: 0.75,
                    duration: 1.2,
                    type: "tween",
                    ease: TWEEN_EASE.power3.out
                  }
                }}
                exit={{
                  opacity: 0,
                  x: "-150px",
                  visibility: "hidden",
                  transition: {
                    type: "tween",
                    ease: TWEEN_EASE.power3.out,
                    duration: 0.9
                  }
                }}
                transition={{
                  type: "tween",
                  ease: TWEEN_EASE.power3.out
                }}
              >
                {links.map((l, index) => {
                  const theKey = menuPageItemKeys[index];
                  const href = l.link.url;
                  return (
                    <RP_Navigator
                      href={href}
                      key={theKey + `_${index}`}
                      theKey={theKey}
                    >
                      {l.link.label}
                    </RP_Navigator>
                  );
                })}
              </m.ul>
            )}
          </AnimatePresence>
        </nav>
        <div className="menu__noti-scroller">
          <div
            className="notifications__list"
            style={{ opacity: 0, visibility: "hidden" }}
          />
        </div>
        <p ref={er} className="menu__year" data-themed="color">
          {`\xa9${lastAdjustRealTime}`}
        </p>
        <div>
          {frames.map((frame, ind) => {
            return (
              <m.div
                className={cn("menu__frame", `frame-${frame}`)}
                id={`frame-${frame}`}
                ref={(el) => {
                  if (el) {
                    menuFrames.current[ind] = el;
                    keyedFrames.current[`${frame}`] = `frame-${frame}`;
                  }
                }}
                data-themed="background-color"
                key={`${frame + ind}`}
              />
            );
          })}
          {corners.map((corner, ind) => {
            return (
              <div
                className={cn(["menu__frame-corner", `corner-${corner}`])}
                ref={(el) => {
                  if (el) {
                    menuCorners.current[ind] = el;
                    keyedCorners.current[`${corner}`] = `corner-${corner}`;
                  }
                }}
                id={`corner-${corner}`}
                key={corner + "frame"}
              >
                <m.div
                  className="menu__corner-svg"
                  ref={(el) => {
                    if (el) {
                      menuSVgs.current[ind] = el;
                      keyedSvg.current[`${corner}`] = `svg-${corner}`;
                    }
                  }}
                  id={`svg-${corner}`}
                  style={{
                    position: "relative",
                    translate: "none",
                    rotate: "none",
                    scale: "none",
                    transform: "translate(0px, 0px)",
                    width: size,
                    height: size
                  }}
                >
                  <CornerStone
                    side={corner}
                    path={corn[isMobile ? "mobile" : "desktop"][corner]}
                    size={size}
                    viewbox={"0 0 270 270"}
                    pathVariants={pathVariants}
                  />
                </m.div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

const CornerStone = (
  props: {
    side: CornerSide;
    path: string;
    size: MotionValue<string>;
    viewbox: MotionValue<string> | string;
    pathVariants: Variants;
  } & SVGAttributes<SVGPathElement>
) => {
  const { side, path, size, viewbox, pathVariants } = props;

  const theme = useTheme((state) => state.theme);

  return (
    <m.svg
      id={`cs_${side}`}
      className={"absolute inset-0 inline-block"}
      viewBox={viewbox}
      style={{ width: size, height: size }}
      variants={{
        initial: {
          opacity: 0,
          visibility: "hidden"
        },
        animate: {
          opacity: 1,
          visibility: "visible",
          transition: {
            duration: 0.4,

            ease: "easeInOut",
            type: "tween"
          }
        },
        exit: {
          opacity: 0,
          visibility: "hidden",
          transition: {
            duration: 0.4,

            ease: "easeInOut",
            type: "tween"
          }
        }
      }}
      animate="animate"
      exit="exit"
    >
      <m.path
        d={path}
        data-themed={theme === "dark" ? "stroke,color" : "fill,color"}
        clipRule="evenodd"
        fillRule="evenodd"
        strokeWidth={theme === "dark" ? 1.2 : 0}
        stroke={
          theme === "dark" ? "oklch(from var(--n-s-bbg) l c h/.04)" : "none"
        }
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pathVariants}
        transition={{
          duration: 0.2,
          ease: EASING.power2.out,
          type: "tween"
        }}
      />
    </m.svg>
  );
};
const RP_Navigator = (
  props: Omit<
    ComponentProps<typeof MotionLink>,
    "onClick" | "onMouseEnter" | "onMouseLeave" | "href" | "children"
  > &
    Pick<
      RPLinkPropsWithRef,
      | "onClick"
      | "onMouseEnter"
      | "onMouseLeave"
      | "disabled"
      | "children"
      | "href"
    > & {
      theKey: string;
    }
) => {
  const {
    href,
    onClick,
    onMouseLeave: doML,
    onMouseEnter: doME,
    className,
    children,
    disabled = false,
    theKey,
    ...rest
  } = props;
  const lenis = useLenis();
  const currentPath = usePathname();
  const { isActivePath } = useLinkPaths({ href });

  const disabledRef = useRef(disabled);
  const { isMobile } = useIsMobile();
  const mobileState = useMotionValue(isMobile);
  useEffect(() => {
    mobileState.set(isMobile);
  }, [mobileState, isMobile]);
  const setNavItemHovered = useFrameFactor((r) => r.setFocusedKey);
  const setNavItemSelected = useFrameFactor((r) => r.setActiveKey);
  const activeNavItem = useFrameFactor((r) => r.activeKey);
  const focusedItem = useFrameFactor((r) => r.focusedKey);

  const isActivePage = useMotionValue(isActivePath);
  useEffect(() => {
    isActivePage.set(isActivePath);
  }, [isActivePath, isActivePage]);
  const handlePagePreviewMouseEnter = useCallback(() => {
    if (disabledRef.current) {
      return;
    }
    if (!isActivePage.get()) {
      setNavItemHovered(theKey);
    }
  }, [isActivePage, setNavItemHovered, theKey]);
  const translateX = useMotionValue(`-102%`);
  const opacity = useMotionValue(isActivePath ? 1 : 0.3);
  const setTransitionOutType = useRPStore((r) => r.setTransitionOutType);
  const setNavIsOpen = useRPStore((r) => r.setNavIsOpen);
  const setNavPageIsTransitioning = useRPStore(
    (r) => r.setNavigationPageIsTransitioning
  );
  const setCanInteract = useRPStore((r) => r.setCanInteract);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);
  const resetElements = useCallback(
    (op: number = 0.3) => {
      const comms = {
        type: "tween" as const,
        ease: TWEEN_EASE.power1.out,
        duration: 0.3,
        at: 0
      };

      animate([
        [translateX, "102%", comms],
        [opacity, op, comms]
      ]);
    },
    [opacity, translateX]
  );
  const resetElement = useCallback(
    (op: number = 0.3) => {
      const comms = {
        type: "tween" as const,
        ease: TWEEN_EASE.power1.out,
        duration: 0.3,
        at: 0
      };

      return [
        [translateX, "102%", comms],
        [opacity, op, comms]
      ] as AnimationSequence;
    },
    [opacity, translateX]
  );

  const currentlyFocused = useRef<-1 | string>(-1);
  const resetFrame = useCallback(() => {
    const hi = focusedItem.get(),
      ai = activeNavItem.get();
    const nothingIsActive = hi === -1 && ai === -1;
    const seq: AnimationSequence = [];
    if (ai !== currentlyFocused.current) {
      resetElements(nothingIsActive ? 1 : 0.3);
    }
    if (
      (hi !== -1 && hi === theKey) ||
      (hi === -1 && ai !== -1 && ai === theKey)
    ) {
      seq.push(
        [translateX, "-102%", { at: 0, duration: 0 }],
        [opacity, 0, { at: 0, duration: 0 }],
        [
          translateX,
          "0%",
          {
            duration: 0.6,
            at: 0,
            type: "tween",
            ease: TWEEN_EASE.power3.out
          }
        ],
        [
          opacity,
          1,

          {
            type: "tween",
            duration: 0.6,
            at: 0,
            ease: TWEEN_EASE.power3.out
          }
        ]
      );
    } else if (
      (hi !== -1 && hi !== theKey) ||
      (hi === -1 && ai !== -1 && ai !== theKey)
    ) {
      seq.push(...resetElement(0.3));
    }
    if (nothingIsActive) {
      seq.push(...resetElement(1));
    }

    seq.push([
      motionCallback(() => (currentlyFocused.current = activeNavItem.get())),
      {
        duration: 0
      }
    ]);
    animate(seq);
  }, [
    activeNavItem,
    focusedItem,
    opacity,
    resetElement,
    resetElements,
    theKey,
    translateX
  ]);
  const frameRsetTO = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => {
    frameRsetTO.current = setTimeout(resetFrame, 50);
  }, [resetFrame]);
  const setInitial = useEffectEvent(() => {
    const is = isActivePage.get();
    if (is) {
      frameRsetTO.current = setTimeout(() => setNavItemSelected(theKey), 150);
    }
  });
  useEffect(() => {
    setInitial();
  }, []);
  useMotionValueEvent(activeNavItem, "change", (v) => {
    frameRsetTO.current && clearTimeout(frameRsetTO.current);
    frameRsetTO.current = setTimeout(resetFrame, 50);
  });
  useMotionValueEvent(focusedItem, "change", (v) => {
    frameRsetTO.current && clearTimeout(frameRsetTO.current);
    const is = isActivePage.get();
    frameRsetTO.current =
      v === -1 && is
        ? setTimeout(() => setNavItemSelected(theKey), 400)
        : setTimeout(resetFrame, 50);
  });
  // Cauterization: Voyageur isHome is not imported.
  const isHome = currentPath === "/" || currentPath === "/home";
  useEffect(() => {
    setNavItemSelected(-1);
    (isHome && window.innerHeight > 590 && !isMobile) ||
      (isActivePath &&
        setTimeout(() => {
          setNavItemSelected(theKey);
        }, 400));
  }, [isActivePath, isHome, isMobile, setNavItemSelected, theKey]);
  const propsToPass = useMemo(() => {
    const toPass: Partial<ComponentProps<typeof MotionLink>> = {};
    if (!isInternalLink(href)) {
      toPass.target = "_blank";
      toPass.rel = "noreferrer";
    }
    return toPass;
  }, [href]);

  const { onMouseEnter, onMouseLeave } = useDomCursor<HTMLAnchorElement>({
    onEnter: (event) => {
      event.preventDefault();
      doME?.(event);
      handlePagePreviewMouseEnter();
    },
    onLeave: (event) => {
      doML?.(event);
      setNavItemHovered(null);
    },
    enterCondition: () =>
      disabledRef.current || isActivePage.get() ? null : "FOCUS"
  });

  const [isAnchor, setIsAnchor] = useState(false);
  useEffect(() => {
    setIsAnchor(href.startsWith("#") || href.startsWith(`${currentPath}#`));
  }, [href, currentPath]);
  const { setGenericPageTransition } = useTransitionSetter();
  const menuToPageCallback = useCallback(() => {
    (setNavItemSelected(theKey),
      setTransitionOutType("FROM_MENU"),
      setNavPageIsTransitioning(true));
    setTimeout(() => {
      setCanInteract(true);
      setNavIsOpen(!1);
      setTransitionOutType(null);
    }, 1200);
  }, [
    setCanInteract,
    setNavIsOpen,
    setNavItemSelected,
    setNavPageIsTransitioning,
    setTransitionOutType,
    theKey
  ]);
  const handleClick: MouseEventHandler<HTMLAnchorElement> = useCallback(
    (e) => {
      onClick?.(e);
      mobileState.get()
        ? (handlePagePreviewMouseEnter(),
          setTimeout(() => {
            menuToPageCallback();
          }, 300))
        : menuToPageCallback();
    },
    [onClick, mobileState, handlePagePreviewMouseEnter, menuToPageCallback]
  );
  if (!href || typeof href !== "string") {
    return <div className={className}>{props.children}</div>;
  }

  return (
    <m.li
      className="menu__nav-item"
      data-is-active={isActivePath}
      data-themed="color"
      style={{ opacity }}
    >
      <MotionLink
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={handleClick}
        className={cn(
          {
            link_hashLink: isAnchor
          },

          "button__scroll lift__button"
        )}
        {...rest}
        {...propsToPass}
        style={{
          opacity
        }}
        href={href}
      >
        {children}
      </MotionLink>
      <span className="menu__item-line-container">
        <m.span
          className="absolute top-0 left-0 h-full w-full bg-background"
          data-themed="background-color"
          style={{
            x: translateX
          }}
        />
      </span>
    </m.li>
  );
};
