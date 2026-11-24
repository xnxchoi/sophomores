import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import { getPayload } from "@/payload";
import { readOrderDetail, receiptPrincipal } from "@/lib/commerce/receipt/http";
import { receiptWithoutDelivery } from "@/lib/commerce/receipt/order-receipt";
import { Link } from "@/components/core/Link/Link";
import { PageFrame } from "@/components/commerce/page-frame";
import { InvoiceCertificate, OrderRecordView } from "@/components/commerce/receipt";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { memberSignInHref } from "@/lib/member-auth/paths";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata");
  return {
    title: t("order"),
    robots: { index: false, follow: false },
    referrer: "no-referrer" as const
  };
}

export default async function OrderDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const result = z.uuid().safeParse((await params).id);
  if (!result.success) notFound();
  if (isReviewCopyRequest()) notFound();
  const payload = await getPayload();
  const { user } = await payload.auth({ headers: await headers() });
  if (!user) redirect(memberSignInHref("/me/orders"));
  const detail = await readOrderDetail({ payload, user }, result.data);
  const t = await getTranslations("Customer.app_site_me_orders_id_page");
  const orders = await getTranslations("Customer.components_commerce_orders");
  return <PageFrame title={t("title")} displayTitle>
    <Link href="/me/orders" prefetch={false} className="group/focus mb-6 inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 hover:decoration-current"><FocusShape className="outline-offset-4">{orders("backToOrders")}</FocusShape></Link>
    {detail?.kind === "receipt" ? <InvoiceCertificate receipt={receiptWithoutDelivery(detail.receipt)} principal={receiptPrincipal(user)} /> :
      detail?.kind === "record" ? <OrderRecordView record={detail.record} /> :
        <p role="status" className="py-8 text-sm text-muted-foreground">{orders("orderUnavailable")}</p>}
    <section className="mt-10 border-t border-border pt-8">
      <h2 className="text-xl">{orders("support")}</h2>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">{orders("requestHelpDetail")}</p>
      <div className="mt-3 flex flex-wrap gap-6">
        <Link href="/help" className="group/focus inline-flex min-h-12 items-center text-sm underline underline-offset-4"><FocusShape className="outline-offset-4">{orders("contactSupport")}</FocusShape></Link>
        <Link href="/refund" className="group/focus inline-flex min-h-12 items-center text-sm underline underline-offset-4"><FocusShape className="outline-offset-4">{orders("returnPolicy")}</FocusShape></Link>
      </div>
    </section>
  </PageFrame>;
}
