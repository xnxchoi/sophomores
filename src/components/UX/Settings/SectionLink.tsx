"use client";

import { Link } from "@/components/core/Link/Link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useSettingsNav } from "./SettingsNav";

/**
 * Hub navigation row — Apple Settings cadence translated into our chrome.
 * Categorical color tile · title · optional ambient meta · chevron.
 *
 * The tile color is the only place the categorical token palette appears
 * on a row; everything else is luminance. The chevron is the explicit
 * forward-flow signal.
 *
 * Visual rule (per the breakpoint-2 audit): bare by default. The trailing
 * `meta` slot stays available for sections that genuinely need to surface
 * state (e.g. `Unverified`, `2 passkeys`), but we resist the urge to fill
 * it — peeks-per-row add visual noise that competes with the masthead.
 */
type CategoryTone =
  "account" | "options" | "support" | "billing" | "data" | "neutral";

const TILE_TONES: Record<CategoryTone, string> = {
  // Same oklch tokens as the CLAUDE.md "Admin surfaces" categorical
  // palette. Each color is used once per surface.
  account: "bg-[oklch(72%_0.10_50/0.18)] text-[oklch(85%_0.08_50)]",
  options: "bg-[oklch(60%_0.12_280/0.18)] text-[oklch(80%_0.10_280)]",
  support: "bg-[oklch(70%_0.14_160/0.18)] text-[oklch(85%_0.10_160)]",
  billing: "bg-[oklch(60%_0.18_25/0.20)] text-[oklch(80%_0.12_25)]",
  data: "bg-[oklch(75%_0.04_90/0.18)] text-[oklch(88%_0.04_90)]",
  neutral: "bg-foreground/[0.06] text-foreground/70 dark:bg-foreground/[0.08]"
};

interface SectionLinkProps {
  href: string;
  /** Visible row label. */
  title: string;
  /** Optional one-line description below the title. Optional. */
  description?: string;
  /** Optional ambient meta slot (e.g. "Unverified" / "3 active"). */
  meta?: ReactNode;
  /** 16px-ish leading icon, rendered inside the categorical color tile. */
  icon: ReactNode;
  /** Categorical tone. Each section picks one. */
  tone?: CategoryTone;
  className?: string;
}

export function SectionLink({
  href,
  title,
  description,
  meta,
  icon,
  tone = "neutral",
  className
}: SectionLinkProps) {
  const { pathname, pendingHref, setPendingHref } = useSettingsNav();
  const activePath = pendingHref ?? pathname;
  return (
    <Link
      href={href}
      onClick={() => {
        if (href === activePath) return;
        setPendingHref(href);
      }}
      className={cn(
        "group flex items-center gap-4 rounded-lg px-4 py-3.5 transition-colors",
        // Same inset chrome as FieldRow for visual cohesion across the
        // hub and sub-routes.
        "bg-foreground/[0.025] hover:bg-foreground/[0.045] dark:bg-foreground/[0.03] dark:hover:bg-foreground/[0.05]",
        "before:pointer-events-none before:absolute before:inset-x-2 before:top-0 before:h-px",
        "before:bg-gradient-to-r before:from-transparent before:via-foreground/10 before:to-transparent dark:before:via-foreground/12",
        "relative",

        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md",
          TILE_TONES[tone]
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm text-foreground">{title}</span>
        {description ? (
          <span className="text-xs text-foreground/65 dark:text-foreground/60">
            {description}
          </span>
        ) : null}
      </span>
      {meta ? (
        <span className="shrink-0 text-xs text-foreground/60 dark:text-foreground/55">
          {meta}
        </span>
      ) : null}
      <ChevronRight
        size={16}
        strokeWidth={1.4}
        aria-hidden="true"
        className="shrink-0 text-foreground/40 transition-colors group-hover:text-foreground/75 dark:text-foreground/35"
      />
    </Link>
  );
}

/**
 * Small grouped-rows wrapper. Renders a quiet group label above a stack
 * of <SectionLink>s, with the gradient hairline used elsewhere on the
 * surface as the divider. Use this in the hub to delineate Identity /
 * Access / Experience clusters.
 */
interface SectionGroupProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function SectionGroup({
  label,
  children,
  className
}: SectionGroupProps) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-3 px-1 pt-2">
        <span className="text-xs tracking-tight text-foreground/55 dark:text-foreground/50">
          {label}
        </span>
        <span
          aria-hidden="true"
          className="h-px flex-1 bg-gradient-to-r from-foreground/15 via-foreground/8 to-transparent"
        />
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}
