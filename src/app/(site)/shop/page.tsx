import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadCommerceOffer, type CommerceOffer } from "@/lib/commerce/catalogue";
import { listCommerceEditionProducts, type CommerceEditionShop } from "@/lib/commerce/editions";
import { BookUnavailable, CommerceShopView } from "@/components/commerce/book-offer";
import { CommerceLoadRetry } from "@/components/commerce/load-retry";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { CommerceAccountGate, CommerceCheckout, type PurchaseAllowance } from "@/components/commerce/checkout";
import { legacyPurchaseAllowance } from "../_commerce/purchase-allowance";
import { CommerceOfferView } from "@/components/commerce/offer";
import { readProductPageContent, type ProductPageContent } from "@/components/commerce/product-page/_shared/content";
import { loadProductPageDocuments } from "./products/[id]/page-documents";
import { refundPolicy, refundTerms } from "@/lib/commerce/refund-policy";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata");
  return { title: t("shop"), robots: { index: false, follow: false } };
}

export default async function ShopPage() {
  await connection();
  let offer: CommerceOffer | null = null;
  let editions: CommerceEditionShop | null = null;
  // Each listed product's page fields (art, book textures, shelf title and order); a failed read leaves the books plain.
  const contents: Record<string, ProductPageContent> = {};
  let showLegacy = false;
  // A read that threw is a failure to show with a retry, never the closed shop (Review-B).
  let failed = false;
  let allowance: PurchaseAllowance | null = null;
  try {
    const payload = await getPayload({ config });
    // Each edition is its own product: list them all, never pick one (owner).
    editions = await listCommerceEditionProducts(payload);
    if (editions.status === "displayable") {
      const ids = editions.products.map((entry) => entry.product.productID);
      const documents = await loadProductPageDocuments(payload, ids).catch(() => [] as unknown[]);
      for (const id of ids) contents[id] = readProductPageContent(documents.find((document) => String((document as { id?: unknown }).id) === id));
    }
    // Only explicit native absence can admit the independent legacy offer.
    showLegacy = editions.status === "unavailable" &&
      (editions.reason === "native-schema-unregistered" || editions.reason === "product-unpublished");
    if (showLegacy) {
      try { offer = await loadCommerceOffer(payload); if (offer) allowance = legacyPurchaseAllowance; }
      catch { offer = null; allowance = null; failed = true; console.error("Published commerce information is unavailable."); }
    }
  } catch {
    failed = true;
    console.error("Published book information is unavailable.");
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {failed ? <BookUnavailable retry={<CommerceLoadRetry className="mt-4" />} /> :  !showLegacy ? (
        <CommerceShopView shop={editions} contents={contents} />
      ) : (
        <CommerceOfferView offer={offer}>
          {offer && (
            <CommerceAccountGate signInOffInReview={isReviewCopyRequest()} initialCapabilities={await loadPublicMemberCapabilities()}>
              {allowance && <CommerceCheckout offer={offer} allowance={allowance} refundTerms={refundTerms(refundPolicy({ version: 1 }), null)} />}
            </CommerceAccountGate>
          )}
        </CommerceOfferView>
      )}
    </div>
  );
}
