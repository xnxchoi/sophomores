import messages from "../../../../../messages/en.json";
import { TicketAccountEntry } from "@/components/tickets/ticket-account-entry";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { MEMBER_ACCOUNT_CONTINUATION_PATH, memberCleanCallbackQuery } from "@/lib/member-auth/paths";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import { ReviewCustomerNoticePage } from "@/components/commerce/review-customer-notice";

export const metadata = {
  title: messages.PageMetadata.authentication,
  robots: { index: false, follow: false }
};

/** Provider returns recheck server state; pending setup requires an explicit choice. */
export default async function MemberAccountContinuationPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await connection();
  // A provider's raw error and error_description never stay in the URL (Review-A, 24 Nov).
  const cleaned = memberCleanCallbackQuery(MEMBER_ACCOUNT_CONTINUATION_PATH, await searchParams, false);
  if (cleaned) redirect(cleaned);
  if (isReviewCopyRequest()) return <ReviewCustomerNoticePage kind="account" />;
  return (
    <TicketAccountEntry
      initialFlow="login"
      showAccountNavigation
      initialCapabilities={await loadPublicMemberCapabilities()}
    />
  );
}
