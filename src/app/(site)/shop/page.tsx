import messages from "../../../../messages/en.json";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadCommerceOffer, type CommerceOffer } from "@/lib/commerce/catalogue";
import { loadPublishedCommerceEditions, type CommerceEditionCatalogue } from "@/lib/commerce/editions";
import { CommerceBookView } from "@/components/commerce/book-offer";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { CommerceAccountGate, CommerceCheckout } from "@/components/commerce/checkout";
import { CommerceOfferView } from "@/components/commerce/offer";

export const metadata = { title: messages.PageMetadata.shop, robots: { index: false, follow: false } };

export default async function ShopPage() {
  await connection();
  let offer: CommerceOffer | null = null;
  let editions: CommerceEditionCatalogue | null = null;
  let editionReadFailed = false;
  try {
    const payload = await getPayload({ config });
    try { editions = await loadPublishedCommerceEditions(payload); }
    catch {
      editionReadFailed = true;
      console.error("Published book information is unavailable.");
    }
    try { offer = await loadCommerceOffer(payload); }
    catch { console.error("Published commerce information is unavailable."); }
  } catch {
    editionReadFailed = true;
    console.error("Published commerce information is unavailable.");
  }
  if (editionReadFailed || !editions || editions.status === "displayable" || (editions.status === "unavailable"
    && editions.reason !== "native-schema-unregistered" && editions.reason !== "product-unpublished")) {
    return <CommerceBookView catalogue={editionReadFailed ? null : editions} />;
  }
  return <CommerceOfferView offer={offer}>{offer && <CommerceAccountGate initialCapabilities={loadPublicMemberCapabilities()}>
    <CommerceCheckout offer={offer} />
  </CommerceAccountGate>}</CommerceOfferView>;
}
