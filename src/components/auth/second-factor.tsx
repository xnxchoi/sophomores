"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import { isSixDigitCode } from "@/lib/content/auth-code";
import { AuthAlternate, AuthSubmit } from "./auth-actions";
import { AuthPanel } from "./auth-panel";

export function TwoFactorCard({
  onSubmit
}: {
  onSubmit?: (input: { code: string }) => void;
}) {
  const t = useTranslations("AuthCards");
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);

  return (
    <AuthPanel title={t("twoFactorCode")} description={t("enterTheSixDigitCode")}>
      <form
        className="flex flex-col gap-5 text-[12px]"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isSixDigitCode(code)) {
            setInvalid(true);
            return;
          }
          setInvalid(false);
          onSubmit?.({ code });
        }}
      >
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="code-field w-full m-0 p-3 text-inherit font-normal tracking-[0.2em] text-center bg-transparent border border-faded-fg/35 rounded-lg outline-none"
          aria-label={t("code")}
        />
        {invalid ? <p>{t("enter6Digits")}</p> : null}
        <AuthSubmit>{t("verify")}</AuthSubmit>
      </form>
    </AuthPanel>
  );
}

export function PasskeyButton({ onPasskey }: { onPasskey?: () => void }) {
  const t = useTranslations("AuthCards");
  return (
    <AuthAlternate onClick={onPasskey}>{t("useAPasskey")}</AuthAlternate>
  );
}
