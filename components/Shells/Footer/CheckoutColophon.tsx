import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { BUSINESS } from "src/constants/business";

/**
 * Compact business-info colophon for transactional surfaces.
 *
 * PG review ("결제페이지까지 상시 노출") requires the 사업자 identity block to
 * be visible through checkout and the payment-result pages. The global
 * `Footer` colophon is *hidden* on `/checkout` and on the lostinseoul
 * checkout/payment surfaces (both suppress the site footer), so those routes
 * need this standalone block.
 *
 * Rendered as a `<section>`, NOT a `<footer>` — the lostinseoul dark
 * surfaces hide every `footer` via CSS, which would erase a `<footer>` here
 * exactly where it is required.
 *
 * Values come from the shared `Footer.*` messages + `BUSINESS` constants
 * (single source), and labels from `Commerce.colophon`. No hardcoded copy,
 * no isKo ternaries. Colors use `currentColor` at tiered opacities so the
 * block inherits whatever surface it sits on (dark lost, light/dark plans).
 */

interface ColophonField {
  label: string;
  value: ReactNode;
}

export async function CheckoutColophon({
  className = ""
}: {
  className?: string;
}) {
  const locale = await getLocale();
  const [tFooter, tLabels] = await Promise.all([
    getTranslations("Footer"),
    getTranslations("Commerce.colophon")
  ]);

  const pending = tLabels("pending");

  const fields: ColophonField[] = [
    { label: tLabels("tradeName"), value: tFooter("businessName") },
    { label: tLabels("representative"), value: tFooter("representativeName") },
    {
      label: tLabels("registration"),
      value: BUSINESS.registrationNumber || pending
    },
    { label: tLabels("address"), value: tFooter("address") },
    { label: tLabels("phone"), value: BUSINESS.phone || pending }
  ];

  return (
    <section
      aria-label={tLabels("aria")}
      className={`mt-10 border-t border-current/15 pt-6 ${className}`.trim()}
      lang={locale}
    >
      <p className="text-[12px] leading-[1.9] [text-wrap:pretty] text-current/80">
        {fields.map((field, index) => (
          <span key={field.label}>
            <span className="whitespace-nowrap">
              <span className="text-current/65">{field.label}</span>{" "}
              <span className="text-current/90">{field.value}</span>
            </span>
            {index < fields.length - 1 ? (
              <span aria-hidden className="mx-2 text-current/30">
                ·
              </span>
            ) : null}{" "}
          </span>
        ))}
      </p>
    </section>
  );
}
