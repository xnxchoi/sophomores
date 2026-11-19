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
import { useEffect, useRef, useState, createContext, useContext } from "react";
import { HeaderActions, SiteHeaderActions, useCloseMenuOnNavigate } from "./header-actions";
import { Controlbar } from "./controlbar";
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
  // Phones sit on the 16px content gutter; wider screens keep Hideaway's 20px inset.
  const start = width < 768 ? width - 32 : width - 40;
  header.style.width = `${start + progress * (collapsed - start)}px`;
  // Tailwind's -translate-x-1/2 centres the bar through the translate property. Writing that same
  // property keeps one -50%; a transform added a second and pushed the bar half off the left edge.
  header.style.translate = `-50% ${progress * 12}px`;
  header.style.setProperty("--header-logo", `${28 - progress * 6}px`);
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
    if (open) {
      locked.current = true;
      running.current = animate(scrub, 0, { duration: 0.96, ease: MENU_EASE });
    } else {
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
    }
    return () => {
      running.current?.stop();
      cancelAnimationFrame(frame);
    };
  }, [open, scrub]);

  useLenis((lenis) => {
    const latest = typeof lenis.animatedScroll === "number" ? lenis.animatedScroll : window.scrollY;
    scrollPx.current = latest > 50 ? latest - 50 : 0;
    if (locked.current) return;
    scrub.set(
      getNextHeaderScrubPosition({
        currentScrub: scrub.get(),
        latestScroll: scrollPx.current
      })
    );
  });

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
      className="site-header group/header fixed top-3 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-md:w-[calc(100%-32px)] h-12 lg:h-[54px] overflow-hidden rounded-full bg-[oklch(from_var(--off-bg)_l_c_h_/_0.72)] backdrop-blur-floating transition-[background-color,backdrop-filter] duration-300 data-[visible=false]:bg-transparent data-[visible=false]:backdrop-blur-none"
      data-menu={open ? "open" : "closed"}
      style={{ zIndex: open ? siteLayer.headerOpen : siteLayer.header, ["--header-logo" as string]: "28px" }}
    >
      <div className="site-header-fx pointer-events-none absolute inset-0 transition-opacity duration-300 group-data-[visible=false]/header:opacity-0" aria-hidden="true">
        <div className="site-header-fx-a pointer-events-none absolute inset-0 opacity-50 backdrop-blur-[var(--header-fx-blur,5px)] backdrop-contrast-[var(--header-fx-contrast,500%)] backdrop-saturate-[1500%]" />
        <div className="site-header-fx-b pointer-events-none absolute inset-0 opacity-75 blur-[var(--header-fx-blur,5px)] contrast-[var(--header-fx-contrast,500%)] saturate-[var(--header-fx-saturate,1500%)]" />
      </div>
      {/* Hidden: the contents fade out (The Hideaway's internalOpacity spring) and take no taps; they stay
          focusable, and focus shows the header. */}
      <m.div
        className={cn("site-header-inner relative z-2 flex h-full items-center justify-between px-5", !visible && "pointer-events-none")}
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
