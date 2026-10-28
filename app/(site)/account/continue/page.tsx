import { MemberAccountStudy } from "@/components/Authentication/member-auth/account-study";

export const metadata = {
  title: "Continue your account — Sophomores",
  robots: { index: false, follow: false }
};

/** Provider returns recheck server state; pending setup requires an explicit choice. */
export default function MemberAccountContinuationPage() {
  return <MemberAccountStudy initialFlow="login" />;
}
