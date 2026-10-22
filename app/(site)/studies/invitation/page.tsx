import { InvitationStudy } from "@/components/invitation/experience";
import "@/components/invitation/study.css";
import "@/components/invitation/form.css";

export const metadata = {
  title: "Invitation study — sophomores",
  robots: { index: false, follow: false }
};

export default function InvitationStudyPage() {
  return <InvitationStudy />;
}
