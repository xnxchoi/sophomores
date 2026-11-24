import { MEMBERSHIP_ACCOUNT_LIMIT } from "./contracts";
import { SHARED_GUEST_LIMIT } from "./event-tickets";

// The caller supplies a routing hint, not proof of an eligible Guest offer.
export const SHARED_GUEST_CART_KIND = "shared-event-guest";

export function cartQuantityError(item: { productID: string; quantity: number; variant?: unknown; ticketKind?: unknown }) {
  if (item.quantity <= MEMBERSHIP_ACCOUNT_LIMIT) return null;
  const eventID = process.env.UNLOCK_SHARED_TICKET_EVENT_ID;
  const guestProductID = process.env.UNLOCK_SHARED_TICKET_GUEST_PRODUCT_ID;
  if (!eventID?.trim() || !guestProductID || item.productID !== guestProductID ||
    item.variant != null || item.ticketKind !== SHARED_GUEST_CART_KIND) return "Only one unit per purchase";
  return item.quantity > SHARED_GUEST_LIMIT ? "Only two Guest Tickets per purchase" : null;
}
