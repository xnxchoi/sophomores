import { TicketAccountEntry } from "@/components/tickets/ticket-account-entry";

export const metadata = {
  title: "Account — Sophomores",
  robots: { index: false, follow: false }
};

export default function MemberAccountStudyPage() {
  return <TicketAccountEntry />;
}
