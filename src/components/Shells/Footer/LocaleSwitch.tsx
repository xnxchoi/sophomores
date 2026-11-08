"use client";

import { setLocale } from "@/lib/actions/locale";
import { useLocale } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/core/Button";

interface LocaleOption {
  value: "en" | "ko";
  label: string;
}

const OPTIONS: LocaleOption[] = [
  { value: "en", label: "EN" },
  { value: "ko", label: "KO" }
];

export function LocaleSwitch() {
  const current = useLocale();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center gap-1 font-sans text-[10px] tracking-widest uppercase"
    >
      {OPTIONS.map((option, index) => {
        const isActive = current === option.value;
        return (
          <span key={option.value} className="flex items-center gap-1">
            {index > 0 ? (
              <span className="text-foreground/20" aria-hidden>
                /
              </span>
            ) : null}
            <Button
              type="button"
              disabled={isPending || isActive}
              aria-pressed={isActive}
              onClick={() =>
                startTransition(async () => {
                  await setLocale(option.value);
                })
              }
              className={
                isActive
                  ? "text-foreground"
                  : "text-foreground/40 transition-colors hover:text-foreground/80 disabled:opacity-40"
              }
            >
              {option.label}
            </Button>
          </span>
        );
      })}
    </div>
  );
}
