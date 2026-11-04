import { Link } from "@/components/core/Link/Link";
import { BenefitList, type Benefit } from "./BenefitList";
import s from "./Pricing.module.scss";

export type MembershipBandProps = {
  /** "page" — primary composition on /plans (full type ramp).
   *  "inline" — embedded inline on a product detail page (compressed). */
  variant?: "page" | "inline";
  tierLabel: string;
  priceDisplay: string;
  validityLabel: string;
  description: string;
  benefits: Benefit[];
  ctaLabel: string;
  ctaHref: string;
  ctaAriaLabel?: string;
};

/**
 * Portable Patron-pitch primitive. Renders both as the /plans body
 * composition (variant="page") and inline on a future product detail page
 * (variant="inline", compressed). The CSS lever is `data-variant` —
 * Pricing.module.scss styles the two variants without prop-driven className
 * munging.
 *
 * Server component. The CTA reuses the existing `.cta` class from
 * Pricing.module.scss.
 */
export function MembershipBand({
  variant = "page",
  tierLabel,
  priceDisplay,
  validityLabel,
  description,
  benefits,
  ctaLabel,
  ctaHref,
  ctaAriaLabel
}: MembershipBandProps) {
  return (
    <div className={`${s.membershipBand} ${s.fadeIn}`} data-variant={variant}>
      <div className={s.membershipHeader}>
        <p className={s.eyebrow}>{tierLabel}</p>
        <p className={s.membershipPrice}>
          <span className={s.membershipPriceMain}>{priceDisplay}</span>
          <span className={s.membershipValidity}>· {validityLabel}</span>
        </p>
      </div>
      <p className={s.membershipDescription}>{description}</p>
      <BenefitList benefits={benefits} />
      <Link
        href={ctaHref}
        className={s.cta}
        prefetch={false}
        aria-label={ctaAriaLabel ?? `${ctaLabel} — ${tierLabel}`}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
