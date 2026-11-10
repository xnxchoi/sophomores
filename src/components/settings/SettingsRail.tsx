"use client";
import { useTranslations } from "next-intl";


import {
  IdCard,
  ShieldCheck,
  Sliders,
  type LucideIcon,
} from "lucide-react";
import { LayoutGroup } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { useSettingsNav } from "./SettingsNav";
import {
  SETTINGS_SECTION_META,
  SETTINGS_SECTION_SLUGS,
  type SettingsSectionSlug,
} from "@/lib/settings/sections";

const SETTINGS_BASE = "/me/settings";

interface RailDecor {
  icon: LucideIcon;
}

const RAIL_DECOR: Record<SettingsSectionSlug, RailDecor> = {
  general: { icon: Sliders },
  account: { icon: IdCard },
  security: { icon: ShieldCheck },
};

const isActive = (pathname: string, slug: SettingsSectionSlug) =>
  pathname === `${SETTINGS_BASE}/${slug}` ||
  pathname.startsWith(`${SETTINGS_BASE}/${slug}/`);

export function SettingsRail() {
  const sectionT = useTranslations("Customer.settingsSections");
  const t = useTranslations('Customer.components_settings_SettingsRail');
  const { pathname, pendingHref, setPendingHref } = useSettingsNav();
  const activePath = pendingHref ?? pathname;

  return (
    <LayoutGroup id="settings-rail">
      <nav
        aria-label={t('settingsSections')}
        className="flex w-full flex-col gap-1.5"
      >
        {SETTINGS_SECTION_SLUGS.map((slug) => {
          const href = `${SETTINGS_BASE}/${slug}`;
          const active = isActive(activePath, slug);
          const decor = RAIL_DECOR[slug];
          const Icon = decor.icon;
          const meta = SETTINGS_SECTION_META[slug];

          return (
            <Link
              key={slug}
              href={href}
              scroll={false}
              prefetch
              aria-current={active ? "page" : undefined}
              onClick={() => {
                if (href === activePath) return;
                setPendingHref(href);
              }}
              className={cn(
                "group relative flex items-center gap-3.5 rounded-xl px-3.5 py-3 transition-colors duration-150",
                !active && "hover:bg-white/[0.04]"
              )}
            >
              {active ? (
                <m.span
                  layoutId="settings-rail-active"
                  className="absolute inset-0 rounded-xl bg-white/[0.08] border border-white/10"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                />
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-lg border",
                  active
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-white/5 bg-white/[0.03] text-neutral-400 group-hover:text-white"
                )}
              >
                <Icon size={18} strokeWidth={1.5} />
              </span>
              <div className="relative z-10 flex min-w-0 flex-col">
                <span
                  className={cn(
                    "text-sm tracking-tight transition-colors duration-150",
                    active
                      ? "font-medium text-white"
                      : "text-neutral-400 group-hover:text-neutral-200"
                  )}
                >
                  {sectionT(meta.label)}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}
