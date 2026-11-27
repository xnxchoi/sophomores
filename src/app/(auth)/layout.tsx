import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { StaticMark } from "./_shared/static-mark";
import "./index.css";

export const metadata: Metadata = {
  title: "sphmrs",
  robots: { index: false, follow: false }
};

/**
 * The staff wall's frame, in the main site's look (owner, 27 Nov): the wordmark centred at the top as in the site's header, the
 * form in the middle of the page, and the staff line at the foot, all on the site's gutter. The pages translate on
 * the server and load no script; the provider stays for the catalogue contract (tests/i18n/catalog-contract.test.ts).
 */
export default async function PreviewLayout({
  children
}: {
  readonly children: ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const t = await getTranslations("AppLayout");
  return (
    <html lang={locale} className="[color-scheme:light_dark]">
      <body className="m-0 flex min-h-svh flex-col bg-preview-surface px-5 font-sans text-base font-normal text-preview-foreground antialiased max-md:px-4">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <header className="flex h-18 shrink-0 items-center justify-center">
            <StaticMark />
          </header>
          <main className="flex flex-1 items-center justify-center py-8">
            <div className="w-full max-w-100">{children}</div>
          </main>
          <footer className="flex h-18 shrink-0 items-center justify-center text-xs text-preview-muted">{t("staffOnly")}</footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
