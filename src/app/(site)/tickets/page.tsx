import { TicketSelection } from "@/components/tickets/ticket-selection";
import { headers } from "next/headers";
import { connection } from "next/server";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { loadPortOneCatalogue, loadPortOneConfig, reviewedTestChannel } from "@/lib/tickets/portone/config";
import { commerceDisclosure, publishedCommerceDisclosureSchema } from "@/lib/commerce/disclosures";
import { SellerDisclosure } from "../_commerce/seller-disclosure";

export const metadata = {
  title: "Tickets — Sophomores",
  robots: { index: false, follow: false }
};

/** Unconfigured checkout remains unavailable; no example catalogue is a real offer. */
export default async function TicketsPage() {
  await connection();
  let checkoutCatalogue = null;
  let testChannelReviewed = false;
  let localKpnTestCheckout = false;
  try {
    const config = loadPortOneConfig();
    if (config) {
      checkoutCatalogue = loadPortOneCatalogue();
      testChannelReviewed = reviewedTestChannel !== null
        && reviewedTestChannel.storeId === config.storeId && reviewedTestChannel.channelKey === config.channelKey;
      if (config.localKpnTestCheckout) {
        const directHost = (await headers()).get("host");
        localKpnTestCheckout = directHost === new URL(config.origin).host;
      }
    }
  } catch {
    console.error("Ticket payment configuration is unavailable.");
  }
  // This async Server Component reads the request clock only after connection().
  // eslint-disable-next-line react-hooks/purity
  const requestTime = Date.now();
  const checkoutReady = (publishedCommerceDisclosureSchema.safeParse(commerceDisclosure).success || localKpnTestCheckout)
    && testChannelReviewed && checkoutCatalogue !== null
    && Date.parse(checkoutCatalogue.saleStartsAt) <= requestTime && requestTime < Date.parse(checkoutCatalogue.saleEndsAt);
  return <>
    <TicketSelection initialCapabilities={loadPublicMemberCapabilities()} checkoutCatalogue={checkoutCatalogue} checkoutReady={checkoutReady} />
    <SellerDisclosure className="bg-neutral-950 text-neutral-100" />
  </>;
}
