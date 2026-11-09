"use client";
import { useTranslations } from "next-intl";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsNav } from "./SettingsNav";

interface SubRouteHeaderProps {
  title: string;
  blurb?: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export function SubRouteHeader({
  title,
  blurb,
  backHref = "/me/settings",
  backLabel,
  className,
}: SubRouteHeaderProps) {
const t = useTranslations("Customer.settingsControls");
  const { pathname, pendingHref, setPendingHref } = useSettingsNav();
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
          "group inline-flex w-fit items-center gap-1.5 text-xs text-neutral-400 transition-colors hover:text-white",
          "rounded-sm xl:hidden"
        )}
      >
        <ChevronLeft
          size={14}
          strokeWidth={1.4}
          className="transition-transform group-hover:-translate-x-0.5"
          aria-hidden="true"
        />
        {backLabel ?? t("backToSettings")}
      </Link>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-light tracking-tight text-white xl:text-4xl">
          {title}
        </h1>
        {blurb ? (
          <p className="max-w-2xl text-sm text-neutral-400">
            {blurb}
          </p>
        ) : null}
      </div>
    </header>
  );
}
