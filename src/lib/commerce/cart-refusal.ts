/**
 * Stable reasons a member cart write is refused. Shared by the cart hook (server) and the browser cart helper; it has
 * no dependencies.
 *
 * Each refusal carries its code twice: in the REST error's `data.cartRefusal`, and as a `[cart-refusal:<code>]` tag at
 * the end of the message. Payload's REST error formatter keeps `data` only when the thrown error passes its own
 * `instanceof APIError` check, which fails across module instances; the message always survives.
 */
export const cartRefusals = ["offer-unavailable", "limit-reached", "payment-in-progress", "cart-locked", "open-cart-exists"] as const;
export type CartRefusal = (typeof cartRefusals)[number];

export const cartRefusalMessage = (text: string, cartRefusal: CartRefusal) => `${text} [cart-refusal:${cartRefusal}]`;
export const cartRefusalData = (cartRefusal: CartRefusal) => ({ cartRefusal });

/** The refusal code a REST error names, from its data or else its message tag. */
export function cartRefusalOf(error: { data?: unknown; message?: unknown } | undefined): CartRefusal | undefined {
  const data = error?.data as { cartRefusal?: unknown } | undefined;
  const fromData = typeof data?.cartRefusal === "string" ? data.cartRefusal : undefined;
  const fromMessage = typeof error?.message === "string" ? /\[cart-refusal:([a-z-]+)\]$/.exec(error.message)?.[1] : undefined;
  const code = fromData ?? fromMessage;
  return cartRefusals.find((known) => known === code);
}
