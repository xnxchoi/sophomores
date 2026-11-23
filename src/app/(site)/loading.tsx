"use client";

import { useTranslations } from "next-intl";
import { PageInset } from "@/components/core/PageInset/PageInset";
import { Spinner } from "@/components/ui/spinner";
import { FXFrameKeep } from "@/components/shell/footer-visibility";

export default function SiteLoading() {
  const t = useTranslations("Common");

  return (
    <PageInset as="main" className="flex min-h-[70svh] items-center pt-32 pb-24 text-foreground sm:pt-40">
      <FXFrameKeep />
      <div role="status" className="flex max-w-[35rem] items-center gap-3 text-sm text-muted-foreground">
        <Spinner aria-hidden="true" role="presentation" className="size-5 shrink-0" />
        <p>{t("loading")}</p>
      </div>
    </PageInset>
  );
}
