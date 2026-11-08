"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/hideaway/components/core/Button";
import type { DayNNightView } from "./useViewPref";

interface ViewToggleProps {
  value: DayNNightView;
  onChange: (next: DayNNightView) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  const t = useTranslations("Event.DayNNight.viewToggle");

  // Visible markup is a binary toggle — two buttons only. The "View"
  // label is announced via aria-label on the radiogroup so screen
  // readers still hear the control's purpose; rendering it visually
  // made the pill read as a tri-state switch (label / Story / Card).
  return (
    <div
      data-dn-chrome-pill
      data-dn-view-toggle
      role="radiogroup"
      aria-label={t("label")}
      className="inline-flex gap-0.5 rounded-full border border-[var(--dn-chrome-line)] p-[3px]"
    >
      <Button
        type="button"
        role="radio"
        aria-checked={value === "immersive"}
        data-active={value === "immersive"}
        data-dn-toggle-btn
        className="ease cursor-pointer appearance-none rounded-full border-0 bg-transparent px-[13px] py-[7px] font-sans text-[10px] tracking-[0.16em] text-[var(--dn-chrome-fg-mute)] uppercase transition-[background,color] duration-[250ms]"
        onClick={() => onChange("immersive")}
      >
        {t("immersive")}
      </Button>
      <Button
        type="button"
        role="radio"
        aria-checked={value === "simplified"}
        data-active={value === "simplified"}
        data-dn-toggle-btn
        className="ease cursor-pointer appearance-none rounded-full border-0 bg-transparent px-[13px] py-[7px] font-sans text-[10px] tracking-[0.16em] text-[var(--dn-chrome-fg-mute)] uppercase transition-[background,color] duration-[250ms]"
        onClick={() => onChange("simplified")}
      >
        {t("simplified")}
      </Button>
    </div>
  );
}
