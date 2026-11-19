import messages from "../../../../../messages/en.json";
import { getTranslations } from "next-intl/server";
import { PageFrame } from "@/components/commerce/page-frame";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadCommerceOffer, type CommerceOffer } from "@/lib/commerce/catalogue";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { CommerceAccountGate } from "@/components/commerce/checkout";
import { CommerceCart } from "@/components/commerce/cart";

export const metadata = {
  title: messages.PageMetadata.cart,
  robots: { index: false, follow: false }
};

export default async function CartPage() {
  await connection();
  const t = await getTranslations("Customer.app_site_shop_cart_page");
  let offer: CommerceOffer | null = null;
  try { offer = await loadCommerceOffer(await getPayload({ config })); }
  catch { console.error("Published cart pricing is unavailable."); }
  return <PageFrame title={t("title")} displayTitle>
    <div className="dark rounded-xl border border-border bg-background px-4 py-5 text-foreground sm:p-8">
      <CommerceAccountGate initialCapabilities={loadPublicMemberCapabilities()}>
        <CommerceCart offer={offer} />
      </CommerceAccountGate>
    </div>
  </PageFrame>;
}
