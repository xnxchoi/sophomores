"use client";

import { siteLayer } from "@/components/gl/layers";
import { useSiteMenu } from "@/lib/content/menu";
import { BrandMark } from "@/lib/brand";
import Link from "next/link";
import { getNextHeaderScrubPosition } from "@/lib/content/header-motion";
import { useLenis } from "lenis/react";
import { useRef } from "react";
import { HeaderActions } from "./header-actions";
import { MenuButton } from "./menu-button";

/** Hideaway's floating pill. Menu on the left, the mark in the center. */
export function SiteHeader() {
  const headerRef = useRef<HTMLElement>(null);
  const open = useSiteMenu((state) => state.open);
  const scrubRef = useRef(0);

  useLenis((lenis) => {
    const header = headerRef.current;
    if (!header) return;
    const latest = typeof lenis.animatedScroll === "number" ? lenis.animatedScroll : window.scrollY;
    scrubRef.current = getNextHeaderScrubPosition({
      currentScrub: scrubRef.current,
      latestScroll: latest > 50 ? latest - 50 : 0
    });
    const progress = scrubRef.current;
    const width = window.innerWidth;
    const collapsed = width < 768 ? width - 32 : 645;
    const start = width - 40;
    header.style.width = `${start + progress * (collapsed - start)}px`;
    header.style.transform = `translate(-50%, ${progress * 12}px)`;
    header.style.setProperty("--header-logo", `${28 - progress * 6}px`);
    header.style.setProperty("--header-fx-blur", `${5 - 5 * progress}px`);
    header.style.setProperty("--header-fx-contrast", `${500 - 400 * progress}%`);
    header.style.setProperty("--header-fx-saturate", `${1500 - 1400 * progress}%`);
  });

  return (
    <header
      ref={headerRef}
      id="rp-header"
      className="site-header"
      style={{ zIndex: open ? 7 : siteLayer.header, ["--header-logo" as string]: "28px" }}
    >
      <div className="site-header-fx" aria-hidden="true">
        <div className="site-header-fx-a" />
        <div className="site-header-fx-b" />
      </div>
      <div className="site-header-inner">
        <MenuButton />
        <Link href="/" aria-label="Sophomores" className="site-header-logo">
          <BrandMark className="site-header-mark">Sophomores</BrandMark>
        </Link>
        <HeaderActions />
      </div>
    </header>
  );
}
