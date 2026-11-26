import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { VerificationMessages } from "../../src/components/Authentication/phone-verification/verification-messages";
import { verificationCatalogues } from "../../src/lib/phone-verification/messages.server";

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

// Verification surfaces render inside the app router; their links go through the site's transition router.
const router: AppRouterInstance = {
  back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "verification-fixture"
};

/** Server markup of a verification surface, with the copy its segment would deliver. */
export const renderVerificationMarkup = (node: ReactNode) =>
  renderToStaticMarkup(
    <AppRouterContext.Provider value={router}>
      <WithVerificationMessages>{node}</WithVerificationMessages>
    </AppRouterContext.Provider>
  );
