import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/en.json";
import { WithVerificationMessages } from "./verification-messages";

/**
 * The same canonical catalogue used by the site, without network or request state. Like a purchase segment
 * (SegmentMessages), it also hands the phone verification flow its bilingual copy.
 */
export function EnglishMessages({ children }: { children: ReactNode }) {
  return <NextIntlClientProvider locale="en" timeZone="Asia/Seoul" messages={messages}>
    <WithVerificationMessages>{children}</WithVerificationMessages>
  </NextIntlClientProvider>;
}
