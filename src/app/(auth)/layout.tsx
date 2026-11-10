import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "./index.css";

export const metadata: Metadata = {
  title: "sphmrs",
  robots: { index: false, follow: false }
};

export default async function PreviewLayout({
  children
}: {
  readonly children: ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const t = await getTranslations("AppLayout");
  return (
    <html lang={locale}>
      <body className="m-0 grid min-h-svh place-items-center bg-preview-surface px-5 py-8 font-sans text-base font-normal text-preview-foreground">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <main className="w-full max-w-100">
            {children}
            <footer className="mt-8 text-xs text-preview-muted">{t("staffOnly")}</footer>
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
