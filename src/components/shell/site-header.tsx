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
import { useEffect, useRef } from "react";
import { HeaderActions } from "./header-actions";


/** Hideaway `TWEEN_EASE.power3.inOut`. Menu open expands the header over 0.96s. */
const MENU_EASE = [0.77, 0, 0.175, 1] as const;

function paintHeader(header: HTMLElement, progress: number) {
  const width = window.innerWidth;
  const collapsed = width < 768 ? width - 32 : 645;
  const start = width - 40;
  header.style.width = `${start + progress * (collapsed - start)}px`;
  header.style.transform = `translate(-50%, ${progress * 12}px)`;
  header.style.setProperty("--header-logo", `${28 - progress * 6}px`);
  header.style.setProperty("--header-fx-blur", `${5 - 5 * progress}px`);
  header.style.setProperty("--header-fx-contrast", `${500 - 400 * progress}%`);
  header.style.setProperty("--header-fx-saturate", `${1500 - 1400 * progress}%`);
}

/** Hideaway's floating pill. Menu on the left, the mark in the center. */
export function SiteHeader({ posts, notifications }: { posts?: PostBody[]; notifications?: Notification[] }) {
  const headerRef = useRef<HTMLElement>(null);
  const open = useRPStore((state) => state.navIsOpen);
  const scrub = useMotionValue(0);
  const scrollPx = useRef(0);
  const running = useRef<AnimationPlaybackControls | null>(null);
  const locked = useRef(false);

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
      className="site-header fixed top-3 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] h-12 lg:h-[54px] overflow-hidden rounded-full bg-[oklch(from_var(--off-bg)_l_c_h_/_0.72)] backdrop-blur-[20px]"
      data-menu={open ? "open" : "closed"}
      style={{ zIndex: open ? 7 : siteLayer.header, ["--header-logo" as string]: "28px" }}
    >
      <div className="site-header-fx pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="site-header-fx-a pointer-events-none absolute inset-0 opacity-50 backdrop-blur-[var(--header-fx-blur,5px)] backdrop-contrast-[var(--header-fx-contrast,500%)] backdrop-saturate-[1500%]" />
        <div className="site-header-fx-b pointer-events-none absolute inset-0 opacity-75 blur-[var(--header-fx-blur,5px)] contrast-[var(--header-fx-contrast,500%)] saturate-[var(--header-fx-saturate,1500%)]" />
      </div>
      <div className="site-header-inner relative z-2 flex h-full items-center justify-between px-5">
        <MenuButton />
        <Link href="/" aria-label="Sophomores" className="site-header-logo absolute left-1/2 -translate-x-1/2">
          <BrandMark className="site-header-mark text-[length:var(--header-logo,28px)] leading-none">Sophomores</BrandMark>
        </Link>
        <HeaderActions posts={posts} notifications={notifications} />
      </div>
    </header>
  );
}
