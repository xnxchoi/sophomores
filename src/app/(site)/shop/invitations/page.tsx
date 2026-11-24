import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { getPayload } from "@/payload";
import { currentUser } from "@/lib/auth/server";
import { sharedGuestSalePin } from "@/lib/commerce/event-tickets";
import { loadCommerceOffer } from "@/lib/commerce/catalogue";
import { hasGuestSponsorMembership } from "@/lib/commerce/membership";
import { GuestTicketPurchase } from "@/components/commerce/guest-ticket-purchase";
import { PageFrame } from "@/components/commerce/page-frame";

export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function GuestInvitationsPage() {
  await connection();
  const t = await getTranslations("Customer.app_site_shop_invitations_page");
  const sale = sharedGuestSalePin();
  const frame = (message: string) => <PageFrame title={t("title")}><p>{message}</p></PageFrame>;
  if (!sale) return frame(t("unavailable"));

  try {
    const user = await currentUser();
    if (!user) return frame(t("membersOnly"));
    const payload = await getPayload();
    if (!await hasGuestSponsorMembership(payload, String(user.id))) return frame(t("membersOnly"));
    const offer = await loadCommerceOffer(payload, undefined, sale.productID);
    if (!offer?.ticketTarget || offer.event.id !== sale.eventID || offer.productID !== sale.productID) return frame(t("unavailable"));
    return <PageFrame title={t("title")}>
      <GuestTicketPurchase customerID={String(user.id)} productID={offer.productID} title={offer.title}
        priceKRW={offer.priceKRW} available={Math.min(offer.maximumQuantity, offer.availableQuantity)}
        limit={offer.maximumQuantity} locale={await getLocale()} />
    </PageFrame>;
  } catch {
    return frame(t("unavailable"));
  }
}
