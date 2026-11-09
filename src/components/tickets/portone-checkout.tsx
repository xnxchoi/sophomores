"use client";
import { useTranslations } from "next-intl";


import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { requestPayment as portOneRequestPayment, type PaymentRequest } from "@portone/browser-sdk/v2";
import { z } from "zod";
import { providerPaymentId } from "@/lib/tickets/portone/payment-id";
import { checkoutIntentKey, checkoutIntentSchema, type CheckoutIntent } from "./_shared/checkout-intent";

const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
// Zod strips unapproved fields; only canonical server customer fields reach the SDK.
const preparation = z.object({
  success: z.literal(true),
  data: z.object({
    storeId: identifier,
    channelKey: identifier,
    paymentId: providerPaymentId,
    orderName: z.string().trim().min(1).max(256),
    totalAmount: z.int().positive(),
    currency: z.enum(["KRW", "USD"]),
    redirectUrl: z.url(),
    customer: z.object({ customerId: identifier, email: z.email().optional(), fullName: z.string().trim().min(1).max(128).optional() }),
    recovered: z.boolean(),
  }),
});
type Props = {
  quantity: number;
  disabled?: boolean;
  recoveryDisabled?: boolean;
  unavailableFallback?: React.ReactNode;
  onBusyChange?: (busy: boolean, quantity?: number, order?: CheckoutIntent["order"]) => void;
  requestPayment?: typeof portOneRequestPayment;
  onNavigate?: (url: string) => void;
};

export function PortOneCheckoutButton({ quantity, disabled = true, recoveryDisabled = disabled, unavailableFallback, onBusyChange, requestPayment = portOneRequestPayment, onNavigate }: Props) {
  const t = useTranslations('Customer.components_tickets_portone_checkout');
  const [phase, setPhase] = useState<"opening" | "recovering" | null>(null);
  const busy = phase !== null;
  // Primitive snapshots remain stable until Storage changes; undefined is the
  // shared server/hydration snapshot, false means absent, null means denied.
  const stored = useSyncExternalStore(useCallback((notify) => {
    window.addEventListener("storage", notify);
    window.addEventListener("focus", notify);
    return () => { window.removeEventListener("storage", notify); window.removeEventListener("focus", notify); };
  }, []), useCallback(() => {
    try { return window.sessionStorage.getItem(checkoutIntentKey) ?? false; }
    catch { return null; }
  }, []), () => undefined);
  const restoredIntent = useMemo(() => {
    if (typeof stored !== "string" || stored.length > 2048) return null;
    try { return checkoutIntentSchema.parse(JSON.parse(stored)); }
    catch { return null; }
  }, [stored]);
  const [updatedIntent, setIntent] = useState<CheckoutIntent | null>(null);
  const intent = updatedIntent ?? restoredIntent;
  const preparedOrder = intent?.order ?? null;
  const storageReady = stored !== undefined;
  const [writeBlocked, setStorageBlocked] = useState(false);
  const storageBlocked = writeBlocked || stored === null || (typeof stored === "string" && !restoredIntent);
  const [message, setMessage] = useState<string | null>(null);
  const feedback = message ?? (storageBlocked ? t('checkoutNeedsBrowserStorageEnableItAndReload') : null);
  const active = useRef(true);
  const button = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const pending = useRef(false);
  const retainedIntent = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const busyChange = useRef(onBusyChange);

  useEffect(() => { busyChange.current = onBusyChange; }, [onBusyChange]);

  useEffect(() => {
    if (busy || !restoreFocus.current) return;
    restoreFocus.current = false;
    if (document.activeElement === document.body || document.activeElement === button.current) button.current?.focus();
  }, [busy]);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      restoreFocus.current = false;
      controller.current?.abort();
      if (pending.current || retainedIntent.current) busyChange.current?.(false);
      pending.current = false;
      retainedIntent.current = false;
    };
  }, []);

  useEffect(() => {
    if (!intent || retainedIntent.current) return;
    // Native Storage/JSON and Zod own this record. The selection draft's
    // automatic expiry cannot safely retire an unresolved payment intent.
    retainedIntent.current = true;
    busyChange.current?.(true, intent.quantity, intent.order);
  }, [intent]);

  async function checkout() {
    // Replaying a retained attempt is not a new sale, even before its payment ID is known.
    if (pending.current || (preparedOrder ? recoveryDisabled : (intent ? recoveryDisabled : disabled) || !storageReady || storageBlocked
      || (!intent && (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 6)))) return;
    if (preparedOrder) {
      const url = `/tickets/payment?paymentId=${encodeURIComponent(preparedOrder.paymentId)}`;
      if (onNavigate) onNavigate(url);
      else {
        // Reload the canonical server/session boundary, matching mobile SDK redirects.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign(url);
      }
      return;
    }
    let nextIntent: CheckoutIntent;
    const recoveryOnly = intent !== null;
    try {
      const raw = window.sessionStorage.getItem(checkoutIntentKey);
      // Another mounted caller may have begun a checkout since this one hydrated.
      // Adopt it, rather than overwriting its financial intent with a fresh key.
      if (raw !== null && !intent) {
        if (raw.length > 2048) throw new Error("Invalid checkout record");
        const restored = checkoutIntentSchema.parse(JSON.parse(raw));
        retainedIntent.current = true;
        setIntent(restored);
        busyChange.current?.(true, restored.quantity, restored.order);
        return;
      }
      nextIntent = intent ?? checkoutIntentSchema.parse({ schemaVersion: 1, attemptId: window.crypto.randomUUID(), quantity });
      window.sessionStorage.setItem(checkoutIntentKey, JSON.stringify(nextIntent));
      retainedIntent.current = true;
      setIntent(nextIntent);
    } catch {
      setStorageBlocked(true);
      setMessage(t('checkoutNeedsBrowserStorageEnableItAndReload'));
      return;
    }
    pending.current = true;
    restoreFocus.current = true;
    setPhase(recoveryOnly ? "recovering" : "opening");
    setMessage(null);
    busyChange.current?.(true, nextIntent.quantity);
    const abort = new AbortController();
    controller.current = abort;
    let knownPaymentId: string | null = null;
    try {
      const response = await fetch("/api/payments/portone/prepare", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: nextIntent.quantity, attemptId: nextIntent.attemptId }), signal: AbortSignal.any([abort.signal, AbortSignal.timeout(12_000)]),
      });
      if (!active.current) return;
      if (!response.ok) throw new Error("Payment preparation unavailable");
      const parsed = preparation.safeParse(await response.json());
      if (!active.current) return;
      if (!parsed.success || parsed.data.data.redirectUrl !== `${window.location.origin}/tickets/payment`) throw new Error("Invalid payment preparation");
      const { recovered, ...paymentRequest } = parsed.data.data;
      const request = { ...paymentRequest, payMethod: "CARD" } satisfies PaymentRequest;
      knownPaymentId = request.paymentId;
      const preparedIntent: CheckoutIntent = { ...nextIntent, order: { paymentId: knownPaymentId,
        quantity: nextIntent.quantity, totalAmount: request.totalAmount, currency: parsed.data.data.currency } };
      setIntent(preparedIntent);
      busyChange.current?.(true, preparedIntent.quantity, preparedIntent.order);
      // Persist the reference before the SDK can open or navigate away. A failed
      // write leaves the initial attempt recoverable, but must never open the SDK.
      window.sessionStorage.setItem(checkoutIntentKey, JSON.stringify(preparedIntent));
      if (recoveryOnly || recovered) return;
      if (!navigator.locks) throw new Error("Browser locking unavailable");
      await navigator.locks.request(`sphmrs.portone-payment:${knownPaymentId}`, { mode: "exclusive", ifAvailable: true }, async (lock) => {
        if (!lock || !active.current) throw new Error("Payment already open");
      const result = await requestPayment(request);
      if (!active.current) return;
      if (!result || result.code || result.paymentId !== knownPaymentId) {
        setMessage(t('paymentHasNotBeenConfirmedCheckItsStatusBefore'));
        return;
      }
      const url = `/tickets/payment?paymentId=${encodeURIComponent(knownPaymentId)}`;
      restoreFocus.current = false;
      if (onNavigate) onNavigate(url);
      else {
        // Reload the canonical server/session boundary, matching mobile SDK redirects.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign(url);
      }
      });
    } catch {
      restoreFocus.current = true;
      if (active.current) setMessage(knownPaymentId
        ? t('paymentHasNotBeenConfirmedCheckItsStatusBefore')
        : t('checkoutCouldNotBeOpenedRecoverItBeforeTrying'));
    } finally {
      if (active.current) {
        pending.current = false;
        setPhase(null);
        if (!retainedIntent.current) busyChange.current?.(false);
      }
    }
  }

  if (!intent && unavailableFallback) return unavailableFallback;

  return <div className="space-y-3">
    <button ref={button} type="button" disabled={busy || (preparedOrder ? recoveryDisabled : (intent ? recoveryDisabled : disabled) || !storageReady || storageBlocked || (!intent && (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 6)))}
      aria-busy={busy} onClick={checkout}
      className="min-h-12 w-full rounded-xl bg-neutral-100 px-5 py-3 text-sm font-medium text-neutral-950 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-100 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500">
      {busy ? phase === "recovering" ? t('recoveringCheckout') : t('openingPayment') : preparedOrder ? t('checkPaymentStatus') : storageBlocked || (!intent && disabled) ? t('checkoutUnavailable') : intent ? t('recoverCheckout') : t('payByCard')}
    </button>
    {preparedOrder && <p className="text-sm leading-6 tabular-nums text-neutral-300">{preparedOrder.quantity} {preparedOrder.quantity === 1 ? t('ticket') : t('tickets')} · {new Intl.NumberFormat("en-US", { style: "currency", currency: preparedOrder.currency }).format(preparedOrder.currency === "KRW" ? preparedOrder.totalAmount : preparedOrder.totalAmount / 100)}</p>}
    {feedback && <p role="alert" className="text-sm leading-6 text-neutral-300">{feedback}</p>}
  </div>;
}
