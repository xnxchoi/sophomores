"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { SurvivalKit } from "./SurvivalKit";

/**
 * Simplified view — editorial card mode.
 *
 * One screen. Date, location + address, the two windows (day → grill /
 * night → cocktails), entry block, RSVP. Designed for the "I just want
 * the facts" reader and for screens too small for the horizontal scene.
 *
 * Composition shift from the immersive view: where the scene is sprawl
 * and theatrics, the card is tight typography on a single column. Every
 * line earns its place — no decorative chrome, no parallax. The brand
 * voice still carries via the kicker ("30 & Smokin'") and the closing
 * line, but the visual register is restrained.
 */
export function SimplifiedView() {
  const t = useTranslations("Event.DayNNight");

  return (
    <div className="grid min-h-svh grid-rows-[auto_1fr_auto] content-start gap-10 p-6 md:grid-rows-[1fr_auto_1fr] md:content-stretch md:gap-16 md:p-12">
      <header className="flex items-start justify-between gap-4 font-sans text-[10px] tracking-[0.2em] text-[var(--dn-fg-faint)] uppercase">
        <span>
          {t("date.short")} · {t("location.neighborhood")}
        </span>
        <span>{t("date.weekday")}</span>
      </header>
      <div className="grid max-w-[720px] gap-6 md:max-w-[880px] md:gap-8">
        <p className="font-sans text-[11px] tracking-[0.22em] text-[var(--dn-fg-mute)] uppercase">
          {t("opening.kicker")}
        </p>
        <h1 className="font-serif text-[clamp(3.2rem,9vw,8rem)] leading-[0.95] font-bold tracking-[-0.02em] text-[var(--dn-fg)]">
          {t("title")}
        </h1>
        <p className="max-w-[50ch] text-[clamp(1.4rem,2vw,1.9rem)] leading-[1.45] font-light tracking-[-0.01em] text-[var(--dn-fg-mute)]">
          {t("opening.lede")}
        </p>

        <dl className="mt-8 grid grid-cols-1 gap-6 font-sans text-xs leading-[1.7] text-[var(--dn-fg-mute)] md:mt-12 md:max-w-[640px] md:grid-cols-2 md:gap-x-12 md:gap-y-8">
          {" "}
          <div
            id="entry"
            className="grid scroll-mt-16 grid-cols-[72px_1fr] items-baseline gap-[14px]"
          >
            <dt className="self-start pt-0.5 text-[10px] tracking-[0.18em] text-[var(--dn-fg-faint)] uppercase">
              {t("act.day.label")}
            </dt>
            <dd className="flex flex-col text-[13px] tracking-normal text-[var(--dn-fg)]">
              {t("act.day.time")}
            </dd>
          </div>
          <div className="grid grid-cols-[72px_1fr] items-baseline gap-[14px]">
            <dt className="self-start pt-0.5 text-[10px] tracking-[0.18em] text-[var(--dn-fg-faint)] uppercase">
              {t("act.night.label")}
            </dt>
            <dd className="flex flex-col text-[13px] tracking-normal text-[var(--dn-fg)]">
              {t("act.night.time")}
            </dd>
          </div>
          <div className="grid grid-cols-[72px_1fr] items-baseline gap-[14px]">
            <dt className="self-start pt-0.5 text-[10px] tracking-[0.18em] text-[var(--dn-fg-faint)] uppercase">
              {t("location.label")}
            </dt>
            <dd className="flex flex-col text-[13px] tracking-normal text-[var(--dn-fg)]">
              <span>{t("location.neighborhood")}</span>
              <span className="mt-1 block text-[10.5px] tracking-[0.06em] text-[var(--dn-fg-faint)]">
                {t("location.address")}
              </span>
            </dd>
          </div>
          <div className="grid grid-cols-[72px_1fr] items-baseline gap-[14px]">
            <dt className="self-start pt-0.5 text-[10px] tracking-[0.18em] text-[var(--dn-fg-faint)] uppercase">
              {t("entry.heading")}
            </dt>
            <dd className="flex flex-col text-[13px] tracking-normal text-[var(--dn-fg)]">
              <span>{t("entry.amount")}</span>
              <span className="mt-1 block text-[10.5px] tracking-[0.06em] text-[var(--dn-fg-faint)]">
                {t("entry.perGuest")} · {t("entry.method")}
              </span>
            </dd>
          </div>
        </dl>

        <div className="mt-10 flex flex-col items-start gap-3 self-start md:mt-12 md:flex-row md:items-center md:gap-5">
          <Link
            href="#entry"
            className="ease inline-flex items-center gap-[14px] border border-[var(--dn-fg)] bg-[var(--dn-fg)] px-[26px] py-[14px] font-sans text-[11px] tracking-[0.22em] text-[var(--dn-bg)] uppercase no-underline transition-[background,color] duration-[250ms] hover:bg-transparent hover:text-[var(--dn-fg)]"
          >
            <span>{t("rsvpCta.primary")}</span>
            <span aria-hidden>→</span>
          </Link>
          <span className="font-sans text-[10px] tracking-[0.18em] text-[var(--dn-fg-faint)] uppercase">
            {t("rsvpCta.secondary")}
          </span>
        </div>

        <p className="mt-14 max-w-[38ch] font-serif text-[clamp(1.05rem,1.2vw,1.25rem)] leading-[1.55] text-[var(--dn-fg-mute)] italic md:mt-16">
          {t("closing.lede")}
        </p>

        {/* Survival Kit — Phase 5a P5a-Product-1. Sits below the RSVP
            CTA + closing line so it reads as the logistics appendix,
            not part of the editorial header. Absorbs the predictable
            DM volume the product-lens audit identified. */}
        <SurvivalKit />
      </div>
      <footer className="flex items-end justify-between gap-4 font-sans text-[10px] tracking-[0.2em] text-[var(--dn-fg-faint)] uppercase">
        <span>{t("footer.hosts")}</span>
        <span>{t("footer.rsvpClosesAt")}</span>
      </footer>
    </div>
  );
}
