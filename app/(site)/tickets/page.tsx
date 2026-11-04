import { TicketSelection } from "@/components/tickets/ticket-selection";
import { connection } from "next/server";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";

export const metadata = {
  title: "Tickets — Sophomores",
  robots: { index: false, follow: false }
};

/** No catalogue or quote adapter is approved for the actual ticket entry yet. */
export default async function TicketsPage() {
  await connection();
  return <TicketSelection initialCapabilities={loadPublicMemberCapabilities()} />;
}
