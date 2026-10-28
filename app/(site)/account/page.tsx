import { MemberAccountStudy } from "@/components/Authentication/member-auth/account-study";

export const metadata = {
  title: "Account — Sophomores",
  robots: { index: false, follow: false }
};

export default function MemberAccountStudyPage() {
  return <MemberAccountStudy />;
}
