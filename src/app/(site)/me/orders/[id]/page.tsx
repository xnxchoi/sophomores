import messages from "../../../../../../messages/en.json";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/server";
import { Link } from "@/components/core/Link/Link";
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
  const orders = await getTranslations("Customer.components_commerce_orders");
  return <PageFrame title={t("title")} displayTitle>
    <Link href="/me/orders" prefetch={false} className="mb-6 inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{orders("backToOrders")}</Link>
    <CommerceOrders key={String(user.id) + result.data} customerID={String(user.id)} orderID={result.data} />
  </PageFrame>;
}
