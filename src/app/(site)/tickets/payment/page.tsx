import { PortOnePaymentResult } from "@/components/tickets/portone-payment-result";
import { SellerDisclosure } from "@/app/(site)/_commerce/seller-disclosure";

export const metadata = {
  title: "Payment — Sophomores",
  robots: { index: false, follow: false },
};

export default async function PaymentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  // Redirect code/message are untrusted; only the server can confirm payment.
  return <>
    <PortOnePaymentResult paymentId={typeof query.paymentId === "string" ? query.paymentId : null} />
    <SellerDisclosure />
  </>;
}
