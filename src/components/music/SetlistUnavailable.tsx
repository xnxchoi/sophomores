"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/arc/button/button";

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
        <section className="mx-auto flex max-w-5xl flex-col items-start gap-3 px-6 pt-32">
          {failure === "setlist" ? <h1 className="text-2xl font-medium">{t("setlistUnavailable")}</h1>
            : <p className="text-sm">{t("playlistUnavailable")}</p>}
          <Button
            type="button"
            variant="secondary"
            loading={pending}
            onClick={(event) => {
              retryHadFocus.current = document.activeElement === event.currentTarget;
              setAttempted(true);
              startTransition(() => router.refresh());
            }}
          >
            {t("retrySetlist")}
          </Button>
        </section>
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
