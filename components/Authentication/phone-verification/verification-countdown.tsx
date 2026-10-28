"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { remainingSeconds } from "../../../lib/phone-verification/model";
import { subscribeToCountdown } from "../../../lib/phone-verification/countdown";
import { cn } from "../../../lib/utils";

type VerificationCountdownProps = {
  expiresAt: number;
  visible: boolean;
  onExpire: () => void;
  compact?: boolean;
  labelKey?:
    "countdownLabel" | "trialCountdownLabel" | "verificationCountdownLabel";
};

// Keep the once-per-second update out of the form and modal shell.
export function VerificationCountdown({
  expiresAt,
  visible,
  onExpire,
  compact = false,
  labelKey = "countdownLabel"
}: VerificationCountdownProps) {
  const t = useTranslations("Verification");
  const [seconds, setSeconds] = useState(() =>
    remainingSeconds(expiresAt, Date.now())
  );
  const notifiedExpiry = useRef<number | null>(null);

  useEffect(() => {
    return subscribeToCountdown(
      {
        expiresAt,
        onTick: setSeconds,
        onExpire: () => {
          if (notifiedExpiry.current !== expiresAt) {
            notifiedExpiry.current = expiresAt;
            onExpire();
          }
        }
      },
      {
        now: Date.now,
        setInterval: (callback, delay) => window.setInterval(callback, delay),
        clearInterval: (id) => window.clearInterval(id),
        page: window,
        visibility: document
      }
    );
  }, [expiresAt, onExpire]);

  if (!visible) return null;

  return (
    <p
      className={cn(
        "my-3 text-left font-mono text-base text-white tabular-nums [&>span]:ml-1 [&>span]:font-message [&>span]:text-xs [&>span]:text-neutral-400",
        compact &&
          "my-0 shrink-0 text-xs whitespace-nowrap text-neutral-400 [&>span]:text-[11px]"
      )}
      role="timer"
      aria-live="off"
      aria-label={t(labelKey, { seconds })}
    >
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}{" "}
      <span>{t("remainingTime")}</span>
    </p>
  );
}
