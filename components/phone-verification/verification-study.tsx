"use client";

import { cn } from "@/lib/utils";

import { BrandMark } from "../../lib/brand";

import { useRef, useState } from "react";
import { PrimaryButton } from "./verification-ui";
import { AuthenticationEntry } from "./authentication-entry";
import type { VerificationLocale } from "../../lib/phone-verification/i18n";

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

  return (
    <div className="min-h-svh bg-[#090909] p-6 text-white" lang={locale}>
      <header className="h-11">
        <BrandMark data-brand-mark="" className="text-[25px] tracking-[-1.5px]">
          sophomores
        </BrandMark>
      </header>
      <main className={cn("mx-auto mt-32 max-w-xs", open ? "invisible" : "")}>
        <PrimaryButton
          ref={trigger}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          {locale === "ko" ? "로그인 / 회원가입" : "Log in / Sign up"}
        </PrimaryButton>
      </main>
      <AuthenticationEntry
        open={open}
        onOpenChange={setOpen}
        locale={locale}
        onLocaleChange={setLocale}
        returnFocusRef={trigger}
        localTrial={localTrial}
      />
    </div>
  );
}
