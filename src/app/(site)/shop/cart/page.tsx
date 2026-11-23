import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageFrame } from "@/components/commerce/page-frame";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadCommerceOffer, type CommerceOffer } from "@/lib/commerce/catalogue";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { CommerceAccountGate } from "@/components/commerce/checkout";
import { CommerceCart } from "@/components/commerce/cart";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata");
  return {
    title: t("cart"),
    robots: { index: false, follow: false }
  };
}

export default async function CartPage() {
  await connection();
  const t = await getTranslations("Customer.app_site_shop_cart_page");
  let offer: CommerceOffer | null = null;
  try { offer = await loadCommerceOffer(await getPayload({ config })); }
  catch { console.error("Published cart pricing is unavailable."); }
  const signInOffInReview = isReviewCopyRequest();
  return <PageFrame title={t("title")} displayTitle layout={signInOffInReview ? "editorial" : "wide"}>
    <div className="min-w-0">
      <CommerceAccountGate
        signInOffInReview={signInOffInReview}
        initialCapabilities={await loadPublicMemberCapabilities()}
      >
        <CommerceCart offer={offer} wide />
      </CommerceAccountGate>
    </div>
  </PageFrame>;
}
