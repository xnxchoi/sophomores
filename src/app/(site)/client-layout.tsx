"use client";
import { useTranslations } from "next-intl";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { RP_Menu } from "@/components/UX/Menu";
import { RPage } from "@/components/UX/Transition";
import { TourOrchestrator } from "@/components/UX/Tour";
import { CanvasBoundary } from "@/components/gl/canvas-boundary";
import { CanvasGrain } from "@/components/gl/canvas-grain";
import { SharedCanvas } from "@/components/gl/shared-canvas";
import { SiteHeader } from "@/components/shell/site-header";
import { menuLinks } from "@/lib/content/menu";
import { useRPStore } from "@/providers/RP_Pro";

function ViewportHeight() {
  useEffect(() => {
    const apply = () => {
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`
      );
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);
  return null;
}

function SiteMenuLinks() {
  const t = useTranslations("Customer.navigation");
  const setNavigationPageItemData = useRPStore(
    (state) => state.setNavigationPageItemData
  );
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

/**
 * Pages that draw their own top, so the frame leaves the header bar to them: the home page's masthead
 * (`components/teaser/hero.tsx`) and the essays reading view, which mounts the bar itself with its live posts
 * and notifications (`components/reading/reading-stage.tsx`).
 */
function drawsOwnTop(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/essays" ||
    pathname.startsWith("/essays/")
  );
}

export function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const frameRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <>
      <ViewportHeight />
      <div ref={frameRef} className="has-site-cursor">
        {!drawsOwnTop(pathname) && <SiteHeader />}
        <SitePage>{children}</SitePage>
        <SiteMenuLinks />
        <RP_Menu />
        {mounted && <TourOrchestrator />}
        <CanvasBoundary fallback={<CanvasGrain standalone />}>
          <SharedCanvas eventSource={frameRef} />
        </CanvasBoundary>
      </div>
    </>
  );
}
