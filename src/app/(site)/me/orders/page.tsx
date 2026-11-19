import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { currentUser } from "@/lib/auth/server";
import { PageFrame } from "@/components/commerce/page-frame";
import { CommerceOrders } from "@/components/commerce/orders";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata");
  return {
    title: t("orders"),
    robots: { index: false, follow: false }
  };
}

export default async function OrderListPage() {
  const user = await currentUser();
  if (!user) redirect("/account?next=/me/orders");
  const t = await getTranslations("Customer.app_site_me_orders_page");
  return <PageFrame title={t("title")} introduction={t("introduction")} displayTitle>
    <CommerceOrders key={String(user.id)} customerID={String(user.id)} />
  </PageFrame>;
}
