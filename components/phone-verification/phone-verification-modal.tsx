"use client";

import { type RefObject, useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { VerificationFlow, VerificationProvider } from "./phone-verification";
import { VerificationTray } from "./verification-tray";
import type { VerificationLocale } from "../../lib/phone-verification/i18n";

export type PhoneVerificationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLocale?: VerificationLocale;
  locale?: VerificationLocale;
  onLocaleChange?: (locale: VerificationLocale) => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

/** A dismissed preview is discarded; step and language changes retain the active session. */
export function PhoneVerificationModal({
  initialLocale = "ko",
  locale,
  onLocaleChange,
  ...dialogProps
}: PhoneVerificationModalProps) {
  return (
    <VerificationProvider
      initialLocale={initialLocale}
      locale={locale}
      onLocaleChange={onLocaleChange}
    >
      <VerificationDialog {...dialogProps} />
    </VerificationProvider>
  );
}

function VerificationDialog({
  open,
  onOpenChange,
  returnFocusRef
}: Pick<
  PhoneVerificationModalProps,
  "open" | "onOpenChange" | "returnFocusRef"
>) {
  const locale = useLocale();
  const t = useTranslations("Verification");
  const headingId = useId();
  const descriptionId = useId();

  return (
    <VerificationTray open={open} onOpenChange={onOpenChange} returnFocusRef={returnFocusRef}
      onCancel={() => onOpenChange(false)} cancelLabel={locale === "ko" ? "취소" : "Cancel"}
      headingId={headingId} descriptionId={descriptionId} locale={locale}
      description={t("modalDescription")} closeLabel={t("modalClose")}>
        {/* Removing only the session on dismissal also stops its countdown immediately. */}
        {open && <VerificationFlow headingAs="h2" headingId={headingId} />}
    </VerificationTray>
  );
}
