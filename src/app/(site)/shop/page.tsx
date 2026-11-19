import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadCommerceOffer, type CommerceOffer } from "@/lib/commerce/catalogue";
import { loadPublishedCommerceEditions, type CommerceEditionCatalogue } from "@/lib/commerce/editions";
import { CommerceBookView } from "@/components/commerce/book-offer";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { CommerceAccountGate, CommerceCheckout } from "@/components/commerce/checkout";
import { CommerceOfferView } from "@/components/commerce/offer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata");
  return { title: t("shop"), robots: { index: false, follow: false } };
}

export default async function ShopPage() {
  await connection();
  let offer: CommerceOffer | null = null;
  let editions: CommerceEditionCatalogue | null = null;
  let showLegacy = false;
  try {
    const payload = await getPayload({ config });
    editions = await loadPublishedCommerceEditions(payload);
    // Only explicit native absence can admit the independent legacy offer.
    showLegacy = editions.status === "unavailable" &&
      (editions.reason === "native-schema-unregistered" || editions.reason === "product-unpublished");
    if (showLegacy) {
      try { offer = await loadCommerceOffer(payload); }
      catch { console.error("Published commerce information is unavailable."); }
    }
  } catch {
    console.error("Published book information is unavailable.");
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {!showLegacy ? (
        <CommerceBookView catalogue={editions} />
      ) : (
        <CommerceOfferView offer={offer}>
          {offer && (
            <CommerceAccountGate initialCapabilities={loadPublicMemberCapabilities()}>
              <CommerceCheckout offer={offer} />
            </CommerceAccountGate>
          )}
        </CommerceOfferView>
      )}
    </div>
  );
}
