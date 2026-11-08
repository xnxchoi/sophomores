import { getTranslations } from "next-intl/server";
import { Link } from "@/components/core/Link/Link";
import s from "./Pricing.module.scss";

/**
 * Refund-info block for the public /plans surface (digital goods → refund
 * only). PG review requires refund info reachable from the product surface;
 * this links the full policy at /refund. Copy via `Plans.commerce`.
 */
export async function PlansRefundNote() {
  const t = await getTranslations("Plans.commerce");
  return (
    <section
      aria-label={t("title")}
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "0 24px 96px",
        textAlign: "center"
      }}
    >
      <p className={s.eyebrow} style={{ marginBottom: 12 }}>
        {t("eyebrow")}
      </p>
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.7,
          color: "var(--pricing-fg-mute)",
          maxWidth: "52ch",
          margin: "0 auto 16px"
        }}
      >
        {t("body")}
      </p>
      <Link
        href="/refund"
        style={{
          fontSize: 13,
          color: "var(--pricing-fg)",
          textDecoration: "underline",
          textUnderlineOffset: "0.3em"
        }}
      >
        {t("link")}
      </Link>
    </section>
  );
}
