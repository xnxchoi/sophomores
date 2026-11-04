"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { type ToastKey } from "./copy";

interface NudgeOptions {
  description?: string;
}

export function useComingSoon() {
  const t = useTranslations("ComingSoon.toasts");
  const nudge = useCallback(
    (key: ToastKey = "unavailable", options?: NudgeOptions) => {
      toast(t(key), options);
    },
    [t]
  );

  return { nudge };
}
