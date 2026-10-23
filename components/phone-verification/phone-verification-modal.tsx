"use client";

import { useId, type RefObject } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog, DialogClose, DialogContent } from "../ui/dialog";
import { VerificationFlow, VerificationProvider } from "./phone-verification";
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
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent
        className="phone-verification pv-modal"
        lang={locale}
        showCloseButton={false}
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        initialFocus={() => document.getElementById(headingId)}
        finalFocus={returnFocusRef ?? true}
      >
        <div className="pv-modal-bar">
          <span
            className="font-teaser-serif text-[25px] tracking-[-1.5px]"
            aria-hidden="true"
          >
            sophomores
          </span>
          <DialogClose className="pv-close" aria-label={t("modalClose")}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </DialogClose>
        </div>
        <p id={descriptionId} className="sr-only">
          {t("modalDescription")}
        </p>
        {/* Removing only the session on dismissal also stops its countdown immediately. */}
        {open && <VerificationFlow headingAs="h2" headingId={headingId} />}
      </DialogContent>
    </Dialog>
  );
}
