import messages from "../../../../../messages/en.json";
import { getTranslations } from "next-intl/server";
import { PageFrame } from "@/components/commerce/page-frame";

export const metadata = {
  title: messages.PageMetadata.cart,
  robots: { index: false, follow: false }
};

// Structure only (03c, Cart). Lines, totals and the checkout hand-off follow separately.
export default async function CartPage() {
  const t = await getTranslations("Customer.app_site_shop_cart_page");
  return <PageFrame title={t("title")} />;
}
