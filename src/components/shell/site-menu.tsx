"use client";
import { useTranslations } from "next-intl";


import { CanvasBoundary } from "@/components/gl/canvas-boundary";
import { siteLayer } from "@/components/gl/layers";
import { menuLinks, useSiteMenu } from "@/lib/content/menu";
import { useRPStore } from "@/providers/RP_Pro";
import { Link } from "@/components/core/Link/Link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useLenis } from "lenis/react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { Suspense, useEffect } from "react";
import { MenuFrame } from "./menu-frame";
import { MenuGradient } from "./menu-gradient";

/** The nav, the window preview, and the gradient behind the frame. */
export function SiteMenu() {
  const navT = useTranslations("Customer.navigation");
  const t = useTranslations('Customer.components_shell_site_menu');
  const open = useSiteMenu((state) => state.open);
  const preview = useSiteMenu((state) => state.preview);
  const close = useSiteMenu((state) => state.close);
  const setPreview = useSiteMenu((state) => state.setPreview);
  const lenis = useLenis();
  const setNavIsOpen = useRPStore((state) => state.setNavIsOpen);
  const setNavOpeningElement = useRPStore((state) => state.setNavOpeningElement);

  useEffect(() => {
    setNavIsOpen(open);
  }, [open, setNavIsOpen]);

  useEffect(() => {
    const hole = document.getElementById("navWindow");
    if (hole instanceof HTMLDivElement) setNavOpeningElement(hole);
  }, [setNavOpeningElement]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lenis?.stop();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      lenis?.start();
      document.removeEventListener("keydown", onKey);
    };
  }, [close, lenis, open]);

  return (
    <div
      className={cn(
        "site-menu fixed inset-0 overflow-hidden pointer-events-none text-[var(--faded-fg)] [--menu-gutter:20px] [--menu-offset:80px] [--menu-window:30vw]",
        open && "is-open pointer-events-auto"
      )}
      style={{ zIndex: siteLayer.menu }}
      aria-hidden={open ? undefined : true}
    >
      <MenuFrame open={open} onWindowClick={open ? close : undefined}>
        {open ? (
          <CanvasBoundary>
            <Suspense fallback={null}>
              <MenuGradient />
            </Suspense>
          </CanvasBoundary>
        ) : null}
        {preview ? (
          <Image src={preview.src} alt={navT(preview.alt)} fill sizes="30vw" className="object-cover" />
        ) : null}
      </MenuFrame>
      <nav className="site-menu-nav absolute top-1/2 left-[var(--menu-gutter)] z-3 -translate-y-1/2" aria-label={t('menu')}>
        <AnimatePresence>
          {open ? (
            <m.ul
              className="flex flex-col gap-3"
              initial={{ opacity: 0, x: -150 }}
              animate={{
                opacity: 1,
                x: 0,
                transition: { delay: 0.75, duration: 1.2, ease: [0.165, 0.84, 0.44, 1] }
              }}
              exit={{
                opacity: 0,
                x: -150,
                transition: { duration: 0.9, ease: [0.165, 0.84, 0.44, 1] }
              }}
            >
              {menuLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-serif text-4xl font-light tracking-tight"
                    onMouseEnter={() => setPreview(link.preview ?? null)}
                    onMouseLeave={() => setPreview(null)}
                    onFocus={() => setPreview(link.preview ?? null)}
                    onBlur={() => setPreview(null)}
                    onClick={close}
                  >
                    {navT(link.label)}
                  </Link>
                </li>
              ))}
            </m.ul>
          ) : null}
        </AnimatePresence>
      </nav>
      <m.p
        className="menu-year absolute bottom-[var(--menu-gutter)] left-[var(--menu-gutter)] z-3 text-xs tracking-[0.08em]"
        initial={false}
        animate={open ? { opacity: 1, visibility: "visible" } : { opacity: 0, visibility: "hidden" }}
        transition={{ delay: open ? 0.5 : 0, duration: 1.2 }}
      >
        ©{new Date().getFullYear()}
      </m.p>
    </div>
  );
}
