import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import messages from "../../../../../../messages/en.json";

import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { InvitationClaim } from "@/components/commerce/invitation-claim";
import { PageFrame } from "@/components/commerce/page-frame";

export const metadata = { title: messages.PageMetadata.guestInvitation, robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function InvitationClaimPage() {
  const t = await getTranslations('Customer.app_site_shop_invitations_claim_page');
  await connection();
  return <PageFrame title={t('yourGuestInvitation')}>
    <InvitationClaim signInOffInReview={isReviewCopyRequest()} initialCapabilities={loadPublicMemberCapabilities()} />
  </PageFrame>;
}
