import { getLocale, getTranslations } from "next-intl/server";
import { denyReviewCustomerOperation } from "@/lib/auth/review-editor-policy";
import { createReceiptPdfHandler } from "@/lib/commerce/receipt/http";
import { getPayload } from "@/payload";

export const runtime = "nodejs";

const download = createReceiptPdfHandler(async (request) => {
  const payload = await getPayload();
  const { user } = await payload.auth({ headers: request.headers });
  return user ? { payload, user } : null;
}, async (receipt) => {
  const [{ renderReceiptPdf }, locale, t] = await Promise.all([
    import("@/lib/commerce/receipt/pdf"), getLocale(),
    getTranslations("Customer.components_commerce_orders"),
  ]);
  return renderReceiptPdf(receipt, locale, {
    receipt: t("receipt.title"), orderNumber: t("orderNumber", { id: receipt.id }),
    date: t("receipt.date"), status: t("recordStatus", { status: t(`status.${receipt.status}`) }),
    quantity: t("quantity"), unitPrice: t("unitPrice"), shipping: t("shippingFee"),
    total: t("recordedAmount"), delivery: t("delivery"), benefits: t("receipt.benefits"),
    signet: t("receipt.signet"), ticket: t("receipt.ticket"),
  });
});

export async function GET(request: Request) {
  return denyReviewCustomerOperation(request) ?? await download(request);
}
