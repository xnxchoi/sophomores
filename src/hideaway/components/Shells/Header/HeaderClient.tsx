"use client";
import { CheckInButton } from "./CheckInButton";
import { Link } from "@/hideaway/components/core/Link/Link";
import { SearchBar } from "@/hideaway/components/UX/CommandKey/SearchBar";
import { DarkmodeButton } from "@/hideaway/components/UX/DarkMode/Darkmode";
import { UserDropdown } from "@/hideaway/components/UX/Dropdown/RPDropDown";
import { Mogo } from "@/hideaway/components/core/Logo";
import { MenuButton } from "@/hideaway/components/UX/Menu/MenuButton";
import { NotificationButton } from "@/hideaway/components/UX/NotificationButton/notificationButton";
import { EASING, SPRING_EASE, TWEEN_EASE } from "@/hideaway/constants/animations";
import { useRPSession } from "@/hideaway/lib/auth/session/RP_SessionProvider";
import { cn } from "@/lib/utils";
import { useHeaderTheme } from "@/hideaway/providers/HeaderTheme";
import { useIsMobile } from "@/hideaway/providers/MiddleMan";
import { useCursor, useFrameState, useRPStore } from "@/hideaway/providers/RP_Pro";
import { useTheme } from "@/hideaway/providers/Theme";
import { useVoyageur } from "@/hideaway/stores/Routing/RP_Voyageur";
import { delay } from "@/hideaway/utilities/rp_utils";
import { useWindowResize } from "@/hideaway/utilities/use_window_resize";
import { SignedIn } from "@/hideaway/components/auth";
import { useLenis } from "lenis/react";
import { animate, AnimationPlaybackControls, cancelFrame, frame } from "motion";
import {
  getHeaderScrollProgress,
  getNextHeaderScrubPosition
} from "./headerMotion";
import {
  AnimatePresence,
  HTMLMotionProps,
  MotionValue,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useTransform
} from "motion/react";
import * as m from "motion/react-m";
import { pathHidesHeaderByDefault } from "@/hideaway/components/Shells/Footer/footer-visibility";
import { usePathname } from "next/navigation";
import { useTransitionState } from "next-transition-router";
import React, {
  type ComponentRef,
  CSSProperties,
  MouseEventHandler,
  type ReactNode,
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { useShallow } from "zustand/shallow";

type VerticalDirection = "up" | "down";
type TransitionType =
  "animate-to-full" | "transition-wipe" | "animate-to-previous";
export const HeaderClient = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const hideHeader = pathHidesHeaderByDefault(pathname ?? "");
  const showHeader = useRPStore(useShallow((store) => store.showHeader));
  const setHeaderVisibility = useRPStore((store) => store.setHeaderVisibility);
  const _toutt = useRPStore(useShallow((store) => store.transitionOutType));
  const transitionOutType = useMotionValue(_toutt);
  const scrollValue = useMotionValue(0);
  useLenis((lenis) => {
    if (lenis.isScrolling) {
      scrollValue.set(lenis.scroll);
    }
  });
  useEffect(() => {
    transitionOutType.set(_toutt);
  }, [_toutt, transitionOutType]);
  const isPreloader = useRPStore(useShallow((store) => store.isPreloader));
  const theme = useTheme(useShallow((r) => r.theme));
  const [the, setTheme] = useState(theme);
  const themeValue = useMotionValue(theme);
  useEffect(() => {
    themeValue.set(theme);
  }, [theme, themeValue]);

  // scrubPosition is the single writable source of truth for scroll progress (0–1).
  // In scroll mode: set directly from lenis scroll events.
  // In transition mode: animated via Motion's animate().
  const scrubPosition = useMotionValue(0);

  const to = useRef<ReturnType<typeof setTimeout>>(null!);
  const [visible, setVisible] = useState(true);
  const visibleness = useMotionValue(visible);
  useEffect(() => {
    visibleness.set(visible);
  }, [visible, visibleness]);

  const { isMobile, isTouch } = useIsMobile();
  const mobileState = useMotionValue(isMobile);
  useEffect(() => {
    mobileState.set(isMobile);
  }, [mobileState, isMobile]);
  // Right-side cluster moves to the bottom Controlbar on touch-mobile.
  // Desktop-narrow (DevTools, keyboard-only) keeps the header actions —
  // hot-keys aren't taken away just because the viewport is small.
  const controlbarOwnsActions = isMobile && isTouch;
  const [toogled, setToogled] = useState(false);

  const docInnerRef = useRef<HTMLElement>(null!);
  const setupInnerListener = useEffectEvent(() => {
    const onEnter = () => setToogled(true);
    const onLeave = () => setToogled(false);

    const docInner = document.querySelector("#rp-header");
    if (docInner) {
      docInnerRef.current = docInner as HTMLElement;
      docInnerRef.current.addEventListener("mouseenter", onEnter);
      docInnerRef.current.addEventListener("mouseleave", onLeave);
    }
    return () => {
      if (docInnerRef.current) {
        docInnerRef.current.removeEventListener("mouseenter", onEnter);
        docInnerRef.current.removeEventListener("mouseleave", onLeave);
      }
    };
  });
  useLayoutEffect(() => {
    setupInnerListener();
  }, []);

  const navIsOpen = useRPStore(useShallow((store) => store.navIsOpen));
  const { left, top, bottom, right, navState } = useFrameState();
  const mainT = useTransform(() => top.get() * 0.5);
  const mainTop = useSpring(mainT, {
    visualDuration: 0.2,
    ...SPRING_EASE.power4.out
  });
  const gutter = useTransform(() => (mobileState.get() ? 16 : (20 as number)));

  const { headerTheme } = useHeaderTheme();
  const fxVisibility = useRPStore(useShallow((ll) => ll.showFXFrame));

  const [scrollDirection, setScrollDirection] =
    useState<VerticalDirection>("up");

  const [isScrolling, setScrolling] = useState(false);
  useLenis(({ isScrolling, direction }) => {
    setScrolling(!!isScrolling);
    setScrollDirection(direction > -1 ? "up" : "down");
  });
  const commandRef = useRef<ComponentRef<"button">>(null!);
  const user = useRPSession(useShallow((rr) => rr.id));

  const headerTransition = useRPStore(useShallow((ll) => ll.headerTransition));
  const transitionVariant = useMotionValue(headerTransition);
  useEffect(() => {
    transitionVariant.set(headerTransition);
  }, [headerTransition, transitionVariant]);

  const setHeaderTransition = useRPStore((ll) => ll.setHeaderTransition);
  const _tw = useRPStore(useShallow((ll) => ll.isTransitioningWipe));

  const isWipeTransition = useMotionValue(_tw);
  useEffect(() => {
    isWipeTransition.set(_tw);
  }, [_tw, isWipeTransition]);

  const _themeColour = useTransform(() => {
    const currentTheme = themeValue.get(),
      currentNav = navState.get();
    return currentTheme === "dark"
      ? currentNav
        ? 10.17
        : 97.5
      : currentNav
        ? 97.5
        : 10.17;
  });
  const themeColour = useMotionTemplate`oklch(${_themeColour}% 0.001 218.99)`;

  const tweenNumber = useRef(0);

  const getTweenPercentBasedOnScroll = useCallback(
    (lv: number) => getHeaderScrollProgress(lv),
    []
  );

  const animateOnScroll = useCallback(
    (lv: number) => {
      scrubPosition.set(getTweenPercentBasedOnScroll(lv));
    },
    [getTweenPercentBasedOnScroll, scrubPosition]
  );

  useEffect(() => {
    setTheme((headerTheme && headerTheme) || theme);
  }, [headerTheme, theme]);

  const _sectionTranslate = useTransform(() => {
    const isVisibility = visibleness.get(),
      tv = transitionVariant.get();
    return tv !== "slide" || isVisibility ? 0 : (100 as number);
  });

  const sectionTranslate = useSpring(_sectionTranslate, {
    visualDuration: 0.4,
    ...SPRING_EASE.power4.inOut
  });
  const innerTranslate = useMotionValue(0);
  const innerOpacity = useMotionValue(1);
  const _internalOpacity = useTransform(() => {
    const latestValue = transitionVariant.get();
    const vis = visibleness.get();
    return latestValue !== "fade" && latestValue !== "slide" && vis ? 0 + 1 : 0;
  });
  const internalOpacity = useSpring(_internalOpacity, {
    ...SPRING_EASE.power2.inOut,
    visualDuration: 0.3
  });
  const innerVisibility = useTransform<
    number,
    NonNullable<CSSProperties["visibility"]>
  >(() => (innerOpacity.get() > 0.2 ? "visible" : "hidden"));

  useMotionValueEvent(transitionVariant, "change", (latestValue) => {
    const iss = latestValue === "slide";
    const vis = visibleness.get();
    const ty = iss ? (vis ? 0 : -100) : 0;

    animate(innerTranslate, ty, {
      delay: iss ? 0.4 : 0,
      duration: iss ? 0.4 : 0.1,
      type: "tween",
      ease: TWEEN_EASE.power4.inOut
    });
  });

  const sectionY = useMotionTemplate`-${sectionTranslate}%`,
    scy = useTransform(() => {
      const scft = sectionTranslate.get(),
        mb = mobileState.get(),
        scb = scrubPosition.get();
      return scft < 0 ? scft : mb ? -50 : -25 - scb * 25;
    }),
    sectionCY = useMotionTemplate`translate(-50%,${scy}%)`;
  const sectionLX = useMotionTemplate`-${sectionTranslate}%`,
    sectionRX = useMotionTemplate`${sectionTranslate}%`;
  const innerY = useMotionTemplate`${innerTranslate}%`;

  const { stage } = useTransitionState();
  const clearPageTheme = useTheme((ll) => ll.clearPageTheme);
  const initiatedScroll = useRef(false);
  const reset = useVoyageur((ll) => ll.reset);
  const resetCursorTheme = useCursor((ll) => ll.resetCursorTheme);
  const setCursorState = useCursor((ll) => ll.setCursorState);
  useEffect(() => {
    setVisible(showHeader && fxVisibility);
  }, [fxVisibility, showHeader]);

  const headerTransitionDisabled = useMotionValue(false);
  const lastResize = useWindowResize({
    debounce: 50,
    detectHeightChange: true
  });
  const animateBye = useEffectEvent(async () => {
    await delay(50);
    clearPageTheme();
    reset();
    resetCursorTheme();
    setCursorState(null);
    to.current && clearTimeout(to.current);
    to.current = null!;
    // Navigation always resets scroll to 0, so reset the reference and animate
    // back to the expanded state. Without this, scrubPosition stays at the old
    // compacted value and jumps when the first scroll event fires.
    tweenNumber.current = 0;
    setHeaderTransition(null);
    setHeaderVisibility(true);
    haltScrollAnimation();
    runningAnimation.current?.stop();
    runningAnimation.current = animate(scrubPosition, 0, {
      duration: 0.96,
      type: "tween",
      ease: TWEEN_EASE.power3.inOut,
      onComplete: () => {
        runningAnimation.current = null;
        enableScrollAnimation();
      }
    });
  });
  useEffect(() => {
    if (stage === "leaving") {
      animateBye();
    }
  }, [stage]);

  const themeOK = useTransform(() => {
    const progress = scrubPosition.get();
    const isDark = themeValue.get() === "dark";
    const darkValue = 78.94,
      lightValue = 66.06;
    const [from, to]: [number, number] = isDark
      ? [darkValue, lightValue]
      : [lightValue, darkValue];
    return from + (from - to) * progress;
  });
  const _scrollToBtbgop = useTransform(scrubPosition, [0, 1], [0.25, 0.1]);
  const btbgop = useTransform(() =>
    navState.get() ? 0 : _scrollToBtbgop.get()
  );

  const btBackground = useMotionTemplate`oklch(${themeOK}% 0.008 176.48/${btbgop})`;
  const logoSize = useTransform(scrubPosition, [0.1, 0.3], [28, 22]);
  const fxInnerTop = useTransform(() => (navState.get() ? -top.get() : 0));
  const initialInnerLeft = useTransform(() =>
    navState.get() ? -left.get() : 0
  );
  const initialInnerRight = useTransform(() =>
    navState.get() ? -right.get() : 0
  );
  const ssss = useTransform(scrubPosition, [0, 0.4], [0, 1]);
  const innerLeft = useTransform(() => {
    const progress = ssss.get();
    return (1 - progress) * initialInnerLeft.get();
  });
  const innerRight = useTransform(() => {
    const progress = scrubPosition.get();
    return (1 - progress) * initialInnerRight.get();
  });
  const innerPX = useTransform(() => {
    const progress = ssss.get();
    const pxOrigin = mobileState.get() ? 24 : 36;
    return pxOrigin + progress * (gutter.get() - pxOrigin);
  });
  const innerPTop = useTransform(
    () => (1 - ssss.get()) * (mobileState.get() ? 0 : 14)
  );
  const _btBlur = useTransform(() => {
    const navOpen = navState.get(),
      progress = scrubPosition.get();
    return navOpen ? 0 : 4 + progress * 10;
  });
  const btBlur = useMotionTemplate`blur(${_btBlur}px)`;

  const mainY = useTransform(() => {
    const scrub = scrubPosition.get();
    return mobileState.get() ? 5 + 7 * scrub : scrub * 12;
  });
  const translate = useMotionTemplate`translate(-50%,${mainY}px)`;
  const paddingBottom = useTransform(() => {
    const scrub = scrubPosition.get();
    if (scrub < 0.5) {
      return scrub * 20;
    } else {
      return -20 * scrub + 20;
    }
  });
  const windowWidthValue = useMotionValue(0);

  const mainWidth = useTransform(() => {
    const progress = scrubPosition.get(),
      ww = windowWidthValue.get();
    const kw = mobileState.get() ? ww - 32 : 645;
    return ww + progress * (kw - ww);
  });
  const mainZIndex = useTransform(scrubPosition, [0, 1], [249, 245]);
  const _bsSpread = useTransform(() => 0.5 * scrubPosition.get()),
    _bsBlur = useTransform(() => 1.2 * scrubPosition.get()),
    _bsOKOp = useTransform(() => 0.7 * scrubPosition.get());
  const mainBS = useMotionTemplate`0 0 ${_bsSpread}px ${_bsBlur}px oklch(36.76% 0.003 58.67/${_bsOKOp})`;
  const mainBoxShadow = useTransform(() => {
    const progress = scrubPosition.get();
    const dark = progress > 0.3 && themeValue.get() === "dark";
    return dark ? mainBS.get() : "none";
  });

  // Track running animate-to-full animation so we can cancel it before starting a new one
  const runningAnimation = useRef<AnimationPlaybackControls | null>(null);

  const instantiator = useEffectEvent(() => {
    windowWidthValue.set(window.innerWidth);
    const target = getTweenPercentBasedOnScroll(tweenNumber.current);
    animate(scrubPosition, [0, target], {
      duration: 0.6,
      type: "tween",
      ease: TWEEN_EASE.power1.out
    });
  });
  useEffect(() => {
    instantiator();
  }, [lastResize]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null!);

  const enableScrollAnimation = useEffectEvent(() =>
    headerTransitionDisabled.set(false)
  );
  const haltScrollAnimation = useEffectEvent(() =>
    headerTransitionDisabled.set(true)
  );

  const setHeaderState = useEffectEvent(
    (transitionType: TransitionType, callback?: () => void) => {
      runningAnimation.current?.stop();
      runningAnimation.current = null;

      switch (transitionType) {
        case "transition-wipe":
          return;

        case "animate-to-full": {
          runningAnimation.current = animate(scrubPosition, 0, {
            duration: 0.96,
            type: "tween",
            ease: TWEEN_EASE.power3.inOut,
            onComplete: () => {
              runningAnimation.current = null;
              callback?.();
            }
          });
          return;
        }

        default: {
          // animate-to-previous: lerp scrubPosition back toward current scroll value
          callback?.();

          const stepScrubPosition = () => {
            scrubPosition.set(
              getNextHeaderScrubPosition({
                currentScrub: scrubPosition.get(),
                latestScroll: tweenNumber.current
              })
            );
          };
          frame.update(stepScrubPosition, true);
          setTimeout(() => cancelFrame(stepScrubPosition), 1000);
          return;
        }
      }
    }
  );

  useLenis((lenis) => {
    !initiatedScroll.current &&
      ((initiatedScroll.current = !0),
      lenis.on("scroll", (lv) => {
        if (!headerTransitionDisabled.get() && lv.animatedScroll) {
          const c = lv.animatedScroll;
          c > 50 ? (tweenNumber.current = c - 50) : (tweenNumber.current = 0);
          animateOnScroll(tweenNumber.current);
        }
      }));
  });

  const headerDone = useEffectEvent(() => {
    if (isWipeTransition.get()) {
      haltScrollAnimation();
      setHeaderState("transition-wipe", enableScrollAnimation);
      return;
    }
    if (navState.get()) {
      haltScrollAnimation();
      setHeaderState("animate-to-full");
      return;
    }
    if (typeof transitionOutType.get() === "string") {
      haltScrollAnimation();
      // Destination page starts at scroll 0; clear the cached scroll so the
      // follow-up `animate-to-previous` lerps to 0 instead of a stale target.
      tweenNumber.current = 0;
      setHeaderState("animate-to-full");
      setTimeout(enableScrollAnimation, 720);
      return;
    }

    setHeaderState("animate-to-previous", enableScrollAnimation);
  });
  const [lastTime, setLastTime] = useState(0);
  useMotionValueEvent(navState, "change", () => {
    setLastTime(performance.now());
  });
  useMotionValueEvent(transitionOutType, "change", () => {
    setLastTime(performance.now());
  });
  useMotionValueEvent(transitionVariant, "change", () => {
    setLastTime(performance.now());
  });
  useMotionValueEvent(isWipeTransition, "change", () => {
    setLastTime(performance.now());
  });
  useEffect(() => {
    timeoutRef.current && clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(headerDone, 20);
  }, [lastTime]);
  const onEnter: MouseEventHandler = useCallback(() => {
    to.current && clearTimeout(to.current);
    to.current = null!;
    to.current = setTimeout(() => {
      setVisible(true);
    }, 200);
  }, []);
  const onLeave: MouseEventHandler = useCallback(() => {
    to.current && clearTimeout(to.current);
    to.current = null!;
    to.current = setTimeout(() => {
      setVisible(false);
    }, 200);
  }, []);

  if (hideHeader) return null;

  return (
    <AnimatePresence>
      {!isPreloader && (
        <m.header
          key={"rp-header-client"}
          initial={{
            opacity: 0,
            visibility: "hidden"
          }}
          animate={{
            opacity: 1,
            visibility: "visible"
          }}
          exit={{
            opacity: 0,
            visibility: "hidden"
          }}
          data-theme={the}
          id="rp-header"
          className={cn(
            "fixed z-240 m-0 w-full overflow-hidden rounded-[100rem] p-0 shadow-none",
            {
              scrolling: isScrolling
            }
          )}
          data-scroll={scrollDirection}
          data-themed={"background-color,color.z-index"}
          style={{
            top: mainTop,
            zIndex: mainZIndex,
            width: mainWidth,
            transform: translate,
            paddingBottom,
            left: "50%",
            boxShadow: mainBoxShadow
          }}
          {...((!showHeader && {
            onMouseEnter: onEnter,
            onMouseLeave: onLeave
          }) ||
            {})}
        >
          {children}
          <AnimatePresence mode="sync" initial={false}>
            <FXs progressRate={ssss} fxVisibility={visible} />
          </AnimatePresence>
          <m.div
            key={"color-fx"}
            style={{
              opacity: scrubPosition
            }}
            className={
              "absolute top-0 left-0 z-1 h-full w-full bg-off-l-gray/35 opacity-[0.00001] dark:bg-faded-l-gray/35"
            }
          />
          <m.div
            key={"blur-fx"}
            style={{ opacity: scrubPosition }}
            className={
              "absolute top-0 left-0 z-2 h-full w-full opacity-[0.00001] backdrop-blur-[20px]"
            }
          />
          <m.div
            style={{
              y: innerY,
              opacity: innerOpacity,
              visibility: innerVisibility,
              paddingLeft: innerPX,
              paddingRight: innerPX,
              paddingTop: innerPTop,
              left: innerLeft,
              right: innerRight,
              paddingBottom: 0
            }}
            key={"section-header-container"}
            className="relative z-20 flex h-[4.8rem] items-center justify-between px-[36px] pt-[24px] pb-0 min-lg:h-[5.4rem]"
          >
            <m.div
              id="l-side"
              className="z-20"
              style={{
                opacity: internalOpacity,
                y: sectionY,
                x: sectionLX
              }}
            >
              <div className="flex">
                <MenuButton
                  style={{
                    backgroundColor: btBackground,
                    backdropFilter: btBlur,
                    color: themeColour
                  }}
                />
              </div>
            </m.div>
            <m.div
              style={{
                opacity: internalOpacity,
                transform: sectionCY,
                left: "50%",
                top: "50%"
              }}
              id="c-side"
            >
              <Link
                href="/home"
                aria-label={"Logo"}
                className="header-main__logo z-20"
                style={{
                  transform: "translate(-50%, 0%)"
                }}
              >
                <Mogo
                  style={{
                    width: logoSize,
                    height: logoSize,
                    color: themeColour
                  }}
                />
              </Link>
            </m.div>

            <m.div
              id="r-side"
              className={"z-20"}
              style={{
                opacity: internalOpacity,
                y: sectionY,
                x: sectionRX
              }}
            >
              <AnimatePresence mode="popLayout" propagate={true}>
                {!controlbarOwnsActions && (
                  <SignedIn key="signed-in">
                    {!isMobile && (
                      <NotificationButton
                        style={{
                          color: themeColour,
                          backgroundColor: btBackground,
                          backdropFilter: btBlur
                        }}
                      />
                    )}
                    <UserDropdown
                      style={{
                        color: themeColour,
                        backgroundColor: btBackground,
                        backdropFilter: btBlur
                      }}
                    />
                  </SignedIn>
                )}
                {!user && !controlbarOwnsActions && (
                  <CheckInButton
                    key="signed-out"
                    style={{
                      backgroundColor: btBackground,
                      backdropFilter: btBlur
                    }}
                  />
                )}
                {!isMobile && (
                  <SearchBar
                    key={"search-component"}
                    ref={commandRef}
                    style={{
                      color: themeColour,
                      backgroundColor: btBackground,
                      backdropFilter: btBlur
                    }}
                  />
                )}
                {!controlbarOwnsActions && (
                  <DarkmodeButton
                    key={"darkmode-component"}
                    style={{
                      color: themeColour,
                      backgroundColor: btBackground,
                      backdropFilter: btBlur
                    }}
                  />
                )}
              </AnimatePresence>
            </m.div>
          </m.div>
        </m.header>
      )}
    </AnimatePresence>
  );
};

const FXs = ({
  ref,
  className,
  progressRate,
  fxVisibility
}: {
  progressRate: MotionValue<number>;
  fxVisibility: boolean;
} & HTMLMotionProps<"div">) => {
  const bottom = useTransform(() => (progressRate.get() > 0.1 ? 0 : "auto"));
  const xValue = useTransform(() => progressRate.get() * 10);
  const top = useTransform(() => (10 * (progressRate.get() - 1)) ^ 2);
  const fx3Filter = useTransform(() => {
    const progress = progressRate.get();
    return `hue-rotate(0deg) brightness(100%) blur(${5 - 5 * progress}px) contrast(${500 - 400 * progress}%) saturate(${500 - 400 * progress}%)`;
  });
  const fx2Filter = useTransform(() => {
    const progress = progressRate.get();
    return `brightness(100%) blur(${5 - 5 * progress}px) contrast(${500 - 400 * progress}%) saturate(${1500 - 1400 * progress}%)`;
  });
  return (
    <m.div
      initial={{
        opacity: 0
      }}
      key={"fx-container"}
      animate={{
        opacity: 1
      }}
      exit={{
        opacity: 0
      }}
      transition={{
        duration: 0.2,
        ease: EASING.power2.out
      }}
      ref={ref}
      className={cn(
        "pointer-events-none fixed top-0 right-4 bottom-0 left-4 z-10 mx-auto",
        !fxVisibility && "opacity-0",
        className
      )}
      style={{
        left: xValue,
        top,
        right: xValue,
        bottom
      }}
    >
      <m.div
        data-themed={"background-color"}
        className="absolute top-[10px] bottom-auto z-[19] h-[80px] bg-[#ffffff03] mask-linear-from-[#000] mask-linear-to-[transparent] opacity-50 backdrop-blur-[5px] backdrop-contrast-500 backdrop-saturate-[1500%]"
      />
      <m.div
        data-themed={"background-color"}
        className="absolute top-[10px] bottom-auto z-[19] h-[60px] bg-[#ffffff03] mask-linear-from-[#000] mask-linear-to-[transparent] opacity-75 blur-[5px] contrast-[500%] hue-rotate-0 saturate-[1500%]"
        style={{
          filter: fx2Filter
        }}
      />
      <m.div
        data-themed={"background-color"}
        className="top-fx-bottom fixed inset-x-0 top-0 bottom-auto z-[10] hidden h-[50px] bg-[#ffffff03] mask-linear-from-[#000] mask-linear-to-[transparent] blur-[5px] contrast-[500%] saturate-[1500%]"
        style={{
          filter: fx3Filter
        }}
      />
    </m.div>
  );
};
