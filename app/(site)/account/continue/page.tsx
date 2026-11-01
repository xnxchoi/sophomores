import { TicketAccountEntry } from "@/components/tickets/ticket-account-entry";

export const metadata = {
  title: "Continue your account — Sophomores",
  robots: { index: false, follow: false }
};

/** Provider returns recheck server state; pending setup requires an explicit choice. */
export default function MemberAccountContinuationPage() {
  return <TicketAccountEntry initialFlow="login" />;
}
