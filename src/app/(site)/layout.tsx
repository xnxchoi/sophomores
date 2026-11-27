import type { Metadata } from "next";
import "lenis/dist/lenis.css";
import "@/styles/globals.css";
import "@/styles/teaser.css";
import "@/styles/sphmrs.scss";
import { Suspense, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ClientLayout } from "./client-layout";
import { AccountSheetProvider } from "@/components/auth/account-sheet";
import { VerificationMessages } from "@/components/Authentication/phone-verification/verification-messages";
import { verificationCatalogues } from "@/lib/phone-verification/messages.server";
import { Footer } from "@/components/shell/Footer/footer";
import { FooterGate, PageCover } from "@/components/shell/Footer/footer-visibility";
import { loadBusinessInformation } from "@/payload/globals/business-info";
import { Providers } from "@/providers";
import { themeBoot } from "@/lib/content/theme";
import { NextIntlClientProvider } from "next-intl";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadSiteEditorial } from "@/payload/globals/site-editorial";
import { getLocale, getMessages } from "next-intl/server";
import { pick } from "lodash-es";
import { shellDelivery } from "@/i18n/client-namespaces";
import { headers } from "next/headers";
import { readHeaderMemberState } from "@/lib/member-auth/header-state.server";
import { message, NarcissianNectare, serif, Pretendard } from "../../../fonts";

/**
 * The title and description are the business's (site-editorial global, seeded with the text this layout
 * carried before). The origin and robots stay deployment-owned here.
 */
export async function generateMetadata(): Promise<Metadata> {
  const base: Metadata = {
    metadataBase: new URL("https://sophomores.co"),
    robots: { index: false, follow: false }
  };
  try {
    const site = await loadSiteEditorial(
      await getPayload({ config }),
      (await getLocale()) === "ko" ? "ko" : "en"
    );
    return {
      ...base,
      ...(site.title ? { title: site.title } : {}),
      ...(site.description ? { description: site.description } : {})
    };
  } catch {
    console.error("Site details are unavailable.");
    return base;
  }
}

/** The published customer-service email for the Help pill's Contact, or null until all seven facts are filled. */
async function readContactEmail(): Promise<string | null> {
  try {
    return (
      (await loadBusinessInformation(await getPayload({ config }))).facts
        ?.customerServiceEmail ?? null
    );
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  // The header's account entry reads signed-in state per request (R-P17b). Not awaited: the header
  // streams it in, and a slow or failed read shows a plain Account link.
  const headerMember = readHeaderMemberState(await headers());
  // Not awaited either: the pill shows at once and Contact joins it when the read lands.
  const contactEmail = readContactEmail();

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
        // The shop shelf's scroll catch holds the page with this attribute while it glides (shop/use-shelf-catch.tsx).
        "data-shelf-scroll-lock:overflow-hidden data-shelf-scroll-lock:[scrollbar-gutter:stable]",
        message.variable,
        serif.variable,
        NarcissianNectare.variable,
        Pretendard.variable
      )}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body data-themed="color, background-color">
        <NextIntlClientProvider
          locale={locale}
          messages={pick(messages, shellDelivery)}
        >
          <Providers>
            {/* One in-place sign-in sheet for the site's sign-in buttons, with the phone step's bilingual copy. */}
            <VerificationMessages messages={verificationCatalogues()}>
            <AccountSheetProvider>
            <ClientLayout
              headerMember={headerMember}
              contactEmail={contactEmail}
            >
              <PageCover>{children}</PageCover>
              <FooterGate>
                <Suspense fallback={null}>
                  <Footer />
                </Suspense>
              </FooterGate>
            </ClientLayout>
            </AccountSheetProvider>
            </VerificationMessages>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
