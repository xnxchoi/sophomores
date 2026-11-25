import messages from "../../../../messages/en.json";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { MemberAccountPage } from "@/components/Authentication/member-auth/account-study";
import { ReviewCustomerNoticePage } from "@/components/commerce/review-customer-notice";
import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import { readHeaderMemberState } from "@/lib/member-auth/header-state.server";
import { MEMBER_SIGN_IN_PATH, memberCleanCallbackQuery, memberSignInNext } from "@/lib/member-auth/paths";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";

export const metadata = {
  title: messages.PageMetadata.account,
  robots: { index: false, follow: false }
};

/**
 * The sign-in page (owner, 24 Nov: a signed-out /account redirects here; no modal). `next` comes from a closed list
 * (MEMBER_SIGN_IN_RETURNS); without a listed one, sign-in ends at shop home. A complete member goes straight on; an
 * account still in setup stays here and finishes it inline.
 */
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  await connection();
  const query = await searchParams;
  // A provider's raw error and error_description never stay in the URL: redirect to the clean query first.
  const cleaned = memberCleanCallbackQuery(MEMBER_SIGN_IN_PATH, query, true);
  if (cleaned) redirect(cleaned);
  if (isReviewCopyRequest()) return <ReviewCustomerNoticePage kind="account" />;
  const next = memberSignInNext(query?.next);
  const state = await readHeaderMemberState(await headers());
  if (state.state === "signed-in" && state.member) redirect(next);
  // Signed in but still in setup (a new social member back from the provider): the setup step, not the chooser.
  return <MemberAccountPage next={next} initialFlow={state.state === "signed-in" ? "login" : undefined} initialCapabilities={await loadPublicMemberCapabilities()} />;
}
