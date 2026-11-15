import messages from "../../../../../messages/en.json";
import { headers } from "next/headers";
import { connection } from "next/server";
import { WalletActivation } from "@/components/commerce/wallet-activation";
import { loadWalletActivationView } from "@/lib/member-auth/wallet/runtime.server";

export const metadata = {
  title: messages.PageMetadata.activateMembership,
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

/**
 * Activation's own page (ADR-0005, owner 2026-11-16): `/account/activate`
 * sits under the account it belongs to and names the one thing it does.
 */
export default async function ActivateMembershipPage() {
  await connection();
  return <WalletActivation initialView={await loadWalletActivationView(await headers())} />;
}
