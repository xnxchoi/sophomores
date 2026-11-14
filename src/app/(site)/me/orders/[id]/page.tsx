import messages from "../../../../../../messages/en.json";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/server";
import { PageFrame } from "@/components/commerce/page-frame";

export const metadata = {
  title: messages.PageMetadata.order,
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const
};

// Structure only (03c, Order detail; C-21 settled). Reads no order yet: ownership checks, the
// order itself and the cancel and return actions follow separately. /shop/orders/[id] is
// untouched until the single-purchase handoff moves it here.
export default async function OrderDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const result = z.uuid().safeParse((await params).id);
  if (!result.success) notFound();
  if (!(await currentUser()))
    redirect(`/account?next=/me/orders/${result.data}`);
  const t = await getTranslations("Customer.app_site_me_orders_id_page");
  return <PageFrame title={t("title")} />;
}
