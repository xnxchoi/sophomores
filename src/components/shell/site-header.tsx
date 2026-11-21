"use client";

import { siteLayer } from "@/constants/site-layers";
import { MenuButton } from "@/components/UX/Menu/MenuButton";
import { useRPStore } from "@/providers/RP_Pro";
import { BrandMark } from "@/lib/brand";
import { Link } from "@/components/core/Link/Link";
import { clamp, mix } from "motion";
import { useLenis } from "lenis/react";
import { animate, useMotionValue, useMotionValueEvent, type AnimationPlaybackControls } from "motion/react";
import * as m from "motion/react-m";
import { SPRING_EASE } from "@/constants/animations";
import { useCallback, useEffect, useRef, useState, createContext, useContext } from "react";
import { HeaderActions, SiteHeaderActions, useCloseMenuOnNavigate } from "./header-actions";
import { Controlbar } from "./controlbar";
import { useFooterReveal } from "./footer-visibility";
import { useReadingPosts } from "./reading-chrome";
import { useNotificationInbox } from "@/components/notifications/notification-inbox";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { HeaderMemberState } from "@/lib/member-auth/header-state.server";


/** Hideaway `TWEEN_EASE.power3.inOut`. Menu open expands the header over 0.96s. */
const MENU_EASE = [0.77, 0, 0.175, 1] as const;

function paintHeader(header: HTMLElement, progress: number) {
  const width = window.innerWidth;
  const collapsed = width < 768 ? width - 32 : 645;
  // At the top the phone header widens to the viewport frame's 10px side inset (RP_Pro useFrameState) and narrows to
  // the 16px gutter as it scrolls. The Hideaway goes edge to edge there (HeaderClient.tsx:356-361, ww to ww - 32);
  // the owner wants narrower margins, never none (21 Nov). Wider screens keep our 20px inset.
  const start = width < 768 ? width - 20 : width - 40;
  header.style.width = `${start + progress * (collapsed - start)}px`;
  // Tailwind's -translate-x-1/2 centres the bar through the translate property. Writing that same
  // property keeps one -50%; a transform added a second and pushed the bar half off the left edge.
  header.style.translate = `-50% ${progress * 12}px`;
  header.style.setProperty("--header-logo", `${28 - progress * 6}px`);
  header.style.setProperty("--header-scrub", `${progress}`);
  // The inner padding tweens over the first 40 % of the scrub (The Hideaway's ssss, HeaderClient.tsx:316-338):
  // 24 to 16 px on phones, as there; 16 to 20 px wider, where our header sits 20 px in, so the controls start 36 px
  // from the edge at the top, as The Hideaway's do.
  const early = Math.min(1, progress / 0.4);
  const pad = width < 768 ? 24 - 8 * early : 16 + 4 * early;
  header.style.setProperty("--header-pad", `${pad}px`);
  header.style.setProperty("--header-fx-blur", `${5 - 5 * progress}px`);
  header.style.setProperty("--header-fx-contrast", `${500 - 400 * progress}%`);
  header.style.setProperty("--header-fx-saturate", `${1500 - 1400 * progress}%`);
}

// The header's scroll scrub (The Hideaway: components/Shells/Header/headerMotion.ts), with its one user.
const HEADER_SCROLL_DISTANCE = 350;

export function getHeaderScrollProgress(latestScroll: number) {
  return clamp(0, 1, latestScroll / HEADER_SCROLL_DISTANCE);
}

function getNextHeaderScrubPosition({
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
  const headerRef = useRef<HTMLElement>(null);
  const open = useRPStore((state) => state.navIsOpen);
  // The Hideaway's hidden header (HeaderClient.tsx:253, 492-505, 545-548): a page that hides the header
  // (showHeader false, set per page by RPage) keeps it mounted with its contents faded out, and a pointer
  // over its pill reveals it after 200 ms and hides it 200 ms after leaving. While the menu is open it stays
  // shown, so Close stays reachable.
  // A route that hides the header (hidesHeader) is hidden from the server render on, before the store is
  // set. Keyboard: the header stays in the Tab order and shows while focus is inside it, the one deliberate
  // addition to The Hideaway (coordinator decision, 2026-11-19).
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
  const visible = showHeader || hovered || focused || open;
  const scrub = useMotionValue(0);
  const scrollPx = useRef(0);
  const running = useRef<AnimationPlaybackControls | null>(null);
  const locked = useRef(false);
  const closeMenu = useCloseMenuOnNavigate();

  useMotionValueEvent(scrub, "change", (progress) => {
    const header = headerRef.current;
    if (header) paintHeader(header, progress);
  });

  useEffect(() => {
    running.current?.stop();
    let frame = 0;
    let unlock: ReturnType<typeof setTimeout> | undefined;
    if (open) {
      locked.current = true;
      running.current = animate(scrub, 0, { duration: 0.96, ease: MENU_EASE });
    } else {
      // The Hideaway keeps the scroll scrub off until headerDone, 20 ms after the menu state changes
      // (HeaderClient.tsx:487-490), then lerps back (animate-to-previous). Lenis reports a scroll as the menu
      // closes; without the wait it set the scrub straight to the page's position and the tint snapped back.
      unlock = setTimeout(() => {
        locked.current = false;
        const started = performance.now();
        const step = () => {
          if (locked.current) return;
          scrub.set(
            getNextHeaderScrubPosition({
              currentScrub: scrub.get(),
              latestScroll: scrollPx.current
            })
          );
          if (performance.now() - started < 1000) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      }, 20);
    }
    return () => {
      running.current?.stop();
      clearTimeout(unlock);
      cancelAnimationFrame(frame);
    };
  }, [open, scrub]);

  const syncScrub = useCallback(
    (scrolled: number) => {
      // Only the page's own content moves the scrub: past the page's end the scroll just reveals the pinned footer,
      // and the header stays as it was (owner, 21 Nov). A page whose only scroll is the footer keeps it at rest.
      const contentScroll = Math.max(0, useFooterReveal.getState().pageEnd - window.innerHeight);
      const latest = Math.min(scrolled, contentScroll);
      scrollPx.current = latest > 50 ? latest - 50 : 0;
      if (locked.current) return;
      // The Hideaway sets the scrub straight from the scroll (HeaderClient.tsx:184-189, animateOnScroll); Lenis
      // already smooths it. A lerp per scroll event stopped short whenever the events stopped, so a jump to the top
      // left the tint at ~15 % instead of fully transparent. The lerp is only for returning after the menu closes.
      scrub.set(getHeaderScrollProgress(scrollPx.current));
    },
    [scrub]
  );

  useLenis((lenis) => {
    syncScrub(typeof lenis.animatedScroll === "number" ? lenis.animatedScroll : window.scrollY);
  });

  // The cap also moves without a scroll: when the arriving page measures its end, when content changes its height,
  // and when the window resizes in place. Lenis reports only scrolls, so those re-sync here (Review-B, rev 2.7).
  useEffect(() => {
    const resync = () => syncScrub(window.scrollY);
    // The header's width and inset come from the window's width (paintHeader), and the scrub only repaints when it
    // changes. A resize that leaves the scrub where it was still needs the new geometry, so it repaints at the same
    // scrub.
    const resize = () => {
      resync();
      const header = headerRef.current;
      if (header) paintHeader(header, scrub.get());
    };
    const unsubscribe = useFooterReveal.subscribe((state, previous) => {
      if (state.pageEnd !== previous.pageEnd) resync();
    });
    window.addEventListener("resize", resize);
    resync();
    return () => {
      unsubscribe();
      window.removeEventListener("resize", resize);
    };
  }, [syncScrub, scrub]);

  return (
    <>
    <header
      ref={headerRef}
      id="rp-header"
      data-visible={visible}
      onMouseEnter={showHeader ? undefined : () => hover(true)}
      onMouseLeave={showHeader ? undefined : () => hover(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
      className="site-header group/header fixed top-3 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-md:w-[calc(100%-20px)] h-12 lg:h-[54px] overflow-hidden rounded-full data-[menu=open]:text-[var(--n-s-menu-i)] data-[menu=open]:[--faded-fg:var(--n-s-menu-i)] data-[menu=open]:[--button-background:transparent]"
      // Open menu (The Hideaway: HeaderClient.tsx:164-175, 303-312): the buttons lose their fill, and the mark
      // and controls take the frame's ink, --n-s-menu-i (The Hideaway's oklch 97.5%/10.17% 0.001 218.99 = our
      // --off-white/--off-black). Both flip at once, as The Hideaway's do: they follow the menu state, not a tween.
      data-menu={open ? "open" : "closed"}
      style={{ zIndex: open ? siteLayer.headerOpen : siteLayer.header, ["--header-logo" as string]: "28px" }}
    >
      {/* The pill's tint and blur follow the scroll scrub, as The Hideaway's colour and blur layers do
          (HeaderClient.tsx:555-568, opacity = scrubPosition): none while fully expanded at the top, so the
          header is transparent there; full once scrolled. Opening the menu tweens the scrub to 0 over 0.96 s and
          closing lerps it back over about 1 s, so the tint follows both. The tint is The Hideaway's lighter grey,
          off-l-gray at 35 % (dark: faded-l-gray), over its 20 px blur (owner, 21 Nov: "lighter gray and blur").
          Each layer carries its own opacity: an opacity below 1 on a parent would cut the blur off from the
          page behind it. */}
      <div className="pointer-events-none absolute inset-0 transition-opacity duration-300 group-data-[visible=false]/header:opacity-0" aria-hidden="true">
        <div className="absolute inset-0 bg-(--off-l-gray)/35 opacity-[var(--header-scrub,0)] dark:bg-faded-l-gray/35" />
        <div className="absolute inset-0 opacity-[var(--header-scrub,0)] backdrop-blur-[20px]" />
      </div>
      {/* The fx layers also follow the scrub, so the fully expanded header is transparent (owner, 21 Nov: "It's
          supposed to be completely transparent"). Ungated, their contrast boost turned a dark page darker in the
          header's box. The Hideaway never gates its band (HeaderClient.tsx:740): it is strongest at the top and
          relaxes as it scrolls (:713-720), which paintHeader follows. So the fx now shows only mid-scrub, and at
          full scroll it is as before. Before the first paint --header-scrub is unset and the fallback keeps it off.
          Each layer carries the gate: an opacity below 1 on the parent would cut fx-a's backdrop off from the page,
          and the parent's 300 ms fade would lag the scrub. With the menu open the layers step aside: over the
          plain menu their contrast boost would show as a brighter pill. */}
      <div className="site-header-fx pointer-events-none absolute inset-0 transition-opacity duration-300 group-data-[visible=false]/header:opacity-0 group-data-[menu=open]/header:opacity-0 group-data-[menu=open]/header:duration-[960ms]" aria-hidden="true">
        <div className="site-header-fx-a pointer-events-none absolute inset-0 opacity-[calc(var(--header-scrub,0)*0.5)] backdrop-blur-[var(--header-fx-blur,5px)] backdrop-contrast-[var(--header-fx-contrast,500%)] backdrop-saturate-[1500%]" />
        <div className="site-header-fx-b pointer-events-none absolute inset-0 opacity-[calc(var(--header-scrub,0)*0.75)] blur-[var(--header-fx-blur,5px)] contrast-[var(--header-fx-contrast,500%)] saturate-[var(--header-fx-saturate,1500%)]" />
      </div>
      {/* Hidden: the contents fade out (The Hideaway's internalOpacity spring) and take no taps; they stay
          focusable, and focus shows the header. */}
      <m.div
        className={cn("site-header-inner relative z-2 flex h-full items-center justify-between px-[var(--header-pad,24px)] md:px-[var(--header-pad,16px)]", !visible && "pointer-events-none")}
        initial={false}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ type: "spring", visualDuration: 0.3, ...SPRING_EASE.power2.inOut }}
      >
        {/* The pill clips its rolling label, so its 44px target and focus ring come from this wrapper. A tap
            in the wrapper's margin reaches the button; keyboard focus stays on the button itself. */}
        <span
          className="relative flex h-11 min-w-11 items-center rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-current"
          onClick={(event) => {
            if (event.target === event.currentTarget) event.currentTarget.querySelector("button")?.click();
          }}
        >
          <MenuButton />
        </span>
        <Link href="/" aria-label="Sophomores" onClick={closeMenu} className="site-header-logo absolute left-1/2 flex h-11 -translate-x-1/2 items-center rounded-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current">
          {/* The Hideaway's centred mark; on phones a fixed 22px (owner, 2026-11-19). The ring is inset. */}
          <BrandMark className="site-header-mark text-[length:var(--header-logo,28px)] leading-none max-md:text-[22px]">Sophomores</BrandMark>
        </Link>
        {posts
          ? <HeaderActions posts={posts} notifications={notifications} />
          : <SiteHeaderActions member={member} />}
      </m.div>
    </header>
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
