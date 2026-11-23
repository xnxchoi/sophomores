"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useTranslations } from "next-intl";
import { receiptDeliverySchema } from "@/lib/commerce/receipt/delivery";
import { subscribeVisibility } from "@/utils/browser/visibility";

type Delivery = ReturnType<typeof receiptDeliverySchema.parse>;

export function ReceiptDelivery({ orderID, principal }: { orderID: string; principal: string }) {
  const t = useTranslations("Customer.components_commerce_orders");
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  useEffect(() => {
    let blurred = false;
    let pending: AbortController | undefined;
    const discard = () => { pending?.abort(); pending = undefined; };
    const load = async () => {
      if (blurred || document.visibilityState !== "visible" || pending) return;
      const request = new AbortController();
      pending = request;
      try {
        const response = await fetch("/api/invoice/delivery?order=" + encodeURIComponent(orderID), {
          credentials: "same-origin", cache: "no-store", signal: request.signal,
          headers: { "x-receipt-principal": principal },
        });
        if (!response.ok) return;
        const parsed = receiptDeliverySchema.safeParse(await response.json());
        if (parsed.success && pending === request && document.visibilityState === "visible") setDelivery(parsed.data);
      } catch {
        // No private data is shown after a failed or abandoned read.
      } finally {
        if (pending === request) pending = undefined;
      }
    };
    const conceal = () => {
      discard();
      // Clear before the browser can freeze a document in its back/forward cache.
      flushSync(() => setDelivery(null));
    };
    const reveal = () => { void load(); };
    const onBlur = () => { blurred = true; conceal(); };
    const onFocus = () => { blurred = false; reveal(); };
    const unsubscribe = subscribeVisibility(() => {
      if (document.visibilityState === "visible") reveal();
      else conceal();
    });
    const onRestore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      conceal();
      reveal();
    };
    window.addEventListener("pagehide", conceal);
    window.addEventListener("pageshow", onRestore);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    reveal();
    return () => {
      discard();
      unsubscribe();
      window.removeEventListener("pagehide", conceal);
      window.removeEventListener("pageshow", onRestore);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [orderID, principal]);

  if (!delivery) return null;
  const { address, fulfillment } = delivery;
  return <section>
    <h3 className="text-xl">{t("delivery")}</h3>
    <address className="mt-3 space-y-1 text-sm leading-relaxed not-italic [overflow-wrap:anywhere]">
      <p>{address.recipientName}</p><p>{address.phone}</p><p>{address.addressLine1}</p>
      {address.addressLine2 && <p>{address.addressLine2}</p>}
      <p>{address.postalCode}, {address.country}</p>
    </address>
    {fulfillment?.status && <p className="mt-4 text-sm">{t("deliveryStatus", { status: t(`fulfillment.${fulfillment.status}`) })}</p>}
    {fulfillment?.carrier && <p className="mt-2 text-sm [overflow-wrap:anywhere]">{t("carrier", { carrier: fulfillment.carrier })}</p>}
    {fulfillment?.trackingNumber && <p className="mt-2 text-sm [overflow-wrap:anywhere]">{t("tracking", { number: fulfillment.trackingNumber })}</p>}
  </section>;
}
