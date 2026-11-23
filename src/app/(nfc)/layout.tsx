import "@/styles/globals.css";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { cn } from "@/lib/utils";
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
        <NextIntlClientProvider locale={locale} messages={{ Customer: { app_site_nfc_tap: messages.Customer.app_site_nfc_tap } }}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
