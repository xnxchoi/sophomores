import messages from "../../../../../messages/en.json";
import { connection } from "next/server";
import { PortOnePaymentResult } from "@/components/tickets/portone-payment-result";
import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import { ReviewCustomerNoticePage } from "@/components/commerce/review-customer-notice";

export const metadata = {
  title: messages.PageMetadata.payment,
  robots: { index: false, follow: false },
};

export default async function PaymentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  if (isReviewCopyRequest()) return <ReviewCustomerNoticePage kind="payment" />;
  const query = await searchParams;
  // Redirect code/message are untrusted; only the server can confirm payment.
  return <>
    <PortOnePaymentResult paymentId={typeof query.paymentId === "string" ? query.paymentId : null} />
    </>;
}
