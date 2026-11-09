import type { Metadata } from "next";
import "lenis/dist/lenis.css";
import "@/styles/globals.css";
import "@/styles/teaser.css";
import "@/styles/sphmrs.scss";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ClientLayout } from "./client-layout";
import { Providers } from "@/providers";
import { themeBoot } from "@/lib/content/theme";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
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

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        message.className,
        serif.className,
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
            <ClientLayout>{children}</ClientLayout>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
