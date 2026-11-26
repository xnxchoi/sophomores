"use client";

import { createContext, useContext } from "react";

/**
 * Starts stripe.press's fly of a book into the cart's stack (their triggerFlyForBookId, called by their add row hZ
 * before the add, 06w9:741535), or null outside the shop's scene. The shop's home provides it; the details' add row
 * calls it with the product it adds.
 */
export const CartFlyContext = createContext<((productID: string) => void) | null>(null);

export function useCartFly() { return useContext(CartFlyContext); }
