import { useLocale, useTranslations } from "next-intl";
import type { RefundTerms as Terms } from "@/lib/commerce/refund-policy";
import { cn } from "@/lib/utils";

/**
 * The refund rule a purchase is made under, told before Pay and before a resumed payment (owner, 25 Nov: personalised
 * products may refuse refunds once the customer is told before the sale). Body size in the foreground colour, its own
 * line (Review-B r2). The terms come from the server; this only renders them. `as="span"` sits inside a button row.
 */
export function RefundTerms({ terms, as: Tag = "p", className }: { terms: Terms; as?: "p" | "span"; className?: string }) {
  const t = useTranslations("Customer.components_commerce_refund_terms");
  const locale = useLocale();
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  const text = terms.kind === "refundable" ? t("refundable")
    : terms.kind === "until" ? t("refundableUntil", { cutoff: date(terms.cutoffAt) })
    : terms.kind === "closed" ? (terms.cutoffAt ? t("refundsClosed", { cutoff: date(terms.cutoffAt) }) : t("refundsClosedNoDate"))
    : terms.reason === "personalised-edition" ? t("personalisedNoRefunds") : t("membershipNoRefunds");
  return <Tag data-refund-terms={terms.kind} className={cn("block text-sm leading-6 text-foreground text-pretty", className)}>{text}</Tag>;
}
