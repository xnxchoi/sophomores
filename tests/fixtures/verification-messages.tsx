import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VerificationMessages } from "../../src/components/Authentication/phone-verification/verification-messages";
import { verificationCatalogues } from "../../src/lib/phone-verification/messages.server";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { CursorProvider, DeviceProvider, HAStoreProvider } from "@/providers/RP_Pro";

const router: AppRouterInstance = {
  back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "verification-fixture",
};

/** What a purchase segment hands the phone verification flow (SegmentMessages): its copy in both locales. */
export function WithVerificationMessages({
  children
}: {
  children: ReactNode;
}) {
  return (
    <VerificationMessages messages={verificationCatalogues()}>
      {children}
    </VerificationMessages>
  );
}

/** Server markup of a verification surface, with the copy its segment would deliver. */
export const renderVerificationMarkup = (node: ReactNode) =>
  renderToStaticMarkup(
    <AppRouterContext.Provider value={router}>
      <DeviceProvider><HAStoreProvider><CursorProvider>
        <WithVerificationMessages>{node}</WithVerificationMessages>
      </CursorProvider></HAStoreProvider></DeviceProvider>
    </AppRouterContext.Provider>
  );
