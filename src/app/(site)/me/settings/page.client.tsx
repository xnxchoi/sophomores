"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { AddressBookIcon, ArrowLeftIcon, BellIcon, CaretRightIcon, IdentificationCardIcon, ShieldCheckIcon, SlidersHorizontalIcon, UserCircleIcon } from "@phosphor-icons/react";
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
  general: SlidersHorizontalIcon,
  account: IdentificationCardIcon,
  security: ShieldCheckIcon,
};

export default function SettingsHubClient({ user }: SettingsHubClientProps) {
  const sectionT = useTranslations("Customer.settingsSections");
  const t = useTranslations("Customer.app_site_me_settings_page_client");
  const addresses = useTranslations("Customer.app_site_me_settings_addresses_page");
  const notifications = useTranslations("Customer.app_site_me_settings_notifications_page");
  const { setPendingHref } = useSettingsNav();
  const destinations = [
    ...SETTINGS_SECTION_SLUGS.map((slug) => ({
      href: `/me/settings/${slug}`,
      icon: SECTION_ICONS[slug],
      label: sectionT(SETTINGS_SECTION_META[slug].label),
      description: t(`destinations.${slug}`),
    })),
    { href: "/me/settings/addresses", icon: AddressBookIcon, label: addresses("title"), description: null },
    { href: "/me/settings/notifications", icon: BellIcon, label: notifications("title"), description: null },
  ];

  return (
    <div className="dark flex w-full flex-col gap-8 text-foreground">
      <header>
        <Link href="/me" className="group group/focus -mt-2 mb-2 inline-flex min-h-12 items-center rounded-sm text-sm text-muted-foreground hover:text-foreground">
          <FocusShape className="inline-flex items-center gap-2 outline-offset-4">
            <ArrowLeftIcon aria-hidden="true" className="size-4 transition-transform group-hover:-translate-x-0.5 group-focus-visible:-translate-x-0.5" />
            {t("backToAccount")}
          </FocusShape>
        </Link>
        <h1 className="text-3xl font-light tracking-tight sm:text-4xl">
          {t("settings")}
        </h1>
      </header>

      <section
        aria-label={t("signedInAccount")}
        className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 sm:p-6"
      >
        <span className="flex size-10 shrink-0 items-center justify-center" aria-hidden="true">
          <UserCircleIcon className="size-8 text-muted-foreground" weight="light" />
        </span>
        <div className="min-w-0 space-y-2">
          <p className="text-xs text-muted-foreground">{t("signedInAccount")}</p>
          <h2 className="text-xl tracking-tight [overflow-wrap:anywhere]">
            {user.name?.trim() || t("yourAccount")}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
            {user.email?.trim() || t("emailUnavailable")}
          </p>
        </div>
      </section>

      <nav aria-label={t("settings")}>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {destinations.map(({ href, icon: Icon, label, description }) => (
            <li key={href}>
              <Link
                href={href}
                scroll={false}
                onNavigate={() => setPendingHref(href)}
                className="group flex min-h-20 items-center gap-4 px-5 py-4 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-foreground sm:px-6"
              >
                <span className="flex size-7 shrink-0 items-center justify-center text-muted-foreground transition-colors group-hover:text-foreground group-focus-visible:text-foreground" aria-hidden="true">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base tracking-tight">
                    {label}
                  </h2>
                  {description !== null && (
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  )}
                </div>
                <CaretRightIcon
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
