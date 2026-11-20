import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import messages from "../../../../../messages/en.json";

import { getTranslations } from "next-intl/server";
import { Link } from "@/components/core/Link/Link";
import { PageFrame } from "@/components/commerce/page-frame";
import { connection } from "next/server";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { CommerceAccountGate } from "@/components/commerce/checkout";
import { CommercePayment } from "@/components/commerce/payment";

export const metadata = { title: messages.PageMetadata.payment, robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function CommercePaymentPage() {
  const t = await getTranslations('Customer.app_site_shop_payment_page');
  await connection();
  return <PageFrame title={t('yourPayment')} introduction={t('aReturnFromThePaymentWindowIsNotA')}>
    <nav aria-label={t('navigation')} className="mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <Link href="/shop" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t('backToShop')}</Link>
      <Link href="/help" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t('help')}</Link>
    </nav>
    <CommerceAccountGate signInOffInReview={isReviewCopyRequest()} initialCapabilities={loadPublicMemberCapabilities()}>
      <div className="min-w-0 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-8">
        <CommercePayment recovery />
      </div>
    </CommerceAccountGate>
  </PageFrame>;
}
