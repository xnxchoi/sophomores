import type { Metadata } from "next";
import "lenis/dist/lenis.css";
import "@/styles/globals.css";
import "@/styles/teaser.css";
import "@/styles/sphmrs.scss";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { headers } from "next/headers";
import { readHeaderMemberState } from "@/lib/member-auth/header-state.server";
import messages from "../../messages/en.json";
import { NotFoundPage } from "@/components/layouts/Missing/not-found-screen";
import { cn } from "@/lib/utils";
import { Providers } from "@/providers";
import { Suspense } from "react";
import { ClientLayout } from "./(site)/client-layout";
import { BusinessFooter } from "./(site)/_commerce/business-footer";
import { Hyd, message, NarcissianNectare, serif, Suit } from "../../fonts";

export const metadata: Metadata = {
  metadataBase: new URL("https://sophomores.co"),
  title: "404",
  description: messages.System.notFoundDescription,
  robots: { index: false, follow: false }
};

// Unmatched URLs (ADR 0002). This page bypasses every layout, so it renders the site's document itself.
// The 404 holds dark, and that hold is on the served <html>: it paints dark from the first frame with no
// script. The boot script is left out on purpose: it would apply the visitor's pick here, and this page
// neither reads nor saves it. Once mounted, the 404's own hold (MissingLayout) keeps the store dark.
export default async function GlobalNotFound() {
  const locale = await getLocale();
  const intlMessages = await getMessages();
  // Mirrors (site)/layout.tsx: this page bypasses it, so the header's account entry is read here too.
  const headerMember = readHeaderMemberState(await headers());

  return (
    <html
      lang={locale}
      data-theme="dark"
      suppressHydrationWarning
      className={cn(
        "dark",
        message.className,
        serif.className,
        serif.variable,
        NarcissianNectare.className,
        Suit.className,
        Hyd.className
      )}
    >
      <body data-themed="color, background-color">
        <NextIntlClientProvider locale={locale} messages={intlMessages}>
          <Providers>
            <ClientLayout headerMember={headerMember}>
              <NotFoundPage />
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
