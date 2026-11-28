"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { setUserLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/core/Button";
import { locales, type Locale } from "@/i18n/locales";

/**
 * The footer's language switch, ported from The Hideaway's footer LocaleSwitch (Shells/Footer/LocaleSwitch.tsx).
 * It sets the same NEXT_LOCALE cookie as Settings > General (setUserLocale); the server action returns the page in
 * the new language in one round trip (Next docs, cookies: "Understanding Cookie Behavior in Server Functions").
 * Nothing changes until a visitor picks a language, so a choice saved in Settings stays until they pick again.
 * Core Button (owner, 27 Nov: buttons go through it, so the cursor reacts), styled as The Hideaway's small text; each is a
 * 44 px target around the label.
 */
export function FooterLocaleSwitch() {
  const t = useTranslations("Interface.seller");
  return (
    <div role="group" aria-label={t("language")} className="flex items-center">
      {locales.map((locale, index) => (
        <span key={locale} className="flex items-center">
          {index > 0 && (
            <span aria-hidden="true" className="text-[9px] text-footer-muted">
              /
            </span>
          )}
          <LocaleButton locale={locale} />
        </span>
      ))}
    </div>
  );
}

function LocaleButton({ locale }: { locale: Locale }) {
  const t = useTranslations("Interface.seller");
  const current = useLocale();
  const [pending, startTransition] = useTransition();
  const active = current === locale;
  return (
    <Button
      type="button"
      variant="ghost"
      lang={locale}
      aria-pressed={active}
      disabled={pending || active}
      onClick={() => startTransition(() => setUserLocale(locale))}
      className={cn(
        // bg-transparent holds through Arc's ghost hover and press grounds, which would show as grey chips on the footer.
        // 9 px: the footer's floor (owner, 28 Nov: about a third of its size). No ground-coloured halo: it was cut from
        // the old footer colour and would outline the small letters on the gunmetal ground.
        "min-h-11 min-w-11 rounded-none bg-transparent px-0 font-sans text-[9px] font-normal tracking-widest uppercase",
        // The pick shows by an underline, not by dimming the other (Review-B: 40 % ink on the footer ground was
        // 2.87:1). Nothing dims while a change is pending either (Santa review, 28 Nov): the button is disabled, its
        // 9 px label stays at full Singer Stone (10.4:1 on the flat gunmetal).
        active
          ? "text-foreground disabled:text-foreground"
          : "text-footer-muted transition-colors hover:text-foreground disabled:text-footer-muted disabled:opacity-100"
      )}
    >
      {/* The underline sits on the label: Arc's label slots are inline-flex, so a decoration on the button stops there. */}
      <span className={cn(active && "underline decoration-1 underline-offset-4")}>
        {t(locale === "en" ? "languageEn" : "languageKo")}
      </span>
    </Button>
  );
}
