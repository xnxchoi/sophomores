import { denyReviewCustomerOperation } from "@/lib/auth/review-editor-policy";
import { createReceiptDeliveryHandler } from "@/lib/commerce/receipt/http";
import { getPayload } from "@/payload";

export const runtime = "nodejs";

const read = createReceiptDeliveryHandler(async (request) => {
  const payload = await getPayload();
  const { user } = await payload.auth({ headers: request.headers });
  return user ? { payload, user } : null;
});

export async function GET(request: Request) {
  return denyReviewCustomerOperation(request) ?? await read(request);
}
