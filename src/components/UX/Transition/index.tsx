"use client";
import { TE } from "@/constants/animations";
import { cn } from "@/lib/utils";
import { useMenu, useRPStore } from "@/providers/RP_Pro";
import { useTheme } from "@/providers/Theme";
import { Theme } from "@/providers/Theme/types";
import { useRPTransition } from "@/providers/TransitionProvider";
// Cauterization: Voyageur is not imported. Page types stay strings.
type FrontEndCollections = string;
type PageType = string;
const pageTypeToPublicPath = (pageType: string, slug: string) => {
  const encoded = slug.split("/").filter(Boolean).map((part) => encodeURIComponent(part)).join("/");
  return `/${[pageType === "pages" || pageType === "home" ? "" : pageType, encoded].filter(Boolean).join("/")}`;
};
import { useIsMobile } from "@/utilities/getBreakpoints";
import { consumeHydrationSafeInitial } from "@/utilities/pageTransitionInitial";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { HTMLMotionProps, useAnimate, useMotionValue } from "motion/react";
import * as m from "motion/react-m";
import { useTransitionRouter } from "next-transition-router";
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useShallow } from "zustand/react/shallow";

export type PageTransitionType =
  | "FADE"
  | "FROM_MENU"
  | "CURTAIN"
  | "LOST_PRODUCT"
  | "IMMEDIATE"
  | "SHELL";
/**
 * @description Information on the transition trigger.
 * @property origin - what caused the navigation, default null
 * if null, we consider the trigger to be user-driven - refresh, url entry, new tab link
 * "scroll" : when page has navigated via infinite scroll (not implemented)
 * "menu" : when navigation occurs with the menu open
 * "navigation" : when navigation occurs via browser's back/forward
 * "link" : when navigation occurs via a link (not sure if we need this, but just in case)
 *
 * @property target - the page type that is being navigated to
 * this should probably be extended to enhance usefullness
 * 1) collection: collection slug, default 'pages'
 * 2) type: this is where things get complicated
 * - Archive: group of page types applicable to all"content" type collections.
 *   This is the most "automated" type, where things get shown as they get posted.
 *      -Per-collection types:
 *          1) Single : page showing a single item of a collection... like a post, a page, etc
 *          2) List : paginated page showing a list of items from the collection
 *      - By subject:
 *          1) Categories
 *          2) Tags
 *          3) Search
 * - Featured: hand-selected articles..
 * - Account
 * - User
 *
 * - Other named single-pages?
 * 3) subtype (optional)
 * - for further narrowing of the type...
 * @example {origin:"link",target:"pages"}
 */
export type TransitionTrigger = {
  origin: "link" | "menu" | "scroll" | "navigation" | null;
  collection?: FrontEndCollections;
  target: PageType;
  subtype?: string;
};
const tz = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",

  overflow: "hidden"
};
const tU = {
  position: "relative",
  top: 0,
  left: 0,
  width: "100%",
  height: "auto",
  overflow: "visible"
};
const dlay = 0.7;
type PageTargets = [
  "users",
  "pages",
  "posts",
  "surf",
  "search",
  "account",
  "archive"
];

type PairwiseConcatWithReverse<
  Arr extends string[],
  Conn extends string,
  Result extends string = never
> = Arr extends [infer First extends string, ...infer Rest extends string[]]
  ? PairwiseConcatWithReverse<
      Rest,
      Conn,
      | Result
      | (Rest[number] extends string
          ? Uppercase<`${First}_${Conn}_${First}`>
          : never)
    >
  : Result;

type Transitions = PairwiseConcatWithReverse<PageTargets, "_TO_">;
type TransitionMap<Transitions> = {
  [K in Transitions as string]: {
    [T in "start" | "enter" | "exit"]: {
      [S: string]: any;
    };
  };
};
const _transMap: TransitionMap<Transitions> = {
  SEARCH_TO_USERS: {
    start: {
      ...tz,
      opacity: 0
    },
    enter: {
      ...tU,
      opacity: 1
    },
    exit: {
      ...tz,
      opacity: 0
    }
  }
};

export const transitionMappings: TransitionMap<Transitions> = {
  FADE: {
    start: {
      ...tz,
      opacity: 0
    },
    enter: {
      ...tU,
      opacity: 1,
      transition: {
        ease: "easeIn",
        duration: 0.3,
        delay: dlay
      }
    },
    exit: {
      ...tz,
      opacity: 0,
      transition: {
        delay: dlay,
        duration: 0.3,
        ease: "easeOut"
      }
    }
  },
  FROM_MENU: {
    start: {
      ...tz
    },
    enter: {
      ...tU,
      opacity: 1,
      transition: {
        duration: 0,
        delay: 0
      }
    },
    exit: {
      transition: {
        duration: 0,
        delay: 0
      }
    }
  },
  CURTAIN: {
    start: {
      ...tz
    },
    enter: {
      ...tU,
      opacity: 1,
      transition: {
        delay: 0,
        duration: 0
      }
    },
    exit: {
      opacity: 0,
      position: "relative",
      transition: {
        delay: 0,
        duration: 0
      }
    }
  },
  LOST_PRODUCT: {
    start: {
      ...tz,
      y: "100svh",
      zIndex: 0,
      borderRadius: "4px",
      overflow: "hidden"
    },
    enter: {
      ...tU,
      y: 0,
      opacity: 1,
      zIndex: 1,
      transition: {
        delay: 0,
        duration: 1.24,
        ease: [0.6, 0, 0.3, 1]
      }
    },
    exit: {
      ...tz,
      scale: 0.5,
      scaleX: 0.9,
      borderRadius: "4px",
      overflow: "hidden",
      opacity: 1,
      transition: {
        delay: 0,
        duration: 1.28,
        ease: [0.6, 0, 0.3, 1]
      }
    }
  },
  IMMEDIATE: {
    start: {},
    enter: {
      opacity: 1,
      transition: {
        delay: 0,
        duration: 0.1,
        ease: "easeIn"
      }
    },
    exit: {
      opacity: 0,
      transition: {
        delay: 0,
        duration: 0.1,
        ease: "easeOut"
      }
    }
  },
  SHELL: {
    start: {},
    enter: {
      opacity: 1,
      transition: {
        duration: 0
      }
    },
    exit: {
      opacity: 1,
      transition: {
        duration: 0
      }
    }
  }
};
export const getPageTransitionVariants = (l: PageTransitionType) => {
  let c: any = transitionMappings.FADE;
  return (
    l === "FROM_MENU" && (c = transitionMappings.FROM_MENU),
    l === "CURTAIN" && (c = transitionMappings.CURTAIN),
    l === "LOST_PRODUCT" && (c = transitionMappings.LOST_PRODUCT),
    l === "IMMEDIATE" && (c = transitionMappings.IMMEDIATE),
    l === "SHELL" && (c = transitionMappings.SHELL),
    c
  );
};
export type PortalFrameTransitions = "top" | "bottom" | "right" | "left";
export const portalFrameTransitions: Map<
  PortalFrameTransitions,
  { x: string; y: string }
> = new Map([
  ["top", { x: "0", y: "-100%" }],
  ["bottom", { x: "0", y: "100%" }],
  ["right", { x: "100%", y: "0" }],
  ["left", { x: "-100% ", y: "0" }]
]);

export const PageRedirect = ({
  pageType,
  slug,
  message = "Redirecting..."
}: {
  pageType: PageType;
  slug: string;
  message?: string;
}) => {
  const toR = useRef<ReturnType<typeof setTimeout>>(null!);
  const setPageIsTransitioning = useRPStore((l) => l.setPageIsTransitioning);
  const router = useTransitionRouter();
  return (
    <m.div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-15 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, zIndex: 1000 }}
      exit={{ opacity: 0, zIndex: 0 }}
      onAnimationStart={() => {
        (toR.current && clearTimeout(toR.current),
          (toR.current = setTimeout(() => {
            router.push(pageTypeToPublicPath(pageType, slug));
          }, 50)));
      }}
      onAnimationComplete={() => {
        setPageIsTransitioning(false);
      }}
      transition={{ type: "tween", duration: 0.5, ease: "easeInOut" }}
    >
      <m.div
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          transition: {
            type: "tween",
            duration: 0.3,
            delay: 0.2,
            ease: "easeInOut"
          }
        }}
        className="text-2xl font-bold text-white"
      >
        {message}
      </m.div>
    </m.div>
  );
};
export type TransitionWrapperProps = {
  type: PageType;
  slug: string[];
  className?: string;
  internalClassName?: string;
  children: ReactNode;
  headerVisibility?: boolean;
  theme?: Theme | null;
} & HTMLMotionProps<"div">;
// Main PageTransition Component
export const RPage = (props: TransitionWrapperProps) => {
  // Cauterization: useVoyageur setPage is not imported.
  return <TransitionInternal {...props} />;
};
const TransitionInternal = (props: TransitionWrapperProps) => {
  const {
    children,
    internalClassName,
    className,
    headerVisibility = true,
    theme,
    ref: pageRef
  } = props;
  const pathname = usePathname();
  const hydrationSafeInitial = consumeHydrationSafeInitial(pathname);

  const navIsOpen = useRPStore(useShallow((l) => l.navIsOpen));
  const setPageTheme = useTheme((r) => r.setPageTheme);
  const transitionOutType = useRPStore(useShallow((l) => l.transitionOutType));
  const setCurrentStep = useRPTransition((l) => l.setCurrentStep);
  const pageIsTransitioning = useRPStore(
    useShallow((l) => l.pageIsTransitioning)
  );
  const lenis = useLenis(),
    { isMobile } = useIsMobile();
  useEffect(() => {
    Array.from(
      document.querySelectorAll('head > link[rel="stylesheet"][data-n-p]')
    ).forEach((l) => {
      l.removeAttribute("data-n-p");
    });
    const l = new MutationObserver((l) => {
      l.forEach((l) => {
        const c = l.target;
        c.nodeName === "STYLE" &&
          (c as HTMLElement).getAttribute("media") === "x" &&
          (c as HTMLElement).removeAttribute("media");
      });
    });
    return (
      l.observe(document.head, {
        subtree: !0,
        attributeFilter: ["media"]
      }),
      () => {
        l.disconnect();
      }
    );
  }, []);

  // useEffect(() => {
  //   timeOutRef.current && clearTimeout(timeOutRef.current),
  //     navigationPageItemSelected !== -1 && setCurrentKey(navigationPageItemSelected),
  //     (timeOutRef.current = setTimeout(() => {
  //       setCurrentKey(navigationPageItemSelected)
  //     }, 1400))
  // }, [navigationPageItemSelected])

  const navOpeningElement = useRPStore(useShallow((l) => l.navOpeningElement));

  const [scaled, setScaled] = useState(1.1);
  const transitionMa = useRPTransition(
    useShallow((r) => r.transitionAnimations)
  );
  const transitionMap = useMemo(() => transitionMa, [transitionMa]);
  const transitionArray = useRef(
    Object.keys(transitionMap) as PageTransitionType[]
  );
  const [currentVariants, setCurrentVariants] = useState(
    transitionMap[transitionOutType || "FADE"]
  );
  const viewportEpoch = useMenu((s) => s.viewportEpoch);
  useEffect(() => {
    if (navOpeningElement) {
      setScaled(1.1 * (navOpeningElement.offsetHeight / window.innerHeight));
    }
  }, [navOpeningElement, viewportEpoch]);
  const isSidebarOpen = useRPStore(useShallow((r) => r.sidebarOpen));
  useEffect(() => {
    setCurrentVariants(
      (!!transitionOutType &&
        transitionMap[transitionOutType as PageTransitionType]) ||
        transitionMap["FADE"]
    );
  }, [transitionMap, transitionOutType]);
  // useGSAP(
  //   () => {
  //     if (typeof ref !== "object" || !ref || !lenis || !ref.current) return;
  //     gsap.killTweensOf(ref.current);
  //     ref.current.style.removeProperty("transform");
  //     let scaleDown = scaled * 0.95;
  //     let scaledScrollY = (1 - scaleDown) * (lenis.scroll - lenis.limit / 2);
  //     isMobile && ((scaledScrollY = 0), (scaleDown = 1));
  //     gsap.to(ref.current, {
  //       y: isSidebarOpen ? scaledScrollY : 0,
  //       scale: isSidebarOpen ? scaleDown : 1,
  //       ease: "power3.in",
  //       duration: 0.6,
  //       onComplete: () => {
  //         !isSidebarOpen &&
  //           !navIsOpen &&
  //           gsap.to(ref.current, { delay: 0.4, clearProps: "transform" });
  //       }
  //     });
  //   },
  //   { dependencies: [] }
  // );

  const nsH = useMotionValue(1.1);
  useEffect(() => {
    if (!navOpeningElement || typeof window === "undefined") return;
    const apply = () => {
      const vh = window.innerHeight || 1;
      nsH.set(navOpeningElement.offsetHeight / vh);
    };
    apply();
    if (typeof ResizeObserver === "undefined") return;
    let raf = 0;
    const observer = new ResizeObserver(() => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    });
    observer.observe(navOpeningElement);
    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [navOpeningElement, nsH, viewportEpoch]);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const baseConfig = useMemo(
    () => ({
      type: "tween" as const,
      ease: TE.power3.inOut
    }),
    []
  );
  const [ref, animate] = useAnimate<HTMLDivElement>();
  const lastSideBar = useRef(isSidebarOpen);
  useEffect(() => {
    if (!lenis || !ref.current) return;
    const liveRatio =
      navOpeningElement && window.innerHeight
        ? navOpeningElement.offsetHeight / window.innerHeight
        : nsH.get();
    const scaleVal = isMobile
      ? 1
      : navIsOpen
        ? 1.1 * liveRatio
        : isSidebarOpen
          ? 0.9
          : 1;
    const yval =
      isMobile || navIsOpen
        ? 0
        : (1 - scaleVal) * (lenis.scroll - lenis.limit / 2);

    animate(
      ref.current,
      {
        y: yval,
        scale: scaleVal
      },
      {
        ...baseConfig,
        duration:
          lastSideBar.current !== isSidebarOpen
            ? isSidebarOpen
              ? 0.8
              : 0.4
            : 1.2
      }
    );
    lastSideBar.current = isSidebarOpen;
  }, [
    baseConfig,
    isMobile,
    isSidebarOpen,
    lenis,
    nsH,
    navIsOpen,
    ref,
    animate,
    navOpeningElement,
    viewportEpoch
  ]);
  // useGSAP(
  //   () => {
  //     if (typeof ref !== "object" || !ref || !lenis || !ref.current) return;
  //     gsap.killTweensOf(ref.current);
  //     ref.current.style.removeProperty("transform");
  //     let scaleDown = scaled;
  //     let scaledScrollY = (1 - scaleDown) * (lenis.scroll - lenis.limit / 2);
  //     isMobile && ((scaledScrollY = 0), (scaleDown = 1));
  //     gsap.to(ref.current, {
  //       y: navIsOpen ? scaledScrollY : 0,
  //       scale: navIsOpen ? scaleDown : 1,
  //       ease: "power3.inOut",
  //       duration: 1.2,
  //       onComplete: () => {
  //         !navIsOpen &&
  //           gsap.to(ref.current, { delay: 0.4, clearProps: "transform" });
  //       }
  //     });
  //   },
  //   { dependencies: [navIsOpen] }
  // );
  const setHeaderVisibility = useRPStore((l) => l.setHeaderVisibility);
  const clearPageTheme = useTheme((r) => r.clearPageTheme);
  const onComplete = useCallback(
    (headerVisible: boolean = true, theme?: Theme | null) => {
      setHeaderVisibility(headerVisible);
      if (theme === null) clearPageTheme();
      else if (theme) setPageTheme(theme, true);
    },
    [clearPageTheme, setHeaderVisibility, setPageTheme]
  );

  return (
    <m.div
      key="navigation"
      initial={hydrationSafeInitial ? false : "none"}
      animate="entering"
      exit="leaving"
      suppressHydrationWarning
      data-themed="background-color,color"
      ref={pageRef}
      variants={currentVariants}
      className={cn(
        "min-h-screen w-screen",

        className
      )}
      onAnimationComplete={(phase) => {
        setCurrentStep("complete");

        switch (phase) {
          case "entering":
            onComplete(headerVisibility, theme);
            break;

          default:
            break;
        }
      }}
    >
      <m.div
        className={cn(
          "relative flex min-h-screen w-full flex-col justify-start",
          internalClassName
        )}
        ref={ref}
      >
        {children}
      </m.div>
    </m.div>
  );
};
//let M = 0.7;

/*
 <AnimatePresence mode="sync" key={'navigation'} initial={false}>
        {navigationPageItemData.map((l, c) => {
          if (!l.link || l.link.type === 'custom' || !l.link.reference) return null
          let slug =
            typeof l.link.reference.value === 'string'
              ? l.link.reference.value
              : l.link.reference.value.slug
          let previewKey = getMenuPagePreviewKey(l.link.reference.relationTo, slug),
            h = navigationPageItemSelected === previewKey
          if (!h && !navIsOpenDebounced && currentKey !== previewKey && !isPreloader) return null
          return (
            <SectionPreview
              id={previewKey}
              type={'pages'}
              slug={slug}
              key={previewKey}
              sections={[]}
              minimizePageDuringOpenNav={transitionCallback}
            />
          )
        })}
      </AnimatePresence>
* */
