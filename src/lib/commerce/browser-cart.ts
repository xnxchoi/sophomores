import { z } from "zod";
import { cartRefusalOf, type CartRefusal } from "./cart-refusal";

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
    return [];
  } catch {
    // Storage exists but refuses access (or holds unparsable data): the page-only fallback that write() keeps is used.
    return memory;
  }
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
/** Clears only the line a write-through sent: a newer choice made while it was in flight is kept. */
function clearIfStill(line: GuestCartLine, target?: CartStorage) {
  const [current] = read(target);
  if (current?.productID === line.productID) write([], target);
}

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

const refusalBody = z.object({ errors: z.array(z.object({ message: z.unknown().optional(), data: z.unknown().optional() })).optional() });
const savedCart = z.object({ doc: z.object({ id: z.union([z.string().min(1), z.number()]) }) });
const memberOpenCart = z.object({ user: z.object({ cart: z.object({ docs: z.array(z.union([z.string().min(1), z.number(),
  z.object({ id: z.union([z.string().min(1), z.number()]) })])) }).optional() }).nullable() });
const productOf = (value: unknown) => value != null && typeof value === "object" && "id" in value ? String(value.id) : value == null ? undefined : String(value);

/** The member's open cart as the server holds it (the users.cart join: newest open cart, never a purchased one). */
async function findOpenCart(fetcher: typeof fetch): Promise<string | undefined> {
  try {
    const response = await fetcher("/api/users/me?depth=0&select[cart]=true", { credentials: "include", cache: "no-store" });
    if (!response.ok) return undefined;
    const body = memberOpenCart.safeParse(await response.json());
    const first = body.success ? body.data.user?.cart?.docs[0] : undefined;
    return first == null ? undefined : String(typeof first === "object" ? first.id : first);
  } catch { return undefined; }
}

/**
 * One write: PATCH replaces the member's cart lines atomically, POST creates the member's cart. Never remove-then-add.
 * Idempotent: the server keeps one open cart per member, so a create that finds one (a retry, a concurrent call, a lost
 * acknowledgement) is refused as open-cart-exists, and the line is written into that cart instead.
 */
export async function writeThroughGuestCart(memberCart: MemberCartView,
  options: { fetcher?: typeof fetch; storage?: CartStorage } = {}): Promise<WriteThroughResult> {
  const [line] = read(options.storage);
  if (!line) return { outcome: "nothing" };
  return writeLine(line, memberCart, options, false);
}

async function writeLine(line: GuestCartLine, memberCart: MemberCartView,
  options: { fetcher?: typeof fetch; storage?: CartStorage }, reused: boolean): Promise<WriteThroughResult> {
  const fetcher = options.fetcher ?? fetch;
  if (memberCart && (memberCart.items ?? []).length === 1 && productOf(memberCart.items?.[0]?.product) === line.productID) {
    clearIfStill(line, options.storage);
    return { outcome: "already-in-cart", cartID: String(memberCart.id) };
  }
  const items = [{ product: line.productID, quantity: 1 }];
  let response: Response;
  try {
    response = await fetcher(memberCart ? `/api/carts/${encodeURIComponent(String(memberCart.id))}` : "/api/carts", {
      method: memberCart ? "PATCH" : "POST", credentials: "include", cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(memberCart ? { items } : { items, currency: "KRW" }),
    });
  } catch { return { outcome: "retry", productID: line.productID }; }
  if (response.ok) {
    const saved = savedCart.safeParse(await response.json().catch(() => null));
    clearIfStill(line, options.storage);
    return { outcome: "written", cartID: saved.success ? String(saved.data.doc.id) : String(memberCart?.id ?? "") };
  }
  if (response.status >= 500 || response.status === 429 || response.status === 401 || response.status === 403) return { outcome: "retry", productID: line.productID };
  const body = refusalBody.safeParse(await response.json().catch(() => null));
  const reason = (body.success ? body.data.errors?.map((error) => cartRefusalOf(error as { data?: unknown; message?: unknown })).find(Boolean) : undefined) ?? "rejected";
  if (reason === "open-cart-exists" && !memberCart && !reused) {
    // Converge on the member's one open cart, found from the server (not from error data, which may be stripped).
    const cartID = await findOpenCart(fetcher);
    if (!cartID) return { outcome: "retry", productID: line.productID };
    return writeLine(line, { id: cartID, items: [] }, options, true);
  }
  if (reason === "open-cart-exists") return { outcome: "retry", productID: line.productID };
  if (reason !== "payment-in-progress") clearIfStill(line, options.storage);
  return { outcome: "refused", reason, productID: line.productID };
}
