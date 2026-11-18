"use client";

import { useTranslations } from "next-intl";
import { Spinner } from "@/components/ui/spinner";

export default function SiteLoading() {
  const t = useTranslations("Common");

  return (
    <main className="mx-auto flex min-h-[70svh] w-full max-w-3xl items-center px-6 pt-32 pb-24 text-foreground sm:px-10 sm:pt-40">
      <div role="status" className="flex items-center gap-3 text-sm text-muted-foreground">
        <Spinner aria-hidden="true" role="presentation" className="size-5 shrink-0" />
        <p>{t("loading")}</p>
      </div>
    </main>
  );
}
