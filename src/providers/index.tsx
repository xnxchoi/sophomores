"use client";

import { PortalProvider } from "@/components/UX/Transition/Portaller";
import { HA_TooltipProvider } from "@/components/ui/tooltip";
import { SiteScroll } from "@/components/shell/site-scroll";
import { MobileProvider } from "@/providers/MiddleMan";
import { CursorProvider, DeviceProvider, HAStoreProvider, MenuProvider } from "@/providers/RP_Pro";
import { HeaderThemeProvider } from "@/providers/HeaderTheme";
import { CMDKeyManager, ThemeProvider } from "@/providers/Theme";
import { TransitionProvider } from "@/providers/TransitionProvider";
import { TourProvider } from "@/hideaway/components/UX/Tour";
import { LazyMotion, domAnimation } from "motion/react";
import type { ReactNode } from "react";

/**
 * Pass 1 provider stack. Search and notifications stay out.
 * Query and session stay the site's own reads and currentUser.
 * Voyageur is not mounted.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <DeviceProvider>
      <HAStoreProvider>
        <ThemeProvider>
          <CursorProvider>
            <MobileProvider>
              <LazyMotion features={domAnimation}>
                <SiteScroll>
                  <PortalProvider>
                    <TransitionProvider>
                      <MenuProvider>
                        <HA_TooltipProvider>
                          <TourProvider>
                            <HeaderThemeProvider>
                              <CMDKeyManager />
                              {children}
                            </HeaderThemeProvider>
                          </TourProvider>
                        </HA_TooltipProvider>
                      </MenuProvider>
                    </TransitionProvider>
                  </PortalProvider>
                </SiteScroll>
              </LazyMotion>
            </MobileProvider>
          </CursorProvider>
        </ThemeProvider>
      </HAStoreProvider>
    </DeviceProvider>
  );
}
