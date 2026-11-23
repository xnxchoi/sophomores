"use client";

import { ArcRoles } from "./arc-roles";
import { ConfirmMorph } from "@/components/arc/confirm-morph/confirm-morph";
import { ToastStack, ToastStackProvider, useToastStack } from "@/components/arc/toast-stack/toast-stack";
import { useTranslations } from "next-intl";


import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useCart, useEcommerce, usePayments } from "@payloadcms/plugin-ecommerce/client/react";
import { requestPayment as portOneRequestPayment, type PaymentRequest } from "@portone/browser-sdk/v2";
import { z } from "zod";
import { shippingAddressSchema, type ShippingAddress } from "@/lib/commerce/contracts";
import { providerPaymentId } from "@/lib/tickets/portone/payment-id";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { ActionButton, CopyButton } from "@/components/core/ArcFocus/ArcFocus";

const identifier = z.string().min(1).max(128);
/** Thrown after every Pay press so the action button returns to idle rather than showing success. */
const settled = new Error("Payment step settled");
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
const terminalSchema = z.object({ outcome: z.literal("local-terminal"), status: z.enum(["failed", "cancelled", "refunded"]) });
const pendingSchema = z.object({ attempts: z.array(z.object({ transactionID: z.uuid(), paymentID: providerPaymentId,
  cartID: identifier, productID: identifier, quantity: z.int().min(1).max(3), totalAmount: z.int().positive(), currency: z.literal("KRW"),
  status: z.string().max(40), reviewHold: z.boolean(), resolutionConflict: z.boolean().default(false),
  orderName: z.string().max(200).nullable().default(null) })).max(100) });
type PaymentIntent = z.infer<typeof intentSchema>;

type CommercePaymentProps = {
  shippingAddress?: ShippingAddress; disabled?: boolean; recovery?: boolean;
  onBusyChange?: (busy: boolean) => void; onAttemptChange?: (retained: boolean) => void;
  requestPayment?: typeof portOneRequestPayment;
  productID?: string;
};

/** Payment failures show as toasts (owner, for payment failures only); confirmed and cancelled results stay inline. */
export function CommercePayment(props: CommercePaymentProps) {
  const t = useTranslations('Customer.components_commerce_payment');
  return <ArcRoles><ToastStackProvider><PaymentPanel {...props} /><ToastStack label={t('paymentUpdates')} position="bottom-center" /></ToastStackProvider></ArcRoles>;
}

/** No shipping, customer details, cart secrets or SDK requests are stored in browser storage. */
function PaymentPanel({ shippingAddress, disabled = false, onBusyChange, onAttemptChange, recovery = false, productID, requestPayment = portOneRequestPayment }: CommercePaymentProps) {
  const t = useTranslations('Customer.components_commerce_payment');
  const { toast } = useToastStack();
  const fail = (title: string) => { toast({ type: "error", title }); };
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
  // Recovery after a lost response (e.g. a retire that landed before a reload). Auth's rule: clear the saved attempt only after
  // the server confirms terminal evidence for the same transactionID and paymentID; never on a lost response, a timeout or a
  // non-matching id. This applies the strictest part of it: /result must answer local-terminal for exactly the saved pair, and
  // clearMatchingIntent re-checks the pair at clear time. Every other outcome, error or abort keeps the attempt.
  const savedTransactionID = intent?.transactionID, savedPaymentID = intent?.paymentID, savedCartID = intent?.cartID;
  useEffect(() => {
    if (!savedTransactionID || !savedPaymentID || !savedCartID || discovery.state !== "ready" || orderID) return;
    const saved = { version: 1 as const, cartID: savedCartID, transactionID: savedTransactionID, paymentID: savedPaymentID };
    const abort = new AbortController();
    const query = new URLSearchParams({ transactionID: savedTransactionID, paymentID: savedPaymentID, cartID: savedCartID });
    void fetch("/api/payments/portone/result?" + query.toString(), { credentials: "include", cache: "no-store", signal: abort.signal })
      .then(async (response) => { if (!response.ok) return null; const parsed = terminalSchema.safeParse(await response.json()); return parsed.success ? parsed.data.status : null; })
      .then((status) => {
        if (!status || abort.signal.aborted || !active.current) return;
        // Only the tab whose matching saved attempt was cleared reports the outcome; a newer attempt is kept and stays quiet.
        if (!clearMatchingIntent(saved)) return;
        setRetirableTransactionID(null); setDiscoveryRetry((value) => value + 1);
        setMessage(status === "cancelled" ? t('attemptCancelledYouCanChoosePaymentAgain') : status === "refunded" ? t('attemptRefundedYouCanPayAgain') : t('attemptFailedYouCanPayAgain'));
      })
      .catch(() => {});
    return () => abort.abort();
  }, [savedTransactionID, savedPaymentID, savedCartID, discovery.state, orderID]);

  function saveIntent(value: PaymentIntent) {
    if (!storageKey) throw new Error("Account unavailable");
    const intent = intentSchema.parse(value);
    window.sessionStorage.setItem(storageKey, JSON.stringify(intent));
    window.dispatchEvent(new Event("commerce-payment-update"));
  }
  // Feature-local storage ownership: never clear a newer concurrently saved attempt.
  /** Returns true only when the saved attempt was this exact one and is now cleared. */
  function clearMatchingIntent(value: PaymentIntent): boolean {
    if (!storageKey) return false;
    const saved = window.sessionStorage.getItem(storageKey);
    const current = saved ? intentSchema.safeParse(JSON.parse(saved)) : null;
    if (current?.success && current.data.transactionID === value.transactionID
      && current.data.paymentID === value.paymentID && current.data.cartID === value.cartID) {
      window.sessionStorage.removeItem(storageKey);
      window.dispatchEvent(new Event("commerce-payment-update"));
      return true;
    }
    return false;
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
    catch { fail(t('paymentIsNotConfirmedCheckThisAttemptBeforeTrying')); }
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
      fail(t('thisPaymentFailedCancelThisAttemptBeforeStartingAnother'));
      return;
    }
    if (resumed.outcome !== "resumable" || !resumed.paymentRequest) { fail(t('thisAttemptCannotBeReopenedCheckPaymentStatusOr')); return; }
    await openSDK(intent, resumed.paymentRequest);
  }
  async function preparePayment() {
    if (discovery.state !== "ready" || discovery.attempts.length) { fail(t('resolveTheExistingPaymentAttemptBeforeStartingAnother')); return; }
    if (disabled || !cartID || !shippingAddress || !shippingAddressSchema.safeParse(shippingAddress).success) {
      fail(t('completeTheDeliveryAddressBeforePayment')); return;
    }
    if (intent?.transactionID) { fail(t('checkTheSavedAttemptBeforeMakingAnotherPayment')); return; }
    const attempt = intent ?? { version: 1 as const, attemptID: crypto.randomUUID(), cartID: String(cartID) };
    if (attempt.cartID !== String(cartID) || !attempt.attemptID) throw new Error("Cart changed");
    saveIntent(attempt); // Same preparation ID survives a lost response; no silent new charge.
    const prepared = preparedSchema.parse(await initiatePayment("portone", { additionalData: { shippingAddress, attemptID: attempt.attemptID } }));
    const retained = { ...attempt, transactionID: prepared.transactionID, paymentID: prepared.paymentID };
    saveIntent(retained);
    if (prepared.outcome !== "prepared" || !prepared.paymentRequest) { fail(t('anExistingAttemptWasFoundCheckItsStatusBefore')); return; }
    await openSDK(retained, prepared.paymentRequest);
  }
  /** Resolves true only when a retire landed; every failure has already shown its toast. */
  async function run(action: "start" | "check" | "resume" | "retire"): Promise<boolean> {
    let retired = false;
    if (pending.current || busy || !user || stored === undefined || stored === null || orderID) return false;
    if ((action === "resume" || action === "retire") && discovery.attempts.some((attempt) =>
      attempt.transactionID === intent?.transactionID && (attempt.reviewHold || attempt.resolutionConflict))) {
      fail(t('thisPaymentNeedsReviewContactSupportBeforeTryingAgain')); return false;
    }
    if (stored && !intent) { fail(t('savedPaymentInformationCouldNotBeReadDoNot')); return false; }
    if (!navigator.locks) { fail(t('thisBrowserCannotSafelyOpenPaymentUseACurrent')); return false; }
    pending.current = true; setBusy(true); onBusyChange?.(true); setMessage("");
    try {
      await navigator.locks.request("sphmrs:commerce-payment:" + user.id, { ifAvailable: true }, async (lock) => {
        if (!lock) { fail(t('paymentIsOpenInAnotherTabFinishOrCheck')); return; }
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
          retired = true;
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
      if (active.current) fail(t('paymentCouldNotBeConfirmedYourAttemptIsRetained'));
    } finally {
      pending.current = false;
      if (active.current) { setBusy(false); onBusyChange?.(false); }
    }
    return retired;
  }
  const retained = Boolean(intent?.transactionID);
  const reviewHold = discovery.attempts.some((attempt) => attempt.transactionID === intent?.transactionID && (attempt.reviewHold || attempt.resolutionConflict));
  const unavailable = busy || !user || stored === undefined || stored === null || Boolean(stored && !intent) || Boolean(orderID);
  return <section aria-label={t('payment')} className="space-y-6 text-foreground">
    <header className="border-b border-border pb-4"><h2 className="text-xl">{t('payment')}</h2></header>
    <p role="status" aria-live="polite" className="min-h-10 max-w-prose empty:hidden text-sm leading-relaxed wrap-anywhere text-foreground">{message || (stored === null ? t('paymentNeedsBrowserStorageEnableItAndReload') : stored && !intent ? t('savedPaymentInformationIsUnreadableContactSupportBeforeMaking') : reviewHold ? t('thisPaymentNeedsReviewContactSupportBeforeTryingAgain') : discovery.state === "error" ? t('existingPaymentsCouldNotBeCheckedTryAgainBefore') : recovery && !intent && discovery.state === "ready" && !discovery.attempts.length ? t('noUnresolvedPaymentAttemptWasFoundForThisAccount') : retained ? t('aPaymentAttemptIsSavedNothingWillReopenAutomatically') : discovery.state === "loading" ? t('checkingExistingPayments') : "")}</p>
    {!retained && discovery.attempts.length > 0 && <div><h3 className="pb-3 text-base">{t('existingPaymentAttempts')}</h3>
      {discovery.attempts.map((attempt) => <button key={attempt.transactionID} type="button" disabled={unavailable}
        onClick={() => { try { saveIntent({ version: 1, cartID: attempt.cartID, transactionID: attempt.transactionID, paymentID: attempt.paymentID }); setMessage(""); } catch { fail(t('paymentNeedsBrowserStorageEnableItAndReload')); } }}
        className="grid min-h-12 w-full grid-cols-1 items-center gap-x-4 gap-y-2 border-t border-border py-4 last:border-b sm:grid-cols-[minmax(0,1fr)_auto] text-left text-sm outline-offset-4 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-foreground disabled:opacity-40">
        <span className="min-w-0 tabular-nums">{attempt.orderName && <span className="mb-1 block font-medium wrap-anywhere">{attempt.orderName}</span>}{attempt.totalAmount.toLocaleString("ko-KR")} KRW <span className="mt-1 block wrap-anywhere text-xs text-muted-foreground">{t('referenceEnding')}{attempt.paymentID.slice(-6)}</span></span><span className="font-medium">{attempt.reviewHold || attempt.resolutionConflict ? t('reviewNeeded') : t('viewAttempt')}</span>
      </button>)}
    </div>}
    {/* Always settles back to idle: a confirmed payment replaces this button with the order, so it never shows a success state. */}
    {!recovery && !retained && !orderID && <ActionButton label={t('payByCard')} pendingLabel={t('preparing')} successLabel={t('payByCard')} resetAfterMs={0}
      disabled={(unavailable && !busy) || disabled || !cartID || discovery.state !== "ready" || discovery.attempts.length > 0}
      onAction={async () => { await run("start"); throw settled; }} onActionError={() => {}} />}
    {retained && !orderID && <div className="grid gap-3">
      <button type="button" disabled={unavailable} onClick={() => void run("check")} className="h-10 rounded-full border border-foreground bg-transparent px-5 text-[13px] uppercase tracking-[0.04em] text-foreground outline-offset-4 transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 focus-visible:outline-foreground disabled:opacity-40 pointer-coarse:h-11">{busy ? t('checking') : t('checkPayment')}</button>

      <button type="button" disabled={unavailable || reviewHold} onClick={() => void run("resume")} className="inline-flex min-h-11 items-center text-xs uppercase tracking-[0.04em] underline decoration-dotted underline-offset-4 outline-offset-4 hover:decoration-solid focus-visible:outline-2 disabled:opacity-40">{t('resumeSamePayment')}</button>
      {/* Cancelling retires the attempt for good, so it asks first and offers no undo. Its own row, so the question has room. */}
      {retirableTransactionID === intent?.transactionID && <ConfirmMorph className="justify-self-start" label={t('cancelThisAttempt')} prompt={t('cancelThisAttemptQuestion')} confirmLabel={t('cancelAttempt')}
        cancelLabel={t('keepAttempt')} pendingLabel={t('cancellingAttempt')} doneLabel={t('attemptCancelled')} errorLabel={t('couldNotCancelAttempt')} retryLabel={t('tryAgain')}
        disabled={unavailable || reviewHold} onConfirm={async () => { if (!(await run("retire"))) throw new Error("Attempt not cancelled"); }} />}
    </div>}

    {discovery.state === "error" && <button type="button" onClick={() => setDiscoveryRetry((value) => value + 1)} className="min-h-12 rounded-full border border-border bg-background px-5 py-3 text-sm outline-offset-4 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-foreground">{t('retryPaymentLookup')}</button>}
    {orderID && <div className="space-y-3 border-t border-border pt-4"><div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p className="min-w-0 text-sm leading-relaxed text-muted-foreground">
        {t('orderReference')}<span className="wrap-anywhere tabular-nums">{orderID}</span>
      </p>
      <CopyButton value={orderID} label={t('copyOrderReference')} className="min-h-12!" />
    </div><div className="flex flex-wrap items-center gap-x-6 gap-y-2"><Link href={"/me/orders/" + orderID} prefetch={false} className="inline-flex min-h-12 items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background outline-offset-4 transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-foreground">{t('viewOrder')}</Link><Link href={"/shop/orders/" + orderID} className="group/focus inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 hover:decoration-current"><FocusShape className="outline-offset-4 group-focus-visible/focus:outline-foreground">{t('manageGuestAdmissions')}</FocusShape></Link></div></div>}
  </section>;
}
