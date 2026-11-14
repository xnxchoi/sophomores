"use client";
import { useTranslations } from "next-intl";


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
  const t = useTranslations('Customer.components_commerce_checkout');
  const accountFeedback = useTranslations('Customer.components_tickets_ticket_selection');
  const { user, clearSession, onLogin } = useEcommerce();
  const customerID = user?.id;
  type IdentityState =
    | { kind: "checking" | "authentication-required" }
    | { kind: "confirmed"; customerID: string }
    | { kind: "forbidden" | "rate-limited" | "http-error"; status: number }
    | { kind: "malformed-receipt" | "transport-error" | "transport-aborted" }
    | { kind: "synchronizing" | "synchronization-error" | "synchronization-unconfirmed"; customerID: string; attempt: number };
  const [state, setState] = useState<IdentityState>({ kind: "checking" });
  const [identity, setIdentity] = useState({ customerID: customerID == null ? undefined : String(customerID), generation: 0 });
  const [retry, setRetry] = useState(0);
  const [previousVerified, setPreviousVerified] = useState(verified);
  const [observedProviderID, setObservedProviderID] = useState(customerID == null ? undefined : String(customerID));
  // Guarded render adjustment prevents a previously confirmed receipt flashing
  // visible when the parent re-enables verification. No effect-time reset gap.
  if (previousVerified !== verified) { setPreviousVerified(verified); setState({ kind: "checking" }); }
  const latest = useRef({ customerID, clearSession, onLogin, onSessionExpired });
  const recheck = useRef<((allowSynchronization: boolean) => void) | undefined>(undefined);
  const request = useRef(0);
  const synchronization = useRef<{ customerID: string; attempt: number } | undefined>(undefined);
  const settledSynchronization = useRef(false);
  const settledFailure = useRef<"synchronization-error" | "synchronization-unconfirmed">("synchronization-unconfirmed");
  const isolate = useCallback((id: string) => {
    setIdentity((previous) => previous.customerID === id ? previous : { customerID: id, generation: previous.generation + (previous.customerID === undefined ? 0 : 1) });
  }, []);
  // Preserve the existing privacy boundary on observed non-null provider changes,
  // independently of whether the next own-ID read can confirm permission. Null
  // from clearSession is not a different account and must not discard same-owner input.
  if (customerID != null && observedProviderID !== String(customerID)) {
    setObservedProviderID(String(customerID)); isolate(String(customerID));
  }
  useEffect(() => {
    const changed = String(latest.current.customerID ?? "") !== String(customerID ?? "");
    latest.current = { customerID, clearSession, onLogin, onSessionExpired };
    // Provider state changes during its own synchronization are not new read
    // evidence and must not start a recursive login/recheck loop.
    if (changed && !synchronization.current) recheck.current?.(!settledSynchronization.current || state.kind === "confirmed");
  }, [customerID, clearSession, onLogin, onSessionExpired, state.kind]);
  useEffect(() => {
    let active = true;
    let pending = false;
    let queued = false;
    let queuedSynchronization = false;
    let controller: AbortController | undefined;
    async function verify(invalidate = false, allowSynchronization = true) {
      if (!verified || document.visibilityState === "hidden") return;
      if (pending) {
        if (invalidate) { request.current++; queued = true; queuedSynchronization = allowSynchronization; controller?.abort(); }
        return;
      }
      pending = true;
      synchronization.current = undefined;
      if (allowSynchronization) settledSynchronization.current = false;
      const attempt = ++request.current;
      const current = () => active && request.current === attempt;
      controller = new AbortController();
      setState({ kind: "checking" });
      try {
        let response: Response;
        try {
          response = await fetch("/api/users/me?depth=0&select[id]=true", { credentials: "include", cache: "no-store", signal: controller.signal });
        } catch (error) {
          if (current()) setState({ kind: error instanceof Error && error.name === "AbortError" ? "transport-aborted" : "transport-error" });
          return;
        }
        if (!current()) return;
        if (response.status === 401) { setState({ kind: "authentication-required" }); latest.current.onSessionExpired(); return; }
        if (!response.ok) {
          setState({ kind: response.status === 403 ? "forbidden" : response.status === 429 ? "rate-limited" : "http-error", status: response.status });
          return;
        }
        let body: string;
        try {
          body = await response.text();
        } catch (error) {
          if (current()) setState({ kind: error instanceof Error && error.name === "AbortError" ? "transport-aborted" : "transport-error" });
          return;
        }
        if (!current()) return;
        let result: { user: { id: string | number } | null };
        try {
          result = z.object({ user: z.object({ id: z.union([z.string().min(1), z.number()]) }).nullable() }).parse(JSON.parse(body));
        } catch {
          if (current()) setState({ kind: "malformed-receipt" });
          return;
        }
        if (!current()) return;
        if (!result.user) { setState({ kind: "authentication-required" }); latest.current.onSessionExpired(); return; }
        const id = String(result.user.id);
        // A confirmed own-account change removes prior private DOM even if the
        // provider subsequently fails to synchronize. Same-account state stays mounted.
        isolate(id);
        if (id === String(latest.current.customerID ?? "")) {
          settledSynchronization.current = false;
          setState({ kind: "confirmed", customerID: id }); return;
        }
        if (!allowSynchronization) {
          setState({ kind: settledFailure.current, customerID: id, attempt }); return;
        }
        synchronization.current = { customerID: id, attempt };
        setState({ kind: "synchronizing", customerID: id, attempt });
        let fulfilled = false;
        try {
          const provider = latest.current;
          provider.clearSession(); // Installed API is synchronous void, not an acknowledgement.
          await provider.onLogin(); // Promise<void> may fulfill without setting any user.
          fulfilled = true;
          if (current()) { settledFailure.current = "synchronization-unconfirmed"; setState({ kind: "synchronization-unconfirmed", customerID: id, attempt }); }
        } catch {
          if (current()) { settledFailure.current = "synchronization-error"; setState({ kind: "synchronization-error", customerID: id, attempt }); }
        } finally {
          // A settled guard must not suppress later external identity changes,
          // and an old completion must never clear a newer attempt's guard.
          if (synchronization.current?.attempt === attempt) { synchronization.current = undefined; settledSynchronization.current = true; }
          if (fulfilled && current()) { queued = true; queuedSynchronization = false; }
        }
      } finally {
        pending = false;
        if (active && queued) { queued = false; void verify(false, queuedSynchronization); }
      }
    }
    const restart = (allowSynchronization: boolean) => { void verify(true, allowSynchronization); };
    const onReturn = () => { void verify(); };
    recheck.current = restart;
    window.addEventListener("focus", onReturn); document.addEventListener("visibilitychange", onReturn);
    if (verified) void verify();
    return () => {
      active = false; controller?.abort();
      if (recheck.current === restart) recheck.current = undefined;
      window.removeEventListener("focus", onReturn); document.removeEventListener("visibilitychange", onReturn);
    };
  }, [isolate, retry, verified]);
  const blocked = !verified || state.kind !== "confirmed" || state.customerID !== String(customerID ?? "");
  const checking = state.kind === "checking" || state.kind === "synchronizing" || (state.kind === "synchronization-unconfirmed" && state.customerID === String(customerID ?? "")) || (state.kind === "confirmed" && blocked);
  const error = !checking && state.kind !== "confirmed" && state.kind !== "authentication-required";
  return <>
    <div hidden={blocked} inert={blocked} key={identity.generation} data-commerce-identity-state={state.kind} data-commerce-identity-http-status={"status" in state ? state.status : undefined}>{children}</div>
    {(checking || error) && <p role="status" className="min-h-12 text-sm text-neutral-400">{error ? accountFeedback('weCouldnTCheckYourAccountTryAgain') : t('checkingYourAccount')}</p>}
    {error && <button type="button" onClick={() => setRetry((value) => value + 1)} className="min-h-12 rounded-xl border border-white/25 px-5 py-3 text-sm">{t('retryAccountCheck')}</button>}
  </>;
}

export function CommerceCheckout({ offer }: { offer: CommerceOffer }) {
  const t = useTranslations('Customer.components_commerce_checkout');
  const { cart, addItem, removeItem, isLoading } = useCart();
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
  const maximum = Math.min(1, offer.availableQuantity);
  const disabled = busy || isLoading || paymentLocked || !user || !compatible;
  // One unit per purchase: a single add/remove control, never a quantity picker.
  async function toggleUnit() {
    if (disabled || changing.current) return;
    changing.current = true; setBusy(true); setMessage("");
    try {
      if (!item && maximum > 0) await addItem({ product: offer.productID }, 1);
      else if (item?.id) await removeItem(item.id);
    } catch { setMessage(t('theQuantityCouldNotBeUpdatedTryAgain')); }
    finally { changing.current = false; setBusy(false); }
  }
  return <div className="space-y-7">
    <div><h2 className="text-xl font-medium">{t('yourOrder')}</h2><p className="mt-2 text-sm leading-6 text-neutral-400">{t('admissionGuestNamesCanBeAssignedAfterPurchaseEach')}</p></div>
    <div className="flex items-center justify-between gap-4"><span id="commerce-quantity-label" className="text-sm">{t('coins')}</span>
      <div role="group" aria-labelledby="commerce-quantity-label" className="flex items-center gap-2 rounded-full border border-white/20 p-1">
        <output aria-live="polite" className="min-w-8 pl-3 text-center tabular-nums">{quantity}</output>
        <button type="button" aria-label={quantity ? t('removeOneCoin') : t('addOneCoin')} aria-pressed={quantity > 0} disabled={disabled || (!quantity && maximum === 0)} onClick={() => void toggleUnit()} className="size-12 rounded-full text-xl hover:bg-white/10 disabled:opacity-30">{quantity ? "−" : "+"}</button>
      </div>
    </div>
    <p role="status" className="min-h-5 text-sm text-neutral-400">{message || (!compatible ? t('yourCartContainsADifferentReleaseResolveItBefore') : !user ? t('loadingYourAccount') : maximum === 0 ? t('thisReleaseIsUnavailable') : "")}</p>
    <ShippingAddressForm value={shippingAddress} onChange={setShippingAddress} disabled={busy || paymentLocked || !user} />
    <div className="flex justify-between border-t border-white/15 pt-5 text-lg"><span>{t('total')}</span><span className="tabular-nums">{(quantity ? offer.priceKRW * quantity + offer.shippingFeeKRW : 0).toLocaleString("ko-KR")} KRW</span></div>
    <CommercePayment productID={offer.productID} shippingAddress={shippingAddress} disabled={disabled || quantity < 1} onBusyChange={setBusy} onAttemptChange={setPaymentLocked} />
  </div>;
}
