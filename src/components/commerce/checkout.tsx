"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { EcommerceProvider, useCart, useEcommerce } from "@payloadcms/plugin-ecommerce/client/react";
import { MemberAccountFlow } from "@/components/Authentication/member-auth/account-study";
import type { MemberSnapshot } from "@/components/Authentication/member-auth/_shared/session";
import { createMemberClient, parseMemberStatus } from "@/lib/member-auth/client";
import type { MemberCapabilities } from "@/lib/member-auth/contracts";
import type { CommerceOffer } from "@/lib/commerce/catalogue";
import type { ShippingAddress } from "@/lib/commerce/contracts";
import { z } from "zod";
import { CommercePayment } from "./payment";
import { ShippingAddressForm } from "./shipping-address";

/** Account flow stays mounted; only fresh authoritative membership reveals commerce. */
export function CommerceAccountGate({ initialCapabilities, children, inlineEmailOnly = false }: { initialCapabilities: Readonly<MemberCapabilities>; children: ReactNode; inlineEmailOnly?: boolean }) {
  const headingID = useId();
  const client = useMemo(() => {
    const source = createMemberClient(undefined, undefined, "ticket-checkout");
    return { ...source, status: async () => {
      const status = parseMemberStatus(await source.status());
      return inlineEmailOnly ? { ...status, capabilities: { ...status.capabilities, google: false, magicLink: false } } : status;
    } };
  }, [inlineEmailOnly]);
  const [eligible, setEligible] = useState(false);
  const [started, setStarted] = useState(false);
  const [accountGeneration, setAccountGeneration] = useState(0);
  const onSnapshot = useCallback((snapshot: MemberSnapshot) => {
    const ready = !snapshot.busy && !snapshot.error && snapshot.status?.authenticated === true && snapshot.status.member;
    if (ready) setStarted(true);
    setEligible(ready);
  }, []);
  const onSessionExpired = useCallback(() => { setEligible(false); setAccountGeneration((value) => value + 1); }, []);
  return <>
    <div hidden={eligible} inert={eligible}><MemberAccountFlow key={accountGeneration} client={client} initialCapabilities={inlineEmailOnly ? { ...initialCapabilities, google: false, magicLink: false } : initialCapabilities}
      headingId={headingID} flow="signup" presentation="ticket-checkout" onSnapshot={onSnapshot} /></div>
    {started && <div hidden={!eligible} inert={!eligible}><CommerceSession verified={eligible} onSessionExpired={onSessionExpired}>{children}</CommerceSession></div>}
  </>;
}

function CommerceSession({ children, verified, onSessionExpired }: { children: ReactNode; verified: boolean; onSessionExpired: () => void }) {
  return <EcommerceProvider customersSlug="users" debug={false} enableVariants={false} syncLocalStorage={false}
    currenciesConfig={{ defaultCurrency: "KRW", supportedCurrencies: [{ code: "KRW", decimals: 0, label: "Korean Won", symbol: "₩" }] }}
    paymentMethods={[{ name: "portone", label: "Card", initiatePayment: true, confirmOrder: true }]}>
    <CommerceIdentityBoundary verified={verified} onSessionExpired={onSessionExpired}>{children}</CommerceIdentityBoundary>
  </EcommerceProvider>;
}

/** Revalidate identity on return without resetting the same account's in-progress address. */
export function CommerceIdentityBoundary({ children, verified, onSessionExpired }: { children: ReactNode; verified: boolean; onSessionExpired: () => void }) {
  const { user, clearSession, onLogin } = useEcommerce();
  const customerID = user?.id;
  const retainedCustomerID = useRef(customerID);
  const [identityGeneration, setIdentityGeneration] = useState(0);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (customerID === undefined || customerID === null) return;
    if (retainedCustomerID.current !== undefined && retainedCustomerID.current !== null
      && String(retainedCustomerID.current) !== String(customerID)) {
      setIdentityGeneration((value) => value + 1);
    }
    retainedCustomerID.current = customerID;
  }, [customerID]);
  useEffect(() => {
    let active = true;
    let pending = false;
    async function verify() {
      if (!verified || document.visibilityState === "hidden" || pending) return;
      pending = true; setChecking(true); setError(false);
      try {
        const response = await fetch("/api/users/me?depth=0&select[id]=true", { credentials: "include", cache: "no-store" });
        if (!active) return;
        if (response.status === 401 || response.status === 403) { onSessionExpired(); return; }
        if (!response.ok) throw new Error("Session unavailable");
        const result = z.object({ user: z.object({ id: z.union([z.string(), z.number()]) }).nullable() }).parse(await response.json());
        if (!active) return;
        if (!result.user) { onSessionExpired(); return; }
        if (String(result.user.id) !== String(customerID ?? "")) {
          clearSession();
          await onLogin();
        }
      } catch { if (active) setError(true); }
      finally { pending = false; if (active) setChecking(false); }
    }
    window.addEventListener("focus", verify); document.addEventListener("visibilitychange", verify);
    if (verified && (retry > 0 || customerID)) void verify();
    return () => { active = false; window.removeEventListener("focus", verify); document.removeEventListener("visibilitychange", verify); };
  }, [customerID, clearSession, onLogin, retry, verified, onSessionExpired]);
  return <>
    <div hidden={checking || error} inert={checking || error} key={identityGeneration}>{children}</div>
    {(checking || error) && <p role="status" className="min-h-12 text-sm text-neutral-400">{error ? "Your session could not be verified. Your inputs are retained." : "Checking your account…"}</p>}
    {error && <button type="button" onClick={() => setRetry((value) => value + 1)} className="min-h-12 rounded-xl border border-white/25 px-5 py-3 text-sm">Retry account check</button>}
  </>;
}

export function CommerceCheckout({ offer }: { offer: CommerceOffer }) {
  const { cart, addItem, incrementItem, decrementItem, isLoading } = useCart();
  const { user } = useEcommerce();
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({ country: "KR", recipientName: "", phone: "", postalCode: "", addressLine1: "" });
  const [busy, setBusy] = useState(false);
  const [paymentLocked, setPaymentLocked] = useState(false);
  const [message, setMessage] = useState("");
  const changing = useRef(false);
  const currentCustomer = useRef<unknown>(undefined);
  useEffect(() => {
    if (!user) return;
    if (currentCustomer.current !== undefined && currentCustomer.current !== user.id) {
      setShippingAddress({ country: "KR", recipientName: "", phone: "", postalCode: "", addressLine1: "" });
      setPaymentLocked(false);
    }
    currentCustomer.current = user.id;
  }, [user?.id]);
  const items = cart?.items ?? [];
  const item = items.length === 1 ? items[0] : undefined;
  const productID = item && (typeof item.product === "object" ? item.product?.id : item.product);
  const compatible = items.length === 0 || String(productID) === offer.productID;
  const quantity = compatible && item ? item.quantity : 0;
  const maximum = Math.min(offer.maximumQuantity, offer.availableQuantity);
  const disabled = busy || isLoading || paymentLocked || !user || !compatible;
  async function changeQuantity(increase: boolean) {
    if (disabled || changing.current) return;
    changing.current = true; setBusy(true); setMessage("");
    try {
      if (!item && increase) await addItem({ product: offer.productID }, 1);
      else if (item?.id && increase && quantity < maximum) await incrementItem(item.id);
      else if (item?.id && !increase && quantity > 0) await decrementItem(item.id);
    } catch { setMessage("The quantity could not be updated. Try again."); }
    finally { changing.current = false; setBusy(false); }
  }
  return <div className="space-y-7">
    <div><h2 className="text-xl font-medium">Your order</h2><p className="mt-2 text-sm leading-6 text-neutral-400">Admission guest names can be assigned after purchase. Each guest can optionally register to claim their own four Part I drinks and Part I → Part II transport.</p></div>
    <div className="flex items-center justify-between gap-4"><span id="commerce-quantity-label" className="text-sm">Coins</span>
      <div role="group" aria-labelledby="commerce-quantity-label" className="flex items-center gap-2 rounded-full border border-white/20 p-1">
        <button type="button" aria-label="Remove one coin" disabled={disabled || quantity <= 0} onClick={() => void changeQuantity(false)} className="size-12 rounded-full text-xl hover:bg-white/10 disabled:opacity-30">−</button>
        <output aria-live="polite" className="min-w-8 text-center tabular-nums">{quantity}</output>
        <button type="button" aria-label="Add one coin" disabled={disabled || quantity >= maximum} onClick={() => void changeQuantity(true)} className="size-12 rounded-full text-xl hover:bg-white/10 disabled:opacity-30">+</button>
      </div>
    </div>
    <p role="status" className="min-h-5 text-sm text-neutral-400">{message || (!compatible ? "Your cart contains a different release. Resolve it before continuing." : !user ? "Loading your account…" : maximum === 0 ? "This release is unavailable." : "")}</p>
    <ShippingAddressForm value={shippingAddress} onChange={setShippingAddress} disabled={busy || paymentLocked || !user} />
    <div className="flex justify-between border-t border-white/15 pt-5 text-lg"><span>Total</span><span className="tabular-nums">{(quantity ? offer.priceKRW * quantity + offer.shippingFeeKRW : 0).toLocaleString("ko-KR")} KRW</span></div>
    <CommercePayment productID={offer.productID} shippingAddress={shippingAddress} disabled={disabled || quantity < 1} onBusyChange={setBusy} onAttemptChange={setPaymentLocked} />
  </div>;
}
