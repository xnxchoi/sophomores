import messages from "../../../../../messages/en.json";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadPublishedCommerceDisclosure } from "@/lib/commerce/catalogue";
import { PortOnePaymentResult } from "@/components/tickets/portone-payment-result";
import { SellerDisclosure } from "@/app/(site)/_commerce/seller-disclosure";

export const metadata = {
  title: messages.PageMetadata.payment,
  robots: { index: false, follow: false },
};

export default async function PaymentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const query = await searchParams;
  let disclosure = null;
  try { disclosure = await loadPublishedCommerceDisclosure(await getPayload({ config })); }
  catch { console.error("Published commerce information is unavailable."); }
  // Redirect code/message are untrusted; only the server can confirm payment.
  return <>
    <PortOnePaymentResult paymentId={typeof query.paymentId === "string" ? query.paymentId : null} />
    <SellerDisclosure seller={disclosure?.seller} />
  </>;
}
