"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { remainingSeconds } from "../../lib/phone-verification/model";
import { subscribeToCountdown } from "../../lib/phone-verification/countdown";

type VerificationCountdownProps = {
  expiresAt: number;
  visible: boolean;
  onExpire: () => void;
};

// Keep the once-per-second update out of the form and modal shell.
export function VerificationCountdown({
  expiresAt,
  visible,
  onExpire
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
      className="pv-timer"
      role="timer"
      aria-live="off"
      aria-label={t("countdownLabel", { seconds })}
    >
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}{" "}
      <span>{t("remainingTime")}</span>
    </p>
  );
}
