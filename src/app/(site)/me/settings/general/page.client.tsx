"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Globe, LoaderCircle } from "lucide-react";
import type { User } from "@/payload-types";
import { setUserLocale } from "@/lib/i18n/locale";
import { SubRouteHeader } from "@/components/settings/SubRouteHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GeneralSectionClientProps {
  user: User;
}

export default function GeneralSectionClient({ user }: GeneralSectionClientProps) {
  const t = useTranslations("Customer.app_site_me_settings_general_page_client");
  const requestLocale = useLocale();
  const locale = requestLocale === "en" || requestLocale === "ko"
    ? requestLocale
    : user.localePreference === "ko" ? "ko" : "en";
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [attemptedLocale, setAttemptedLocale] = useState<"en" | "ko">(locale);
  const inFlight = useRef(false);

  const handleSelectLocale = async (target: "en" | "ko") => {
    if (inFlight.current) return;
    inFlight.current = true;
    setAttemptedLocale(target);
    setStatus("saving");

    try {
      // Keep the existing browser-cookie fallback if the action cannot respond.
      document.cookie = `NEXT_LOCALE=${target}; path=/; max-age=31536000; SameSite=Lax`;
      await setUserLocale(target);
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <div className="dark flex w-full flex-col gap-8 text-foreground">
      <SubRouteHeader
        title={t("general")}
        blurb={t("browserLanguageDescription")}
      />

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-8">
        <fieldset
          disabled={status === "saving"}
          aria-busy={status === "saving"}
          aria-describedby="language-fallback"
          className="min-w-0"
        >
          <legend className="mb-3 flex items-center gap-2 text-lg font-medium tracking-tight">
            <Globe className="size-5" aria-hidden="true" />
            {t("language")}
          </legend>
          <p id="language-fallback" className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            {t("languageFallback")}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <label className={cn(
              "flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-foreground has-[:disabled]:cursor-wait has-[:disabled]:opacity-60",
              locale === "en"
                ? "border-foreground bg-muted text-foreground"
                : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            )}>
              <input
                type="radio"
                name="interface-language"
                value="en"
                checked={locale === "en"}
                onChange={() => void handleSelectLocale("en")}
                className="size-5 shrink-0 accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              />
              <span className="text-sm font-medium">{t("english")}</span>
            </label>

            <label className={cn(
              "flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-foreground has-[:disabled]:cursor-wait has-[:disabled]:opacity-60",
              locale === "ko"
                ? "border-foreground bg-muted text-foreground"
                : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            )}>
              <input
                type="radio"
                name="interface-language"
                value="ko"
                checked={locale === "ko"}
                onChange={() => void handleSelectLocale("ko")}
                className="size-5 shrink-0 accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              />
              <span lang="ko" className="text-sm font-medium">{t("korean")}</span>
            </label>
          </div>
        </fieldset>

        <div className="mt-4 flex min-h-12 items-center justify-between gap-4">
          <p role="status" aria-live="polite" aria-atomic="true" className="flex min-w-0 items-center gap-2 text-sm leading-relaxed text-muted-foreground">
            {status === "saving" ? <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden="true" /> : null}
            {status === "saving" ? t("languageSaving") : null}
            {status === "saved" ? t("browserLanguageUpdated") : null}
            {status === "error" ? t("languageChangeUnconfirmed") : null}
          </p>
          {status === "error" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSelectLocale(attemptedLocale)}
              className="min-h-12 rounded-lg px-4 text-foreground"
            >
              {t("retryLanguage")}
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
