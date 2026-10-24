import { MemberAccountStudy } from "@/components/member-auth/account-study";

export const metadata = {
  title: "Continue registration — Sophomores",
  robots: { index: false, follow: false }
};

/** Resume the UI, never authentication: the flow rechecks server session status. */
export default function MemberAccountContinuationPage() {
  return <MemberAccountStudy initialFlow="signup" />;
}
