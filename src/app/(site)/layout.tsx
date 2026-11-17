import type { Metadata } from "next";
import "lenis/dist/lenis.css";
import "@/styles/globals.css";
import "@/styles/teaser.css";
import "@/components/arc/foundation.css";
import "@/styles/sphmrs.scss";
import { Suspense, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ClientLayout } from "./client-layout";
import { BusinessFooter } from "./_commerce/business-footer";
import { Providers } from "@/providers";
import { themeBoot } from "@/lib/content/theme";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Hyd, message, NarcissianNectare, serif, Suit } from "../../../fonts";

export const metadata: Metadata = {
  metadataBase: new URL("https://sophomores.co"),
  title: "sophomores.",

  robots: { index: false, follow: false }
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        message.className,
        serif.className,
        // Defines --font-teaser-serif for the font-teaser-serif utility; the class
        // alone sets a font-family but no variable.
        serif.variable,
        NarcissianNectare.className,
        Suit.className,

        Hyd.className
      )}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <ClientLayout>
              {children}
              <Suspense fallback={null}>
                <BusinessFooter />
              </Suspense>
            </ClientLayout>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
