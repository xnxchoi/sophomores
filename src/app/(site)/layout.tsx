import type { Metadata } from "next";
import "lenis/dist/lenis.css";
import "@/styles/globals.css";
import "@/styles/teaser.css";
import "@/styles/sphmrs.scss";
import { Suspense, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ClientLayout } from "./client-layout";
import { BusinessFooter } from "./_commerce/business-footer";
import { FooterGate } from "@/components/shell/footer-visibility";
import { Providers } from "@/providers";
import { themeBoot } from "@/lib/content/theme";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { headers } from "next/headers";
import { readHeaderMemberState } from "@/lib/member-auth/header-state.server";
import { GeistMono } from "geist/font/mono";
import { message, NarcissianNectare, serif, Suit } from "../../../fonts";

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
      // Dark until the boot script below applies the pick, the device setting or the page's hold, so the
      // first frame without script is dark too (ADR 0002). The boot script and the theme provider own both
      // attributes from then on; React doesn't rewrite them (the prop never changes).
      data-theme="dark"
      suppressHydrationWarning
      // Font loaders only define variables here; the typography roles in globals.css choose the faces.
      // A loader's .className would set font-family on <html> directly and override the roles.
      className={cn(
        "dark",
        message.variable,
        serif.variable,
        NarcissianNectare.variable,
        Suit.variable,
        GeistMono.variable
      )}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body data-themed="color, background-color">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <ClientLayout headerMember={headerMember}>
              {children}
              <FooterGate>
                <Suspense fallback={null}>
                  <BusinessFooter />
                </Suspense>
              </FooterGate>
            </ClientLayout>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
