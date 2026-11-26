"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { setUserLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";

const OPTIONS = ["en", "ko"] as const;

/**
 * The footer's EN / KO switch, ported from The Hideaway's footer LocaleSwitch (Shells/Footer/LocaleSwitch.tsx).
 * It sets the same NEXT_LOCALE cookie as Settings > General (setUserLocale); the server action returns the page in
 * the new language in one round trip (Next docs, cookies: "Understanding Cookie Behavior in Server Functions").
 * Nothing changes until a visitor picks a language, so a choice saved in Settings stays until they pick again.
 * Native buttons keep The Hideaway's text look; each is a 44px target around the small label.
 */
export function FooterLocaleSwitch() {
  const t = useTranslations("Interface.seller");
  const current = useLocale();
  const [pending, startTransition] = useTransition();
  return (
    <div role="group" aria-label={t("language")} className="flex items-center font-sans text-[10px] tracking-widest uppercase">
      {OPTIONS.map((locale, index) => (
        <span key={locale} className="flex items-center">
          {index > 0 && <span aria-hidden="true" className="text-foreground/20">/</span>}
          <button
            type="button"
            lang={locale}
            aria-pressed={current === locale}
            disabled={pending || current === locale}
            onClick={() => startTransition(() => setUserLocale(locale))}
            className={cn(
              "group/focus flex min-h-11 min-w-11 items-center justify-center",
              // The pick shows by an underline, not by dimming the other (Review-B: 40 % ink on the footer ground was
              // 2.87:1); both hold 80 % ink or more.
              current === locale ? "text-foreground underline decoration-1 underline-offset-4" : "text-footer-muted transition-colors hover:text-foreground disabled:opacity-40"
            )}
          >
            <FocusShape>{t(locale === "en" ? "languageEn" : "languageKo")}</FocusShape>
          </button>
        </span>
      ))}
    </div>
  );
}
