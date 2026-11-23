import { useTranslations } from "next-intl";
import { Link } from "@/components/core/Link/Link";
import { PageFrame } from "./page-frame";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";

export function ReviewCustomerNotice() {
  const t = useTranslations("Customer.components_commerce_checkout");
  const navigation = useTranslations("Customer.navigation");
  return <section className="space-y-3 border-y border-border py-6">
    <p className="text-base leading-relaxed text-muted-foreground">{t("customerSignInIsOffInThisReviewCopy")}</p>
    <Link href="/shop" prefetch={false} className="group/focus inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 hover:decoration-current"><FocusShape className="outline-offset-4">{navigation("shop")}</FocusShape></Link>
  </section>;
}

export function ReviewCustomerNoticePage({ kind }: { kind: "account" | "payment" }) {
  const t = useTranslations("PageMetadata");
  return <PageFrame title={t(kind)}><ReviewCustomerNotice /></PageFrame>;
}
