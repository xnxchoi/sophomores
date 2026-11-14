import messages from "../../../../../messages/en.json";
import { getTranslations } from "next-intl/server";
import { PageFrame } from "@/components/commerce/page-frame";

export const metadata = {
  title: messages.PageMetadata.checkout,
  robots: { index: false, follow: false }
};

// Stub (03c, Checkout). Checkout and payment are held; what this page does is business
// logic that follows separately. Deliberately imports nothing from payment or checkout code.
export default async function CheckoutPage() {
  const t = await getTranslations("Customer.app_site_shop_checkout_page");
  return <PageFrame title={t("title")} />;
}
