import { z } from "zod";
import { cartRefusals, type CartRefusal } from "./cart-refusal";

/**
 * The signed-out cart (owner, 23 Nov: "the cart shouldn't be where you sign-in. Only when you check-out you do."):
 * lines are held in this browser only, with no server record and no secret. After sign-in, writeThroughGuestCart puts
 * them into the member's own server cart through the official carts REST operations, as the member, where the cart
 * hook re-checks catalogue, offer and the one-per-account limit. Browser-only; it imports nothing from the server.
 *
 * Contract for the cart page:
 * - Signed out: listGuestCart / addGuestCartLine / removeGuestCartLine / clearGuestCart, and subscribeGuestCart for
 *   re-rendering (useSyncExternalStore). A line is a product ID; the quantity is always 1 (one per account).
 * - Signed in, once the identity check reports `confirmed`: call writeThroughGuestCart once with the provider's current
 *   cart, then re-sync the provider (clearSession + onLogin) on `written`. Never turn on the plugin's guest mode.
 */
export const GUEST_CART_STORAGE_KEY = "sphmrs.cart.v1";
export type GuestCartLine = Readonly<{ productID: string; quantity: 1 }>;

type CartStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const stored = z.object({ version: z.literal(1), lines: z.array(z.object({ productID: z.string().min(1).max(64), quantity: z.literal(1) })).max(1) });
// Used only when browser storage is unavailable (private mode, blocked site data): the cart lasts for this page only.
let memory: GuestCartLine[] = [];
const listeners = new Set<() => void>();

function storage(explicit?: CartStorage): CartStorage | undefined {
  if (explicit) return explicit;
  try { return globalThis.localStorage ?? undefined; } catch { return undefined; }
}

function read(target?: CartStorage): GuestCartLine[] {
  const store = storage(target);
  if (!store) return memory;
  try {
    const raw = store.getItem(GUEST_CART_STORAGE_KEY);
    if (raw === null) return [];
    const parsed = stored.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data.lines;
    store.removeItem(GUEST_CART_STORAGE_KEY);
  } catch { /* Unreadable or malformed: treated as empty. */ }
  return [];
}

function write(lines: GuestCartLine[], target?: CartStorage): GuestCartLine[] {
  const store = storage(target);
  if (!store) memory = lines;
  else {
    try {
      if (lines.length) store.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify({ version: 1, lines }));
      else store.removeItem(GUEST_CART_STORAGE_KEY);
    } catch { memory = lines; }
  }
  for (const listener of listeners) listener();
  return lines;
}

export const listGuestCart = (target?: CartStorage): GuestCartLine[] => read(target);
/** Replaces any line: the latest choice wins, never summed. */
export const addGuestCartLine = (productID: string, target?: CartStorage): GuestCartLine[] =>
  write([{ productID: z.string().min(1).max(64).parse(productID), quantity: 1 }], target);
export const removeGuestCartLine = (productID: string, target?: CartStorage): GuestCartLine[] =>
  write(read(target).filter((line) => line.productID !== productID), target);
export const clearGuestCart = (target?: CartStorage): void => { write([], target); };

/** Same-tab changes and other tabs' storage events. Returns the unsubscribe function. */
export function subscribeGuestCart(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => { if (event.key === null || event.key === GUEST_CART_STORAGE_KEY) listener(); };
  globalThis.addEventListener?.("storage", onStorage);
  return () => { listeners.delete(listener); globalThis.removeEventListener?.("storage", onStorage); };
}

export type MemberCartView = { id: string | number; items?: ReadonlyArray<{ product?: unknown }> | null } | null | undefined;
export type WriteThroughResult =
  /** No browser line. */
  | { outcome: "nothing" }
  /** The member's cart already holds that product; the browser line is cleared. */
  | { outcome: "already-in-cart"; cartID: string }
  /** The member's cart now holds exactly the browser line (replacing any other); the browser line is cleared. */
  | { outcome: "written"; cartID: string }
  /**
   * The server refused the line. For `payment-in-progress` the browser line is kept (resolve the payment first);
   * otherwise it is cleared, since it can no longer be bought ("rejected" is any other 4xx refusal).
   */
  | { outcome: "refused"; reason: CartRefusal | "rejected"; productID: string }
  /** Not settled (network, 5xx, 429, or not signed in): the browser line is kept for a later try. */
  | { outcome: "retry"; productID: string };

const refusalBody = z.object({ errors: z.array(z.object({ data: z.object({ cartRefusal: z.enum(cartRefusals) }).partial().optional() })).optional() });
const savedCart = z.object({ doc: z.object({ id: z.union([z.string().min(1), z.number()]) }) });
const productOf = (value: unknown) => value != null && typeof value === "object" && "id" in value ? String(value.id) : value == null ? undefined : String(value);

/** One write: PATCH replaces the member's cart lines atomically, POST creates the member's cart. Never remove-then-add. */
export async function writeThroughGuestCart(memberCart: MemberCartView,
  options: { fetcher?: typeof fetch; storage?: CartStorage } = {}): Promise<WriteThroughResult> {
  const [line] = read(options.storage);
  if (!line) return { outcome: "nothing" };
  if (memberCart && (memberCart.items ?? []).length === 1 && productOf(memberCart.items?.[0]?.product) === line.productID) {
    clearGuestCart(options.storage);
    return { outcome: "already-in-cart", cartID: String(memberCart.id) };
  }
  const items = [{ product: line.productID, quantity: 1 }];
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(memberCart ? `/api/carts/${encodeURIComponent(String(memberCart.id))}` : "/api/carts", {
      method: memberCart ? "PATCH" : "POST", credentials: "include", cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(memberCart ? { items } : { items, currency: "KRW" }),
    });
  } catch { return { outcome: "retry", productID: line.productID }; }
  if (response.ok) {
    const saved = savedCart.safeParse(await response.json().catch(() => null));
    clearGuestCart(options.storage);
    return { outcome: "written", cartID: saved.success ? String(saved.data.doc.id) : String(memberCart?.id ?? "") };
  }
  if (response.status >= 500 || response.status === 429 || response.status === 401 || response.status === 403) return { outcome: "retry", productID: line.productID };
  const body = refusalBody.safeParse(await response.json().catch(() => null));
  const reason = (body.success ? body.data.errors?.find((error) => error.data?.cartRefusal)?.data?.cartRefusal : undefined) ?? "rejected";
  if (reason !== "payment-in-progress") clearGuestCart(options.storage);
  return { outcome: "refused", reason, productID: line.productID };
}
