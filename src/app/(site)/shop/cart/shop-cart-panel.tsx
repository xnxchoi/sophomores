"use client";

import { useTranslations } from "next-intl";
import { CartContents, type CartProps } from "./cart-view";
import { ShopCartLines } from "./shop-cart-lines";

/**
 * The cart's steps inside the shop's cart column (stripe.press's CartRightColumn body, 06w9 page chunk): the step's
 * title (Cardinal Fruit 40 px there; our display face), a rule (DetailRule: 1 px, 4 px over, 6 px under), the bracketed
 * summary label (11 px uppercase, 1.5 line height, 6 px under), then the step: the cart as their panel lays it out
 * (ShopCartLines), or the account step unchanged (CartContents).
 */
export function ShopCartPanel(props: CartProps) {
  const t = useTranslations("Customer.components_commerce_cart");
  return <CartContents {...props} cart={(cart) => <ShopCartLines {...cart} />} frame={({ title, step, children }) => <>
    <header className="mb-3 flex items-center gap-3">
      <h2 className="font-display text-[40px] leading-[1.1] font-normal tracking-[-0.02em]">{title}</h2>
    </header>
    <hr className="mt-1 mb-1.5 border-0 border-t border-border" />
    {step === "cart" && <p className="pb-1.5 text-[11px] leading-[1.5] uppercase">[ {t("summary")} ]</p>}
    {children}
  </>} />;
}
