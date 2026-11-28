import { clearGuestCartAfterSignOut, LEGACY_GUEST_CART_STORAGE_KEY } from "@/lib/commerce/browser-cart";
import { TICKET_SELECTION_DRAFT_KEY } from "@/lib/tickets/selection-draft";
import { checkoutIntentKey } from "@/components/tickets/_shared/checkout-intent";

/** A member's pending store payment, kept for the tab (components/commerce/payment.tsx), one key per member. */
export const commercePaymentIntentPrefix = "sphmrs:commerce-payment:";

type Store = Pick<Storage, "key" | "length" | "removeItem">;
type Stores = { local?: Store & Pick<Storage, "getItem" | "setItem">; session?: Store };

function browserStores(): Stores {
  const read = (pick: () => Storage) => { try { return pick(); } catch { return undefined; } };
  return { local: read(() => window.localStorage), session: read(() => window.sessionStorage) };
}

function remove(store: Store | undefined, match: (key: string) => boolean) {
  if (!store) return;
  try {
    const keys = Array.from({ length: store.length }, (_, index) => store.key(index)).filter((key): key is string => key !== null && match(key));
    for (const key of keys) store.removeItem(key);
  } catch {
    // Storage that refuses access holds nothing this page can clear.
  }
}

/**
 * Sign-out (owner, 23 Nov: sign-out clears client copies): every copy this browser keeps for the account or its
 * purchases. That means pending payment and ticket checkout records, the browser cart and the ticket selection draft.
 * Durable cart cleanup participates in its write lock; where unavailable the cart stays read-only. Payment
 * records are keyed per member, and the server answers a ticket checkout record only to the member who owns it.
 */
export async function clearMemberBrowserCopies(stores: Stores = browserStores()): Promise<void> {
  remove(stores.session, (key) => key.startsWith(commercePaymentIntentPrefix) || key === checkoutIntentKey);
  remove(stores.local, (key) => key === TICKET_SELECTION_DRAFT_KEY || key === LEGACY_GUEST_CART_STORAGE_KEY);
  await clearGuestCartAfterSignOut(stores.local);
}

/**
 * After a confirmed sign-out: clear the browser copies, then load the home page afresh. A full navigation also drops
 * the router's cached pages and any in-memory state of the signed-in pages, which a client-side push would keep.
 */
export async function leaveAfterSignOut(navigate: (url: string) => void = (url) => window.location.replace(url), stores?: Stores): Promise<void> {
  await clearMemberBrowserCopies(stores);
  navigate("/");
}

/**
 * Settings sign-out. Better Auth's client resolves (it does not throw) with { data, error }; only an explicit
 * acknowledgement, data.success === true and no error, counts as signed out. Anything else (an error, a missing or
 * malformed answer) keeps the copies, since the session and its pending payment may live on. Returns whether it
 * signed out; a thrown request is left to the caller.
 */
export async function signOutAndLeave(signOut: () => Promise<unknown>, navigate?: (url: string) => void, stores?: Stores): Promise<boolean> {
  const result = (await signOut()) as { data?: { success?: unknown } | null; error?: unknown } | null | undefined;
  if (!result || result.error || result.data?.success !== true) return false;
  await leaveAfterSignOut(navigate, stores);
  return true;
}
