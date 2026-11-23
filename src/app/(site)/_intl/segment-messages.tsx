import type { ReactNode } from "react";
import { pick } from "lodash-es";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

// A segment layout hands its pages their own namespaces (src/i18n/client-namespaces.ts). next-intl treats
// `messages` as atomic, so this provider replaces the shell's set for the page, not adds to it; locale, time zone
// and formats still come from the request config.
export async function SegmentMessages({
  namespaces,
  children
}: {
  namespaces: readonly string[];
  children: ReactNode;
}) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={pick(messages, namespaces)}>
      {children}
    </NextIntlClientProvider>
  );
}
