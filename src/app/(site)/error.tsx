"use client";

import { useEffect, useRef, useTransition } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageInset } from "@/components/core/PageInset/PageInset";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Pages that only read published content: re-fetching them repeats no purchase, sign-in, session or
// account work, so they offer Try again in place. Every other page keeps navigation-only recovery
// (ADR-0021). Essays, setlists and music read the session; the shop mounts cart and checkout state.
const retryablePaths = [/^\/$/, /^\/team$/, /^\/help(\/shipping)?$/, /^\/(privacy|refund|terms)$/];

/** Descendant route errors only; the owning layout keeps its existing providers. */
export default function SiteError({ retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("System");
  const pathname = usePathname();
  const retryable = pathname !== null && retryablePaths.some((path) => path.test(pathname));
  const [retrying, startRetry] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <PageInset as="main" className="relative flex min-h-[70svh] flex-col justify-center py-24 text-foreground">
      <h1 ref={headingRef} tabIndex={-1} className="max-w-[35rem] font-display text-4xl leading-tight font-normal tracking-tight focus:outline-none md:text-6xl">
        {t("routeErrorTitle")}
      </h1>
      <p className="mt-6 max-w-[35rem] text-base leading-relaxed text-foreground/70">
        {retryable ? t("routeErrorRetryDescription") : t("routeErrorDescription")}
      </p>
      <div className="mt-8 flex max-w-[35rem] flex-wrap items-center gap-x-6 gap-y-3">
        {retryable && (
          <Button
            type="button"
            variant="outline"
            // aria-disabled, not disabled: the focused button keeps focus while the page reloads.
            aria-disabled={retrying}
            onClick={() => {
              if (!retrying) startRetry(() => retry());
            }}
            className="min-h-12 rounded-full px-6 text-sm aria-disabled:cursor-default aria-disabled:opacity-50"
          >
            {/* Both labels share one cell, so the button keeps its width while the label swaps. */}
            <span className="grid">
              <span className={cn("col-start-1 row-start-1", retrying && "invisible")}>{t("routeErrorRetry")}</span>
              <span className={cn("col-start-1 row-start-1", !retrying && "invisible")}>{t("routeErrorRetrying")}</span>
            </span>
          </Button>
        )}
        {retryable && (
          <span role="status" aria-live="polite" className="sr-only">
            {retrying ? t("routeErrorRetrying") : null}
          </span>
        )}
        <nav aria-label={t("notFoundNavigation")} className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Recovery must bypass the failed client route. */}
          <a href="/" className="inline-flex min-h-12 items-center underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current">
            {t("returnHome")}
          </a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Recovery must bypass the failed client route. */}
          <a href="/help" className="inline-flex min-h-12 items-center underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current">
            {t("routeErrorHelp")}
          </a>
        </nav>
      </div>
    </PageInset>
  );
}
