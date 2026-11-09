import type { ReactNode } from "react";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { CursorProvider, DeviceProvider, HAStoreProvider } from "@/providers/RP_Pro";

const router: AppRouterInstance = {
  back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "member-auth-fixture"
};

/** Standalone account fixtures still render the site's real custom Link. */
export function MemberAuthProviders({ children }: { children: ReactNode }) {
  return <AppRouterContext.Provider value={router}>
    <DeviceProvider><HAStoreProvider><CursorProvider>{children}</CursorProvider></HAStoreProvider></DeviceProvider>
  </AppRouterContext.Provider>;
}
