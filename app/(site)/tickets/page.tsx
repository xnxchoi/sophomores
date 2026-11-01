import { TicketSelection } from "@/components/tickets/ticket-selection";

export const metadata = {
  title: "Tickets — Sophomores",
  robots: { index: false, follow: false }
};

/** No catalogue or quote adapter is approved for the actual ticket entry yet. */
export default function TicketsPage() {
  return <TicketSelection />;
}
