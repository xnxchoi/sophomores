"use client";

import { siteLayer } from "@/constants/site-layers";
import { MenuButton } from "@/components/UX/Menu/MenuButton";
import { useFrameState, useRPStore } from "@/providers/RP_Pro";
import { useIsMobile } from "@/providers/MiddleMan";
import { useTheme } from "@/providers/Theme";
import { BrandMark } from "@/lib/brand";
import { Link } from "@/components/core/Link/Link";
import { animate, cancelFrame, clamp, frame, mix, type AnimationPlaybackControls } from "motion";
import { useLenis } from "lenis/react";
import { useMotionTemplate, useMotionValue, useMotionValueEvent, useSpring, useTransform, type MotionValue } from "motion/react";
import type { HeaderTransitionType } from "@/stores/RP_Ui";
import * as m from "motion/react-m";
import { SPRING_EASE, TWEEN_EASE } from "@/constants/animations";
import { useTransitionState } from "next-transition-router";
import { useWindowResize } from "@/utilities/use_window_resize";
import { createContext, useContext, useEffect, useEffectEvent, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { HeaderActions, SiteHeaderActions, useCloseMenuOnNavigate } from "./header-actions";
import { Controlbar } from "./controlbar";
import { useFooterReveal } from "./footer-visibility";
import { useReadingPosts } from "./reading-chrome";
import { useNotificationInbox } from "@/components/notifications/notification-inbox";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import type { HeaderMemberState } from "@/lib/member-auth/header-state.server";

// The header's scroll scrub (The Hideaway: components/Shells/Header/headerMotion.ts and HeaderClient.tsx:440-450).
const HEADER_SCROLL_DISTANCE = 350;
const HEADER_START_OFFSET = 50;

export function getHeaderScrollProgress(latestScroll: number) {
  return clamp(0, 1, latestScroll / HEADER_SCROLL_DISTANCE);
}

export function getNextHeaderScrubPosition({
  currentScrub,
  latestScroll,
  amount = 0.08
}: {
  currentScrub: number;
  latestScroll: number;
  amount?: number;
}) {
  return mix(currentScrub, getHeaderScrollProgress(latestScroll), amount);
}

/**
 * The scroll the header follows. From md up, where the footer is pinned under the page, scroll past the page's own
 * end only reveals the footer and leaves the header as it was (owner, 21 Nov; desktop only, 24 Nov). A page whose own
 * content can't move the header (50 px or less of it) isn't capped, so the header still responds there.
 */
export function capHeaderScroll(scrolled: number, { pageEnd, innerHeight, innerWidth }: { pageEnd: number; innerHeight: number; innerWidth: number }) {
  if (innerWidth < 768) return scrolled;
  const contentScroll = pageEnd - innerHeight;
  if (!(contentScroll > HEADER_START_OFFSET)) return scrolled;
  return Math.min(scrolled, contentScroll);
}

type HeaderVariant = HeaderTransitionType;

/** What the header does 20 ms after the menu or a page transition changes (HeaderClient.tsx:452-474). */
export function headerDoneAction({ wipe, navOpen, outType }: { wipe: boolean; navOpen: boolean; outType: unknown }) {
  if (wipe) return "transition-wipe" as const;
  if (navOpen) return "animate-to-full" as const;
  if (typeof outType === "string") return "typed-leave" as const;
  return "animate-to-previous" as const;
}

/**
 * The sides' slide-out distance in % (HeaderClient.tsx:195-199). `revealed` is keyboard focus or the open menu, our
 * kept reveal (#24): it wins over a slide or fade, so the controls are never invisible while reachable.
 */
export function headerSectionTranslate(variant: HeaderVariant, visible: boolean, revealed = false): number {
  if (revealed) return 0;
  return variant !== "slide" || visible ? 0 : 100;
}

/** The sides' opacity target (HeaderClient.tsx:207-211); the reveal (#24) wins, as above. */
export function headerInternalOpacity(variant: HeaderVariant, visible: boolean, revealed = false): number {
  if (revealed) return 1;
  return variant !== "fade" && variant !== "slide" && visible ? 1 : 0;
}

/** The row's slide in % (HeaderClient.tsx:244); the reveal (#24) holds it in place. */
export function headerRowY(innerTranslate: number, revealed: boolean) {
  return revealed ? 0 : innerTranslate;
}

/**
 * The sides' slide, fade and row offset: The Hideaway's springs (HeaderClient.tsx:195-215, 244), with the kept reveal
 * (#24) holding them at rest at once. Motion's function-form useTransform subscribes only to the values whose get()
 * ran during the render-time compute (motion use-computed.mjs:10-12, use-combine-values.mjs:27), so every computed
 * transform in this header reads all of its inputs before it branches; a branch that skipped one left it unsubscribed.
 */
export function useHeaderSides({
  transitionVariant,
  visibleness,
  revealState,
  innerTranslate
}: {
  transitionVariant: MotionValue<HeaderVariant>;
  visibleness: MotionValue<boolean>;
  revealState: MotionValue<boolean>;
  innerTranslate: MotionValue<number>;
}) {
  const springTranslate = useSpring(
    useTransform(() => headerSectionTranslate(transitionVariant.get(), visibleness.get(), revealState.get())),
    { visualDuration: 0.4, ...SPRING_EASE.power4.inOut }
  );
  const springOpacity = useSpring(
    useTransform(() => headerInternalOpacity(transitionVariant.get(), visibleness.get(), revealState.get())),
    { ...SPRING_EASE.power2.inOut, visualDuration: 0.3 }
  );
  const sectionTranslate = useTransform(() => {
    const translate = springTranslate.get();
    return revealState.get() ? 0 : translate;
  });
  const internalOpacity = useTransform(() => {
    const opacity = springOpacity.get();
    return revealState.get() ? 1 : opacity;
  });
  const rowY = useTransform(() => headerRowY(innerTranslate.get(), revealState.get()));
  return { springTranslate, springOpacity, sectionTranslate, internalOpacity, rowY };
}

/**
 * Guards the lerp's frame writer: a writer writes only while it is the latest one, so starting a tween (or another
 * lerp) stops a writer already scheduled, which otherwise kept pulling the scrub for up to a second.
 */
export function createLerpGuard() {
  let generation = 0;
  return {
    writer(write: () => void) {
      const own = ++generation;
      return () => {
        if (own === generation) write();
      };
    },
    cancel() {
      generation += 1;
    }
  };
}

/** The inner row's slide on a header-transition change (HeaderClient.tsx:221-232). */
export function headerInnerTranslate(variant: HeaderVariant, visible: boolean) {
  const slide = variant === "slide";
  return { y: slide ? (visible ? 0 : -100) : 0, delay: slide ? 0.4 : 0, duration: slide ? 0.4 : 0.1 };
}

/** The mark's vertical position in % of its own height (HeaderClient.tsx:235-240). */
export function headerLogoY(sectionTranslate: number, mobile: boolean, scrub: number) {
  return sectionTranslate < 0 ? sectionTranslate : mobile ? -50 : -25 - scrub * 25;
}

/** The row's left/right offsets while the menu is open (HeaderClient.tsx:310-325). */
export function headerInnerOffsets({ navOpen, left, right, early, scrub }: { navOpen: boolean; left: number; right: number; early: number; scrub: number }) {
  return { left: (1 - early) * (navOpen ? -left : 0), right: (1 - scrub) * (navOpen ? -right : 0) };
}

/**
 * The Hideaway's FX band (HeaderClient.tsx:701-770), ported as written: its own fixed box inside the header, moved
 * and relaxed by the early scrub, shown whenever the header is.
 */
function HeaderFX({ progressRate, fxVisibility }: { progressRate: MotionValue<number>; fxVisibility: boolean }) {
  const bottom = useTransform(() => (progressRate.get() > 0.1 ? 0 : "auto"));
  const xValue = useTransform(() => progressRate.get() * 10);
  // `^` is bitwise XOR, as in The Hideaway (HeaderClient.tsx:712).
  const top = useTransform(() => (10 * (progressRate.get() - 1)) ^ 2);
  const fx2Filter = useTransform(() => {
    const progress = progressRate.get();
    return `brightness(100%) blur(${5 - 5 * progress}px) contrast(${500 - 400 * progress}%) saturate(${1500 - 1400 * progress}%)`;
  });
  return (
    <m.div
      aria-hidden="true"
      className={cn("pointer-events-none fixed top-0 right-4 bottom-0 left-4 z-10 mx-auto", !fxVisibility && "opacity-0")}
      style={{ left: xValue, top, right: xValue, bottom }}
    >
      <m.div
        data-themed="background-color"
        className="absolute top-[10px] bottom-auto z-[19] h-[80px] bg-[#ffffff03] mask-linear-from-[#000] mask-linear-to-[transparent] opacity-50 backdrop-blur-[5px] backdrop-contrast-500 backdrop-saturate-[1500%]"
      />
      <m.div
        data-themed="background-color"
        className="absolute top-[10px] bottom-auto z-[19] h-[60px] bg-[#ffffff03] mask-linear-from-[#000] mask-linear-to-[transparent] opacity-75 blur-[5px] contrast-[500%] hue-rotate-0 saturate-[1500%]"
        style={{ filter: fx2Filter }}
      />
    </m.div>
  );
}

/**
 * Hideaway's floating pill. Menu on the left, the mark in the center. Mounted once by the site frame on
 * every page, as The Hideaway's header is (app/(frontend)/layout.tsx:96). While the essays reading view is
 * open it shares its posts (reading-chrome.tsx), and the header shows the reading actions; everywhere else
 * it shows only real destinations (Shop, Cart, Account).
 */
/** The request's member state for the header's account entry (R-P17b), provided by the site frame. */
export const HeaderMemberContext = createContext<Promise<HeaderMemberState> | undefined>(undefined);

export function SiteHeader({ member: memberProp }: { member?: Promise<HeaderMemberState> }) {
  const provided = useContext(HeaderMemberContext);
  const member = memberProp ?? provided;
  const posts = useReadingPosts();
  const { notifications: inbox } = useNotificationInbox([]);
  const notifications = posts ? inbox : undefined;
  const open = useRPStore((state) => state.navIsOpen);
  const setHeaderVisibility = useRPStore((state) => state.setHeaderVisibility);
  // The Hideaway's hidden header (HeaderClient.tsx:253, 492-505, 545-548): a page that hides the header keeps it
  // mounted with its contents faded out, and a pointer over its pill reveals it after 200 ms and hides it 200 ms
  // after leaving. A route that hides the header (hidesHeader) is hidden from the server render on.
  const pathname = usePathname() || "/";
  const showHeader = useRPStore((state) => state.showHeader) && !hidesHeader(pathname);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hover = (next: boolean) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHovered(next), 200);
  };
  useEffect(() => () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }, []);
  // Keyboard focus and the open menu also show it (coordinator decision, 19 Nov; kept by the owner, 24 Nov).
  // The Hideaway also hides the header while the FX frame is off (HeaderClient.tsx:253); not here, because the
  // footer turns that frame off (footer-visibility.tsx), which would hide the header whenever the footer shows.
  const visible = showHeader || hovered || focused || open;
  const revealed = focused || open;
  const closeMenu = useCloseMenuOnNavigate();

  const { isMobile } = useIsMobile();
  const theme = useTheme((state) => state.theme);
  const { top, left, right } = useFrameState();
  // The page transition's stores (useTransitionSetter writes the leave type and the wipe; Missing sets 'slide').
  const outType = useRPStore((state) => state.transitionOutType);
  const wipe = useRPStore((state) => state.isTransitioningWipe);
  const headerTransition = useRPStore((state) => state.headerTransition);
  const setHeaderTransition = useRPStore((state) => state.setHeaderTransition);
  const { stage } = useTransitionState();

  // scrubPosition is the one source of the header's scroll state (0-1): set from the scroll, or tweened.
  const scrubPosition = useMotionValue(0);
  // The frame store's navState is never updated after mount, so the menu state comes from navIsOpen.
  const navState = useMotionValue(open);
  useEffect(() => {
    navState.set(open);
  }, [open, navState]);
  const mobileState = useMotionValue(isMobile);
  useEffect(() => {
    mobileState.set(isMobile);
  }, [isMobile, mobileState]);
  const themeValue = useMotionValue(theme);
  useEffect(() => {
    themeValue.set(theme);
  }, [theme, themeValue]);
  const windowWidth = useMotionValue(0);

  const mainT = useTransform(() => top.get() * 0.5);
  const mainTop = useSpring(mainT, { visualDuration: 0.2, ...SPRING_EASE.power4.out });
  const gutter = useTransform(() => (mobileState.get() ? 16 : 20));
  const ssss = useTransform(scrubPosition, [0, 0.4], [0, 1]);
  const innerPX = useTransform(() => {
    const progress = ssss.get();
    const pxOrigin = mobileState.get() ? 24 : 36;
    return pxOrigin + progress * (gutter.get() - pxOrigin);
  });
  const innerPTop = useTransform(() => (1 - ssss.get()) * (mobileState.get() ? 0 : 14));
  const themeOK = useTransform(() => {
    const progress = scrubPosition.get();
    const [from, to] = themeValue.get() === "dark" ? [78.94, 66.06] : [66.06, 78.94];
    return from + (from - to) * progress;
  });
  const scrollToBtbgop = useTransform(scrubPosition, [0, 1], [0.25, 0.1]);
  const btbgop = useTransform(() => {
    const alpha = scrollToBtbgop.get();
    return navState.get() ? 0 : alpha;
  });
  const btBackground = useMotionTemplate`oklch(${themeOK}% 0.008 176.48/${btbgop})`;
  const btBlurPx = useTransform(() => {
    const progress = scrubPosition.get();
    return navState.get() ? 0 : 4 + progress * 10;
  });
  const btBlur = useMotionTemplate`${btBlurPx}px`;
  const logoSize = useTransform(scrubPosition, [0.1, 0.3], [28, 22]);
  const logoPx = useMotionTemplate`${logoSize}px`;
  const mainY = useTransform(() => {
    const scrub = scrubPosition.get();
    return mobileState.get() ? 5 + 7 * scrub : scrub * 12;
  });
  const transform = useMotionTemplate`translate(-50%,${mainY}px)`;
  const paddingBottom = useTransform(() => {
    const scrub = scrubPosition.get();
    return scrub < 0.5 ? scrub * 20 : -20 * scrub + 20;
  });
  const mainWidth = useTransform(() => {
    const progress = scrubPosition.get();
    const ww = windowWidth.get();
    const kw = mobileState.get() ? ww - 32 : 645;
    // Phones start 10 px in from each side, not edge to edge (owner, 21 Nov: narrower margins, never none).
    const start = ww < 768 ? ww - 20 : ww;
    return start + progress * (kw - start);
  });
  // The Hideaway's 249 to 245 (HeaderClient.tsx:362) sits on its own stacking scale. Here the open header is a flat
  // 249, above the menu body (248) so Close stays reachable, and the closed one keeps its place under dialogs.
  const zIndex = useTransform(() => (navState.get() ? siteLayer.headerOpen : siteLayer.header));

  // Page-transition variants (HeaderClient.tsx:150-162, 195-244).
  const transitionVariant = useMotionValue(headerTransition);
  useEffect(() => {
    transitionVariant.set(headerTransition);
  }, [headerTransition, transitionVariant]);
  const visibleness = useMotionValue(visible);
  useEffect(() => {
    visibleness.set(visible);
  }, [visible, visibleness]);
  const revealState = useMotionValue(revealed);
  useEffect(() => {
    revealState.set(revealed);
  }, [revealed, revealState]);
  const innerTranslate = useMotionValue(0);
  const { sectionTranslate, internalOpacity, rowY } = useHeaderSides({ transitionVariant, visibleness, revealState, innerTranslate });
  useMotionValueEvent(transitionVariant, "change", (latestValue) => {
    const { y, delay, duration } = headerInnerTranslate(latestValue, visibleness.get());
    animate(innerTranslate, y, { delay, duration, type: "tween", ease: TWEEN_EASE.power4.inOut });
  });
  const sectionY = useMotionTemplate`-${sectionTranslate}%`;
  const sectionLX = useMotionTemplate`-${sectionTranslate}%`;
  const sectionRX = useMotionTemplate`${sectionTranslate}%`;
  const innerY = useMotionTemplate`${rowY}%`;
  const scy = useTransform(() => headerLogoY(sectionTranslate.get(), mobileState.get(), scrubPosition.get()));
  const sectionCY = useMotionTemplate`translate(-50%,${scy}%)`;
  const innerLeft = useTransform(
    () => headerInnerOffsets({ navOpen: navState.get(), left: left.get(), right: right.get(), early: ssss.get(), scrub: scrubPosition.get() }).left
  );
  const innerRight = useTransform(
    () => headerInnerOffsets({ navOpen: navState.get(), left: left.get(), right: right.get(), early: ssss.get(), scrub: scrubPosition.get() }).right
  );
  const bsSpread = useTransform(() => 0.5 * scrubPosition.get());
  const bsBlur = useTransform(() => 1.2 * scrubPosition.get());
  // The ring belongs to a shown header: hidden (Home, owner 19 Nov), it fades out with the tint and sides, so no
  // empty outline is left on the page (owner, 24 Nov: "Why the hell is the header empty and still visible?").
  // Same 300 ms as the tint's Tailwind transition-opacity (duration-300, default ease).
  const ringShown = useMotionValue(visible ? 1 : 0);
  useEffect(() => {
    const ring = animate(ringShown, visible ? 1 : 0, { duration: 0.3, ease: [0.4, 0, 0.2, 1] });
    return () => ring.stop();
  }, [visible, ringShown]);
  const bsOKOp = useTransform(() => {
    const scrub = scrubPosition.get();
    const shown = ringShown.get();
    return 0.7 * scrub * shown;
  });
  const mainBS = useMotionTemplate`0 0 ${bsSpread}px ${bsBlur}px oklch(36.76% 0.003 58.67/${bsOKOp})`;
  const boxShadow = useTransform(() => {
    const progress = scrubPosition.get();
    const dark = themeValue.get() === "dark";
    const shadow = mainBS.get();
    const shown = ringShown.get();
    return headerRingShadow({ progress, dark, shown, shadow });
  });

  const tweenNumber = useRef(0);
  const halted = useRef(false);
  const running = useRef<AnimationPlaybackControls | null>(null);
  const [lerpGuard] = useState(createLerpGuard);
  const lerpStep = useRef<(() => void) | null>(null);
  const lerpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stops a scheduled lerp writer: its frame, its 1 s cancel timer, and (through the guard) any call already queued.
  const stopLerp = () => {
    lerpGuard.cancel();
    if (lerpStep.current) cancelFrame(lerpStep.current);
    lerpStep.current = null;
    if (lerpTimer.current) clearTimeout(lerpTimer.current);
    lerpTimer.current = null;
  };

  const track = (scrolled: number) => {
    const c = capHeaderScroll(scrolled, {
      pageEnd: useFooterReveal.getState().pageEnd,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth
    });
    tweenNumber.current = c > HEADER_START_OFFSET ? c - HEADER_START_OFFSET : 0;
  };

  // HeaderClient.tsx:440-450: the scroll sets the scrub directly, unless a tween holds it, or Lenis reports 0.
  const lenis = useLenis((instance) => {
    if (!halted.current && instance.animatedScroll) {
      track(instance.animatedScroll);
      scrubPosition.set(getHeaderScrollProgress(tweenNumber.current));
    }
  });

  // The footer cap moves without a scroll when the arriving page measures its end or its height changes; re-read
  // the same Lenis scroll the live path uses.
  const resync = useEffectEvent(() => {
    if (halted.current) return;
    track(lenis?.animatedScroll ?? window.scrollY);
    scrubPosition.set(getHeaderScrollProgress(tweenNumber.current));
  });
  useEffect(
    () =>
      useFooterReveal.subscribe((state, previous) => {
        if (state.pageEnd !== previous.pageEnd) resync();
      }),
    []
  );

  // Mount and every debounced resize: tween from 0 to the scroll's position (HeaderClient.tsx:376-387). The footer
  // cap depends on the window's size, so the position is re-read first.
  const lastResize = useWindowResize({ debounce: 50, detectHeightChange: true });
  const instantiator = useEffectEvent(() => {
    windowWidth.set(window.innerWidth);
    if (!halted.current) track(lenis?.animatedScroll ?? window.scrollY);
    const target = getHeaderScrollProgress(tweenNumber.current);
    stopLerp();
    animate(scrubPosition, [0, target], { duration: 0.6, type: "tween", ease: TWEEN_EASE.power1.out });
  });
  useLayoutEffect(() => {
    windowWidth.set(window.innerWidth);
  }, [windowWidth]);
  useEffect(() => {
    instantiator();
  }, [lastResize]);

  // HeaderClient.tsx:398-438.
  const setHeaderState = useEffectEvent((transitionType: "transition-wipe" | "animate-to-full" | "animate-to-previous", callback?: () => void) => {
    running.current?.stop();
    running.current = null;
    stopLerp();
    if (transitionType === "transition-wipe") return;
    if (transitionType === "animate-to-full") {
      running.current = animate(scrubPosition, 0, {
        duration: 0.96,
        type: "tween",
        ease: TWEEN_EASE.power3.inOut,
        onComplete: () => {
          running.current = null;
          callback?.();
        }
      });
      return;
    }
    callback?.();
    const stepScrubPosition = lerpGuard.writer(() => {
      scrubPosition.set(getNextHeaderScrubPosition({ currentScrub: scrubPosition.get(), latestScroll: tweenNumber.current }));
    });
    frame.update(stepScrubPosition, true);
    lerpStep.current = stepScrubPosition;
    lerpTimer.current = setTimeout(() => cancelFrame(stepScrubPosition), 1000);
  });

  // HeaderClient.tsx:452-491: 20 ms after the menu or a page transition changes. A wipe holds the scroll (and, as in
  // The Hideaway, nothing lets it go until the next change); an open menu holds it and tweens the header to full; a
  // typed leave does the same and lets the scroll back after 720 ms; otherwise the scroll comes back and the header
  // lerps toward it.
  const headerDone = useEffectEvent(() => {
    const enable = () => {
      halted.current = false;
    };
    switch (headerDoneAction({ wipe, navOpen: navState.get(), outType })) {
      case "transition-wipe":
        halted.current = true;
        setHeaderState("transition-wipe", enable);
        return;
      case "animate-to-full":
        halted.current = true;
        setHeaderState("animate-to-full");
        return;
      case "typed-leave":
        halted.current = true;
        // The destination page starts at scroll 0.
        tweenNumber.current = 0;
        setHeaderState("animate-to-full");
        setTimeout(enable, 720);
        return;
      default:
        setHeaderState("animate-to-previous", enable);
    }
  });
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (doneTimer.current) clearTimeout(doneTimer.current);
    doneTimer.current = setTimeout(headerDone, 20);
  }, [open, outType, headerTransition, wipe]);

  // Leaving a page (HeaderClient.tsx:261-291): after 50 ms the hover reveal and header transition reset, the header is
  // set visible, and it tweens to full with the scroll held. The Hideaway's theme and cursor resets there belong to other owners here.
  const animateBye = useEffectEvent(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    setHovered(false);
    tweenNumber.current = 0;
    setHeaderTransition(null);
    setHeaderVisibility(true);
    halted.current = true;
    running.current?.stop();
    stopLerp();
    running.current = animate(scrubPosition, 0, {
      duration: 0.96,
      type: "tween",
      ease: TWEEN_EASE.power3.inOut,
      onComplete: () => {
        running.current = null;
        halted.current = false;
      }
    });
  });
  useEffect(() => {
    if (stage === "leaving") setTimeout(animateBye, 50);
  }, [stage]);

  // The width is measured on the client; the server render uses the classes' start width.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <>
    <m.header
      id="rp-header"
      data-visible={visible}
      onMouseEnter={showHeader ? undefined : () => hover(true)}
      onMouseLeave={showHeader ? undefined : () => hover(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
      className="site-header group/header fixed left-1/2 m-0 w-full max-md:w-[calc(100%-20px)] overflow-hidden rounded-full p-0 data-[menu=open]:text-[var(--n-s-menu-i)] data-[menu=open]:[--faded-fg:var(--n-s-menu-i)]"
      // Open menu (The Hideaway: HeaderClient.tsx:164-175): the mark and controls take the frame's ink,
      // --n-s-menu-i, following the menu state.
      data-menu={open ? "open" : "closed"}
      style={{
        top: mainTop,
        zIndex,
        width: mounted ? mainWidth : undefined,
        transform,
        paddingBottom,
        boxShadow,
        ["--header-logo" as string]: logoPx,
        ["--button-background" as string]: btBackground,
        ["--header-button-blur" as string]: btBlur
      }}
    >
      {/* The pill's tint and blur follow the scrub (HeaderClient.tsx:555-570). They fade with the hidden header, so
          Home shows no header (owner, 19 Nov). */}
      <div className="pointer-events-none absolute inset-0 transition-opacity duration-300 group-data-[visible=false]/header:opacity-0" aria-hidden="true">
        <m.div className="absolute top-0 left-0 z-1 h-full w-full bg-(--off-l-gray)/35 dark:bg-faded-l-gray/35" style={{ opacity: scrubPosition }} />
        <m.div className="absolute top-0 left-0 z-2 h-full w-full backdrop-blur-[20px]" style={{ opacity: scrubPosition }} />
      </div>
      <HeaderFX progressRate={ssss} fxVisibility={visible} />
      {/* Hidden: the sides fade out (The Hideaway's internalOpacity spring, HeaderClient.tsx:586-693) and take no taps;
          they stay focusable, and focus shows the header. */}
      <m.div
        className={cn("site-header-inner relative z-20 flex h-12 lg:h-[54px] items-center justify-between", !visible && "pointer-events-none")}
        style={{ y: innerY, paddingLeft: innerPX, paddingRight: innerPX, paddingTop: innerPTop, left: innerLeft, right: innerRight }}
      >
        <m.div id="l-side" className="z-20" style={{ opacity: internalOpacity, y: sectionY, x: sectionLX }}>
          {/* The pill clips its rolling label, so its 44px target comes from this wrapper and its focus ring from a
              pill-sized one inside it (never around the 44px target). A tap in the wrapper's margin reaches the
              button; keyboard focus stays on the button itself. */}
          <span
            className="relative flex h-11 min-w-11 items-center rounded-full"
            onClick={(event) => {
              if (event.target === event.currentTarget) event.currentTarget.querySelector("button")?.click();
            }}
          >
            <span className="flex rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-current">
              <MenuButton />
            </span>
          </span>
        </m.div>
        {/* The Hideaway's centred mark (#c-side, absolute in its estate.scss:137): its height is the mark's, so the
            scrub moves it -25% to -50% of its own height. The 44px target is the link's ::before; the keyboard ring
            hugs the mark (FocusShape). */}
        <m.div id="c-side" className="absolute top-1/2 left-1/2 z-20" style={{ opacity: internalOpacity, transform: sectionCY }}>
          <Link href="/" aria-label="Sophomores" onClick={closeMenu} className="site-header-logo group/focus relative flex items-center rounded-full before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 before:content-['']">
            {/* On phones a fixed 22px (owner, 2026-11-19). */}
            <FocusShape className="flex group-focus-visible/focus:outline-current">
              <BrandMark className="site-header-mark text-[length:var(--header-logo,28px)] leading-none max-md:text-[22px]">Sophomores</BrandMark>
            </FocusShape>
          </Link>
        </m.div>
        <m.div id="r-side" className="z-20" style={{ opacity: internalOpacity, y: sectionY, x: sectionRX }}>
          {posts
            ? <HeaderActions posts={posts} notifications={notifications} member={member} />
            : <SiteHeaderActions member={member} />}
        </m.div>
      </m.div>
    </m.header>
    {/* Touch phones: the bottom Controlbar takes the header's actions but Cart. Outside the header, so its taps
        and the mouse events touch emulates don't reach the header's hover reveal. */}
    <Controlbar posts={posts ?? undefined} notifications={notifications} member={member} />
    </>
  );
}

/**
 * Pages that hide the header (The Hideaway's per-page headerVisibility): it stays mounted, faded out, and a
 * pointer over it, or keyboard focus in it, shows it. Home, under its own masthead (owner, 2026-11-19).
 */
// The pill's ring (dark mode, past 30% of the scrub, HeaderClient.tsx), drawn only while the header is shown.
export function headerRingShadow({ progress, dark, shown, shadow }: { progress: number; dark: boolean; shown: number; shadow: string }) {
  return progress > 0.3 && dark && shown > 0 ? shadow : "none";
}

export function hidesHeader(pathname: string) {
  return pathname === "/";
}
