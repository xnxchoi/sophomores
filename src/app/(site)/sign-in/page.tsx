import messages from "../../../../messages/en.json";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { MemberSignInPage } from "@/components/Authentication/member-auth/account-study";
import { ReviewCustomerNoticePage } from "@/components/commerce/review-customer-notice";
import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import { readHeaderMemberState } from "@/lib/member-auth/header-state.server";
import { memberSignInNext } from "@/lib/member-auth/paths";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";

export const metadata = {
  title: messages.PageMetadata.account,
  robots: { index: false, follow: false }
};

/**
 * The sign-in page (owner, 24 Nov: a signed-out /account redirects here; no modal). `next` comes from an explicit
 * allowlist (/account, /me and its subpaths); anything else is /account. A complete member goes straight on; an
 * account still in setup stays here and finishes it inline.
 */
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  await connection();
  if (isReviewCopyRequest()) return <ReviewCustomerNoticePage kind="account" />;
  const next = memberSignInNext((await searchParams)?.next);
  const state = await readHeaderMemberState(await headers());
  if (state.state === "signed-in" && state.member) redirect(next);
  // Signed in but still in setup (a new social member back from the provider): the setup step, not the chooser.
  return <MemberSignInPage next={next} initialFlow={state.state === "signed-in" ? "login" : undefined} initialCapabilities={await loadPublicMemberCapabilities()} />;
}
