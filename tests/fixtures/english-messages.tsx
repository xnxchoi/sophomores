import { type ReactNode, useContext } from "react";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/en.json";
import { WithVerificationMessages } from "./verification-messages";
import { CursorProvider, DeviceProvider, HAStoreProvider } from "@/providers/RP_Pro";

/**
 * The same canonical catalogue used by the site, without network or request state. Like a purchase segment
 * (SegmentMessages), it also hands the phone verification flow its bilingual copy. It mounts the site's device, store
 * and cursor contexts too, as the site layout does: core Button and Link need them (owner, 27 Nov: controls go through
 * them so the cursor reacts). Core Link's page transition also needs an app router: a test that mounts its own (to spy
 * on navigation) keeps it; otherwise a no-op one stands in.
 */
export function EnglishMessages({ children }: { children: ReactNode }) {
  return <NextIntlClientProvider locale="en" timeZone="Asia/Seoul" messages={messages}>
    <WithVerificationMessages>
      <WithRouter>
        <DeviceProvider><HAStoreProvider><CursorProvider>{children}</CursorProvider></HAStoreProvider></DeviceProvider>
      </WithRouter>
    </WithVerificationMessages>
  </NextIntlClientProvider>;
}

const inertRouter: AppRouterInstance = {
  back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "english-messages-fixture"
};

function WithRouter({ children }: { children: ReactNode }) {
  return useContext(AppRouterContext) ? children : <AppRouterContext.Provider value={inertRouter}>{children}</AppRouterContext.Provider>;
}
