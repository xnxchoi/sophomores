import type { Metadata } from "next";
import "lenis/dist/lenis.css";
import "@/styles/globals.css";
import "@/styles/teaser.css";
import "@/styles/sphmrs.scss";
import { Suspense, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ClientLayout } from "./client-layout";
import { BusinessFooter } from "./_commerce/business-footer";
import { Providers } from "@/providers";
import { themeBoot } from "@/lib/content/theme";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { headers } from "next/headers";
import { readHeaderMemberState } from "@/lib/member-auth/header-state.server";
import { Hyd, message, NarcissianNectare, serif, Suit } from "../../../fonts";

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
  // The header's account entry reads signed-in state per request (R-P17b). Not awaited: the header
  // streams it in, and a slow or failed read shows a plain Account link.
  const headerMember = readHeaderMemberState(await headers());

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
            <ClientLayout headerMember={headerMember}>
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
