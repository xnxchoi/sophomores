import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import messages from "../../../../../../messages/en.json";

import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { CommerceAccountGate } from "@/components/commerce/checkout";
import { OrderAdmissions } from "@/components/commerce/order-admissions";
import { PageFrame } from "@/components/commerce/page-frame";

export const metadata = { title: messages.PageMetadata.guestAdmissions, robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function OrderAdmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations('Customer.app_site_shop_orders_id_page');
  await connection();
  const result = z.uuid().safeParse((await params).id);
  if (!result.success) notFound();
  return <PageFrame title={t('yourOrder')}>
    <CommerceAccountGate signInOffInReview={isReviewCopyRequest()} initialCapabilities={await loadPublicMemberCapabilities()}><OrderAdmissions orderID={result.data} /></CommerceAccountGate>
  </PageFrame>;
}
