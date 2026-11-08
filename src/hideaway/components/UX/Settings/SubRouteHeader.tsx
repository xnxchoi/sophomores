"use client";

import { Link } from "@/hideaway/components/core/Link/Link";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { useSettingsNav } from "./SettingsNav";

/**
 * Sub-route header for `/me/settings/*` pages.
 *
 * macOS × iOS hybrid:
 *   - **xl+ (desktop)**: the persistent rail in the layout already shows
 *     the active section, so the back link would be redundant. Only the
 *     title + blurb render.
 *   - **< xl (mobile / tablet)**: the rail collapses, so the back link
 *     becomes the primary navigation affordance back to the hub.
 *
 * Mirrors the macOS / iOS Settings cadence — desktop keeps a sticky nav,
 * mobile drills down with explicit back affordances.
 */
interface SubRouteHeaderProps {
  /** The section's display name (e.g. "Profile", "Security"). */
  title: string;
  /** Optional one-line blurb. Sits below the title at body weight. */
  blurb?: string;
  /** Where the back link goes. Defaults to the settings hub. */
  backHref?: string;
  /**
   * Visible label for the back link. When omitted, the localized
   * `Settings.back` translation is used (the common case — only override
   * if back goes somewhere other than the settings hub).
   */
  backLabel?: string;
  className?: string;
}

export function SubRouteHeader({
  title,
  blurb,
  backHref = "/me/settings",
  backLabel,
  className
}: SubRouteHeaderProps) {
  const t = useTranslations("Settings");
  const { pathname, pendingHref, setPendingHref } = useSettingsNav();
  const resolvedBackLabel = backLabel ?? t("back");
  const activePath = pendingHref ?? pathname;
  return (
    <header className={cn("flex flex-col gap-3", className)}>
      <Link
        href={backHref}
        onClick={() => {
          if (backHref === activePath) return;
          setPendingHref(backHref);
        }}
        className={cn(
          "group inline-flex w-fit items-center gap-1.5 text-xs text-foreground/55 transition-colors hover:text-foreground/85",

          "rounded-sm",
          // The persistent rail on xl+ makes this redundant. Hidden on
          // desktop, primary nav affordance below xl.
          "xl:hidden"
        )}
      >
        <ChevronLeft
          size={14}
          strokeWidth={1.4}
          className="transition-transform group-hover:-translate-x-0.5"
          aria-hidden="true"
        />
        {resolvedBackLabel}
      </Link>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-light tracking-tight text-balance xl:text-4xl 2xl:text-5xl">
          {title}
        </h1>
        {blurb ? (
          <p className="max-w-2xl text-sm text-foreground/65 dark:text-foreground/60">
            {blurb}
          </p>
        ) : null}
      </div>
    </header>
  );
}
