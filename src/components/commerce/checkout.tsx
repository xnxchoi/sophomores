"use client";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";


import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { EcommerceProvider, useCart, useEcommerce } from "@payloadcms/plugin-ecommerce/client/react";
import { MemberAccountFlow } from "@/components/Authentication/member-auth/account-study";
import type { MemberSnapshot } from "@/components/Authentication/member-auth/_shared/session";
import { createMemberClient, parseMemberStatus } from "@/lib/member-auth/client";
import type { MemberCapabilities } from "@/lib/member-auth/contracts";
import type { CommerceOffer } from "@/lib/commerce/catalogue";
import { shippingAddressSchema, type ShippingAddress } from "@/lib/commerce/contracts";
import { z } from "zod";
import { CommercePayment } from "./payment";
import { ShippingAddressForm } from "./shipping-address";
import { ReviewCustomerNotice } from "./review-customer-notice";
import { ArcRoles } from "./arc-roles";
import { Progress } from "@/components/arc/progress/progress";
import { Button } from "@/components/arc/button/button";
import { AnimatedCounter } from "@/components/arc/animated-counter/animated-counter";
import { ExpandableCard } from "@/components/arc/expandable-card/expandable-card";
import { Badge } from "@/components/arc/badge/badge";
import { NumberField } from "@/components/arc/number-field/number-field";

type CommerceAccountGateProps = {
  initialCapabilities: Readonly<MemberCapabilities>;
  children?: ReactNode;
  inlineEmailOnly?: boolean;
  accountIntroduction?: ReactNode;
  identityCheckDetails?: ReactNode;
  noAccountMessage?: string;
  signInOffInReview?: boolean;
  /** Checkout page only: show the step indicator and the flat two-column layout. */
  progress?: boolean;
  /** The purchase step Apple and Google sign-in return to (Auth owns the exact paths). */
  returnTo?: "ticket-checkout" | "shop-cart" | "shop-checkout";
};

export function CommerceAccountGate({ signInOffInReview, ...props }: CommerceAccountGateProps) {
  if (signInOffInReview) return <ReviewCustomerNotice />;
  return <EnabledCommerceAccountGate {...props} />;
}

/** Account flow stays mounted; only fresh authoritative membership reveals commerce. */
function EnabledCommerceAccountGate({ initialCapabilities, children, inlineEmailOnly = false, accountIntroduction, identityCheckDetails, noAccountMessage, progress = false, returnTo = "ticket-checkout" }: CommerceAccountGateProps) {
  const headingID = useId();
  const client = useMemo(() => {
    const source = createMemberClient(undefined, undefined, returnTo);
    return { ...source, status: async () => {
      const status = parseMemberStatus(await source.status());
      return inlineEmailOnly ? { ...status, capabilities: { ...status.capabilities, apple: false, google: false, kakao: false, magicLink: false } } : status;
    } };
  }, [inlineEmailOnly, returnTo]);
  const [eligible, setEligible] = useState(false);
  const [started, setStarted] = useState(false);
  const [accountGeneration, setAccountGeneration] = useState(0);
  const onSnapshot = useCallback((snapshot: MemberSnapshot) => {
    const ready = !snapshot.busy && !snapshot.error && snapshot.status?.authenticated === true && snapshot.status.member;
    if (ready) setStarted(true);
    setEligible(ready);
  }, []);
  const onSessionExpired = useCallback(() => { setEligible(false); setAccountGeneration((value) => value + 1); }, []);
  const account = <MemberAccountFlow key={accountGeneration} client={client} initialCapabilities={inlineEmailOnly ? { ...initialCapabilities, apple: false, google: false, kakao: false, magicLink: false } : initialCapabilities}
    headingId={headingID} flow="signup" presentation="ticket-checkout" noAccountMessage={noAccountMessage} onSnapshot={onSnapshot} />;
  const content = <>
    {progress ? <div hidden={eligible} inert={eligible} className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] xl:grid-cols-[minmax(0,1fr)_28rem] lg:gap-x-16 xl:gap-x-24">
      {accountIntroduction != null && <div className="min-w-0 lg:sticky lg:top-28 lg:col-start-2 lg:row-start-1 lg:self-start">{accountIntroduction}</div>}
      {/* The account flow (Auth) hard-codes dark-surface colours, so it sits on a dark surface in both themes, as the older layout does. */}
      <div className="dark min-w-0 rounded-xl border border-border bg-background text-foreground lg:col-start-1 lg:row-start-1">{account}</div>
    </div> : <div hidden={eligible} inert={eligible}>
      {accountIntroduction}
      <div className="dark min-w-0 rounded-2xl border border-border bg-background text-foreground shadow-sm">{account}</div>
    </div>}
    {started && <div hidden={!eligible} inert={!eligible}><CommerceSession verified={eligible} onSessionExpired={onSessionExpired} identityCheckDetails={identityCheckDetails} progress={progress}>{children}</CommerceSession></div>}
  </>;
  return <ArcRoles>{progress ? <CheckoutProgress eligible={eligible}>{content}</CheckoutProgress> : content}</ArcRoles>;
}

function CommerceSession({ children, verified, onSessionExpired, identityCheckDetails, progress }: {
  children: ReactNode; verified: boolean; onSessionExpired: () => void; identityCheckDetails?: ReactNode; progress?: boolean;
}) {
  return <EcommerceProvider customersSlug="users" debug={false} enableVariants={false} syncLocalStorage={false}
    currenciesConfig={{ defaultCurrency: "KRW", supportedCurrencies: [{ code: "KRW", decimals: 0, label: "Korean Won", symbol: "₩" }] }}
    paymentMethods={[{ name: "portone", label: "Card", initiatePayment: true, confirmOrder: true }]}>
    <CommerceIdentityBoundary verified={verified} onSessionExpired={onSessionExpired} identityCheckDetails={identityCheckDetails} progress={progress}>{children}</CommerceIdentityBoundary>
  </EcommerceProvider>;
}

/** Revalidate identity on return without resetting the same account's in-progress address. */
export function CommerceIdentityBoundary({ children, verified, onSessionExpired, identityCheckDetails, progress = false }: {
  children: ReactNode; verified: boolean; onSessionExpired: () => void; identityCheckDetails?: ReactNode; progress?: boolean;
}) {
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
  // The one step bar (CheckoutProgress) shows Delivery while the account is checked, then whatever the checkout reports.
  const reportStep = useContext(CheckoutStepReport);
  const [childStep, setChildStep] = useState(1);
  useEffect(() => { reportStep?.(blocked ? 1 : childStep); }, [reportStep, blocked, childStep]);
  const checking = state.kind === "checking" || state.kind === "synchronizing" || (state.kind === "synchronization-unconfirmed" && state.customerID === String(customerID ?? "")) || (state.kind === "confirmed" && blocked);
  const error = !checking && state.kind !== "confirmed" && state.kind !== "authentication-required";
  return <>
    <div hidden={blocked} inert={blocked} key={identity.generation} data-commerce-identity-state={state.kind} data-commerce-identity-http-status={"status" in state ? state.status : undefined}><CheckoutStepReport.Provider value={reportStep ? setChildStep : null}>{children}</CheckoutStepReport.Provider></div>
    {(checking || error) && progress && <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] xl:grid-cols-[minmax(0,1fr)_28rem] lg:gap-x-16 xl:gap-x-24">
      {identityCheckDetails != null && <div className="min-w-0 lg:col-start-2 lg:row-start-1">{identityCheckDetails}</div>}
      <div className="min-w-0 space-y-4 self-start border-t border-border pt-6 lg:col-start-1 lg:row-start-1">
        <p role="status" className="text-sm leading-6 text-muted-foreground">{error ? accountFeedback('weCouldnTCheckYourAccountTryAgain') : t('checkingYourAccount')}</p>
        {error && <Button type="button" variant="secondary" size="lg" onClick={() => setRetry((value) => value + 1)}>{t('retryAccountCheck')}</Button>}
      </div>
    </div>}
    {(checking || error) && !progress && <div className={cn(identityCheckDetails != null && "grid min-w-0 gap-8 rounded-2xl border border-border bg-background p-5 sm:p-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)] lg:gap-12")}>
      <div className="self-start space-y-3 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <p role="status" className="text-sm leading-6 text-card-foreground">{error ? accountFeedback('weCouldnTCheckYourAccountTryAgain') : t('checkingYourAccount')}</p>
        {error && <button type="button" onClick={() => setRetry((value) => value + 1)} className="min-h-12 rounded-full border border-border bg-background px-5 py-3 text-sm text-foreground outline-offset-4 hover:bg-muted focus-visible:outline-2">{t('retryAccountCheck')}</button>}
      </div>
      {identityCheckDetails}
    </div>}
  </>;
}

/** The server's purchase allowance for this offer, computed in the page on the server. Presentation reads it and never sets it. */
export type PurchaseAllowance = Readonly<{ source: "server"; perAccount: number; singleMembershipToken: boolean; includesAdmission: boolean }>;

/** One server offer is the only identity, price and allowance source: each edition is its own product. */
export function CommerceCheckout({ offer, allowance, orderDetails, progress = false }: { offer: CommerceOffer; allowance: PurchaseAllowance; orderDetails?: ReactNode; progress?: boolean }) {
  const t = useTranslations('Customer.components_commerce_checkout');
  const { cart, addItem, removeItem, isLoading } = useCart();
  const { user } = useEcommerce();
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({ country: "KR", recipientName: "", phone: "", postalCode: "", addressLine1: "" });
  const [busy, setBusy] = useState(false);
  // Payment reports its own busy state; it locks the order and address, but never disables Pay mid-press (Arc keeps focus).
  const [paymentBusy, setPaymentBusy] = useState(false);
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
  // Read, never set: the server's per-account allowance and what is still available.
  const maximum = Math.min(allowance.perAccount, offer.availableQuantity);
  const unitPrice = offer.priceKRW;
  const lineName = offer.title;
  const disabled = busy || paymentBusy || isLoading || paymentLocked || !user || !compatible;
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
  // Payment is the current step only once the order and a delivery address the server would accept are both in place.
  const addressFilled = shippingAddressSchema.safeParse(shippingAddress).success;
  // Purchase entry needs the server's allowance first, then the Payment step (an order and a valid address). Recovery of a
  // retained attempt is separate: CommercePayment's Check, Resume and Cancel never read this flag.
  const purchaseOpen = maximum > 0;
  // Report this checkout's step to the one step bar: Payment once purchase is open and the order and a valid address are
  // both in place. With no allowance, a retained cart and a valid address stay on Delivery: Pay can't be used. A retained
  // attempt is at Payment whatever the allowance: its Check, Resume and Cancel are the actions on screen.
  const reportStep = useContext(CheckoutStepReport);
  const step = paymentLocked || purchaseOpen && quantity > 0 && addressFilled ? 2 : 1;
  useEffect(() => { if (progress) reportStep?.(step); }, [progress, reportStep, step]);
  // Nothing can be ordered and nothing is in the order: the address is not asked for. Recovery stays below, unaffected.
  const addressClosed = !purchaseOpen && quantity === 0;
  const paymentDisabled = !purchaseOpen || step < 2 || busy || isLoading || paymentLocked || !user || !compatible;
  const status = message || (!compatible ? t('yourCartContainsADifferentReleaseResolveItBefore') : !user ? t('loadingYourAccount') : maximum === 0 ? t('thisReleaseIsUnavailable') : "");
  const total = quantity ? unitPrice * quantity + offer.shippingFeeKRW : 0;
  const totalLabel = total.toLocaleString("ko-KR") + " KRW";
  if (!progress) return <div className={cn("grid min-w-0 gap-8",
    orderDetails != null && "lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)] lg:gap-12")}>
    <div className="min-w-0 space-y-7">
      <div><h2 className="text-xl">{t('yourOrder')}</h2>{allowance.includesAdmission && <p className="mt-2 text-sm leading-6 text-neutral-400">{t('guestNamesAfterPurchase')}</p>}</div>
      <LineItem name={lineName} onePerAccount={allowance.singleMembershipToken} quantityField={!allowance.singleMembershipToken} quantity={quantity} disabled={disabled} maximum={maximum} onToggle={() => void toggleUnit()} />
      <p role="status" className="min-h-5 text-sm text-neutral-400">{status}</p>
      <ShippingAddressForm value={shippingAddress} onChange={setShippingAddress} disabled={busy || paymentBusy || paymentLocked || !user || addressClosed} />
    </div>
    <div className="min-w-0 space-y-5">
      {orderDetails}
      <div className="flex flex-wrap justify-between gap-3 border-t border-white/15 pt-5 text-lg"><span>{t('total')}</span><span className="tabular-nums">{totalLabel}</span></div>
      <CommercePayment productID={offer.productID} shippingAddress={shippingAddress} disabled={paymentDisabled} onBusyChange={setPaymentBusy} onAttemptChange={setPaymentLocked} />
    </div>
  </div>;
  return <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] xl:grid-cols-[minmax(0,1fr)_28rem] lg:gap-x-16 lg:gap-y-10 xl:gap-x-24">
    <aside className="min-w-0 lg:sticky lg:top-28 lg:col-start-2 lg:row-start-1 lg:self-start">
      <div className="grid gap-5">
        <ExpandableCard title={lineName} description={unitPrice.toLocaleString("ko-KR") + " KRW"} defaultExpanded>{orderDetails}</ExpandableCard>
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-border pt-4 tabular-nums"><span className="text-base">{t('total')}</span><span className="text-xl"><AnimatedCounter value={total} suffix={"\u00a0KRW"} locale="ko-KR" /></span></div>
      </div>
    </aside>
    <div className="min-w-0 divide-y divide-border lg:col-start-1 lg:row-start-1 [&>section]:py-10 [&>section:first-child]:pt-0">
      <section aria-labelledby="checkout-order-heading" className="space-y-5">
        <div><h2 id="checkout-order-heading" className="text-xl">{t('yourOrder')}</h2>{allowance.includesAdmission && <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">{t('guestNamesAfterPurchase')}</p>}</div>
        <LineItem name={lineName} onePerAccount={allowance.singleMembershipToken} quantityField={!allowance.singleMembershipToken} quantity={quantity} disabled={disabled} maximum={maximum} onToggle={() => void toggleUnit()} />
        <p role="status" className="min-h-5 text-sm text-muted-foreground empty:hidden">{status}</p>
      </section>
      <section><ShippingAddressForm value={shippingAddress} onChange={setShippingAddress} disabled={busy || paymentBusy || paymentLocked || !user || addressClosed} /></section>
      <section className="max-w-2xl"><CommercePayment productID={offer.productID} shippingAddress={shippingAddress} disabled={paymentDisabled} onBusyChange={setPaymentBusy} onAttemptChange={setPaymentLocked} /></section>
    </div>
  </div>;
}

function LineItem({ name, onePerAccount, quantityField = false, quantity, disabled, maximum, onToggle }: { name: string; onePerAccount: boolean; quantityField?: boolean; quantity: number; disabled: boolean; maximum: number; onToggle: () => void }) {
  const t = useTranslations('Customer.components_commerce_checkout');
  // The line names the product. Under the single membership token rule it says so and has one add/remove action; a product
  // outside that rule gets a quantity field bounded by the server allowance (one today, so it moves between 0 and 1).
  return <div className="flex flex-wrap items-center justify-between gap-4">
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1"><p className="text-base wrap-anywhere">{name}</p>
      {onePerAccount && <Badge size="md">{t('onePerAccount')}</Badge>}</div>
    {quantityField
      ? <div data-arc-control><NumberField label={t('quantity')} value={quantity} min={0} max={maximum} size="lg" locale="ko-KR" limitHint={false} disabled={disabled || (!quantity && maximum === 0)}
          onValueChange={(next) => { if ((next > 0) !== (quantity > 0)) onToggle(); }} /></div>
      : <Button type="button" variant="secondary" size="lg" disabled={disabled || (!quantity && maximum === 0)} onClick={onToggle}>{quantity ? t('remove') : t('add')}</Button>}
  </div>;
}

/** Steps report up to the one mounted bar; null outside a progress checkout. */
const CheckoutStepReport = createContext<((step: number) => void) | null>(null);

/** One mounted step bar for the whole checkout, above the account, account-check and checkout screens. Its step lives here,
 * inside this checkout: the account step while signed out, otherwise what the visible screen reports. A hidden subtree
 * (e.g. a retained session behind the account step) never moves it. */
export function CheckoutProgress({ eligible, children }: { eligible: boolean; children: ReactNode }) {
  const [reported, setReported] = useState(1);
  return <CheckoutStepReport.Provider value={setReported}>
    <CheckoutSteps current={eligible ? reported : 0} className="mb-8" />
    {children}
  </CheckoutStepReport.Provider>;
}

/** Arc Progress for the three steps: one bar and the step name. It stays mounted, so Arc's own value moves from the previous
 * step to the new one (and back down), and the first value is set without animating. Never full: the order replaces it.
 * Its accent is our foreground (monochrome), kept local because the global --accent is shadcn's. */
export function CheckoutSteps({ current, className }: { current: number; className?: string }) {
  const t = useTranslations('Customer.components_commerce_checkout');
  const names = [t('stepAccount'), t('stepDelivery'), t('stepPayment')];
  return <div className={cn("min-w-0 [--accent:var(--foreground)]", className)}>
    <Progress label={t('stepProgress', { step: current + 1, total: names.length, name: names[current] ?? "" })} value={current + 1} max={names.length + 1} />
  </div>;
}
