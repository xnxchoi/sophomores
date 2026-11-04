"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

interface SaveStatusProps {
  state: SaveState;
  errorMessage?: string;
  className?: string;
}

const FADE_AFTER_MS = 2400;

export const SaveStatus = ({
  state,
  errorMessage,
  className
}: SaveStatusProps) => {
  const t = useTranslations("Settings.save");
  const [visible, setVisible] = useState(state !== "idle");

  useEffect(() => {
    if (state === "saved") {
      setVisible(true);
      const id = setTimeout(() => setVisible(false), FADE_AFTER_MS);
      return () => clearTimeout(id);
    }
    if (state === "idle") {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [state]);

  if (!visible) return null;

  return (
    <span
      className={cn(
        "font-sans text-[9px] tracking-[0.22em] uppercase transition-opacity duration-500",
        state === "error"
          ? "text-rouge-500"
          : "text-foreground/65 dark:text-foreground/55",
        className
      )}
      aria-live="polite"
    >
      {state === "saving" && t("saving")}
      {state === "saved" && t("saved")}
      {state === "error" && (errorMessage ?? t("error"))}
    </span>
  );
};
