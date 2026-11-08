"use client";

import { SPRING_EASE } from "@/constants/animations";
import { cn } from "@/lib/utils";
import { useCursor, useRPStore } from "@/providers/RP_Pro";
import {
  LayoutType,
  PageType,
  useVoyageur
} from "@/stores/Routing/RP_Voyageur";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { useLenis } from "lenis/react";
import {
  useDragControls,
  useMotionValue,
  useSpring,
  useTransform
} from "motion/react";
import * as m from "motion/react-m";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEventHandler
} from "react";

import { useDomCursor } from "@/components/core/cursorWrapper";
import { useWindowResize } from "@/utilities/use_window_resize";
import type Lenis from "lenis";
import { useShallow } from "zustand/shallow";

gsap.registerPlugin(MorphSVGPlugin);
export const ScrollIndicator = () => {
  const scrollerRef = useRef<HTMLDivElement>(null!);
  const pageIsTransitioning = useRPStore(
    useShallow((l) => l.pageIsTransitioning)
  );
  const setCursor = useCursor(useShallow((r) => r.setCursorState));
  const lastResize = useWindowResize({
    debounce: 100,
    detectHeightChange: true
  });
  const scrollTrack = useRef<HTMLDivElement>(null!);
  const dragControls = useDragControls();

  const navIsTransitioning = useRPStore(
    useShallow((r) => r.navIsTransitioning)
  );
  const navIsOpen = useRPStore(useShallow((r) => r.navIsOpen));

  const trackHeight = useRef(0);
  const lenis = useLenis();

  useEffect(() => {
    if (scrollTrack.current) {
      trackHeight.current = scrollTrack.current.clientHeight;
    }
  }, []);
  useEffect(() => {
    if (scrollTrack.current) {
      trackHeight.current = scrollTrack.current.clientHeight;
    }
  }, [lastResize]);
  const scrolle = useRef<HTMLDivElement>(null!);

  const scrollLocation = useMotionValue(0);

  const scrollYr = useSpring(scrollLocation, {
    stiffness: 1000,
    damping: 53,
    visualDuration: 0.1
  });

  const seekScroll = useCallback(
    (event: PointerEvent) => {
      const y = event.clientY;
      if (!lenis) return;
      const scrollPercent = y / window.innerHeight;
      const scrollValue = lenis.limit * scrollPercent;
      lenis.scrollTo(scrollValue, {
        immediate: true
      });
    },
    [lenis]
  );

  //     if (draggingRef.current) return;
  //     setCursor("FOCUS");
  //     setHovered(true);
  //     unSub.current && (unSub.current(), (unSub.current = null!));
  //     unSub.current = subscribe(
  //       (state) => state.mouseCoordinates,
  //       setBlobCoords
  //     );
  //   },
  //   [setBlobCoords, setHovered, setCursor, subscribe]
  // );
  const [trackk, setTrackk] = useState("idle");
  const [dragging, setDragging] = useState(false);
  const isDragging = useRef(dragging);
  useEffect(() => {
    isDragging.current = dragging;
    const tr = scrollerRef.current;

    setTrackk((r) =>
      dragging ? "dragging" : (r !== "dragging" && r) || "idle"
    );

    if (tr) {
      if (dragging) {
        tr.addEventListener("pointermove", seekScroll);
      } else {
        document.documentElement.removeAttribute("data-dragging");
        tr.removeEventListener("pointermove", seekScroll);
      }
    }
  }, [dragging, seekScroll]);
  const trackTO = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetScrollbar = useCallback(
    () => setTrackk((r) => (r !== "dragging" && "idle") || r),
    []
  );
  const lenisSync = useCallback(
    (e: Lenis) => {
      trackTO.current && clearTimeout(trackTO.current);

      setTrackk("active");
      const location = Math.min(
        e.progress * trackHeight.current,
        trackHeight.current - 60
      );
      scrollLocation.set(location);
      trackTO.current = setTimeout(resetScrollbar, 1000);
    },
    [scrollLocation, resetScrollbar]
  );
  useEffect(() => {
    if (!lenis) return;

    lenis.on("scroll", lenisSync);

    return () => {
      lenis.off("scroll", lenisSync);
      trackTO.current && clearTimeout(trackTO.current);

      trackTO.current = setTimeout(resetScrollbar, 1000);
    };
  }, [lenis, lenisSync, resetScrollbar]);

  const endDrag = useCallback(
    (e: PointerEvent) => {
      e.preventDefault();
      document.documentElement.removeAttribute("data-dragging");
      dragControls.stop();
      setDragging(false);
      setCursor(null);
    },
    [dragControls, setCursor]
  );
  const startDrag: PointerEventHandler = useCallback(
    (event) => {
      setDragging(true);
      dragControls.start(event, { snapToCursor: true });
      setCursor("DRAG");
      document.documentElement.setAttribute("data-dragging", "true");
      document.body.addEventListener("pointerup", endDrag, { once: true });
    },
    [dragControls, endDrag, setCursor]
  );
  const pageTransitionValue = useMotionValue(pageIsTransitioning);
  useEffect(() => {
    pageTransitionValue.set(pageIsTransitioning);
  }, [pageIsTransitioning, pageTransitionValue]);
  const _scrollScale = useTransform(() =>
    pageTransitionValue.get() ? 0 : 1 + 0
  );
  const scale = useSpring(_scrollScale, {
    ...SPRING_EASE.power4.inOut,
    visualDuration: 0.2
  });
  // useGSAP(() => {
  //   const tovalue = pageIsTransitioning ? 0 : 1;
  //   gsap.to(scrolle.current, {
  //     autoAlpha: tovalue,
  //     scaleY: tovalue,
  //     duration: 0.2,
  //     ease: "power4.inOut"
  //   });
  // }, [pageIsTransitioning]);

  const [show, setShow] = useState(true);
  const layoutType = useVoyageur((l) => l.layoutType);
  const pageTypeToShow = useMemo((): Partial<Record<PageType, boolean>> &
    Record<LayoutType, boolean | Partial<Record<PageType, boolean>>> => {
    return {
      archive: true,
      single: true,
      search: false,
      paginated: true,
      dynamic: true,
      account: false,
      "404": false,
      categories: true,
      albums: true,
      playlists: true,

      page: true
    };
  }, []);
  const setCursorTheme = useCursor((r) => r.setCursorTheme);
  const resetCursorTheme = useCursor((r) => r.resetCursorTheme);
  const setVisibility = useCallback(
    ({ layout, pageType }: { layout: LayoutType; pageType: PageType }) => {
      const pt0 = pageTypeToShow[pageType];
      const pt1 = pageTypeToShow[layout];
      if (typeof pt1 === "boolean") {
        typeof pt0 === "boolean" ? pt0 && pt1 : pt1;
      }
    },
    [pageTypeToShow]
  );
  useEffect(() => {
    setShow(
      !pageIsTransitioning &&
        !navIsTransitioning &&
        !navIsOpen &&
        layoutType === "page"
    );
  }, [pageIsTransitioning, navIsTransitioning, navIsOpen, layoutType]);
  const scrollbarVariants = useMemo(
    () => ({
      active: {
        opacity: 0.6,
        scale: 1
      },
      hovered: {
        opacity: 0.8,
        scale: 1.2
      },
      dragging: {
        scale: 1,
        opacity: 1
      },
      idle: {
        opacity: 0.1,
        scale: 1
      }
    }),
    []
  );
  const [trackVar, setTrackVar] = useState("idle");
  const trackEnter = useCallback(
    () => setTrackVar((r) => (r === "dragging" ? r : "hovered")),
    []
  );
  const trackLeave = useCallback(
    () => setTrackVar((r) => (r === "dragging" ? r : "idle")),
    []
  );
  const onEnter = useCallback(
    () => setTrackk((r) => (r === "dragging" ? r : "hovered")),
    []
  );
  const onLeave = useCallback(
    () => setTrackk((r) => (r === "dragging" ? r : "idle")),
    []
  );
  const leaveCondition = useCallback(() => {
    return isDragging.current ? "DRAG" : null;
  }, []);
  const { onMouseEnter, onMouseLeave } = useDomCursor({
    onEnter,
    onLeave,
    leaveCondition
  });
  return (
    <>
      {show && (
        <m.div
          key="scroller"
          className={cn(
            "scroll-indicator fixed top-2 right-0 bottom-2 z-300 flex w-16 justify-end bg-linear-to-r from-background/0 via-muted-faded-background/10 via-55% to-edge-black/50 transition-colors duration-150 ease-out-power2 not-data-[drag=true]:hover:animate-pulse md:bottom-[10px]"
          )}
          data-drag={dragging}
          variants={{
            default: {
              width: "40px"
            },
            dragging: {
              width: "15vw"
            }
          }}
          initial="default"
          animate={dragging ? "dragging" : "default"}
          exit="default"
          ref={scrollerRef}
          onPointerDown={startDrag}
        >
          <m.div
            initial={{ opacity: 0, x: "+100%" }}
            animate={dragging ? "active" : "default"}
            exit={{ opacity: 0, x: "+100%" }}
            whileHover={"active"}
            variants={{
              default: {
                opacity: 1,
                x: 0,

                borderColor: "oklch(from var(--faded-fg) l c h/0)"
              },
              active: {
                opacity: 1,
                x: 0,

                borderColor: "oklch(from var(--faded-fg) l c h/0.2)"
              }
            }}
            transition={{ duration: 0.2, ease: "easeInOut", type: "tween" }}
            key={`scroller-${show}`}
            className={cn(
              "scroll-indicator relative z-[300] flex h-full w-[10px] justify-center overflow-hidden border-x-[1px] border-y-0 border-solid border-faded-background/0"
            )}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            ref={scrollTrack}
          >
            <m.div
              ref={scrolle}
              dragListener={false}
              style={{
                y: scrollYr
              }}
              transition={{
                type: "spring",
                bounce: 0.25
              }}
              variants={scrollbarVariants}
              initial={"idle"}
              animate={trackk}
              exit={"idle"}
              className="outline-groove scroll-indicator absolute z-[251] h-[40px] w-[4px] rounded-[4px] bg-muted-faded-background outline-[1px] outline-muted-faded-foreground/10"
            />
          </m.div>
        </m.div>
      )}
    </>
  );
};

/****
 * <m.div
        onMouseEnter={() => setEnteredLeft(true)}
        onMouseLeave={() => setEnteredLeft(false)}
        initial={{ x: '-100px' }}
        animate={leftNotchVariants[variantState]}
        exit={leftNotchVariants['hidden']}
        className="fixed flex h-auto md:h-[calc(100vh-100px)] top-0 md:top-auto left-[-20px] bg-transparent bottom-0 md:bottom-[20px] z-[248]" style={{
          filter: 'url(#goo-effect)'
        }} >  <span className="fixed w-[4rem] z-[248] bottom-0 md:bottom-[1.35rem] -top-[10px] md:top-[2rem] h-auto md:h-full bg-nav-background -left-px md:left-[-2px]" />

          <m.div className="flex flex-col fixed gap-2.5 items-center justify-center bg-nav-background px-[10px] py-[25px] bottom-[54px] left-[13.5px] rounded-r-[12px] min-w-fit min-h-fit h-[140px] w-[48px] z-[248] lg:scale-115"

          >
            <span onClick={toggleOpen} onMouseEnter={handlers.onMouseEnter} onMouseLeave={handlers.onMouseLeave} style={{ writingMode: 'sideways-rl' }} className="text-nav-foreground text-[10px] font-bold">WORKS</span>
            <AnimatePresence initial={false} mode="sync">
              {hasRadio && <SoundBar />}
            </AnimatePresence>
 *         </m.div></m.div>    {/*<svg className="hidden" aria-hidden="true">  <defs>
 *
 *
 * */
