import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/en.json";

/** The same canonical catalogue used by the site, without network or request state. */
export function EnglishMessages({ children }: { children: ReactNode }) {
  return <NextIntlClientProvider locale="en" timeZone="Asia/Seoul" messages={messages}>{children}</NextIntlClientProvider>;
}
