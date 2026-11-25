import "@/styles/globals.css";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { cn } from "@/lib/utils";
import { pick } from "lodash-es";
import { AccountSheetProvider } from "@/components/auth/account-sheet";
import { VerificationMessages } from "@/components/Authentication/phone-verification/verification-messages";
import { verificationCatalogues } from "@/lib/phone-verification/messages.server";
import { accountSheetNamespaces } from "@/i18n/client-namespaces";
import { CursorProvider, DeviceProvider, HAStoreProvider } from "@/providers/RP_Pro";
import { message, NarcissianNectare, serif, Pretendard } from "../../../fonts";

// No loading boundary: a streaming fallback requires JS to reveal the form.
export default async function NfcRootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html
      lang={locale}
      className={cn("dark", message.variable, serif.variable, NarcissianNectare.variable, Pretendard.variable)}
      data-theme="dark"
    >
      <body className="bg-background text-foreground">
        <NextIntlClientProvider locale={locale} messages={{ ...pick(messages, accountSheetNamespaces), Customer: { app_site_nfc_tap: messages.Customer.app_site_nfc_tap } }}>
          {/* The tap's sign-in button opens the in-place sheet; without JavaScript its form goes to /sign-in. */}
          <DeviceProvider><HAStoreProvider><CursorProvider>
            <VerificationMessages messages={verificationCatalogues()}>
              <AccountSheetProvider>{children}</AccountSheetProvider>
            </VerificationMessages>
          </CursorProvider></HAStoreProvider></DeviceProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
