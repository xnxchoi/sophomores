"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { checkoutIntentKey, checkoutIntentSchema } from "./_shared/checkout-intent";

const paymentReference = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
const completion = z.object({ success: z.literal(true), data: z.object({ orderId: paymentReference, status: z.enum(["paid", "pending", "cancelled", "refunded", "held"]) }) });
type Status = "checking" | "paid" | "pending" | "cancelled" | "refunded" | "held" | "unavailable";

export function PortOnePaymentResult({ paymentId }: { paymentId: string | null }) {
  return <PaymentResult key={paymentId} paymentId={paymentId} />;
}

function PaymentResult({ paymentId }: { paymentId: string | null }) {
  const valid = paymentReference.safeParse(paymentId).success;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ paymentId: string | null; status: Status }>({ paymentId, status: "checking" });
  const status = result.paymentId === paymentId ? result.status : "checking";

  useEffect(() => {
    if (!valid || !paymentId) return;
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
        if (!parsed.success || parsed.data.data.orderId !== paymentId) throw new Error("Invalid payment confirmation");
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
      <div role="status" aria-live="polite" className="text-sm leading-6 text-neutral-300">
        {!valid ? "No payment reference was provided." : status === "paid" ? "Your payment has been verified. Keep your payment reference for your records." : status === "cancelled" ? "The server has verified that this payment was cancelled." : status === "refunded" ? "The server has verified that this payment was refunded." : status === "held" ? "This payment needs review before it can be used for admission." : status === "pending" ? "Your payment is still pending. Check again before starting another payment." : status === "unavailable" ? "We could not confirm this payment. Check again before starting another payment." : "Confirming the payment with the server. This page alone is not proof of payment."}
      </div>
      {valid && <p className="break-all text-xs leading-5 text-neutral-400">Payment reference: {paymentId}</p>}
      {valid && ["checking", "pending", "unavailable"].includes(status) && <button type="button" disabled={status === "checking"} aria-busy={status === "checking"}
        onClick={() => { setResult({ paymentId, status: "checking" }); setAttempt((value) => value + 1); }}
        className="min-h-12 w-full rounded-xl bg-neutral-100 px-5 py-3 text-sm font-medium text-neutral-950 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-100 disabled:cursor-wait disabled:bg-neutral-800 disabled:text-neutral-400">
        {status === "checking" ? "Checking…" : "Check again"}
      </button>}
      <a href="/tickets" className="inline-flex min-h-12 items-center text-sm text-neutral-300 underline decoration-neutral-600 underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-100">Back to tickets</a>
    </section>
  </main>;
}
