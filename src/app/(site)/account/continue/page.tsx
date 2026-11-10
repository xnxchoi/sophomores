import messages from "../../../../../messages/en.json";
import { TicketAccountEntry } from "@/components/tickets/ticket-account-entry";
import { connection } from "next/server";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";

export const metadata = {
  title: messages.PageMetadata.authentication,
  robots: { index: false, follow: false }
};

/** Provider returns recheck server state; pending setup requires an explicit choice. */
export default async function MemberAccountContinuationPage() {
  await connection();
  return (
    <TicketAccountEntry
      initialFlow="login"
      initialCapabilities={loadPublicMemberCapabilities()}
    />
  );
}
