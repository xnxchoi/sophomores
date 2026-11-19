import messages from "../../../../messages/en.json";
import { TicketAccountEntry } from "@/components/tickets/ticket-account-entry";
import { connection } from "next/server";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";

export const metadata = {
  title: messages.PageMetadata.account,
  robots: { index: false, follow: false }
};

export default async function MemberAccountStudyPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await connection();
  // A failed provider sign-in returns here with ?error=…; log in shows why.
  const query = await searchParams;
  const providerReturn = query?.error !== undefined;
  const accountReturn = query?.next === "/me" || query?.next === "/me/settings/account" || query?.next === "/me/orders" || query?.next === "/me/settings";
  return (
    <TicketAccountEntry
      initialFlow={providerReturn || accountReturn ? "login" : undefined}
      showAccountNavigation={providerReturn || accountReturn}
      initialCapabilities={loadPublicMemberCapabilities()}
    />
  );
}
