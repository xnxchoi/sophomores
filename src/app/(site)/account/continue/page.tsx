import messages from "../../../../../messages/en.json";
import { TicketAccountEntry } from "@/components/tickets/ticket-account-entry";
import { connection } from "next/server";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import { ReviewCustomerNoticePage } from "@/components/commerce/review-customer-notice";

export const metadata = {
  title: messages.PageMetadata.authentication,
  robots: { index: false, follow: false }
};

/** Provider returns recheck server state; pending setup requires an explicit choice. */
export default async function MemberAccountContinuationPage() {
  await connection();
  if (isReviewCopyRequest()) return <ReviewCustomerNoticePage kind="account" />;
  return (
    <TicketAccountEntry
      initialFlow="login"
      showAccountNavigation
      initialCapabilities={loadPublicMemberCapabilities()}
    />
  );
}
