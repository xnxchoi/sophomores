"use client";

import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import type {
  TrialSnapshot,
  TrialStatus
} from "../../lib/phone-verification/client-contracts";
import { cn } from "../../lib/utils";
import { VerificationCountdown } from "./verification-countdown";

export function VerificationStatus({
  state = "pending",
  busy,
  error,
  checked,
  expiresAt,
  onExpire
}: {
  state?: TrialStatus["state"];
  busy: boolean;
  error: TrialSnapshot["error"];
  checked: boolean;
  expiresAt: number;
  onExpire: () => void;
}) {
  const t = useTranslations("VerificationTrial.registration.status");
  const active = state === "pending" || state === "review";
  const label = error
    ? error === "receiver"
      ? "receiverUnavailable"
      : error === "status"
      ? "unavailable"
      : error === "cancel"
        ? "cancelUnavailable"
        : "createUnavailable"
    : busy
      ? "checking"
      : state === "pending" && checked
        ? "notReceived"
        : state;
  const indicator = error
    ? "unavailable"
    : busy
      ? "checking"
      : state === "pending"
        ? "waiting"
        : state;
  return (
    <div
      data-verification-status-row=""
      className="flex min-h-6 items-center justify-between gap-3"
    >
      <p
        role="status"
        aria-live="polite"
        className="flex min-w-0 items-center gap-2 text-xs leading-5 text-neutral-400"
      >
        <span
          aria-hidden="true"
          className="flex size-4 shrink-0 items-center justify-center"
        >
          <motion.span
            data-status-indicator={indicator}
            animate={{ rotate: indicator === "checking" ? 360 : 0 }}
            transition={{ duration: indicator === "checking" ? 1 : 0, ease: "linear", repeat: indicator === "checking" ? Infinity : 0 }}
            className={cn(
              "inline-flex size-3 items-center justify-center rounded-full border border-neutral-500",
              indicator === "checking" &&
                "border-neutral-300 border-r-transparent",
              indicator === "verified" &&
                "border-neutral-100 bg-neutral-100 text-[8px] text-neutral-950"
            )}
          >
            {indicator === "verified" ? "✓" : null}
          </motion.span>
        </span>
        {t(label)}
      </p>
      {active && (
        <VerificationCountdown
          expiresAt={expiresAt}
          visible
          compact
          onExpire={onExpire}
          labelKey="verificationCountdownLabel"
        />
      )}
    </div>
  );
}
