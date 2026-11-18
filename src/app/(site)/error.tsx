"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

/** Descendant route errors only; the owning layout keeps its existing providers. */
export default function SiteError() {
  const t = useTranslations("System");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className="relative mx-auto flex min-h-[70svh] w-full max-w-4xl flex-col justify-center px-6 py-24 text-foreground md:px-12">
      <h1 ref={headingRef} tabIndex={-1} className="font-heading text-4xl leading-tight tracking-tight focus:outline-none md:text-6xl">
        {t("routeErrorTitle")}
      </h1>
      <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground/70">
        {t("routeErrorDescription")}
      </p>
      <nav aria-label={t("notFoundNavigation")} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Recovery must bypass the failed client route. */}
        <a href="/" className="inline-flex min-h-12 items-center underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current">
          {t("returnHome")}
        </a>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Recovery must bypass the failed client route. */}
        <a href="/help" className="inline-flex min-h-12 items-center underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current">
          {t("routeErrorHelp")}
        </a>
      </nav>
    </main>
  );
}
