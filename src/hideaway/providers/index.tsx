"use client";

import { HA_TooltipProvider as TooltipProvider } from "@/components/ui/tooltip";
import { TourOrchestrator, TourProvider } from "@/hideaway/components/UX/Tour";
import { PortalProvider } from "@/hideaway/components/UX/Transition/Portaller";
import {
  CursorProvider,
  DeviceProvider,
  HAStoreProvider,
  MenuProvider,
  SearchBarProvider
} from "@/hideaway/providers/RP_Pro";
import { useRPSession } from "@/lib/auth/session/RP_SessionProvider";
import { NotificationProvider } from "@/hideaway/providers/Notifications";
import { MiddleMan } from "@/hideaway/providers/MiddleMan";
import { Voyageur } from "@/hideaway/stores/Routing/RP_Voyageur";
import { LazyMotion } from "motion/react";
import React from "react";
import { useShallow } from "zustand/shallow";
import { HeaderThemeProvider } from "./HeaderTheme";
import { QueryProvider } from "./QueryProvider";
import { SessionProvider } from "./Session/providers";
import { CMDKeyManager, ThemeProvider } from "./Theme";
import { TransitionProvider } from "./TransitionProvider";

const motion = () => import("./Motion").then((r) => r.default);

/**
 * Mounts NotificationProvider once at the top of the tree so any client
 * surface (Header, RP_Menu, SideDrawer, Controlbar, pages) can call
 * `useNotifications()` without per-surface wrapping. The provider's
 * orchestrator pulls the live session via `useRPSession`, so the initial
 * `user` prop is just a seed — empty string is fine for signed-out users
 * (the query is gated by `Boolean(sessionUser)` internally).
 */
const GlobalNotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const userId = useRPSession(useShallow((r) => r.id)) ?? "";
  return <NotificationProvider user={userId}>{children}</NotificationProvider>;
};
export const Providers: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <QueryProvider>
      <DeviceProvider>
        <Voyageur>
          <SessionProvider>
            <GlobalNotificationProvider>
              <HAStoreProvider>
                <ThemeProvider>
                  <LazyMotion features={motion} strict={true}>
                    <CursorProvider>
                      <PortalProvider>
                        <TransitionProvider>
                          <MenuProvider>
                            <SearchBarProvider>
                              <MiddleMan>
                                <TooltipProvider>
                                  <CMDKeyManager />
                                  <TourProvider>
                                    <TourOrchestrator />
                                    <HeaderThemeProvider>
                                      {children}
                                    </HeaderThemeProvider>
                                  </TourProvider>
                                </TooltipProvider>
                              </MiddleMan>
                            </SearchBarProvider>
                          </MenuProvider>
                        </TransitionProvider>
                      </PortalProvider>
                    </CursorProvider>
                  </LazyMotion>
                </ThemeProvider>
              </HAStoreProvider>
            </GlobalNotificationProvider>
          </SessionProvider>
        </Voyageur>
      </DeviceProvider>
    </QueryProvider>
  );
};
