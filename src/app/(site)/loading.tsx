"use client";

import { useLayoutEffect, useRef } from "react";
import { animate } from "motion/react";
import { useTranslations } from "next-intl";
import { PageInset } from "@/components/core/PageInset/PageInset";
import { Spinner } from "@/components/ui/spinner";
import { FXFrameKeep } from "@/components/shell/footer-visibility";

/**
 * When the page arrives, the hold leaves in the same commit, before paint: the page layer starts at 0 and fades in,
 * so a page that took a while still arrives with the standard fade instead of cutting in over the hold (owner, 26 Nov:
 * "the next page should be mounted before fading in"). If the hold leaves because the visitor went elsewhere, its
 * page layer is on its way out and the fade is moot.
 */
function FadeInPageOnArrival() {
  const marker = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const page = marker.current?.closest<HTMLElement>("[data-rp-page]");
    return () => {
      if (page?.isConnected) animate(page, { opacity: [0, 1] }, { duration: 0.28, ease: "easeOut" });
    };
  }, []);
  return <span ref={marker} hidden />;
}

export default function SiteLoading() {
  const t = useTranslations("Common");

  return (
    // At least the window's full height while the next page loads, so the page still covers the pinned footer and the
    // footer never rises into view between two pages (owner, 26 Nov: "the footer jumping up when the page is
    // transitioned out, and the next page is yet to transition in"). The status fades in only if the wait runs on,
    // so a quick load reads as one change: the page, then the next page's own fade-in.
    <PageInset as="main" className="flex min-h-svh items-center pt-32 pb-24 text-foreground sm:pt-40">
      <FXFrameKeep />
      <FadeInPageOnArrival />
      <div role="status" className="flex max-w-[35rem] animate-in fade-in fill-mode-backwards items-center gap-3 text-sm text-muted-foreground delay-400 duration-300">
        <Spinner aria-hidden="true" role="presentation" className="size-5 shrink-0" />
        <p>{t("loading")}</p>
      </div>
    </PageInset>
  );
}
