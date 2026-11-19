"use client";
import { useTranslations } from "next-intl";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { RP_Menu } from "@/components/UX/Menu";
import { RPage } from "@/components/UX/Transition";
import { TourOrchestrator } from "@/components/UX/Tour";
import { CanvasBoundary } from "@/components/gl/canvas-boundary";
import { SharedCanvas } from "@/components/gl/shared-canvas";
import { InAppBrowserHelp } from "@/components/shell/in-app-browser-help";
import { drawsOwnTop, SiteHeader } from "@/components/shell/site-header";
import type { HeaderMemberState } from "@/lib/member-auth/header-state.server";
import { menuLinks } from "@/lib/content/menu";
import { useRPStore } from "@/providers/RP_Pro";

function ViewportHeight() {
  useEffect(() => {
    const apply = () => {
      document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);
  return null;
}

function SiteMenuLinks() {
  const t = useTranslations("Customer.navigation");
  const setNavigationPageItemData = useRPStore((state) => state.setNavigationPageItemData);
  useEffect(() => {
    // Cauterization: Hideaway filled these from the header global.
    setNavigationPageItemData(
      menuLinks.map((link) => ({
        link: { type: "custom", url: link.href, label: t(link.label) }
      }))
    );
  }, [setNavigationPageItemData, t]);
  return null;
}

function SitePage({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const slug = pathname.split("/").filter(Boolean);
  return (
    <RPage key={pathname} type="pages" slug={slug.length > 0 ? slug : ["home"]}>
      {children}
    </RPage>
  );
}

export function ClientLayout({ children, headerMember }: { children: ReactNode; headerMember?: Promise<HeaderMemberState> }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() || "/";
  // While the menu is open the page behind it is inert, so keyboard and pointer stay in the menu and the
  // header that holds Close; the browser's own Tab order then covers just those. display: contents keeps
  // the page's layout as it was.
  const menuOpen = useRPStore((state) => state.navIsOpen);
  const ownTop = drawsOwnTop(pathname);
  const pageRef = useRef<HTMLDivElement>(null);
  // A page that draws its own top keeps its header (and Close) inside the page, so the page can't be inert
  // whole. While the menu is open, everything in it except the branch that holds the header is. The essay
  // header sits inside the reading view's own <main>, so no layout container separates it; instead the
  // isolation is re-applied whenever the page's nodes change (streamed content, a header that arrives
  // after a fallback), and only attributes this effect set are removed.
  useEffect(() => {
    const page = pageRef.current;
    // Home runs its own teaser menu, not this one.
    if (!menuOpen || !ownTop || pathname === "/" || !page) return;
    const held = new Set<Element>();
    const apply = () => {
      const want = new Set<Element>();
      const header = page.querySelector("#rp-header");
      // No header inside the page (e.g. a missing essay, whose header is portalled to the body): all of
      // the page. Its children, not the wrapper, whose own inert React sets for frame-owned pages.
      if (!header) for (const child of Array.from(page.children)) want.add(child);
      for (let node: Element | null = header; node && node !== page; node = node.parentElement) {
        for (const sibling of Array.from(node.parentElement?.children ?? [])) {
          if (sibling !== node) want.add(sibling);
        }
      }
      held.forEach((element) => {
        if (want.has(element)) return;
        element.removeAttribute("inert");
        held.delete(element);
      });
      want.forEach((element) => {
        if (held.has(element) || element.hasAttribute("inert")) return;
        element.setAttribute("inert", "");
        held.add(element);
      });
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(page, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      held.forEach((element) => element.removeAttribute("inert"));
    };
  }, [menuOpen, ownTop, pathname]);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <>
      <ViewportHeight />
      <div ref={frameRef} className="has-site-cursor">
        <div ref={pageRef} inert={menuOpen && !ownTop} className="contents">
          <SitePage>{children}</SitePage>
        </div>
        {!ownTop && <SiteHeader member={headerMember} />}
        <SiteMenuLinks />
        <RP_Menu />
        <InAppBrowserHelp />
        {mounted && <TourOrchestrator />}
        <CanvasBoundary>
          <SharedCanvas eventSource={frameRef} />
        </CanvasBoundary>
      </div>
    </>
  );
}
