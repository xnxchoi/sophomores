"use client";

import { useTranslations } from "next-intl";
import { useTransitionRouter } from "next-transition-router";
import { Pagination } from "@/components/core/ArcFocus/ArcFocus";

/** The listing's page control: each page lives at /essays/in/[pageNumber], as in The Hideaway. */
export function EssayPagination({ page, totalPages }: { page: number; totalPages: number }) {
  const t = useTranslations("Customer.components_reading_page_links");
  const router = useTransitionRouter();
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-center px-6 pb-16">
      <Pagination page={page} pageCount={totalPages} label={t("pages")} onPageChange={(next) => router.push(`/essays/in/${next}`)} />
    </div>
  );
}
