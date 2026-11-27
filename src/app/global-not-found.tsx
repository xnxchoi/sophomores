import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import "lenis/dist/lenis.css";
import "@/styles/globals.css";
import "@/styles/teaser.css";
import "@/styles/sphmrs.scss";
import { NextIntlClientProvider } from "next-intl";
import { pick } from "lodash-es";
import { shellDelivery } from "@/i18n/client-namespaces";
import { getLocale, getMessages } from "next-intl/server";
import { headers } from "next/headers";
import { readHeaderMemberState } from "@/lib/member-auth/header-state.server";
import { NotFoundPage } from "@/components/layouts/Missing/not-found-screen";
import { cn } from "@/lib/utils";
import { Providers } from "@/providers";
import { Suspense } from "react";
import { ClientLayout } from "./(site)/client-layout";
import { Footer } from "@/components/shell/Footer/footer";
import { message, NarcissianNectare, serif, Pretendard } from "../../fonts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("System");
  return {
    metadataBase: new URL("https://sophomores.co"),
    // The Hideaway's 404 title, as served (hideawayseoul.com, 24 Nov).
    title: "404...",
    description: t("notFoundDescription"),
    robots: { index: false, follow: false }
  };
}

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
      // The same font loaders as (site)/layout.tsx, and like it only their variables: the typography roles in
      // globals.css choose the faces. A loader's .className would set font-family on <html> and override them.
      className={cn(
        "dark",
        message.variable,
        serif.variable,
        NarcissianNectare.variable,
        Pretendard.variable
      )}
    >
      <body data-themed="color, background-color">
        <NextIntlClientProvider
          locale={locale}
          messages={pick(intlMessages, shellDelivery)}
        >
          <Providers>
            <ClientLayout headerMember={headerMember}>
              <NotFoundPage />
              <Suspense fallback={null}>
                <Footer />
              </Suspense>
            </ClientLayout>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
