"use client";

import { siteLayer } from "@/constants/site-layers";
import type { Notification, PostBody } from "@/lib/content/slots";
import { MenuButton } from "@/components/UX/Menu/MenuButton";
import { useRPStore } from "@/providers/RP_Pro";
import { BrandMark } from "@/lib/brand";
import { Link } from "@/components/core/Link/Link";
import { getNextHeaderScrubPosition } from "@/lib/content/header-motion";
import { useLenis } from "lenis/react";
import { animate, useMotionValue, useMotionValueEvent, type AnimationPlaybackControls } from "motion/react";
import { useEffect, useRef, useSyncExternalStore, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { HeaderActions, SiteHeaderActions, useCloseMenuOnNavigate } from "./header-actions";
import { usePathname } from "next/navigation";
import type { HeaderMemberState } from "@/lib/member-auth/header-state.server";


/** Hideaway `TWEEN_EASE.power3.inOut`. Menu open expands the header over 0.96s. */
const MENU_EASE = [0.77, 0, 0.175, 1] as const;

function paintHeader(header: HTMLElement, progress: number) {
  const width = window.innerWidth;
  const collapsed = width < 768 ? width - 32 : 645;
  const start = width - 40;
  header.style.width = `${start + progress * (collapsed - start)}px`;
  // Tailwind's -translate-x-1/2 centres the bar through the translate property. Writing that same
  // property keeps one -50%; a transform added a second and pushed the bar half off the left edge.
  header.style.translate = `-50% ${progress * 12}px`;
  header.style.setProperty("--header-logo", `${28 - progress * 6}px`);
  header.style.setProperty("--header-fx-blur", `${5 - 5 * progress}px`);
  header.style.setProperty("--header-fx-contrast", `${500 - 400 * progress}%`);
  header.style.setProperty("--header-fx-saturate", `${1500 - 1400 * progress}%`);
}

/**
 * Hideaway's floating pill. Menu on the left, the mark in the center. The reading view passes its live
 * posts and notifications and keeps its own actions; everywhere else the header shows only real
 * destinations (Shop, Cart, Account).
 */
/**
 * The request's member state for the header's account entry (R-P17b), provided once by the site frame
 * (client-layout.tsx). A header rendered elsewhere (the reading view's own, a missing essay's portalled
 * one) reads it here, so each shows the same Log in / Account entry.
 */
export const HeaderMemberContext = createContext<Promise<HeaderMemberState> | undefined>(undefined);

export function SiteHeader({ posts, notifications, member: memberProp }: { posts?: PostBody[]; notifications?: Notification[]; member?: Promise<HeaderMemberState> }) {
  const provided = useContext(HeaderMemberContext);
  const member = memberProp ?? provided;
  const headerRef = useRef<HTMLElement>(null);
  const open = useRPStore((state) => state.navIsOpen);
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
    <header
      ref={headerRef}
      id="rp-header"
      className="site-header fixed top-3 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] h-12 lg:h-[54px] overflow-hidden rounded-full bg-[oklch(from_var(--off-bg)_l_c_h_/_0.72)] backdrop-blur-floating"
      data-menu={open ? "open" : "closed"}
      style={{ zIndex: open ? siteLayer.headerOpen : siteLayer.header, ["--header-logo" as string]: "28px" }}
    >
      <div className="site-header-fx pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="site-header-fx-a pointer-events-none absolute inset-0 opacity-50 backdrop-blur-[var(--header-fx-blur,5px)] backdrop-contrast-[var(--header-fx-contrast,500%)] backdrop-saturate-[1500%]" />
        <div className="site-header-fx-b pointer-events-none absolute inset-0 opacity-75 blur-[var(--header-fx-blur,5px)] contrast-[var(--header-fx-contrast,500%)] saturate-[var(--header-fx-saturate,1500%)]" />
      </div>
      <div className="site-header-inner relative z-2 flex h-full items-center justify-between px-5">
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
        <Link href="/" aria-label="Sophomores" onClick={closeMenu} className="site-header-logo absolute left-1/2 flex h-11 -translate-x-1/2 items-center">
          <BrandMark className="site-header-mark text-[length:var(--header-logo,28px)] leading-none">Sophomores</BrandMark>
        </Link>
        {posts !== undefined || notifications !== undefined
          ? <HeaderActions posts={posts} notifications={notifications} />
          : <SiteHeaderActions member={member} />}
      </div>
    </header>
  );
}

/**
 * Pages that draw their own top, so the site frame leaves the header to them: the home page's masthead
 * (components/teaser/hero.tsx) and the essays reading view, which mounts the header itself with its live
 * posts and notifications (components/reading/reading-stage.tsx).
 */
export function drawsOwnTop(pathname: string) {
  return pathname === "/" || pathname === "/essays" || pathname.startsWith("/essays/");
}

/**
 * The header for a not-found page under a path that draws its own top: a missing essay 404s before the
 * reading view mounts its header, so without this the page would have none. Elsewhere the frame's header
 * already shows. It appears after hydration (client portal), not in the server markup.
 */
export function NotFoundHeader() {
  const pathname = usePathname() || "/";
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  // Portalled to the body: inside the page wrapper the header could not rise above the open menu.
  return mounted && pathname !== "/" && drawsOwnTop(pathname) ? createPortal(<SiteHeader />, document.body) : null;
}
