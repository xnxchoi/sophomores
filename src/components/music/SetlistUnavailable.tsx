"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { InlineRetry } from "@/components/core/InlineRetry/InlineRetry";
import { PageInset } from "@/components/core/PageInset/PageInset";

export function SetlistLoadStatus({ failure, children }: {
  failure: "setlist" | "playlist" | null;
  children?: ReactNode;
}) {
  const t = useTranslations("Interface.radio");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [attempted, setAttempted] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const retryHadFocus = useRef(false);

  useEffect(() => {
    if (!attempted || pending || failure || !retryHadFocus.current) return;
    retryHadFocus.current = false;
    if (document.activeElement === document.body) {
      root.current?.querySelector("h1")?.focus();
    }
  }, [attempted, failure, pending]);

  return (
    <div ref={root}>
      {failure && (
        // The shared InlineRetry (plain refresh action, busy text in place). The failure line stays
        // here as the page's h1, which the focus return below needs; gap-x-3 against InlineRetry's
        // -ml-3 gives the same spacing as its own message slot.
        <PageInset as="section" className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-32">
          {failure === "setlist" ? <h1 className="text-2xl">{t("setlistUnavailable")}</h1>
            : <p className="text-sm">{t("playlistUnavailable")}</p>}
          <InlineRetry
            pending={pending}
            label={t("retrySetlist")}
            pendingLabel={t("retryingSetlist")}
            onRetry={() => {
              retryHadFocus.current = root.current?.contains(document.activeElement) ?? false;
              setAttempted(true);
              startTransition(() => router.refresh());
            }}
          />
        </PageInset>
      )}
      {/* InlineRetry announces the busy text; this line announces only the outcome. */}
      <p role="status" aria-atomic="true" className="sr-only">
        {attempted && !pending ? failure ? t("setlistStillUnavailable") : t("setlistLoaded") : null}
      </p>
      {children}
    </div>
  );
}
