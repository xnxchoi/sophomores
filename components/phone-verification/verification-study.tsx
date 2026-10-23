"use client";

import { useRef, useState } from "react";
import { createTranslator } from "next-intl";
import { PhoneVerificationModal } from "./phone-verification-modal";
import { PhoneVerificationTrialModal } from "./phone-verification-trial";
import {
  messagesByLocale,
  type VerificationLocale
} from "../../lib/phone-verification/i18n";

export function VerificationStudy({
  initialLocale = "ko",
  localTrial = false
}: {
  initialLocale?: VerificationLocale;
  localTrial?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [locale, setLocale] = useState(initialLocale);
  const trigger = useRef<HTMLButtonElement>(null);
  const t = createTranslator({
    locale,
    messages: messagesByLocale[locale],
    namespace: "Verification"
  });
  const Modal = localTrial ? PhoneVerificationTrialModal : PhoneVerificationModal;

  return (
    <div className="phone-verification pv-study" lang={locale}>
      <header className="pv-header">
        <span className="font-teaser-serif text-[25px] tracking-[-1.5px]">sophomores</span>
      </header>
      <main className="pv-study-launcher">
        <button
          ref={trigger}
          className="pv-primary"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          {t("headingNumber")}
        </button>
      </main>
      <Modal
        open={open}
        onOpenChange={setOpen}
        locale={locale}
        onLocaleChange={setLocale}
        returnFocusRef={trigger}
      />
    </div>
  );
}
