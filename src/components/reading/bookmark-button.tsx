"use client";

import { BookmarkSimpleIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/arc/button/button";

export function BookmarkButton({ saved, onToggle }: { saved: boolean; onToggle: () => void }) {
  const t = useTranslations("Customer.components_reading_bookmark_button");
  return (
    <Button type="button" variant="secondary" aria-pressed={saved} onClick={onToggle}>
      <BookmarkSimpleIcon aria-hidden="true" size={16} weight={saved ? "fill" : "regular"} />
      {t("bookmarkEssay")}
    </Button>
  );
}
