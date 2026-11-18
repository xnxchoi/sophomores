"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { IdCard, ShieldCheck, Sliders, ChevronRight, UserRound } from "lucide-react";
import type { User } from "@/payload-types";
import { useSettingsNav } from "@/components/settings/SettingsNav";
import {
  SETTINGS_SECTION_META,
  SETTINGS_SECTION_SLUGS,
} from "@/lib/settings/sections";

interface SettingsHubClientProps {
  user: User;
  activeSessionsCount: number;
}

const SECTION_ICONS = {
  general: Sliders,
  account: IdCard,
  security: ShieldCheck,
};

export default function SettingsHubClient({ user }: SettingsHubClientProps) {
  const sectionT = useTranslations("Customer.settingsSections");
  const t = useTranslations("Customer.app_site_me_settings_page_client");
  const { setPendingHref } = useSettingsNav();

  return (
    <div className="dark flex w-full flex-col gap-8 text-foreground">
      <header className="space-y-3">
        <h1 className="text-3xl font-light tracking-tight sm:text-4xl">
          {t("settings")}
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          {t("introduction")}
        </p>
      </header>

      <section
        aria-label={t("signedInAccount")}
        className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-muted" aria-hidden="true">
          <UserRound className="size-5" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 space-y-2">
          <p className="text-xs text-muted-foreground">{t("signedInAccount")}</p>
          <h2 className="text-xl font-medium tracking-tight [overflow-wrap:anywhere]">
            {user.name?.trim() || t("yourAccount")}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
            {user.email?.trim() || t("emailUnavailable")}
          </p>
        </div>
      </section>

      <nav aria-label={t("settings")}>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {SETTINGS_SECTION_SLUGS.map((slug) => {
            const Icon = SECTION_ICONS[slug];
            const meta = SETTINGS_SECTION_META[slug];
            const href = `/me/settings/${slug}`;

            return (
              <li key={slug}>
                <Link
                  href={href}
                  scroll={false}
                  onNavigate={() => setPendingHref(href)}
                  className="group flex min-h-28 items-center gap-4 px-5 py-6 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-foreground sm:px-6"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors group-hover:text-foreground group-focus-visible:text-foreground" aria-hidden="true">
                    <Icon className="size-5" strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-medium tracking-tight">
                      {sectionT(meta.label)}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {t(`destinations.${slug}`)}
                    </p>
                  </div>
                  <ChevronRight
                    className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
