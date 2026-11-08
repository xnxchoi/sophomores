"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { LazyMotion, domAnimation } from "motion/react";
import { usePathname } from "next/navigation";
import { RPage } from "@/components/UX/Transition";
import { TourOrchestrator, TourProvider } from "@/components/UX/Tour";
import { SiteCursor } from "@/components/shell/cursor";
import { SiteMenu } from "@/components/shell/site-menu";
import { SiteScroll } from "@/components/shell/site-scroll";
import { SiteTheme } from "@/components/shell/site-theme";
import { CursorProvider, DeviceProvider, HAStoreProvider, MenuProvider } from "@/providers/RP_Pro";
import { ThemeProvider } from "@/providers/Theme";
import { TransitionProvider } from "@/providers/TransitionProvider";
import { Voyageur } from "@/stores/Routing/RP_Voyageur";
import { CanvasBoundary } from "./canvas-boundary";
import { SharedCanvas } from "./shared-canvas";

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
 * Public site frame. Page leave and enter are Hideaway's TransitionProvider
 * (curtain, lost-product scale, fade). RPage owns the menu-open page scale.
 */
export function SiteFrame({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <DeviceProvider>
      <HAStoreProvider>
        <Voyageur>
          <ThemeProvider>
            <CursorProvider>
              <LazyMotion features={domAnimation}>
                <SiteScroll>
                  <TransitionProvider>
                    <MenuProvider>
                      <TourProvider>
                        <ViewportHeight />
                        <div ref={frameRef} className="has-site-cursor">
                          <SiteTheme />
                          <SitePage>{children}</SitePage>
                          <SiteMenu />
                          <SiteCursor />
                          {mounted && <TourOrchestrator />}
                          <CanvasBoundary>
                            <SharedCanvas eventSource={frameRef} />
                          </CanvasBoundary>
                        </div>
                      </TourProvider>
                    </MenuProvider>
                  </TransitionProvider>
                </SiteScroll>
              </LazyMotion>
            </CursorProvider>
          </ThemeProvider>
        </Voyageur>
      </HAStoreProvider>
    </DeviceProvider>
  );
}
