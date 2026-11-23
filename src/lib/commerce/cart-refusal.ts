/**
 * Stable reasons a member cart write is refused, carried in the REST error's `data.cartRefusal`.
 * Shared by the cart hook (server) and the browser cart helper; it has no dependencies.
 */
export const cartRefusals = ["offer-unavailable", "limit-reached", "payment-in-progress", "cart-locked"] as const;
export type CartRefusal = (typeof cartRefusals)[number];
export const cartRefusalData = (cartRefusal: CartRefusal) => ({ cartRefusal });
