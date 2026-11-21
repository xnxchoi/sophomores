import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageFrame } from "@/components/commerce/page-frame";
import { connection } from "next/server";
import { Link } from "@/components/core/Link/Link";
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
  const navigation = await getTranslations("Customer.navigation");
  let offer: CommerceOffer | null = null;
  try { offer = await loadCommerceOffer(await getPayload({ config })); }
  catch { console.error("Published cart pricing is unavailable."); }
  const signInOffInReview = isReviewCopyRequest();
  return <PageFrame title={t("title")} displayTitle layout={signInOffInReview ? "editorial" : "wide"}>
    <div className="dark rounded-xl border border-border bg-background px-4 py-5 text-foreground sm:p-8">
      <CommerceAccountGate
        signInOffInReview={signInOffInReview}
        initialCapabilities={await loadPublicMemberCapabilities()}
        accountIntroduction={
          <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1">
            <Link href="/shop" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{navigation("shop")}</Link>
            <Link href="/help" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{navigation("help")}</Link>
          </div>
        }
      >
        <CommerceCart offer={offer} wide />
      </CommerceAccountGate>
    </div>
  </PageFrame>;
}
