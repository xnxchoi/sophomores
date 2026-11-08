"use client";
import type { PortalFrameTransitions } from "@/components/UX/Transition";
import { TE } from "@/constants/animations";
import { NavEventsProvider } from "@/providers/Navigation/_client-nav-events";
import { HAStoreContext, useCursor, useRPStore } from "@/providers/RP_Pro";
import { CornerSide, FrameSide } from "@/stores/Frame_Ctrl";
import { createTransStore, type RPT } from "@/stores/RP_Ui";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "lenis/react";
import {
  animate,
  HTMLMotionProps,
  MotionValue,
  useMotionTemplate,
  useMotionValue,
  useTransform
} from "motion/react";
import * as m from "motion/react-m";
import { TransitionRouter } from "next-transition-router";
import {
  createContext,
  ReactNode,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

export type TransAPI = ReturnType<typeof createTransStore>;
export const TransContext = createContext<TransAPI | undefined>(undefined);
type LostRouteLeaveRun = {
  finished: Promise<unknown>;
  readyToNavigate: Promise<void>;
};

const scheduleTransitionWork = (work: () => void) => {
  requestAnimationFrame(() => {
    startTransition(work);
  });
};

const TransitionManager = ({ children }: { children: ReactNode }) => {
  const scroll = useLenis();
  gsap.registerPlugin(ScrollTrigger);
  const frameDir: Array<PortalFrameTransitions> = useMemo(
    () => ["top", "right", "bottom", "left"],
    []
  );
  const cornDir = useMemo(
    () => ({
      topleft: "M500 0H0V500C0 223.858 223.858 0 500 0Z",
      topright:
        "M500 500L500 4.19617e-05L1.90735e-05 -2.18557e-05C276.142 0.000249614 500 223.858 500 500Z",
      bottomright: "M0 500L500 500L500 0C500 276.142 276.142 500 0 500Z",
      bottomleft:
        "M-2.18557e-05 0L0 500L500 500C223.858 500 -9.78513e-06 276.142 -2.18557e-05 0Z"
    }),
    []
  );
  const cc = useMemo(
    () => Object.keys(cornDir).map((r) => r as CornerSide),
    [cornDir]
  );
  const setIsTransitioningWipe = useRPStore((r) => r.setIsTransitioningWipe);

  const isTransitioningWipe = useRPStore(
    useShallow((r) => r.isTransitioningWipe)
  );
  const transitionWipeRef = useRef(false);
  useEffect(() => {
    transitionWipeRef.current = isTransitioningWipe;
  }, [isTransitioningWipe]);

  const hasRun = useRef(false);
  const lenis = useLenis();

  const setTransitionOutType = useRPStore((r) => r.setTransitionOutType);
  const transitionOutType = useRPStore(
    useShallow((state) => state.transitionOutType)
  );
  const tro = useRef(transitionOutType);
  useEffect(() => {
    tro.current = transitionOutType;
  }, [transitionOutType]);
  const scrollRefresher = useCallback(() => {
    scroll && scroll.resize();
  }, [scroll]);
  const rpContainerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const navIsOpen = useRPStore((l) => l.navIsOpen);
  const setCursor = useCursor((r) => r.setCursorState);
  const resetCursorTheme = useCursor((r) => r.resetCursorTheme);
  const resetCursor = useCallback(
    () => (setCursor(null), resetCursorTheme()),
    [resetCursorTheme, setCursor]
  );
  const navisopref = useRef(navIsOpen);
  useEffect(() => {
    navisopref.current = navIsOpen;
  }, [navIsOpen]);

  // Synchronously mirror the values that `leaver()` reads. The Zustand `set()`
  // call inside the click handler fires listeners synchronously, so the refs
  // are correct BEFORE next-transition-router invokes `leaver`. Without this,
  // the existing useEffect-based mirrors only update after React's next render
  // commit, which is too late for the click that triggered them.
  const haStore = useContext(HAStoreContext);
  useEffect(() => {
    if (!haStore) return;
    const initial = haStore.getState();
    tro.current = initial.transitionOutType;
    navisopref.current = initial.navIsOpen;
    const unsubTro = haStore.subscribe(
      (s) => s.transitionOutType,
      (v) => {
        tro.current = v;
      }
    );
    const unsubNav = haStore.subscribe(
      (s) => s.navIsOpen,
      (v) => {
        navisopref.current = v;
      }
    );
    return () => {
      unsubTro();
      unsubNav();
    };
  }, [haStore]);
  const setCanInteract = useRPStore((r) => r.setCanInteract);
  const navOpeningElement = useRef<HTMLDivElement>(null!);
  const navElValue = useMotionValue<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!navOpeningElement.current) {
      const promi = async () => {
        const startTime = Date.now();
        const timeout = 5000; // 5 seconds timeout

        while (!document.getElementById("navWindow")) {
          if (Date.now() - startTime > timeout) {
            console.warn("navWindow element not found within timeout period");
            return;
          }
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        const r = document.getElementById("navWindow") as HTMLDivElement;
        navOpeningElement.current = r;
        navElValue.set(r);
      };
      promi();
    }
  }, []);
  const animationProgress = useMotionValue(0);
  const _svgScale = useTransform(animationProgress, [0, 1], [0, 1]);
  const _frameMoves = useTransform(animationProgress, [0, 1], [100, 0]);
  const _cornerX = useTransform(
    () => animationProgress.get() * (0.5 * window.innerWidth - 1)
  );
  const _cornerY = useTransform(
    () =>
      animationProgress.get() *
      ((navElValue.get()?.getBoundingClientRect()?.top ??
        window.innerHeight / 2) -
        1)
  );
  const _cornerTLX = useMotionTemplate`${_cornerX}`;
  const _cornerTLY = useMotionTemplate`${_cornerY}`;
  const _cornerTRX = useMotionTemplate`-${_cornerX}`;
  const _cornerTRY = useMotionTemplate`${_cornerY}`;
  const _cornerBRX = useMotionTemplate`-${_cornerX}`;
  const _cornerBRY = useMotionTemplate`-${_cornerY}`;
  const _cornerBLX = useMotionTemplate`${_cornerX}`;
  const _cornerBLY = useMotionTemplate`-${_cornerY}`;
  const _frameT = useMotionTemplate`-${_frameMoves}%`;
  const _frameR = useMotionTemplate`${_frameMoves}%`;
  const _frameB = useMotionTemplate`${_frameMoves}%`;
  const _frameL = useMotionTemplate`-${_frameMoves}%`;
  const _containerOp = useTransform(animationProgress, [0, 0.45], [1, 0]);
  const _containerVis = useTransform(() =>
    _containerOp.get() > 0 ? "visible" : "hidden"
  );

  const completeEntry = useCallback(() => {
    (window.scroll(0, 0),
      ScrollTrigger.refresh(),
      lenis &&
        lenis.scrollTo(0, {
          immediate: !0
        }),
      lenis && lenis.resize(),
      document.body.style.setProperty("pointer-events", "auto"));
    setCanInteract(true);
  }, [lenis, setCanInteract]);
  const completeExfil = useCallback(() => {
    setCanInteract(false);
    (window.scroll(0, 0),
      lenis &&
        lenis.scrollTo(0, {
          immediate: !0
        }));
  }, [lenis, setCanInteract]);

  // useEffect(() => {
  //   !animateIn.current &&
  //     (animateIn.current = (next: () => void) => {
  //       if (
  //         !frameRefs.current.length ||
  //         !cornerRefs.current.length ||
  //         !svgRefs.current.length ||
  //         !navOpeningElement.current ||
  //         !rpContainerRef.current
  //       ) {
  //         console.log("transition failed");
  //         return;
  //       }
  //       const seq: AnimationSequence = [];
  //       seq.push([
  //         rpContainerRef.current,
  //         {
  //           opacity: 1,
  //           visibility: "visible"
  //         },
  //         {
  //           duration: 0.3,
  //           ease: TE.power3.inOut,
  //           at: 0.1,
  //           type: "tween"
  //         }
  //       ]);
  //
  //       seq.push(
  //         ...frameRefs.current.map((l, c) => {
  //           let xMove: number | string = 0,
  //             yMove: number | string = 0;
  //           switch (c) {
  //             case 0:
  //               yMove = "-100%";
  //               break;
  //             case 1:
  //               xMove = "100%";
  //               break;
  //             case 2:
  //               yMove = "100%";
  //               break;
  //             case 3:
  //               xMove = "-100%";
  //           }
  //
  //           return [
  //             l,
  //             { x: xMove, y: yMove },
  //             {
  //               duration: 0.7,
  //               ease: TE.power3.inOut,
  //               at: 0.1,
  //               type: "tween"
  //             }
  //           ] satisfies Segment;
  //         })
  //       );
  //       seq.push(
  //         ...cornerRefs.current.map(
  //           (l) =>
  //             [
  //               l,
  //               {
  //                 x: 0,
  //                 y: 0
  //               },
  //               {
  //                 duration: 0.7,
  //                 ease: TE.power3.inOut,
  //                 type: "tween",
  //                 at: 0.1
  //               }
  //             ] satisfies Segment
  //         ),
  //         ...svgRefs.current.map(
  //           (l) =>
  //             [
  //               l,
  //               { scale: 1 },
  //               {
  //                 ease: TE.power3.inOut,
  //                 duration: 0.7,
  //                 at: 0.1,
  //                 type: "tween"
  //               }
  //             ] satisfies Segment
  //         ),
  //         [
  //           motionCallback(() => {
  //             completeEntry();
  //             next();
  //           }),
  //           {
  //             duration: 0
  //           }
  //         ]
  //       );
  //
  //       animate(seq);
  //     });
  //   !animateOut.current &&
  //     (animateOut.current = (next: () => void) => {
  //       if (
  //         !frameRefs.current.length ||
  //         !cornerRefs.current.length ||
  //         !svgRefs.current.length ||
  //         !navOpeningElement.current
  //       ) {
  //         console.log("transition failed");
  //         return;
  //       }
  //       const v = navOpeningElement.current.getBoundingClientRect().top;
  //       animate([
  //         ...frameRefs.current.map((l) => {
  //           return [
  //             l,
  //             {
  //               x: 0,
  //               y: 0
  //             },
  //             { duration: 0.7, ease: TE.power4.inOut, at: 0, type: "tween" }
  //           ] satisfies Segment;
  //         }),
  //
  //         ...cornerRefs.current.map((l, c) => {
  //           let d = 0;
  //           let p = 0;
  //           const m = 0.5 * window.innerWidth;
  //
  //           switch (c) {
  //             case 0:
  //               ((p = v - 1), (d = m - 1));
  //               break;
  //             case 1:
  //               ((p = v - 1), (d = -m + 1));
  //               break;
  //             case 2:
  //               ((d = -m + 1), (p = -v + 1));
  //               break;
  //             case 3:
  //               ((d = m - 1), (p = -v + 1));
  //           }
  //           return [
  //             l,
  //             {
  //               x: d,
  //               y: p
  //             },
  //             {
  //               duration: 0.7,
  //               ease: TE.power4.inOut,
  //               type: "tween",
  //               at: 0
  //             }
  //           ] satisfies Segment;
  //         }),
  //         ...svgRefs.current.map((l) => {
  //           return [
  //             l,
  //             {
  //               scale: 0
  //             },
  //             { duration: 0.7, ease: TE.power4.inOut, at: 0, type: "tween" }
  //           ] satisfies Segment;
  //         }),
  //         [
  //           motionCallback(() => {
  //             completeExfil();
  //             next();
  //           }),
  //           {
  //             duration: 0
  //           }
  //         ] satisfies Segment
  //       ]);
  //
  //       hasRun.current = true;
  //       setTimeout(() => {
  //         hasRun.current = false;
  //       }, 700);
  //     });
  // }, [completeExfil, completeEntry]);
  // const animateTransition = useCallback(
  //   (animateOut: boolean, onComplete?: () => void | Promise<void>) => {
  //     if (
  //       !frameRefs.current.length ||
  //       !cornerRefs.current.length ||
  //       !svgRefs.current.length ||
  //       !navOpeningElement.current
  //     ) {
  //       // console.log("transition failed");
  //       return;
  //     }
  //     const g = navOpeningElement.current.getBoundingClientRect(),
  //       v = g.top;
  //     frameRefs.current.forEach((l, c) => {
  //       if (!l) return;
  //       gsap.killTweensOf(l);
  //       let xMove: number | string = 0,
  //         yMove: number | string = 0;
  //       if (!animateOut) {
  //         switch (c) {
  //           case 0:
  //             yMove = "-100%";
  //             break;
  //           case 1:
  //             xMove = "100%";
  //             break;
  //           case 2:
  //             yMove = "100%";
  //             break;
  //           case 3:
  //             xMove = "-100%";
  //         }
  //       }
  //       gsap.to(l, {
  //         x: xMove,
  //         y: yMove,
  //         duration: 0.7,
  //         ease: animateOut ? "power4.inOut" : "power3.inOut",
  //         onComplete: () => {
  //           0 === c && onComplete && onComplete();
  //         }
  //       });
  //       gsap.killTweensOf(".rp-container");
  //       gsap.to(".rp-container", {
  //         autoAlpha: 1,
  //         duration: 0.3,
  //         ease: "power3.inOut",
  //         onStart: () => {
  //           // console.log("curtain here setting rp to visible");
  //         }
  //       });
  //     });
  //     cornerRefs.current.forEach((l, c) => {
  //       if (!l) return;
  //       gsap.killTweensOf(l);
  //       let d = 0;
  //       let p = 0;
  //       const m = 0.5 * window.innerWidth;
  //       if (animateOut) {
  //         switch (c) {
  //           case 0:
  //             ((p = v - 1), (d = m - 1));
  //             break;
  //           case 1:
  //             ((p = v - 1), (d = -m + 1));
  //             break;
  //           case 2:
  //             ((d = -m + 1), (p = -v + 1));
  //             break;
  //           case 3:
  //             ((d = m - 1), (p = -v + 1));
  //         }
  //       }
  //       gsap.to(l, {
  //         x: d,
  //         y: p,
  //         duration: 0.7,
  //         ease: animateOut ? "power4.inOut" : "power3.inOut"
  //       });
  //     });
  //     svgRefs.current.forEach((l) => {
  //       l &&
  //         (gsap.killTweensOf(l),
  //         gsap.to(l, {
  //           scale: animateOut ? 1 : 0,
  //           duration: 0.7,
  //           ease: animateOut ? "power4.inOut" : "power3.inOut"
  //         }));
  //     });
  //     if (!animateOut) {
  //       gsap.killTweensOf(".rp-container");
  //       gsap.to(".rp-container", {
  //         autoAlpha: 1,
  //         duration: 0.3,
  //         ease: "power3.inOut",
  //         onStart: () => {
  //           // console.log("curtain here setting rp to visible");
  //         }
  //       });
  //     }
  //   },
  //   []
  // );
  // const fadeInPage = useCallback(() => {
  //   gsap.killTweensOf(".rp-container");
  //   gsap.to(".rp-container", {
  //     autoAlpha: 1,
  //     duration: 0.3,
  //     ease: "power3.inOut",
  //     onStart: () => {
  //       // console.log("curtain here setting rp to visible");
  //     }
  //   });
  // }, []);
  const entry = useCallback(() => {
    return animate([
      [
        animationProgress,
        0,
        {
          duration: 0.4,
          ease: TE.power3.inOut,
          type: "tween"
        }
      ]
    ]);
  }, [animationProgress]);
  const exit = useCallback(() => {
    return animate([
      [
        animationProgress,
        1,
        {
          duration: 0.7,
          ease: TE.power4.inOut,
          at: 0,
          type: "tween"
        }
      ]
    ]);
  }, [animationProgress]);
  // const fire = useCallback(async () => {
  //   hasRun.current = true;

  //   await delay(50);

  //   animateTransition(true, completeExfil);
  // }, [animateTransition, completeExfil]);
  // useEffect(() => {
  //   if (transitionOutType !== null || !isTransitioningWipe || hasRun.current)
  //     return;
  //   fire();
  // }, [
  //   animateTransition,
  //   transitionOutType,
  //   isTransitioningWipe,
  //   fadeInPage,
  //   completeExfil,
  //   fire
  // ]);
  const scrollToTop = useCallback(() => window.scroll(0, 0), []);
  const runLostProductLeave = useCallback((): LostRouteLeaveRun => {
    const page = [
      '.rp-container [data-themed="background-color,color"].min-h-screen.w-screen > .relative.flex.min-h-screen',
      '.rp-container [data-themed="background-color,color"].min-h-screen.w-screen',
      ".rp-container .mask__content > .min-h-screen.w-screen",
      ".rp-container > [data-main]:not(.root)",
      ".rp-container > [data-lost-page]",
      ".rp-container > main.root",
      ".rp-container > main"
    ]
      .map((selector) => document.querySelector<HTMLElement>(selector))
      .find((node): node is HTMLElement => node !== null);
    if (!page) {
      return {
        finished: Promise.resolve(undefined),
        readyToNavigate: Promise.resolve()
      };
    }

    const startPath = window.location.pathname;
    const scrollY = window.scrollY || 0;
    const viewportOriginY = scrollY + window.innerHeight / 2;
    const fog = document.createElement("div");
    fog.setAttribute("aria-hidden", "true");
    fog.setAttribute("data-lost-route-fog", "true");
    document.body.appendChild(fog);
    const freezeStyles = [
      ["backface-visibility", "hidden"],
      ["border-radius", "4px"],
      ["height", `${Math.max(page.scrollHeight, window.innerHeight)}px`],
      ["left", "0px"],
      ["overflow", "hidden"],
      ["position", "fixed"],
      ["top", `${-scrollY}px`],
      ["transform-origin", `center ${viewportOriginY}px`],
      ["width", "100%"],
      ["will-change", "transform"]
    ] as const;
    const applyFreezeStyles = (node: HTMLElement) => {
      freezeStyles.forEach(([property, value]) => {
        node.style.setProperty(property, value, "important");
      });
    };
    const clearFreezeStyles = (node: HTMLElement) => {
      freezeStyles.forEach(([property]) => {
        node.style.removeProperty(property);
      });
    };

    applyFreezeStyles(page);
    document.body.dataset.lostRouteTransition = "leaving";

    const readyToNavigate = new Promise<void>((resolve) => {
      window.setTimeout(resolve, 860);
    });

    const pageScale = animate(
      page,
      {
        scale: 0.5,
        scaleX: 0.9
      },
      {
        duration: 0.86,
        ease: [0.6, 0, 0.3, 1],
        type: "tween"
      }
    );

    const waitForPathChange = new Promise<void>((resolve) => {
      const startedAt = performance.now();
      const checkPath = window.setInterval(() => {
        if (
          window.location.pathname !== startPath ||
          performance.now() - startedAt > 5000
        ) {
          window.clearInterval(checkPath);
          resolve();
        }
      }, 32);
    });
    let cleanupTimer = 0;
    let hardCleanupTimer = 0;
    let hasCleanedUp = false;
    const cleanup = () => {
      if (hasCleanedUp) return;
      hasCleanedUp = true;
      if (cleanupTimer) window.clearTimeout(cleanupTimer);
      if (hardCleanupTimer) window.clearTimeout(hardCleanupTimer);
      pageScale.stop();
      clearFreezeStyles(page);
      page.style.removeProperty("transform");
      fog.remove();
      document
        .querySelectorAll<HTMLElement>("[data-lost-entry-chrome]")
        .forEach((element) => {
          element.style.removeProperty("opacity");
          element.style.removeProperty("transform");
        });
      delete document.body.dataset.lostRouteTransition;
    };

    const finished = new Promise<void>((resolve) => {
      const finish = () => {
        cleanup();
        resolve();
      };
      hardCleanupTimer = window.setTimeout(finish, 7000);
      void waitForPathChange.then(() => {
        cleanupTimer = window.setTimeout(finish, 1800);
      });
    });

    void waitForPathChange.then(() => {
      window.setTimeout(() => {
        if (document.body.dataset.lostRouteTransition === "leaving") {
          document.body.dataset.lostRouteTransition = "restoring";
        }
        fog.setAttribute("data-lost-route-fog-state", "release");
      }, 900);
    });

    return {
      finished,
      readyToNavigate
    };
  }, []);
  const navOpenRef = useRef(navIsOpen);
  useEffect(() => {
    navOpenRef.current = navIsOpen;
  }, [navIsOpen]);
  // const indexToI = useCallback(
  //   (index: number) => {
  //     switch (index) {
  //       case 0:
  //         return {
  //           x: _cornerTLX,
  //           y: _cornerTLY
  //         };
  //       case 1:
  //         return {
  //           x: _cornerTRX,
  //           y: _cornerTRY
  //         };
  //       case 2:
  //         return {
  //           x: _cornerBRX,
  //           y: _cornerBRY
  //         };
  //       case 3:
  //         return {
  //           x: _cornerBLX,
  //           y: _cornerBLY
  //         };
  //     }
  //   },
  //   [
  //     _cornerTLX,
  //     _cornerTLY,
  //     _cornerTRX,
  //     _cornerTRY,
  //     _cornerBRX,
  //     _cornerBRY,
  //     _cornerBLX,
  //     _cornerBLY
  //   ]
  // );
  const indexToFrame = useCallback((index: number): FrameSide => {
    switch (index) {
      case 0:
        return "top";
      // return {
      //   x: 0,
      //   y: _frameT
      // };
      case 1:
        return "right";
      // return { x: _frameR, y: 0 };
      case 2:
        return "bottom";
      // return { x: 0, y: _frameB };
      case 3:
        return "left";
      // return { x: _frameL, y: 0 };
      default:
        throw new Error("Invalid index");
    }
  }, []);
  const leaver = useCallback(
    (next: () => void, from?: string, to?: string) => {
      const shouldRunWipe =
        tro.current === "CURTAIN" && !navisopref.current && !hasRun.current;
      const shouldRunLostProduct =
        tro.current === "LOST_PRODUCT" &&
        !navisopref.current &&
        !hasRun.current;
      if (shouldRunWipe) {
        hasRun.current = true;
        exit().then(() => {
          scheduleTransitionWork(() => {
            completeExfil();
            hasRun.current = false;
            next();
          });
        });
      } else if (shouldRunLostProduct) {
        hasRun.current = true;
        const transition = runLostProductLeave();
        transition.readyToNavigate.finally(() => {
          scheduleTransitionWork(() => {
            completeExfil();
            hasRun.current = false;
            next();
          });
        });
        void transition.finished;
      } else {
        scheduleTransitionWork(() => {
          completeExfil();
          next();
        });
      }
    },
    [exit, completeExfil, runLostProductLeave]
  );
  const enterer = useCallback(
    (next: () => void, from?: string, to?: string) => {
      const enteringTransition = tro.current;
      if (enteringTransition === "LOST_PRODUCT") {
        document.body.dataset.lostRouteTransition = "restoring";
      }
      entry().then(() => {
        scheduleTransitionWork(() => {
          next();
          completeEntry();
          setIsTransitioningWipe(false);
          if (enteringTransition === "LOST_PRODUCT") {
            window.setTimeout(() => {
              setTransitionOutType(null);
            }, 1520);
            return;
          }
          setTransitionOutType(null);
        });
      });
    },
    [entry, completeEntry, setIsTransitioningWipe, setTransitionOutType]
  );
  return (
    <TransitionRouter leave={leaver} enter={enterer}>
      <m.div
        className="rp-container"
        ref={rpContainerRef}
        data-themed={"background-color"}
        style={{
          opacity: _containerOp,
          visibility: _containerVis
        }}
      >
        {children}
      </m.div>
      <div ref={portalRef} className="pt_container">
        {frameDir.map((v, index) => (
          <Frame side={v} moveProgress={_frameMoves} key={v + "frame"} />
          // <m.div
          //   data-themed="background-color"
          //   className={`pt_mask pt_${v}`}
          //   key={v + "pt"}
          //   ref={(el) => {
          //     el && (frameRefs.current[index] = el);
          //   }}
          //   style={{
          //     ...indexToFrame(index)
          //   }}
          // />
        ))}
        {/*{cc.map(([key, value], index) => (*/}
        {cc.map((key, index) => (
          <Corner
            side={key}
            key={key + "corner"}
            cornerX={_cornerX}
            cornerY={_cornerY}
            svScale={_svgScale}
          />
          // <m.div
          //   className={`pt_cornerstones pt_${key}`}
          //   key={key + "corner"}
          //   ref={(el) => {
          //     el && (cornerRefs.current[index] = el);
          //   }}
          //   style={{
          //     ...indexToI(index)
          //   }}
          // >
          //   <m.div
          //     className="pt_cs_svg"
          //     ref={(el) => {
          //       el && (svgRefs.current[index] = el);
          //     }}
          //     style={{
          //       scale: _svgScale
          //     }}
          //   >
          //     <m.svg viewBox="0 0 500 500" fill="none">
          //       <m.path
          //         d={value}
          //         {...{
          //           fillRule: "evenodd",
          //           clipRule: "evenodd",
          //           fill: "currentColor",
          //           "data-themed": "fill,color"
          //         }}
          //       />
          //     </m.svg>
          //   </m.div>
          // </m.div>
        ))}
      </div>
    </TransitionRouter>
  );
};
const Corner = (
  props: HTMLMotionProps<"div"> & {
    cornerX: MotionValue<number>;
    cornerY: MotionValue<number>;

    svScale: MotionValue<number>;
    side: CornerSide;
  }
) => {
  const { cornerX, cornerY, svScale: scale, side, style, ...rest } = props;
  const pathDef = useMotionValue(
    side === "topleft"
      ? "M500 0H0V500C0 223.858 223.858 0 500 0Z"
      : side === "topright"
        ? "M500 500L500 4.19617e-05L1.90735e-05 -2.18557e-05C276.142 0.000249614 500 223.858 500 500Z"
        : side === "bottomright"
          ? "M0 500L500 500L500 0C500 276.142 276.142 500 0 500Z"
          : "M-2.18557e-05 0L0 500L500 500C223.858 500 -9.78513e-06 276.142 -2.18557e-05 0Z"
  );
  const _x = useTransform(() => {
    switch (side) {
      case "topleft":
      case "bottomleft":
        return cornerX.get();
      case "topright":
      case "bottomright":
        return -1 * cornerX.get();
    }
  });
  const _y = useTransform(() => {
    switch (side) {
      case "topleft":
      case "topright":
        return cornerY.get();
      case "bottomleft":
      case "bottomright":
        return -1 * cornerY.get();
    }
  });
  const x = useMotionTemplate`${_x}%`;
  const y = useMotionTemplate`${_y}%`;
  return (
    <m.div
      className={`pt_cornerstones pt_${side}`}
      style={{
        ...style,
        x,
        y
      }}
      {...rest}
    >
      <m.div
        className="pt_cs_svg"
        style={{
          scale
        }}
      >
        <m.svg viewBox="0 0 500 500" fill="none">
          <m.path
            d={pathDef}
            fillRule={"evenodd"}
            clipRule={"evenodd"}
            fill={"currentColor"}
            data-themed={"fill,color"}
          />
        </m.svg>
      </m.div>
    </m.div>
  );
};
const Frame = (
  props: HTMLMotionProps<"div"> & {
    side: FrameSide;
    moveProgress: MotionValue<number>;
  }
) => {
  const { side, style, moveProgress, ...rest } = props;
  const _x = useTransform(() => {
    switch (side) {
      case "top":
      case "bottom":
        return 0;
      case "left":
        return -1 * moveProgress.get();
      case "right":
        return moveProgress.get();
    }
  });
  const _y = useTransform(() => {
    switch (side) {
      case "top":
        return -1 * moveProgress.get();
      case "bottom":
        return moveProgress.get();
      case "left":
      case "right":
        return 0;
    }
  });
  const x = useMotionTemplate`${_x}%`;
  const y = useMotionTemplate`${_y}%`;

  return (
    <m.div
      data-themed="background-color"
      className={`pt_mask pt_${side}`}
      style={{
        ...style,
        x,
        y
      }}
      {...rest}
    />
  );
};
const TransContextProvider = ({ children }: { children: ReactNode }) => {
  const storeRef = useRef<TransAPI>(undefined);
  if (!storeRef.current) {
    storeRef.current = createTransStore();
  }
  return (
    <TransContext.Provider value={storeRef.current}>
      {children}
    </TransContext.Provider>
  );
};
export const TransitionProvider = ({ children }: { children: ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <TransContextProvider>
      {mounted ? (
        <TransitionManager>
          <NavEventsProvider>{children}</NavEventsProvider>
        </TransitionManager>
      ) : (
        children
      )}
    </TransContextProvider>
  );
};
export const useRPTransition = <T,>(selector: (store: RPT) => T): T => {
  const transContext = useContext(TransContext);
  if (!transContext) {
    throw new Error("useRPTransition must be used within TransProvider");
  }
  return useStore(transContext, selector);
};
