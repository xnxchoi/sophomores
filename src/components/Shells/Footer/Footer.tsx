import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { TickerCrown } from "@/components/core/TickerCrownAnimated/TickerCrown";
import { Link } from "@/components/core/Link/Link";
import { BUSINESS } from "@/constants/business";
import { LocaleSwitch } from "./LocaleSwitch";

interface ColophonField {
  label: string;
  value: ReactNode;
}

/**
 * Centered editorial colophon — label/value pairs flow as continuous prose
 * separated by middots. Wraps naturally inside the centered column. Each
 * `label value` pair is held together by `whitespace-nowrap` so line breaks
 * fall between pairs, not within them.
 */
function Colophon({ fields, lang }: { fields: ColophonField[]; lang: string }) {
  return (
    <p
      className="text-[13px] leading-[2.05] [text-wrap:pretty] text-foreground/85"
      lang={lang}
    >
      {fields.map((field, index) => {
        const isLast = index === fields.length - 1;
        return (
          <span key={field.label}>
            <span className="whitespace-nowrap">
              <span className="text-foreground/55">{field.label}</span>{" "}
              <span className="text-foreground">{field.value}</span>
            </span>
            {!isLast ? (
              <span aria-hidden className="mx-2 text-foreground/30">
                ·
              </span>
            ) : null}{" "}
          </span>
        );
      })}
    </p>
  );
}

/**
 * Single-source-via-next-intl footer.
 *
 *   - Every locale-bearing string flows through `t()` from the
 *     `Footer` namespace in `messages/*.json`. There are no
 *     `isKo ? ... : ...` ternaries and no reads from `BUSINESS.*Ko` /
 *     `BUSINESS.addressEn` parallel fields. If a label needs to vary by
 *     locale, the variation lives in messages — full stop.
 *   - `getLocale()` is called for one purpose only: to set the HTML
 *     `lang` attribute on the colophon and the wordmark, so screen
 *     readers and font selection get a correct hint. Locale never gates
 *     content choice.
 *   - `BUSINESS` provides language-agnostic identifiers (registration
 *     numbers, phone, email, domain). Their env-driven defaults can
 *     resolve to empty — we fall back to a localized "pending" message
 *     in that case via `||`.
 */
export async function Footer() {
  const locale = await getLocale();
  const t = await getTranslations("Footer");
  const year = new Date().getFullYear();

  const colophonFields: ColophonField[] = [
    { label: t("fields.tradeName"), value: t("businessName") },
    { label: t("fields.representative"), value: t("representativeName") },
    {
      label: t("fields.registration"),
      value: BUSINESS.registrationNumber || "—"
    },
    { label: t("fields.address"), value: t("address") },
    { label: t("fields.phone"), value: BUSINESS.phone || "—" },
    {
      label: t("fields.privacyOfficer"),
      value: (
        <>
          {BUSINESS.privacyOfficerName}
          <span aria-hidden className="mx-1.5 text-foreground/40">
            ·
          </span>
          <a
            href={`mailto:${BUSINESS.privacyOfficerEmail}`}
            className="underline-offset-[0.3em] transition-opacity hover:underline hover:opacity-80"
          >
            {BUSINESS.privacyOfficerEmail}
          </a>
        </>
      )
    }
  ];

  const navLinks = [
    { href: "/privacy", label: t("links.privacy") },
    { href: "/terms", label: t("links.terms") },
    { href: "/refund", label: t("links.refund") },
    { href: "/plans", label: t("links.plans") }
  ];

  return (
    <footer
      role="contentinfo"
      data-legal-footer
      className="relative z-10 mt-32 border-t border-border/15 bg-background"
    >
      <div className="mx-auto max-w-2xl px-6 py-20 text-center sm:px-10 xl:py-28">
        <div
          aria-hidden
          className="mx-auto my-12 flex items-center justify-center gap-4 xl:my-16"
        >
          <span className="h-px w-12 bg-border/40" />
          <span className="text-small leading-none text-foreground/40">◇</span>
          <span className="h-px w-12 bg-border/40" />
        </div>
        {/* Bezel-strip motif — three lanes of vertical ticks reading as a
            rotating focus ring viewed edge-on. Crowns the wordmark below. */}
        <div className="my-15 flex justify-center">
          <TickerCrown />
        </div>
        {/* Brand sign-off — small, single instance, editorial serif */}
        <div className="my-15">
          <p className="font-serif text-2xl font-light tracking-tight text-foreground xl:text-3xl">
            The Hideaway.
          </p>
        </div>
        <div className="mb-15">
          <LocaleSwitch />
        </div>
        {/* Nav strip */}
        <nav aria-label={t("navAria")}>
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[14px] font-light tracking-tight">
            {navLinks.map((item, index) => (
              <li key={item.href} className="flex items-center gap-x-5">
                {index > 0 && index < navLinks.length ? (
                  <span aria-hidden className="text-foreground/30">
                    ·
                  </span>
                ) : null}
                <Link
                  href={item.href}
                  className="text-foreground underline decoration-transparent underline-offset-[0.3em] transition-[text-decoration-color] duration-300 hover:decoration-foreground/60"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contact line */}
        <div className="mt-6 flex w-full text-[13px] text-foreground/80">
          <div className="flex grow">
            <a
              href={`mailto:${BUSINESS.email}`}
              className="underline-offset-[0.3em] transition-opacity hover:underline hover:opacity-80"
            >
              {BUSINESS.email}
            </a>
          </div>
          <span aria-hidden className="mx-3 text-foreground/30">
            ·
          </span>
          <div className="flex grow text-left text-wrap wrap-break-word text-foreground/70">
            {t("serviceHours")}
          </div>
        </div>

        {/* Ornament — classical editorial divider; single glyph between two
            hairlines. Replaces a plain UI rule with a typographic mark. */}
        <div
          aria-hidden
          className="mx-auto my-12 flex items-center justify-center gap-4 xl:my-16"
        >
          <span className="h-px w-12 bg-border/40" />
          <span className="text-small leading-none text-foreground/40">◇</span>
          <span className="h-px w-12 bg-border/40" />
        </div>

        {/* Business colophon — centered prose flow */}
        <section aria-label={t("businessAria")}>
          <Colophon fields={colophonFields} lang={locale} />
        </section>

        {/* Ornament */}
        <div
          aria-hidden
          className="mx-auto mt-12 mb-10 flex items-center justify-center gap-4 xl:mt-16 xl:mb-12"
        >
          <span className="h-px w-12 bg-border/40" />
          <span className="text-small leading-none text-foreground/40">◇</span>
          <span className="h-px w-12 bg-border/40" />
        </div>

        {/* Copyright + locale strip */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-foreground/55">
          <span>© {year}</span>
          <span aria-hidden className="text-foreground/30">
            ·
          </span>
          <span lang={locale}>{t("businessName")}</span>
        </div>
      </div>
    </footer>
  );
}
