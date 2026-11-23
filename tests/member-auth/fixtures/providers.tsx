import { EnglishMessages } from "../../fixtures/english-messages";
import { WithVerificationMessages } from "../../fixtures/verification-messages";
import type { ReactNode } from "react";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { CursorProvider, DeviceProvider, HAStoreProvider } from "@/providers/RP_Pro";

const router: AppRouterInstance = {
  back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "member-auth-fixture"
};

/** Standalone account fixtures still render the site's real custom Link, with the copy a purchase segment delivers. */
export function MemberAuthProviders({ children }: { children: ReactNode }) {
  return <EnglishMessages><WithVerificationMessages><AppRouterContext.Provider value={router}>
    <DeviceProvider><HAStoreProvider><CursorProvider>{children}</CursorProvider></HAStoreProvider></DeviceProvider>
  </AppRouterContext.Provider></WithVerificationMessages></EnglishMessages>;
}
