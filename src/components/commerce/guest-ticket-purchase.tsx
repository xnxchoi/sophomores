"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCart, useEcommerce } from "@payloadcms/plugin-ecommerce/client/react";
import { Button } from "@/components/ui/button";
import { CART_EXPECTED_MEMBER_HEADER } from "@/lib/commerce/cart-refusal";
import { shippingAddressSchema, type ShippingAddress } from "@/lib/commerce/contracts";
import { CommerceIdentityBoundary, CommerceProvider } from "./checkout";
import { CommercePayment } from "./payment";
import { ShippingAddressForm } from "./shipping-address";

type GuestOffer = { customerID: string; productID: string; title: string; priceKRW: number; available: number; limit: number; locale: string; offerTicketEmailConsent?: boolean };

export function GuestTicketPurchase(props: GuestOffer) {
  return <CommerceProvider>
    <CommerceIdentityBoundary verified onSessionExpired={() => window.location.reload()}>
      <PurchaseForm {...props} />
    </CommerceIdentityBoundary>
  </CommerceProvider>;
}

function PurchaseForm({ customerID, productID, title, priceKRW, available, limit, locale, offerTicketEmailConsent }: GuestOffer) {
  const t = useTranslations("Customer.app_site_shop_invitations_page");
  const { cart, isLoading, refreshCart } = useCart();
  const { user, onLogin } = useEcommerce();
  const [selection, setSelection] = useState<number>();
  const [saving, setSaving] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentLocked, setPaymentLocked] = useState(false);
  const [notice, setNotice] = useState<"cartSaved" | "cartNotSaved">();
  const [address, setAddress] = useState<ShippingAddress>({ country: "KR", recipientName: "", phone: "", postalCode: "", addressLine1: "" });
  const inFlight = useRef(false);
  const lines = cart?.items ?? [];
  const line = lines.length === 1 ? lines[0] : undefined;
  const compatible = lines.length === 0 || (line && (typeof line.product === "object" ? line.product?.id : line.product) === productID);
  const savedQuantity = compatible ? line?.quantity ?? 0 : 0;
  const typedLine = line?.ticketKind === "shared-event-guest";
  const quantity = selection ?? (savedQuantity || 1);
  const disabled = isLoading || saving || paymentBusy || paymentLocked || !compatible || String(user?.id ?? "") !== customerID;
  const price = new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", maximumFractionDigits: 0 });

  async function save() {
    if (disabled || inFlight.current || quantity < 1 || quantity > available) return;
    inFlight.current = true;
    setSaving(true);
    setNotice(undefined);
    try {
      const items = [{ product: productID, quantity, ticketKind: "shared-event-guest" }];
      const response = await fetch(cart?.id ? `/api/carts/${encodeURIComponent(cart.id)}` : "/api/carts", {
        method: cart?.id ? "PATCH" : "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json", [CART_EXPECTED_MEMBER_HEADER]: customerID },
        body: JSON.stringify(cart?.id ? { items } : { currency: "KRW", items }),
      });
      if (cart?.id) await refreshCart();
      else await onLogin(); // Reload the member's one open cart, including a concurrent create.
      setNotice(response.ok ? "cartSaved" : "cartNotSaved");
    } catch {
      setNotice("cartNotSaved");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  const orderReady = Boolean(compatible && savedQuantity > 0 && savedQuantity <= available && savedQuantity === quantity && (typedLine || savedQuantity === 1));
  return <section className="min-w-0 space-y-6">
    <h2 className="text-xl">{title}</h2>
    <p>{t("memberLimit", { limit })}</p>
    <p>{t("priceEach", { price: price.format(priceKRW) })}</p>
    {!compatible ? <p>{t("differentCart")} <Link href="/shop/cart" className="underline">{t("viewCart")}</Link></p> : (
      <div className="flex flex-wrap items-end gap-4">
        <label className="grid gap-2">
          {t("selectQuantity")}
          <select value={available && quantity <= available ? quantity : ""} onChange={event => setSelection(Number(event.target.value))}
            disabled={disabled || available === 0} className="min-h-12 rounded-md border border-border bg-background px-4">
            <option value="" disabled />
            {Array.from({ length: available }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
          </select>
        </label>
        <Button type="button" disabled={disabled || quantity > available || quantity === savedQuantity && (typedLine || savedQuantity === 1)} onClick={() => void save()}>{t("saveSelection")}</Button>
      </div>
    )}
    <p role="status">{notice ? t(notice) : available === 0 ? t("unavailable") : null}</p>
    {orderReady && <>
      <p>{t("checkoutAddress")}</p>
      <ShippingAddressForm value={address} onChange={setAddress} disabled={disabled} />
      <div className="flex justify-between gap-4 border-t border-border pt-4"><span>{t("total")}</span><span>{price.format(priceKRW * savedQuantity)}</span></div>
    </>}
    <CommercePayment productID={productID} shippingAddress={address}
      offerTicketEmailConsent={offerTicketEmailConsent && orderReady}
      guestQuote={orderReady ? { productID, quantity: savedQuantity, totalAmount: priceKRW * savedQuantity } : undefined}
      disabled={disabled || !orderReady || !shippingAddressSchema.safeParse(address).success}
      onBusyChange={setPaymentBusy} onAttemptChange={setPaymentLocked} />
  </section>;
}
