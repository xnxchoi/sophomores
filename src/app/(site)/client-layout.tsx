"use client";
import { useTranslations } from "next-intl";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { FXFrame } from "@/components/Shells/FXFrame";
import VGradient from "@/components/UX/Gradient";
import { MenuMediaPreview } from "@/components/UX/MediaPreview/MenuMediaPreview";
import { getMenuPagePreviewKey, getPageTypeFromUrl } from "@/utilities/Helpers";
import { HelpPill } from "./help-pill";
import { RP_Menu } from "@/components/UX/Menu";
import { RPage } from "@/components/UX/Transition";
import { isSettingsPath } from "@/components/UX/Transition/useTransitionSetter";
import { TourOrchestrator } from "@/components/UX/Tour";
import { CanvasBoundary } from "@/components/gl/canvas-boundary";
import { SharedCanvas } from "@/components/gl/shared-canvas";
import { InAppBrowserHelp } from "@/components/shell/in-app-browser-help";
import { HeaderMemberContext, hidesHeader, SiteHeader } from "@/components/shell/site-header";
import { NotificationProvider } from "@/components/notifications/notification-inbox";
import type { HeaderMemberState } from "@/lib/member-auth/header-state.server";
import { menuLinks } from "@/lib/content/menu";
import { useRPStore } from "@/providers/RP_Pro";
import { useIsMobile } from "@/providers/MiddleMan";

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
  const setNavigationPreviewMediaByKey = useRPStore((state) => state.setNavigationPreviewMediaByKey);
  useEffect(() => {
    // Cauterization: Hideaway filled these from the header global.
    setNavigationPageItemData(
      menuLinks.map((link) => ({
        link: { type: "custom", url: link.href, label: t(link.label) }
      }))
    );
    // The menu preview's keys, one per link, as The Hideaway's InitiateHeader builds them: no media, so the
    // preview is the gradient, and each key picks that link's colour scheme.
    setNavigationPreviewMediaByKey(
      Object.fromEntries(
        menuLinks.map((link) => [
          getMenuPagePreviewKey(getPageTypeFromUrl(link.href), link.href.split("/").pop() ?? ""),
          { desktop: null, mobile: null }
        ])
      )
    );
  }, [setNavigationPageItemData, setNavigationPreviewMediaByKey, t]);
  return null;
}

function SitePage({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const slug = pathname.split("/").filter(Boolean);
  // One page per pathname, except settings: its layout (rail and pane) stays across tabs and the pane owns
  // the fade (SHELL), as in The Hideaway, where RPage sits inside each settings page under a persistent layout.
  return (
    <RPage key={isSettingsPath(pathname) ? "/me/settings" : pathname} type="pages" slug={slug.length > 0 ? slug : ["home"]} headerVisibility={!hidesHeader(pathname)}>
      {children}
    </RPage>
  );
}

export function ClientLayout({ children, headerMember, contactEmail }: { children: ReactNode; headerMember?: Promise<HeaderMemberState>; contactEmail?: Promise<string | null> }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() || "/";
  // The page's transition sets the header's visibility when it finishes entering (RPage headerVisibility,
  // as The Hideaway does); home hides it, so set the same flag before the first paint too and home never
  // shows the header before hiding it (declared deviation: the masthead flash, Review-B v8a).
  const setHeaderVisibility = useRPStore((state) => state.setHeaderVisibility);
  useLayoutEffect(() => {
    setHeaderVisibility(!hidesHeader(pathname));
  }, [pathname, setHeaderVisibility]);
  // Touch phones: the fixed Controlbar (shell/controlbar) covers the screen's foot, so the page ends with
  // room for it, the strip's height: a 1px rule, its 64px row and 12px under it, plus the safe area.
  const { isMobile, isTouch } = useIsMobile();
  const controlbar = isMobile && isTouch;
  // The open menu holds the page back the way The Hideaway's does: its full-screen layer takes the pointer
  // and closes on a tap on the page, and the scroll stops (components/UX/Menu). No inert here.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <HeaderMemberContext value={headerMember}>
      {/* The shared inbox, above the header, the Controlbar and the page (The Hideaway: providers/index.tsx:50). */}
      <NotificationProvider userId="" notifications={[]}>
      <ViewportHeight />
      <div ref={frameRef} className="has-site-cursor">
        {/* The one header, on every page, first in the document (The Hideaway: app/(frontend)/layout.tsx:96). */}
        <SiteHeader member={headerMember} />
        {/* The open menu's preview: The Hideaway's gradient in the menu window (app/(frontend)/layout.tsx:102). */}
        <MenuMediaPreview>
          <VGradient />
        </MenuMediaPreview>
        <SitePage>{children}</SitePage>
        {/* The bottom bar's depth: the frame's 30 px foot, 1 px border, 64 px row and max(12 px, safe area − 18 px) padding
            (controlbar/index.tsx), so the page's end clears it. */}
        {controlbar && <div aria-hidden="true" className="h-[max(107px,calc(env(safe-area-inset-bottom)+77px))]" />}
        <SiteMenuLinks />
        <RP_Menu />
        <FXFrame />
        {contactEmail && <HelpPill contactEmail={contactEmail} />}
        <InAppBrowserHelp />
        {mounted && <TourOrchestrator />}
        <CanvasBoundary>
          <SharedCanvas eventSource={frameRef} />
        </CanvasBoundary>
      </div>
      </NotificationProvider>
    </HeaderMemberContext>
  );
}
