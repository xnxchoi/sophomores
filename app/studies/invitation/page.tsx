import { InvitationStudy } from "../../../components/invitation-study/experience";
import "../../../components/invitation-study/study.css";
import "../../../components/invitation-study/form.css";

export const metadata = {
  title: "Invitation study — sophomores",
  robots: { index: false, follow: false }
};

export default function InvitationStudyPage() {
  return <InvitationStudy />;
}
