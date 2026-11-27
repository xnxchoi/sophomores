import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/en.json";
import { WithVerificationMessages } from "./verification-messages";
import { CursorProvider, DeviceProvider, HAStoreProvider } from "@/providers/RP_Pro";

/**
 * The same canonical catalogue used by the site, without network or request state. Like a purchase segment
 * (SegmentMessages), it also hands the phone verification flow its bilingual copy. It mounts the site's device, store
 * and cursor contexts too, as the site layout does: core Button and Link need them (owner, 27 Nov: controls go through
 * them so the cursor reacts).
 */
export function EnglishMessages({ children }: { children: ReactNode }) {
  return <NextIntlClientProvider locale="en" timeZone="Asia/Seoul" messages={messages}>
    <WithVerificationMessages>
      <DeviceProvider><HAStoreProvider><CursorProvider>{children}</CursorProvider></HAStoreProvider></DeviceProvider>
    </WithVerificationMessages>
  </NextIntlClientProvider>;
}
