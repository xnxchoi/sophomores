"use client";
import { useTranslations } from "next-intl";


import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useCart, useEcommerce, usePayments } from "@payloadcms/plugin-ecommerce/client/react";
import { requestPayment as portOneRequestPayment, type PaymentRequest } from "@portone/browser-sdk/v2";
import { z } from "zod";
import { shippingAddressSchema, type ShippingAddress } from "@/lib/commerce/contracts";
import { providerPaymentId } from "@/lib/tickets/portone/payment-id";

const identifier = z.string().min(1).max(128);
const intentSchema = z.strictObject({ version: z.literal(1), attemptID: z.uuid().optional(), cartID: identifier,
  transactionID: z.uuid().optional(), paymentID: providerPaymentId.optional() })
  .refine((value) => Boolean(value.transactionID) === Boolean(value.paymentID)
    && Boolean(value.attemptID || value.transactionID));
const sdkRequestSchema = z.object({ storeId: identifier, channelKey: identifier, paymentId: providerPaymentId,
  orderName: z.string().min(1).max(200), totalAmount: z.int().positive(), currency: z.literal("KRW"), redirectUrl: z.url(),
  customer: z.object({ customerId: identifier, email: z.email().optional(), fullName: z.string().max(128).optional() }) });
const preparedSchema = z.object({ transactionID: z.uuid(), paymentID: providerPaymentId,
  outcome: z.enum(["prepared", "resumable", "status-only", "retirable"]), paymentRequest: sdkRequestSchema.optional() });
const confirmedSchema = z.object({ orderID: z.uuid(), transactionID: z.uuid() });
const retiredSchema = z.object({ outcome: z.literal("retired"), transactionID: z.uuid(), paymentID: providerPaymentId });
const pendingSchema = z.object({ attempts: z.array(z.object({ transactionID: z.uuid(), paymentID: providerPaymentId,
  cartID: identifier, productID: identifier, quantity: z.int().min(1).max(3), totalAmount: z.int().positive(), currency: z.literal("KRW"),
  status: z.string().max(40), reviewHold: z.boolean(), resolutionConflict: z.boolean().default(false) })).max(100) });
type PaymentIntent = z.infer<typeof intentSchema>;

/** No shipping, customer details, cart secrets or SDK requests are stored in browser storage. */
export function CommercePayment({ shippingAddress, disabled = false, onBusyChange, onAttemptChange, recovery = false, productID, requestPayment = portOneRequestPayment }: {
  shippingAddress?: ShippingAddress; disabled?: boolean; recovery?: boolean;
  onBusyChange?: (busy: boolean) => void; onAttemptChange?: (retained: boolean) => void;
  requestPayment?: typeof portOneRequestPayment;
  productID?: string;
}) {
  const t = useTranslations('Customer.components_commerce_payment');
  const { user } = useEcommerce();
  const customerID = user?.id;
  const { cart, refreshCart } = useCart();
  // 3.92.1 declares context.cartID but omits it from the runtime provider value.
  // The actual canonical document returned by useCart is the available authority.
  const cartID = cart?.id;
  const { initiatePayment, confirmOrder } = usePayments();
  const storageKey = user ? "sphmrs:commerce-payment:" + user.id : null;
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener("storage", notify); window.addEventListener("commerce-payment-update", notify);
    return () => { window.removeEventListener("storage", notify); window.removeEventListener("commerce-payment-update", notify); };
  }, []);
  const stored = useSyncExternalStore(subscribe, useCallback(() => {
    if (!storageKey) return undefined;
    try { return window.sessionStorage.getItem(storageKey) ?? ""; } catch { return null; }
  }, [storageKey]), () => undefined);
  const intent = useMemo(() => {
    if (!stored || stored.length > 1024) return null;
    try { return intentSchema.parse(JSON.parse(stored)); } catch { return null; }
  }, [stored]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [orderID, setOrderID] = useState<string | null>(null);
  const [retirableTransactionID, setRetirableTransactionID] = useState<string | null>(null);
  const [discovery, setDiscovery] = useState<{ state: "loading" | "error" | "ready"; attempts: z.infer<typeof pendingSchema>["attempts"] }>({ state: "loading", attempts: [] });
  const [discoveryRetry, setDiscoveryRetry] = useState(0);
  const pending = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { onAttemptChange?.(Boolean(intent?.transactionID)); }, [intent?.transactionID, onAttemptChange]);
  useEffect(() => {
    if (!customerID) return;
    const abort = new AbortController();
    setDiscovery({ state: "loading", attempts: [] });
    void fetch("/api/payments/portone/pending" + (productID ? "?productID=" + encodeURIComponent(productID) : ""), { credentials: "include", cache: "no-store", signal: abort.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Recovery unavailable"); return pendingSchema.parse(await response.json()); })
      .then((result) => { if (!abort.signal.aborted) setDiscovery({ state: "ready", attempts: result.attempts }); })
      .catch(() => { if (!abort.signal.aborted) setDiscovery({ state: "error", attempts: [] }); });
    return () => abort.abort();
  }, [customerID, productID, discoveryRetry]);

  function saveIntent(value: PaymentIntent) {
    if (!storageKey) throw new Error("Account unavailable");
    const intent = intentSchema.parse(value);
    window.sessionStorage.setItem(storageKey, JSON.stringify(intent));
    window.dispatchEvent(new Event("commerce-payment-update"));
  }
  // Feature-local storage ownership: never clear a newer concurrently saved attempt.
  function clearMatchingIntent(value: PaymentIntent) {
    if (!storageKey) return;
    const saved = window.sessionStorage.getItem(storageKey);
    const current = saved ? intentSchema.safeParse(JSON.parse(saved)) : null;
    if (current?.success && current.data.transactionID === value.transactionID
      && current.data.paymentID === value.paymentID && current.data.cartID === value.cartID) {
      window.sessionStorage.removeItem(storageKey);
      window.dispatchEvent(new Event("commerce-payment-update"));
    }
  }
  async function confirm(value: PaymentIntent) {
    if (!value.transactionID || !value.paymentID) throw new Error("Preparation unresolved");
    const additionalData = { transactionID: value.transactionID, paymentID: value.paymentID, cartID: value.cartID };
    let confirmation: unknown;
    if (cartID) confirmation = await confirmOrder("portone", { additionalData });
    else {
      // 3.92.1's hook refuses all confirmation without its current cartID, even
      // when a retained canonical cartID is supplied. Recovery uses that SAME
      // official endpoint; it does not create another finalizer or authority.
      const response = await fetch("/api/payments/portone/confirm-order", { method: "POST", credentials: "include", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(additionalData) });
      if (!response.ok) throw new Error("Confirmation pending");
      confirmation = await response.json();
    }
    const result = confirmedSchema.parse(confirmation);
    if (result.transactionID !== value.transactionID) throw new Error("Confirmation mismatch");
    if (active.current) { setOrderID(String(result.orderID)); setMessage(t('paymentConfirmedYourOrderHasBeenReceived')); }
    if (storageKey) {
      try {
        clearMatchingIntent(value);
      } catch {
        if (active.current) setMessage(t('paymentConfirmedYourOrderHasBeenReceivedSavedRecovery'));
      }
    }
    try { await refreshCart(); }
    catch { if (active.current) setMessage(t('paymentConfirmedYourOrderHasBeenReceivedTheCart')); }
  }
  async function openSDK(value: PaymentIntent, rawRequest: unknown) {
    if (!active.current) return;
    const request = sdkRequestSchema.parse(rawRequest);
    if (!user || request.customer.customerId !== String(user.id) || request.paymentId !== value.paymentID
      || new URL(request.redirectUrl).origin !== window.location.origin || new URL(request.redirectUrl).pathname !== "/shop/payment") throw new Error("Payment request mismatch");
    const response = await fetch("/api/users/me?depth=0&select[id]=true", { credentials: "include", cache: "no-store" });
    const account = z.object({ user: z.object({ id: z.union([identifier, z.number()]) }) }).parse(await response.json());
    if (!active.current) return;
    if (!response.ok || String(account.user.id) !== String(user.id)) throw new Error("Account changed");
    saveIntent(value); // Refuse to open an un-recoverable payment window.
    await requestPayment({ ...request, payMethod: "CARD" } as PaymentRequest);
    if (!active.current) return;
    // Cancellation and browser results never prove payment or release the reservation.
    try { await confirm(value); }
    catch { setMessage(t('paymentIsNotConfirmedCheckThisAttemptBeforeTrying')); }
  }
  async function resumePayment() {
    if (!intent?.transactionID || !intent.paymentID) throw new Error("Missing attempt");
    const response = await fetch("/api/payments/portone/resume", { method: "POST", credentials: "include", cache: "no-store",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transactionID: intent.transactionID, paymentID: intent.paymentID, cartID: intent.cartID }) });
    if (!response.ok) throw new Error("Resume unavailable");
    const resumed = preparedSchema.parse(await response.json());
    if (resumed.transactionID !== intent.transactionID || resumed.paymentID !== intent.paymentID) throw new Error("Attempt mismatch");
    if (resumed.outcome === "retirable") {
      setRetirableTransactionID(intent.transactionID);
      setMessage(t('thisPaymentFailedCancelThisAttemptBeforeStartingAnother'));
      return;
    }
    if (resumed.outcome !== "resumable" || !resumed.paymentRequest) { setMessage(t('thisAttemptCannotBeReopenedCheckPaymentStatusOr')); return; }
    await openSDK(intent, resumed.paymentRequest);
  }
  async function preparePayment() {
    if (discovery.state !== "ready" || discovery.attempts.length) { setMessage(t('resolveTheExistingPaymentAttemptBeforeStartingAnother')); return; }
    if (disabled || !cartID || !shippingAddress || !shippingAddressSchema.safeParse(shippingAddress).success) {
      setMessage(t('completeTheDeliveryAddressBeforePayment')); return;
    }
    if (intent?.transactionID) { setMessage(t('checkTheSavedAttemptBeforeMakingAnotherPayment')); return; }
    const attempt = intent ?? { version: 1 as const, attemptID: crypto.randomUUID(), cartID: String(cartID) };
    if (attempt.cartID !== String(cartID) || !attempt.attemptID) throw new Error("Cart changed");
    saveIntent(attempt); // Same preparation ID survives a lost response; no silent new charge.
    const prepared = preparedSchema.parse(await initiatePayment("portone", { additionalData: { shippingAddress, attemptID: attempt.attemptID } }));
    const retained = { ...attempt, transactionID: prepared.transactionID, paymentID: prepared.paymentID };
    saveIntent(retained);
    if (prepared.outcome !== "prepared" || !prepared.paymentRequest) { setMessage(t('anExistingAttemptWasFoundCheckItsStatusBefore')); return; }
    await openSDK(retained, prepared.paymentRequest);
  }
  async function run(action: "start" | "check" | "resume" | "retire") {
    if (pending.current || busy || !user || stored === undefined || stored === null || orderID) return;
    if ((action === "resume" || action === "retire") && discovery.attempts.some((attempt) =>
      attempt.transactionID === intent?.transactionID && (attempt.reviewHold || attempt.resolutionConflict))) {
      setMessage(t('thisPaymentNeedsReviewContactSupportBeforeTryingAgain')); return;
    }
    if (stored && !intent) { setMessage(t('savedPaymentInformationCouldNotBeReadDoNot')); return; }
    if (!navigator.locks) { setMessage(t('thisBrowserCannotSafelyOpenPaymentUseACurrent')); return; }
    pending.current = true; setBusy(true); onBusyChange?.(true); setMessage("");
    try {
      await navigator.locks.request("sphmrs:commerce-payment:" + user.id, { ifAvailable: true }, async (lock) => {
        if (!lock) { setMessage(t('paymentIsOpenInAnotherTabFinishOrCheck')); return; }
        // Check the canonical account immediately before displaying any payment UI.
        const accountResponse = await fetch("/api/users/me?depth=0&select[id]=true", { credentials: "include", cache: "no-store" });
        const account = z.object({ user: z.object({ id: z.union([identifier, z.number()]) }) }).parse(await accountResponse.json());
        if (!accountResponse.ok || String(account.user.id) !== String(user.id)) throw new Error("Account changed");
        if (!active.current) return;
        if (action === "retire") {
          if (!intent?.transactionID || !intent.paymentID || retirableTransactionID !== intent.transactionID) throw new Error("Missing failed attempt");
          const response = await fetch("/api/payments/portone/retire", { method: "POST", credentials: "include", cache: "no-store",
            headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transactionID: intent.transactionID, paymentID: intent.paymentID }) });
          if (!response.ok) throw new Error("Retirement unavailable");
          const result = retiredSchema.parse(await response.json());
          if (result.transactionID !== intent.transactionID || result.paymentID !== intent.paymentID) throw new Error("Retirement mismatch");
          clearMatchingIntent(intent);
          if (!active.current) return;
          setRetirableTransactionID(null); setDiscoveryRetry((value) => value + 1);
          setMessage(t('attemptCancelledYouCanChoosePaymentAgain'));
          try { await refreshCart(); }
          catch { if (active.current) setMessage(t('attemptCancelledReloadToRefreshYourCartBeforePaying')); }
          return;
        }
        if (action === "check") { if (!intent) throw new Error("Missing attempt"); await confirm(intent); return; }
        if (action === "resume") { await resumePayment(); return; }
        await preparePayment();
      });
    } catch {
      if (active.current) setMessage(t('paymentCouldNotBeConfirmedYourAttemptIsRetained'));
    } finally {
      pending.current = false;
      if (active.current) { setBusy(false); onBusyChange?.(false); }
    }
  }
  const retained = Boolean(intent?.transactionID);
  const reviewHold = discovery.attempts.some((attempt) => attempt.transactionID === intent?.transactionID && (attempt.reviewHold || attempt.resolutionConflict));
  const unavailable = busy || !user || stored === undefined || stored === null || Boolean(stored && !intent) || Boolean(orderID);
  return <section aria-label={t('payment')} className="space-y-3">
    {!retained && discovery.attempts.length > 0 && <div className="space-y-2"><h3 className="text-sm font-medium">{t('existingPaymentAttempts')}</h3>
      {discovery.attempts.map((attempt) => <button key={attempt.transactionID} type="button" disabled={unavailable}
        onClick={() => { try { saveIntent({ version: 1, cartID: attempt.cartID, transactionID: attempt.transactionID, paymentID: attempt.paymentID }); setMessage(""); } catch { setMessage(t('paymentNeedsBrowserStorageEnableItAndReload')); } }}
        className="flex min-h-12 w-full items-center justify-between gap-4 rounded-xl border border-white/25 px-4 py-3 text-left text-sm disabled:opacity-40">
        <span>{attempt.quantity} {attempt.quantity === 1 ? t('coin') : t('coins')} · {attempt.totalAmount.toLocaleString("ko-KR")} KRW <span className="block text-xs text-neutral-500">{t('referenceEnding')}{attempt.paymentID.slice(-6)}</span></span><span>{attempt.reviewHold || attempt.resolutionConflict ? t('reviewNeeded') : t('viewAttempt')}</span>
      </button>)}
    </div>}
    {!recovery && !retained && !orderID && <button type="button" disabled={unavailable || disabled || !cartID || discovery.state !== "ready" || discovery.attempts.length > 0} onClick={() => void run("start")}
      className="min-h-12 w-full rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition-opacity hover:opacity-85 disabled:opacity-40">{busy ? t('preparing') : t('payByCard')}</button>}
    {retained && !orderID && <div className="grid gap-3 sm:grid-cols-2">
      <button type="button" disabled={unavailable} onClick={() => void run("check")} className="min-h-12 rounded-xl bg-white px-4 py-3 text-sm font-medium text-black disabled:opacity-40">{busy ? t('checking') : t('checkPayment')}</button>
      <button type="button" disabled={unavailable || reviewHold} onClick={() => void run("resume")} className="min-h-12 rounded-xl border border-white/25 px-4 py-3 text-sm disabled:opacity-40">{t('resumeSamePayment')}</button>
      {retirableTransactionID === intent?.transactionID && <button type="button" disabled={unavailable || reviewHold} onClick={() => void run("retire")} className="min-h-12 rounded-xl border border-white/25 px-4 py-3 text-sm disabled:opacity-40">{t('cancelThisAttempt')}</button>}
    </div>}
    <p role="status" aria-live="polite" className="min-h-10 text-sm leading-5 text-neutral-400">{message || (stored === null ? t('paymentNeedsBrowserStorageEnableItAndReload') : stored && !intent ? t('savedPaymentInformationIsUnreadableContactSupportBeforeMaking') : reviewHold ? t('thisPaymentNeedsReviewContactSupportBeforeTryingAgain') : discovery.state === "error" ? t('existingPaymentsCouldNotBeCheckedTryAgainBefore') : recovery && !intent && discovery.state === "ready" && !discovery.attempts.length ? t('noUnresolvedPaymentAttemptWasFoundForThisAccount') : retained ? t('aPaymentAttemptIsSavedNothingWillReopenAutomatically') : discovery.state === "loading" ? t('checkingExistingPayments') : "")}</p>
    {discovery.state === "error" && <button type="button" onClick={() => setDiscoveryRetry((value) => value + 1)} className="min-h-12 rounded-xl border border-white/25 px-4 py-3 text-sm">{t('retryPaymentLookup')}</button>}
    {orderID && <><p className="break-all text-xs text-neutral-400">{t('orderReference')}{orderID}</p><Link href={"/shop/orders/" + orderID} className="inline-flex min-h-12 items-center text-sm underline underline-offset-4">{t('manageGuestAdmissions')}</Link></>}
  </section>;
}
