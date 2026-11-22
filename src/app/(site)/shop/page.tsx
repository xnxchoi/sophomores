import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadCommerceOffer, type CommerceOffer } from "@/lib/commerce/catalogue";
import { listCommerceEditionProducts, type CommerceEditionShop } from "@/lib/commerce/editions";
import { CommerceShopView } from "@/components/commerce/book-offer";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { CommerceAccountGate, CommerceCheckout, type PurchaseAllowance } from "@/components/commerce/checkout";
import { legacyPurchaseAllowance } from "../_commerce/purchase-allowance";
import { CommerceOfferView } from "@/components/commerce/offer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata");
  return { title: t("shop"), robots: { index: false, follow: false } };
}

export default async function ShopPage() {
  await connection();
  let offer: CommerceOffer | null = null;
  let editions: CommerceEditionShop | null = null;
  let showLegacy = false;
  let allowance: PurchaseAllowance | null = null;
  try {
    const payload = await getPayload({ config });
    // Each edition is its own product: list them all, never pick one (owner).
    editions = await listCommerceEditionProducts(payload);
    // Only explicit native absence can admit the independent legacy offer.
    showLegacy = editions.status === "unavailable" &&
      (editions.reason === "native-schema-unregistered" || editions.reason === "product-unpublished");
    if (showLegacy) {
      try { offer = await loadCommerceOffer(payload); if (offer) allowance = legacyPurchaseAllowance; }
      catch { offer = null; allowance = null; console.error("Published commerce information is unavailable."); }
    }
  } catch {
    console.error("Published book information is unavailable.");
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {!showLegacy ? (
        <CommerceShopView shop={editions} />
      ) : (
        <CommerceOfferView offer={offer}>
          {offer && (
            <CommerceAccountGate signInOffInReview={isReviewCopyRequest()} initialCapabilities={await loadPublicMemberCapabilities()}>
              {allowance && <CommerceCheckout offer={offer} allowance={allowance} />}
            </CommerceAccountGate>
          )}
        </CommerceOfferView>
      )}
    </div>
  );
}
