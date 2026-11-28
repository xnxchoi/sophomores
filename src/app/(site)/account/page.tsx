/**
 * Why the fuck are we using search params here?
 * Is this really the right way?
 */
import messages from "../../../../messages/en.json";
import { TicketAccountEntry } from "@/components/tickets/ticket-account-entry";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/server";
import { memberCleanCallbackQuery, memberSignInHref } from "@/lib/member-auth/paths";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import { ReviewCustomerNoticePage } from "@/components/commerce/review-customer-notice";

export const metadata = {
  title: messages.PageMetadata.account,
  robots: { index: false, follow: false }
};

export default async function MemberAccountStudyPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await connection();
  if (isReviewCopyRequest()) return <ReviewCustomerNoticePage kind="account" />;
  // A failed provider sign-in returns here with ?error=…; log in shows why.
  const query = await searchParams;
  // Provider failures for other flows return here (errorCallbackURL): only a listed next and a recognised code stay.
  const cleaned = memberCleanCallbackQuery("/account", query, true);
  if (cleaned) redirect(cleaned);
  // Owner, 24 Nov: a signed-out visitor is redirected to the sign-in page, never shown the sign-in modal. A listed
  // next and a recognised provider error code carry over; without a next, sign-in ends at shop home (owner, 24 Nov).
  if (!(await currentUser())) redirect(memberSignInHref(query?.next, query?.error));
  const providerReturn = query?.error !== undefined;
  const accountReturn =
    query?.next === "/me" ||
    query?.next === "/me/settings/account" ||
    query?.next === "/me/orders" ||
    query?.next === "/me/settings";
  return (
    // Signed in, the account shows even when its status check fails (owner, 26 Nov: "Account page shoulda fucking
    // should show the account page when logged in"); only a signed-out visitor sees sign-in, by the redirect above.
    <TicketAccountEntry
      signedIn
      initialFlow={providerReturn || accountReturn ? "login" : undefined}
      showAccountNavigation={providerReturn || accountReturn}
      initialCapabilities={await loadPublicMemberCapabilities()}
    />
  );
}
