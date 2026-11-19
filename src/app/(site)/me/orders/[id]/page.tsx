import messages from "../../../../../../messages/en.json";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/server";
import { PageFrame } from "@/components/commerce/page-frame";
import { CommerceOrders } from "@/components/commerce/orders";

export const metadata = {
  title: messages.PageMetadata.order,
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const
};

export default async function OrderDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const result = z.uuid().safeParse((await params).id);
  if (!result.success) notFound();
  const user = await currentUser();
  if (!user)
    redirect("/account?next=/me/orders");
  const t = await getTranslations("Customer.app_site_me_orders_id_page");
  return <PageFrame title={t("title")} displayTitle>
    <CommerceOrders key={String(user.id) + result.data} customerID={String(user.id)} orderID={result.data} />
  </PageFrame>;
}
