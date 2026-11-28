/**
 * Stable reasons a member cart write is refused. Shared by the cart hook (server) and the browser cart helper; it has
 * no dependencies.
 *
 * Each refusal is a 409 that carries its code twice: in the REST error's `data.cartRefusal`, and in its exact message
 * (the text below plus a `[cart-refusal:<code>]` tag). Payload's REST error formatter keeps `data` only when the thrown
 * error passes its own `instanceof APIError` check, which fails across module instances (the cart proof shows it
 * stripped); the message always survives. The browser reads `data` first, else an exact known message, on a 409 only.
 */
export const cartRefusalTexts = {
  "offer-unavailable": "Offer unavailable",
  "limit-reached": "Account membership allowance exceeded",
  "payment-in-progress": "Resolve the existing payment before editing this cart",
  "cart-locked": "Cart is locked",
  "open-cart-exists": "An open cart already exists",
  "account-changed": "The signed-in account changed",
  // Owner, 27 Nov: several editions per cart, "but sometimes you can't. Those are individually handled."
  "membership-in-cart": "Only one edition with membership fits one account",
  "guest-ticket-alone": "A guest ticket is bought on its own",
  "duplicate-product": "Each product must appear on only one cart line",
  "product-limit-reached": "The purchase limit for this product was reached",
} as const;
export type CartRefusal = keyof typeof cartRefusalTexts;
export const cartRefusals = Object.keys(cartRefusalTexts) as CartRefusal[];

export const cartRefusalMessage = (cartRefusal: CartRefusal) => `${cartRefusalTexts[cartRefusal]} [cart-refusal:${cartRefusal}]`;
export const cartRefusalData = (cartRefusal: CartRefusal) => ({ cartRefusal });
const byMessage = new Map(cartRefusals.map((code) => [cartRefusalMessage(code), code] as const));

/** The refusal a 409 REST error names: its data code, else an exact known message. Anything else is not a refusal. */
export function cartRefusalOf(status: number, error: { data?: unknown; message?: unknown } | undefined): CartRefusal | undefined {
  if (status !== 409) return undefined;
  const data = error?.data as { cartRefusal?: unknown } | undefined;
  if (typeof data?.cartRefusal === "string" && cartRefusals.includes(data.cartRefusal as CartRefusal)) return data.cartRefusal as CartRefusal;
  return typeof error?.message === "string" ? byMessage.get(error.message) : undefined;
}

/** The request header that pins a browser cart write to the member the page confirmed. */
export const CART_EXPECTED_MEMBER_HEADER = "x-sphmrs-cart-member";

/** PATCH contains quantity intents, not a replacement cart. Merge under the cart lock. */
export const CART_MERGE_BROWSER_HEADER = "x-sphmrs-cart-merge-browser";
