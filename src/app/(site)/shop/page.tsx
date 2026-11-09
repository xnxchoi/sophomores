import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadCommerceOffer, type CommerceOffer } from "@/lib/commerce/catalogue";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { CommerceAccountGate, CommerceCheckout } from "@/components/commerce/checkout";
import { CommerceOfferView } from "@/components/commerce/offer";

export const metadata = { title: "Shop — Sophomores", robots: { index: false, follow: false } };

export default async function ShopPage() {
  await connection();
  let offer: CommerceOffer | null = null;
  try { offer = await loadCommerceOffer(await getPayload({ config })); }
  catch { console.error("Published commerce information is unavailable."); }
  return <CommerceOfferView offer={offer}>{offer && <CommerceAccountGate initialCapabilities={loadPublicMemberCapabilities()}>
    <CommerceCheckout offer={offer} />
  </CommerceAccountGate>}</CommerceOfferView>;
}
