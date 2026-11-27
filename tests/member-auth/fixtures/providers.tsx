import { EnglishMessages } from "../../fixtures/english-messages";
import { WithVerificationMessages } from "../../fixtures/verification-messages";
import type { ReactNode } from "react";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

const router: AppRouterInstance = {
  back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "member-auth-fixture"
};

/** Standalone account fixtures still render the site's real custom Link, with the copy a purchase segment delivers. */
export function MemberAuthProviders({ children }: { children: ReactNode }) {
  // The router sits outside, so EnglishMessages' SiteContexts keeps it and adds only the inert device, store and cursor.
  return <AppRouterContext.Provider value={router}>
    <EnglishMessages><WithVerificationMessages>{children}</WithVerificationMessages></EnglishMessages>
  </AppRouterContext.Provider>;
}
