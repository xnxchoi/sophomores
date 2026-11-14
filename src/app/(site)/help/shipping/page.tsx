import messages from "../../../../../messages/en.json";
import { getTranslations } from "next-intl/server";
import { PageFrame } from "@/components/commerce/page-frame";

export const metadata = {
  title: messages.PageMetadata.shippingAndReturns,
  robots: { index: false, follow: false }
};

// Structure only (03c, Shipping and returns). Courier, fee and return terms follow, word for
// word with the policy pages, once the owner facts and the legal check exist.
export default async function ShippingHelpPage() {
  const t = await getTranslations("Customer.app_site_help_shipping_page");
  return <PageFrame title={t("title")} />;
}
