import { connection } from "next/server";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { InvitationClaim } from "@/components/commerce/invitation-claim";

export const metadata = { title: "Guest invitation — Sophomores", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function InvitationClaimPage() {
  await connection();
  return <main className="mx-auto min-h-[70svh] max-w-xl px-6 pb-20 pt-32 text-neutral-100">
    <h1 className="mb-6 text-3xl font-medium tracking-tight">Your guest invitation</h1>
    <InvitationClaim initialCapabilities={loadPublicMemberCapabilities()} />
  </main>;
}
