import messages from "../../../../../messages/en.json";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { currentUser } from "@/lib/auth/server";
import { PageFrame } from "@/components/commerce/page-frame";

export const metadata = {
  title: messages.PageMetadata.orders,
  robots: { index: false, follow: false }
};

// Structure only (03c, Order list; C-21 settled: orders live under /me). The list follows separately.
export default async function OrderListPage() {
  if (!(await currentUser())) redirect("/account?next=/me/orders");
  const t = await getTranslations("Customer.app_site_me_orders_page");
  return <PageFrame title={t("title")} />;
}
