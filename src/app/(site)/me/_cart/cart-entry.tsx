import { getPayload } from "payload";
import config from "@payload-config";
import { loadCommerceOffer, type CommerceOffer } from "@/lib/commerce/catalogue";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { AccountCartSheet } from "./cart-sheet";

export async function AccountCartEntry() {
  let offer: CommerceOffer | null = null;
  try {
    offer = await loadCommerceOffer(await getPayload({ config }));
  } catch {
    console.error("Published cart pricing is unavailable.");
  }

  return <AccountCartSheet offer={offer} initialCapabilities={loadPublicMemberCapabilities()} />;
}
