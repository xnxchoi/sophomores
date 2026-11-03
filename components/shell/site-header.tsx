"use client";

import { useEffect, useRef } from "react";
import { siteLayer } from "@/components/gl/layers";
import { getNextHeaderScrubPosition } from "@/lib/content/header-motion";

export function SiteHeader({
  links
}: {
  links: Array<{ href: string; label: string }>;
}) {
  const headerRef = useRef<HTMLElement>(null);
  const scrubRef = useRef(0);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const header = headerRef.current;
        if (!header) return;
        scrubRef.current = getNextHeaderScrubPosition({
          currentScrub: scrubRef.current,
          latestScroll: window.scrollY
        });
        header.style.paddingBlock = `${1.25 - scrubRef.current * 0.5}rem`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className="port-rule sticky top-0 border-b bg-off-black/90 backdrop-blur-md"
      style={{ paddingBlock: "1.25rem", zIndex: siteLayer.header }}
    >
      <div className="mx-auto flex items-end justify-between px-6">
        <a href="/reading" className="font-serif text-2xl font-light tracking-tight">
          Reading
        </a>
        <nav className="flex gap-5 text-xs uppercase tracking-[0.18em] text-white/70">
          {links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
