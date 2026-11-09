"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { requestPayment as portOneRequestPayment, type PaymentRequest } from "@portone/browser-sdk/v2";
import { z } from "zod";
import { providerPaymentId, orderIdFromPaymentId } from "@/lib/tickets/portone/payment-id";
import { checkoutIntentKey, checkoutIntentSchema } from "./_shared/checkout-intent";

const paymentReference = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
const completion = z.object({ success: z.literal(true), data: z.object({ orderId: z.uuid(), status: z.enum(["paid", "pending", "cancelled", "refunded", "held"]) }) });
const resumeResponse = z.strictObject({ success: z.literal(true), data: z.discriminatedUnion("outcome", [
  z.strictObject({ outcome: z.literal("status-only") }),
  z.strictObject({ outcome: z.literal("resumable"), request: z.strictObject({
    storeId: paymentReference, channelKey: paymentReference, paymentId: providerPaymentId,
    orderName: z.string().trim().min(1).max(256), totalAmount: z.int().positive(), currency: z.enum(["KRW", "USD"]),
    redirectUrl: z.url(), customer: z.strictObject({ customerId: paymentReference, email: z.email().optional(), fullName: z.string().trim().min(1).max(128).optional() }),
  }) }),
]) });
type Props = { paymentId: string | null; requestPayment?: typeof portOneRequestPayment; onNavigate?: (url: string) => void };
type Status = "checking" | "paid" | "pending" | "cancelled" | "refunded" | "held" | "unavailable";

export function PortOnePaymentResult(props: Props) {
  return <PaymentResult key={props.paymentId} {...props} />;
}

function PaymentResult({ paymentId, requestPayment = portOneRequestPayment, onNavigate }: Props) {
  const [resuming, setResuming] = useState(false);
  const stored = useSyncExternalStore(useCallback((notify) => {
    window.addEventListener("storage", notify);
    window.addEventListener("focus", notify);
    return () => { window.removeEventListener("storage", notify); window.removeEventListener("focus", notify); };
  }, []), useCallback(() => {
    try { return window.sessionStorage.getItem(checkoutIntentKey); }
    catch { return null; }
  }, []), () => null);
  let canResume = false;
  try {
    const saved = stored && stored.length <= 2048 ? checkoutIntentSchema.safeParse(JSON.parse(stored)) : null;
    canResume = Boolean(saved?.success && saved.data.order?.paymentId === paymentId && providerPaymentId.safeParse(paymentId).success);
  } catch { /* Malformed recovery records never authorize a launch. */ }
  const [feedback, setFeedback] = useState<string | null>(null);
  const pending = useRef(false);
  const active = useRef(true);
  const resumeButton = useRef<HTMLButtonElement>(null);
  const resumeAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; resumeAbort.current?.abort(); };
  }, [paymentId]);
  useEffect(() => {
    if (!resuming) {
      if (document.activeElement === document.body || document.activeElement === resumeButton.current) resumeButton.current?.focus();
    }
  }, [resuming, feedback]);

  async function resume() {
    if (pending.current || status === "checking" || !canResume || !paymentId) return;
    pending.current = true;
    setResuming(true);
    setFeedback(null);
    const abort = new AbortController();
    resumeAbort.current = abort;
    try {
      if (!navigator.locks) throw new Error("Browser locking unavailable");
      await navigator.locks.request(`sphmrs.portone-payment:${paymentId}`, { mode: "exclusive", ifAvailable: true }, async (lock) => {
        if (!lock || !active.current) throw new Error("Payment already open");
        const raw = window.sessionStorage.getItem(checkoutIntentKey);
        if (!raw || raw.length > 2048) throw new Error("Original attempt unavailable");
        const saved = checkoutIntentSchema.parse(JSON.parse(raw));
        if (saved.order?.paymentId !== paymentId) throw new Error("Original order mismatch");
        const response = await fetch("/api/payments/portone/resume", {
          method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId, attemptId: saved.attemptId }), signal: AbortSignal.any([abort.signal, AbortSignal.timeout(12_000)]),
        });
        if (!response.ok) throw new Error("Resume unavailable");
        const parsed = resumeResponse.parse(await response.json());
        if (!active.current) return;
        if (parsed.data.outcome !== "resumable") throw new Error("Status only");
        const request = parsed.data.request;
        if (window.sessionStorage.getItem(checkoutIntentKey) !== raw || request.paymentId !== paymentId
          || request.totalAmount !== saved.order.totalAmount || request.currency !== saved.order.currency
          || request.redirectUrl !== `${window.location.origin}/tickets/payment`) throw new Error("Resume mismatch");
        // The server owns customer identity; old retained intents contain no customer PII.
        const result = await requestPayment({ ...request, payMethod: "CARD" } satisfies PaymentRequest);
        if (!active.current) return;
        if (!result || result.code || result.paymentId !== paymentId) throw new Error("Unconfirmed outcome");
        const url = `/tickets/payment?paymentId=${encodeURIComponent(paymentId)}`;
        if (onNavigate) onNavigate(url);
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        else window.location.assign(url);
      });
    } catch {
      if (active.current) setFeedback("Payment has not been confirmed. Check its status.");
    } finally {
      pending.current = false;
      if (active.current) setResuming(false);
    }
  }
  const valid = providerPaymentId.safeParse(paymentId).success;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ paymentId: string | null; status: Status }>({ paymentId, status: "checking" });
  const status = result.paymentId === paymentId ? result.status : "checking";

  useEffect(() => {
    if (!valid || !paymentId) return;
    const confirmedPaymentId = paymentId;
    let active = true;
    const controller = new AbortController();
    async function confirm() {
      try {
        const response = await fetch("/api/payments/portone/complete", {
          method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)]),
        });
        if (!response.ok) throw new Error("Payment confirmation unavailable");
        const parsed = completion.safeParse(await response.json());
        if (!parsed.success || parsed.data.data.orderId !== orderIdFromPaymentId(confirmedPaymentId)) throw new Error("Invalid payment confirmation");
        if (active) {
          setResult({ paymentId, status: parsed.data.data.status });
          if (["paid", "cancelled", "refunded"].includes(parsed.data.data.status)) {
            try {
              const raw = window.sessionStorage.getItem(checkoutIntentKey);
              // Only retire this exact, server-confirmed payment. An unrelated
              // pending intent, malformed record or held result must survive.
              if (raw !== null && raw.length <= 2048) {
                const saved = checkoutIntentSchema.safeParse(JSON.parse(raw));
                if (saved.success && saved.data.order?.paymentId === paymentId) window.sessionStorage.removeItem(checkoutIntentKey);
              }
            } catch { console.warn("Checkout recovery record could not be cleared."); }
          }
        }
      } catch {
        if (active) setResult({ paymentId, status: "unavailable" });
      }
    }
    void confirm();
    return () => { active = false; controller.abort(); };
  }, [paymentId, valid, attempt]);

  return <main className="mx-auto flex min-h-[60svh] w-full max-w-[960px] items-center px-6 py-20 min-[800px]:px-8">
    <section aria-labelledby="payment-heading" className="w-full max-w-lg space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 min-[800px]:p-8">
      <p className="text-xs uppercase tracking-[0.16em] text-neutral-400">Tickets / Payment</p>
      <h1 id="payment-heading" className="text-2xl font-medium tracking-tight text-neutral-100">
        {!valid ? "Payment reference needed" : status === "paid" ? "Payment confirmed" : status === "cancelled" ? "Payment cancelled" : status === "refunded" ? "Payment refunded" : status === "held" ? "Payment needs review" : status === "pending" ? "Payment pending" : status === "unavailable" ? "Unable to confirm payment" : "Checking payment…"}
      </h1>
      <div role="status" aria-live="polite" className="min-h-12 text-sm leading-6 text-neutral-300">
        {feedback ?? (!valid ? "No payment reference was provided." : status === "paid" ? "Your payment has been verified. Keep your payment reference for your records." : status === "cancelled" ? "The server has verified that this payment was cancelled." : status === "refunded" ? "The server has verified that this payment was refunded." : status === "held" ? "This payment needs review before it can be used for admission." : status === "pending" ? "Your payment is still pending. Check its status before resuming." : status === "unavailable" ? "We could not confirm this payment. Check its status before resuming." : "Checking payment status…")}
      </div>
      {valid && <p className="break-all text-xs leading-5 text-neutral-400">Payment reference: {paymentId}</p>}
      {valid && ["checking", "pending", "unavailable"].includes(status) && <button type="button" disabled={status === "checking" || resuming} aria-busy={status === "checking"}
        onClick={() => { setFeedback(null); setResult({ paymentId, status: "checking" }); setAttempt((value) => value + 1); }}
        className="min-h-12 w-full rounded-xl bg-neutral-100 px-5 py-3 text-sm font-medium text-neutral-950 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-100 disabled:cursor-wait disabled:bg-neutral-800 disabled:text-neutral-400">
        {status === "checking" ? "Checking…" : "Check again"}
      </button>}
      {canResume && ["checking", "pending", "unavailable"].includes(status) && <button ref={resumeButton} type="button" disabled={resuming || status === "checking"} aria-busy={resuming} onClick={resume}
        className="min-h-12 w-full rounded-xl border border-neutral-600 px-5 py-3 text-sm font-medium text-neutral-100 transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-100 disabled:cursor-wait disabled:text-neutral-400">
        {resuming ? "Opening payment…" : "Resume payment"}
      </button>}
      <a href="/tickets" className="inline-flex min-h-12 items-center text-sm text-neutral-300 underline decoration-neutral-600 underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-100">Back to tickets</a>
    </section>
  </main>;
}
