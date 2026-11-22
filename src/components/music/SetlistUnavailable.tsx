"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react";
import { Button } from "@/components/arc/button/button";
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
        <PageInset as="section" className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-32">
          {/* Inline text plus a plain refresh action in the same space (owner, 22 Nov: no boxed retry). */}
          {failure === "setlist" ? <h1 className="text-2xl">{t("setlistUnavailable")}</h1>
            : <p className="text-sm">{t("playlistUnavailable")}</p>}
          {/* Busy via aria-busy/aria-disabled, not `loading`: Arc's `loading` hides the label behind a spinner, and the busy text must show in place. aria-disabled keeps Arc from activating it again. */}
          <Button
            type="button"
            variant="ghost"
            aria-busy={pending || undefined}
            aria-disabled={pending || undefined}
            onClick={(event) => {
              retryHadFocus.current = document.activeElement === event.currentTarget;
              setAttempted(true);
              startTransition(() => router.refresh());
            }}
          >
            {!pending && <ArrowsClockwiseIcon aria-hidden="true" className="size-4" />}
            {pending ? t("retryingSetlist") : t("retrySetlist")}
          </Button>
        </PageInset>
      )}
      <p role="status" aria-atomic="true" className="sr-only">
        {attempted ? pending ? t("retryingSetlist")
          : failure ? t("setlistStillUnavailable") : t("setlistLoaded")
          : null}
      </p>
      {children}
    </div>
  );
}
