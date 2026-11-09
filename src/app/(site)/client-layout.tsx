"use client";
import { useTranslations } from "next-intl";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { RP_Menu } from "@/components/UX/Menu";
import { RPage } from "@/components/UX/Transition";
import { TourOrchestrator } from "@/components/UX/Tour";
import { CanvasBoundary } from "@/components/gl/canvas-boundary";
import { SharedCanvas } from "@/components/gl/shared-canvas";
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

export function ClientLayout({ children }: { children: ReactNode }) {
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
        <SitePage>{children}</SitePage>
        <SiteMenuLinks />
        <RP_Menu />
        {mounted && <TourOrchestrator />}
        <CanvasBoundary>
          <SharedCanvas eventSource={frameRef} />
        </CanvasBoundary>
      </div>
    </>
  );
}
