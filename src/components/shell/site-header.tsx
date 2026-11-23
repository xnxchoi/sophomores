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
import { useMotionTemplate, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
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
  const closeMenu = useCloseMenuOnNavigate();

  const { isMobile } = useIsMobile();
  const theme = useTheme((state) => state.theme);
  const { top } = useFrameState();
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
  const btbgop = useTransform(() => (navState.get() ? 0 : scrollToBtbgop.get()));
  const btBackground = useMotionTemplate`oklch(${themeOK}% 0.008 176.48/${btbgop})`;
  const btBlurPx = useTransform(() => (navState.get() ? 0 : 4 + scrubPosition.get() * 10));
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
  // The Hideaway's 249 to 245 (HeaderClient.tsx:362) sits on its own stacking scale; here it applies only while the
  // menu is open (menu body 248, curtain 250). Closed, the header keeps its place under dialogs (siteLayer).
  const zIndex = useTransform(() => (navState.get() ? Math.round(siteLayer.headerOpen - 4 * scrubPosition.get()) : siteLayer.header));
  const bsSpread = useTransform(() => 0.5 * scrubPosition.get());
  const bsBlur = useTransform(() => 1.2 * scrubPosition.get());
  const bsOKOp = useTransform(() => 0.7 * scrubPosition.get());
  const mainBS = useMotionTemplate`0 0 ${bsSpread}px ${bsBlur}px oklch(36.76% 0.003 58.67/${bsOKOp})`;
  const boxShadow = useTransform(() => (scrubPosition.get() > 0.3 && themeValue.get() === "dark" ? mainBS.get() : "none"));

  const tweenNumber = useRef(0);
  const halted = useRef(false);
  const running = useRef<AnimationPlaybackControls | null>(null);

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
    animate(scrubPosition, [0, target], { duration: 0.6, type: "tween", ease: TWEEN_EASE.power1.out });
  });
  useLayoutEffect(() => {
    windowWidth.set(window.innerWidth);
  }, [windowWidth]);
  useEffect(() => {
    instantiator();
  }, [lastResize]);

  // HeaderClient.tsx:398-438.
  const setHeaderState = useEffectEvent((transitionType: "animate-to-full" | "animate-to-previous", callback?: () => void) => {
    running.current?.stop();
    running.current = null;
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
    const stepScrubPosition = () => {
      scrubPosition.set(getNextHeaderScrubPosition({ currentScrub: scrubPosition.get(), latestScroll: tweenNumber.current }));
    };
    frame.update(stepScrubPosition, true);
    setTimeout(() => cancelFrame(stepScrubPosition), 1000);
  });

  // HeaderClient.tsx:452-491: 20 ms after the menu state changes, an open menu holds the scroll and tweens the header
  // to full; a closed one lets the scroll back and lerps toward it.
  const headerDone = useEffectEvent(() => {
    if (navState.get()) {
      halted.current = true;
      setHeaderState("animate-to-full");
      return;
    }
    setHeaderState("animate-to-previous", () => {
      halted.current = false;
    });
  });
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (doneTimer.current) clearTimeout(doneTimer.current);
    doneTimer.current = setTimeout(headerDone, 20);
  }, [open]);

  // Leaving a page (HeaderClient.tsx:261-291): after 50 ms the hover reveal resets, the header is set visible, and
  // it tweens to full with the scroll held. The Hideaway's theme and cursor resets there belong to other owners here.
  const animateBye = useEffectEvent(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    setHovered(false);
    tweenNumber.current = 0;
    setHeaderVisibility(true);
    halted.current = true;
    running.current?.stop();
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
      {/* Hidden: the contents fade out (The Hideaway's internalOpacity spring) and take no taps; they stay
          focusable, and focus shows the header. */}
      <m.div
        className={cn("site-header-inner relative z-20 flex h-12 lg:h-[54px] items-center justify-between", !visible && "pointer-events-none")}
        style={{ paddingLeft: innerPX, paddingRight: innerPX, paddingTop: innerPTop }}
        initial={false}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ type: "spring", visualDuration: 0.3, ...SPRING_EASE.power2.inOut }}
      >
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
        <Link href="/" aria-label="Sophomores" onClick={closeMenu} className="site-header-logo group/focus absolute left-1/2 flex h-11 -translate-x-1/2 items-center rounded-full">
          {/* The Hideaway's centred mark; on phones a fixed 22px (owner, 2026-11-19). The ring hugs the mark. */}
          <FocusShape className="flex group-focus-visible/focus:outline-current">
            <BrandMark className="site-header-mark text-[length:var(--header-logo,28px)] leading-none max-md:text-[22px]">Sophomores</BrandMark>
          </FocusShape>
        </Link>
        {posts
          ? <HeaderActions posts={posts} notifications={notifications} member={member} />
          : <SiteHeaderActions member={member} />}
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
export function hidesHeader(pathname: string) {
  return pathname === "/";
}
