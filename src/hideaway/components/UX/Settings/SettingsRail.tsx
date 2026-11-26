"use client";

import { useTransitionSetter } from "@/hideaway/components/UX/Transition/useTransitionSetter";
import {
  Bell,
  IdCard,
  ShieldCheck,
  Sliders,
  UserRound,
  type LucideIcon
} from "lucide-react";
import { LayoutGroup } from "motion/react";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { useSettingsNav } from "./SettingsNav";
import { SETTINGS_SECTION_SLUGS, type SettingsSectionSlug } from "./sections";

/**
 * Settings rail — macOS System Settings cadence in the Hideaway palette.
 *
 * Visual signature:
 *   - Each row is `[icon-tile] label` — same categorical color tile used
 *     on `<SectionLink/>` in the hub, miniaturised. Icons aren't
 *     decorative here; they encode section identity at a glance.
 *   - Active row: full-row `bg-foreground/[0.06]` rounded pill, no edge
 *     gradient. macOS uses a flat highlight; we match that, but
 *     restrained for the dark-canvas tone.
 *   - Hover row: a softer tint, only on inactive rows.
 *   - Wider than the editorial TOC (>= 248px) so labels don't crowd.
 *
 * Mobile: the desktop rail is `xl:` only. Mobile / tablet drill into the
 * hub page (`/me/settings`) per the iOS Settings cadence.
 */
const SETTINGS_BASE = "/me/settings";

type Tone = "data" | "account" | "billing" | "support" | "options" | "neutral";

interface RailDecor {
  icon: LucideIcon;
  /** Categorical color tone — same token set as <SectionLink/>. */
  tone: Tone;
}

/** Icon + tone per slug. Labels come from translations, not from here. */
const RAIL_DECOR: Record<SettingsSectionSlug, RailDecor> = {
  general: { icon: Sliders, tone: "data" },
  profile: { icon: UserRound, tone: "account" },
  account: { icon: IdCard, tone: "billing" },
  security: { icon: ShieldCheck, tone: "support" },
  notifications: { icon: Bell, tone: "options" }
};

const TILE_TONES: Record<Tone, string> = {
  account: "",
  options: "",
  support: "",
  billing: "",
  data: "",
  neutral: "bg-foreground/[0.06] text-foreground/70 dark:bg-foreground/[0.08]"
};

const isActive = (pathname: string, slug: SettingsSectionSlug) =>
  pathname === `${SETTINGS_BASE}/${slug}` ||
  pathname.startsWith(`${SETTINGS_BASE}/${slug}/`);

export function SettingsRail() {
  const t = useTranslations("Settings");
  const tSections = useTranslations("Settings.sections");
  const { setGenericPageTransition } = useTransitionSetter();
  const { pathname, pendingHref, setPendingHref } = useSettingsNav();
  const activePath = pendingHref ?? pathname;

  return (
    <LayoutGroup id="settings-rail">
      <nav
        aria-label={t("navAria")}
        className="flex w-full flex-col justify-around"
      >
        {SETTINGS_SECTION_SLUGS.map((slug) => {
          const href = `${SETTINGS_BASE}/${slug}`;
          const active = isActive(activePath, slug);
          const decor = RAIL_DECOR[slug];
          const Icon = decor.icon;
          const label = tSections(`${slug}.label`);
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
                setGenericPageTransition(href, { override: "SHELL" });
              }}
              className={cn(
                "group relative flex items-center gap-9 rounded-2xl px-6 py-6 transition-colors duration-150 ease-out-power2",
                !active && "hover:bg-foreground/5"
              )}
            >
              {active ? (
                <m.span
                  layoutId="settings-rail-active"
                  className="absolute inset-0 rounded-2xl bg-foreground/10"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                />
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 flex size-14 shrink-0 items-center justify-center rounded-[14px]",
                  TILE_TONES[decor.tone]
                )}
              >
                <Icon size={35} strokeWidth={1.4} />
              </span>
              <span
                className={cn(
                  "relative z-10 text-base tracking-tight transition-colors duration-150",
                  active
                    ? "font-medium text-foreground"
                    : "text-foreground/75 group-hover:text-foreground dark:text-foreground/65"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}
