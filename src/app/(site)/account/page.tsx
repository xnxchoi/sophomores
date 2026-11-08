import { TicketAccountEntry } from "@/components/tickets/ticket-account-entry";
import { connection } from "next/server";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";

export const metadata = {
  title: "Account — Sophomores",
  robots: { index: false, follow: false }
};

export default async function MemberAccountStudyPage() {
  await connection();
  return <TicketAccountEntry initialCapabilities={loadPublicMemberCapabilities()} />;
}
