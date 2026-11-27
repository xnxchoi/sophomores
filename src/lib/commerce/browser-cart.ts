import { z } from "zod";
import { CART_EXPECTED_MEMBER_HEADER, CART_MERGE_BROWSER_HEADER, cartRefusalOf, type CartRefusal } from "./cart-refusal";

// Older bundles write v1 without a lock. Never adopt that key into a signed-in transfer.
export const LEGACY_GUEST_CART_STORAGE_KEY = "sphmrs.cart.v1";
export const GUEST_CART_STORAGE_KEY = "sphmrs.cart.v2";
const revokedCartPrefix = "sphmrs.cart.revoked.";
export type GuestCartLine = Readonly<{ productID: string; quantity: number }>;
type CartStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const productIDSchema = z.string().min(1).max(64).refine((id) => id.trim() === id);
const quantitySchema = z.int().positive();
const memberIDSchema = z.string().min(1).max(64);
const stored = z.object({
  generation: z.uuid(), owner: memberIDSchema.optional(),
  lines: z.array(z.object({ productID: productIDSchema, quantity: quantitySchema, intent: z.uuid() }))
    .min(1).refine((lines) => new Set(lines.map((line) => line.productID)).size === lines.length),
});
type CartRecord = z.infer<typeof stored>;
let pageCart: CartRecord | null | undefined;
const listeners = new Set<() => void>();

function storage(explicit?: CartStorage): CartStorage | undefined {
  if (explicit) return explicit;
  try { return globalThis.localStorage ?? undefined; } catch { return undefined; }
}

function readStoredRecord(store?: CartStorage): CartRecord | null | undefined {
  if (!store) return pageCart;
  try {
    const raw = store.getItem(GUEST_CART_STORAGE_KEY);
    if (raw === null) return null;
    const parsed = stored.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch { return undefined; }
}

/** Null is empty; undefined is unreadable. Snapshots never mutate storage. */
function readRecord(store?: CartStorage): CartRecord | null | undefined {
  const record = readStoredRecord(store);
  try {
    return record && store?.getItem(revokedCartPrefix + record.generation) != null ? null : record;
  } catch { return undefined; }
}

function writeRecord(store: CartStorage | undefined, record: CartRecord | null) {
  if (!store) pageCart = record;
  else if (record) store.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(record));
  else store.removeItem(GUEST_CART_STORAGE_KEY);
}

function notifyCart() { for (const listener of listeners) listener(); }

// Critical callbacks are synchronous. Wrap any dispatched fetch so release does not wait for the network.
async function withCartLock<T>(store: CartStorage | undefined, work: () => T): Promise<T | undefined> {
  try {
    if (!store) return work();
    const locks = globalThis.navigator?.locks;
    return locks ? await locks.request(GUEST_CART_STORAGE_KEY, { mode: "exclusive" }, work) : undefined;
  } catch { return undefined; }
}

function visibleRecord(record: CartRecord | null | undefined, memberID?: string) {
  return record?.owner && record.owner !== memberID ? null : record;
}

// Scope every projection independently of sign-out cleanup, which can fail or lag in another tab.
export function listGuestCart(target?: CartStorage, memberID?: string): GuestCartLine[] {
  return (visibleRecord(readRecord(storage(target)), memberID)?.lines ?? []).map(({ productID, quantity }) => ({ productID, quantity }));
}

/** A stable snapshot for deciding whether a refused browser selection was replaced or edited. */
export function readGuestCartIntentKey(memberID?: string): string {
  const record = visibleRecord(readRecord(storage()), memberID);
  return JSON.stringify(record?.lines.map(({ productID, intent }) => [productID, intent, record.generation]) ?? []);
}

export type GuestCartCount = "unknown" | number;
export function readGuestCartCount(target?: CartStorage, memberID?: string): GuestCartCount {
  const record = visibleRecord(readRecord(storage(target)), memberID);
  return record === undefined ? "unknown" : record?.lines.length ?? 0;
}

/** False means the selection was not saved. */
export async function addGuestCartLine(productID: string, target?: CartStorage, options?: { quantity?: number; maximum?: number | null; memberID?: string }): Promise<boolean> {
  const id = productIDSchema.parse(productID);
  const quantity = quantitySchema.parse(options?.quantity ?? 1);
  if (options?.maximum != null && quantity > options.maximum) return false;
  const store = storage(target);
  const result = await withCartLock(store, () => {
    const previous = readStoredRecord(store);
    const record = readRecord(store);
    if (record?.owner && record.owner !== options?.memberID) return;
    const lines = record?.lines ?? [];
    const existing = lines.find((line) => line.productID === id);
    if (existing && (options?.quantity === undefined || existing.quantity === quantity)) return "unchanged";
    const intent = { productID: id, quantity, intent: crypto.randomUUID() };
    writeRecord(store, { ...record, generation: record?.generation ?? crypto.randomUUID(),
      lines: existing ? lines.map((line) => line === existing ? intent : line) : [...lines, intent] });
    if (previous && record === null) {
      try { store?.removeItem(revokedCartPrefix + previous.generation); } catch { /* Superseded marker is harmless. */ }
    }
    return "changed";
  });
  if (result === "changed") notifyCart();
  return result !== undefined;
}

export async function removeGuestCartLine(productID: string, target?: CartStorage, memberID?: string): Promise<boolean> {
  const store = storage(target);
  const result = await withCartLock(store, () => {
    const record = readRecord(store);
    if (record?.owner && record.owner !== memberID) return;
    if (!record) return record === null ? "unchanged" : undefined;
    const lines = record.lines.filter((line) => line.productID !== productID);
    if (lines.length === record.lines.length) return "unchanged";
    writeRecord(store, lines.length ? { ...record, lines } : null);
    return "changed";
  });
  if (result === "changed") notifyCart();
  return result !== undefined;
}

export async function clearGuestCart(target?: CartStorage): Promise<boolean> {
  const store = storage(target);
  pageCart = null;
  const result = await withCartLock(store, () => {
    const generation = readStoredRecord(store)?.generation;
    writeRecord(store, null);
    if (generation) store?.removeItem(revokedCartPrefix + generation);
    return true;
  });
  notifyCart();
  return result === true;
}

/**
 * Sign-out revokes the existing generation, even in a tab that cannot take the lock.
 * This monotonic marker contains no member or product data and cannot write or repin a cart.
 */
export async function clearGuestCartAfterSignOut(target?: CartStorage): Promise<boolean> {
  const store = storage(target);
  const record = readStoredRecord(store);
  if (record && store) {
    try { store.setItem(revokedCartPrefix + record.generation, "1"); } catch { /* Viewer scoping still applies. */ }
  }
  pageCart = null;
  notifyCart();
  if (!store) return true;
  const cleared = await withCartLock(store, () => {
    const current = readStoredRecord(store);
    if (current?.generation !== record?.generation) return true;
    writeRecord(store, null);
    if (record) store.removeItem(revokedCartPrefix + record.generation);
    return true;
  });
  if (cleared) notifyCart();
  return cleared === true;
}

/** Same-tab changes and other tabs' storage events. Returns the unsubscribe function. */
export function subscribeGuestCart(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === GUEST_CART_STORAGE_KEY || event.key.startsWith(revokedCartPrefix)) listener();
  };
  globalThis.window?.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); globalThis.window?.removeEventListener("storage", onStorage); };
}

export type WriteThroughOptions = { memberID: string; fetcher?: typeof fetch; storage?: CartStorage };
export type WriteThroughResult =
  | { outcome: "nothing" }
  | { outcome: "written"; cartID: string }
  | { outcome: "refused"; reason: CartRefusal | "rejected"; productID: string; changed: boolean }
  | { outcome: "retry"; productID: string; changed: boolean }
  | { outcome: "account-changed"; productID: string; changed: boolean };

const id = z.union([z.string().min(1), z.number()]);
const relation = z.union([id, z.object({ id })]).transform((value) => String(typeof value === "object" ? value.id : value));
const memberOpenCart = z.object({ user: z.object({ id, cart: z.object({ docs: z.array(relation) }) }).nullable() });
const savedCart = z.object({ doc: z.object({ id, customer: relation,
  items: z.array(z.object({ product: relation, quantity: quantitySchema })) }) });
const refusalBody = z.object({ errors: z.array(z.object({ message: z.unknown().optional(), data: z.unknown().optional() })).optional() });

async function findOpenCart(fetcher: typeof fetch, memberID: string): Promise<string | null | false | undefined> {
  try {
    const response = await fetcher("/api/users/me?depth=0&select[id]=true&select[cart]=true", { credentials: "include", cache: "no-store" });
    if (!response.ok) return undefined;
    const body = memberOpenCart.safeParse(await response.json());
    if (!body.success) return undefined;
    if (!body.data.user || String(body.data.user.id) !== memberID) return false;
    return body.data.user.cart.docs[0] ?? null;
  } catch { return undefined; }
}

/**
 * Send one quantity intent at a time. Payload merges it into the locked current cart with max(saved, requested),
 * rather than replacing rows or adding twice on replay. Clear only the exact choice acknowledged for this member.
 */
export async function writeThroughGuestCart(options: WriteThroughOptions): Promise<WriteThroughResult> {
  const store = storage(options.storage);
  const record = readRecord(store);
  if (!record) return { outcome: "nothing" };
  const { lines, generation } = record;
  const first = lines[0]!;
  const memberID = options.memberID;
  const retry = { outcome: "retry", productID: first.productID, changed: false } as const;
  const wrongMember = { outcome: "account-changed", productID: first.productID, changed: false } as const;
  if (!memberIDSchema.safeParse(memberID).success) return wrongMember;
  if (record.owner && record.owner !== memberID) return { outcome: "nothing" };
  if (store && !globalThis.navigator?.locks) return retry;
  const fetcher = options.fetcher ?? fetch;
  let cartID = await findOpenCart(fetcher, memberID);
  if (cartID === false) return wrongMember;
  if (cartID === undefined) return retry;

  const claim = await withCartLock(store, () => {
    const current = readRecord(store);
    if (!current || current.generation !== generation) return "stale";
    if (current.owner && current.owner !== memberID) return "account-changed";
    if (!current.owner) writeRecord(store, { ...current, owner: memberID });
    return "claimed";
  });
  if (claim === "account-changed") return wrongMember;
  if (claim === "stale") return { outcome: "nothing" };
  if (claim !== "claimed") return retry;

  let changed = false;
  let refusal: Extract<WriteThroughResult, { outcome: "refused" }> | undefined;
  for (const line of lines) {
    const send = (target: string | null) => fetcher(target ? `/api/carts/${encodeURIComponent(target)}` : "/api/carts", {
      method: target ? "PATCH" : "POST", credentials: "include", cache: "no-store",
      headers: { "Content-Type": "application/json", [CART_EXPECTED_MEMBER_HEADER]: options.memberID,
        ...(target ? { [CART_MERGE_BROWSER_HEADER]: "1" } : {}) },
      body: JSON.stringify({ items: [{ product: line.productID, quantity: line.quantity }], ...(target ? {} : { currency: "KRW" }) }),
    });
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const target = cartID;
        const dispatch = await withCartLock(store, () => {
          const current = readRecord(store);
          if (current?.owner && current.owner !== memberID) return "account-changed";
          if (current?.owner !== memberID || current.generation !== generation ||
            !current.lines.some((item) => item.productID === line.productID && item.intent === line.intent)) return "stale";
          return { response: send(target).catch(() => null) };
        });
        if (dispatch === "account-changed") return { outcome: dispatch, productID: line.productID, changed };
        if (dispatch === "stale") break;
        const response = dispatch && await dispatch.response;
        if (!response) return { outcome: "retry", productID: line.productID, changed };
        const json: unknown = await response.json().catch(() => null);
        if (response.ok) {
          const saved = savedCart.safeParse(json);
          if (!saved.success || saved.data.doc.customer !== options.memberID ||
            (cartID !== null && String(saved.data.doc.id) !== cartID) ||
            !saved.data.doc.items.some((item) => item.product === line.productID && item.quantity >= line.quantity)) {
            return { outcome: "retry", productID: line.productID, changed };
          }
          cartID = String(saved.data.doc.id);
          changed = true;
          const applied = await withCartLock(store, () => {
            const remaining = readRecord(store);
            if (remaining?.owner !== memberID || remaining.generation !== generation) return "stale";
            const lines = remaining.lines.filter((item) => item.productID !== line.productID || item.intent !== line.intent);
            if (lines.length === remaining.lines.length) return "stale";
            writeRecord(store, lines.length ? { ...remaining, lines } : null);
            return "changed";
          });
          if (!applied) return { outcome: "retry", productID: line.productID, changed };
          if (applied === "changed") notifyCart();
          break;
        }
        if (response.status >= 500 || [401, 403, 429].includes(response.status)) return { outcome: "retry", productID: line.productID, changed };
        const parsed = refusalBody.safeParse(json);
        const reason = parsed.success ? parsed.data.errors?.map((error) => cartRefusalOf(response.status, error)).find(Boolean) : undefined;
        if (reason === "account-changed") return { outcome: "account-changed", productID: line.productID, changed };
        if (reason === "open-cart-exists" && cartID === null && attempt === 0) {
          const found = await findOpenCart(fetcher, options.memberID);
          if (!found) return { outcome: found === false ? "account-changed" : "retry", productID: line.productID, changed };
          cartID = found;
          continue;
        }
        if (reason === "payment-in-progress" || reason === "cart-locked") return { outcome: "refused", reason, productID: line.productID, changed };
        refusal ??= { outcome: "refused", reason: reason ?? "rejected", productID: line.productID, changed };
        break;
      }
    } catch { return { outcome: "retry", productID: line.productID, changed }; }
  }
  if (refusal) return { ...refusal, changed };
  return cartID && changed ? { outcome: "written", cartID } : { outcome: "nothing" };
}
