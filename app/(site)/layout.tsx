import type { Metadata } from "next";
import "lenis/dist/lenis.css";
import "@/styles/globals.css";
import "@/styles/teaser.css";
import { Hyd, NarcissianNectare, Suit, message, serif } from "@/fonts";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SiteFrame } from "@/components/gl/site-frame";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

export const metadata: Metadata = {
  metadataBase: new URL("https://sophomores.co"),
  title: "sophomores — experienced. not finished.",
  description:
    "A private social club. A first night. Something is taking shape.",
  robots: { index: false, follow: false }
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={cn(
        message.variable,
        serif.variable,
        NarcissianNectare.variable,
        Suit.variable,
        Hyd.variable
      )}
    >
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SiteFrame>{children}</SiteFrame>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
