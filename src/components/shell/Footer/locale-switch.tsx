"use client";

import { useLocale, useTranslations } from "next-intl";
import React, { ComponentProps, useCallback, useTransition } from "react";
import { setUserLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { Button } from "@/components/core/Button";
import { locales, type Locale } from "@/i18n/locales";

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

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="flex items-center font-sans text-[10px] tracking-widest uppercase"
    >
      {locales.map((locale, index) => (
        <span key={locale} className="flex items-center">
          {index > 0 && (
            <span aria-hidden="true" className="text-foreground/20">
              /
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
const LocaleButton = (props: ComponentProps<"button"> & { locale: Locale }) => {
  const { locale, className,disabled,...rest } = props;
  const t=useTranslations("footer");
  const current = useLocale();
  const [pending, startTransition] = useTransition();
  const onClick = useCallback(
    (e: React.MouseEvent) => startTransition(() => setUserLocale(locale)),
    [locale]
  );
  <Button
    type="button"
    lang={locale}
    aria-pressed={ locale === current}
    disabled={disabled||pending || current === locale}
    onClick={onClick}
    className={cn(
      // On the button itself: the base styles reset text-shadow on buttons, so it can't be inherited.
      "group/focus flex min-h-11 min-w-11 items-center justify-center text-shadow-footer-ground",
      // The pick shows by an underline, not by dimming the other (Review-B: 40 % ink on the footer ground was
      // 2.87:1); both hold 80 % ink or more.
      current === locale
        ? "text-foreground underline decoration-1 underline-offset-4"
        : "text-footer-muted transition-colors hover:text-foreground disabled:opacity-40",
      className
    )}
    {...rest}
  >
    <FocusShape>{t(locale === "en" ? "languageEn" : "languageKo")}</FocusShape>
  </Button>;
};
