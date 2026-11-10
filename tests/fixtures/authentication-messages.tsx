import { useState, type ReactNode } from "react";
import { NextIntlClientProvider, useLocale } from "next-intl";
import { messagesByLocale } from "../../src/i18n/messages";

function LocaleBoundary({ children }: { children: ReactNode }) {
  const locale = useLocale();
  return <div data-authentication-provider-locale={locale}>{children}</div>;
}

/** Legacy study controls select locale; active phase copy uses the native catalogue. */
export function AuthenticationMessages({ children, locale = "en" }: {
  children: ReactNode;
  locale?: "en" | "ko";
}) {
  const [selection, setSelection] = useState({ initial: locale, current: locale });
  if (selection.initial !== locale) setSelection({ initial: locale, current: locale });
  const current = selection.initial === locale ? selection.current : locale;
  return <NextIntlClientProvider locale={current} timeZone="Asia/Seoul" messages={messagesByLocale[current]}>
    <div onChangeCapture={(event) => {
      const target = event.target;
      if (target.tagName === "SELECT" && "value" in target && typeof target.value === "string" && (target.getAttribute("aria-label") === "Language" || target.getAttribute("aria-label") === "언어") && (target.value === "en" || target.value === "ko")) {
        setSelection({ initial: locale, current: target.value });
      }
    }}>
      <LocaleBoundary>{children}</LocaleBoundary>
    </div>
  </NextIntlClientProvider>;
}
