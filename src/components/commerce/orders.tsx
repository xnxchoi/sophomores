"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import { Link } from "@/components/core/Link/Link";
import { commerceSnapshotSchema } from "@/lib/commerce/contracts";

const orderRecordSchema = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime({ offset: true }),
  status: z.enum(["processing", "completed", "cancelled", "refunded", "pending", "paid", "held"]).nullish(),
  amount: z.int().min(0).nullish(),
  totalAmount: z.int().min(0).nullish(),
  currency: z.enum(["KRW", "USD"]).nullish(),
  commerceVersion: z.enum(["legacy", "commerce-v1"]).nullish(),
  commerceSnapshot: z.unknown().optional(),
  fulfillment: z.object({
    status: z.enum(["pending", "packed", "shipped", "delivered", "return-requested", "returned"]).nullish(),
    carrier: z.string().nullish(),
    trackingNumber: z.string().nullish(),
    shippedAt: z.iso.datetime({ offset: true }).nullish(),
    deliveredAt: z.iso.datetime({ offset: true }).nullish(),
  }).nullish(),
});
const orderPageSchema = z.object({
  docs: z.array(orderRecordSchema).max(10),
  page: z.int().min(1),
  totalPages: z.int().min(0),
  totalDocs: z.int().min(0),
  hasNextPage: z.boolean(),
});
type OrderRecord = z.infer<typeof orderRecordSchema>;
type OrderRead =
  | { kind: "loading"; requestKey: string }
  | { kind: "error"; requestKey: string; status?: number }
  | { kind: "ready"; requestKey: string; result: z.infer<typeof orderPageSchema> };

/** Reads the existing owner-filtered collection API; no payment or order mutation lives here. */
export function CommerceOrders({ customerID, orderID }: { customerID: string; orderID?: string }) {
  const t = useTranslations("Customer.components_commerce_orders");
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [pagination, setPagination] = useState<{ totalPages: number; hasNextPage: boolean } | null>(null);
  const requestKey = JSON.stringify([customerID, orderID, page, retry]);
  const [state, setState] = useState<OrderRead>({ kind: "loading", requestKey });
  useEffect(() => {
    const abort = new AbortController();
    const query = new URLSearchParams({ depth: "0", limit: orderID ? "1" : "10", page: String(page), sort: "-createdAt" });
    query.set("where[or][0][customer][equals]", customerID);
    query.set("where[or][1][user][equals]", customerID);
    if (orderID) query.set("where[id][equals]", orderID);
    for (const field of ["id", "createdAt", "status", "amount", "totalAmount", "currency", "commerceVersion"]) query.set(`select[${field}]`, "true");
    if (orderID) {
      query.set("select[commerceSnapshot]", "true");
      query.set("select[fulfillment]", "true");
    }
    setState({ kind: "loading", requestKey });
    void (async () => {
      try {
        const response = await fetch("/api/orders?" + query, { credentials: "include", cache: "no-store", signal: abort.signal });
        if (!response.ok) {
          if (!abort.signal.aborted) setState({ kind: "error", requestKey, status: response.status });
          return;
        }
        const result = orderPageSchema.parse(await response.json());
        if (!abort.signal.aborted && document.visibilityState !== "hidden") {
          setState({ kind: "ready", requestKey, result });
          setPagination({ totalPages: result.totalPages, hasNextPage: result.hasNextPage });
        }
      } catch {
        if (!abort.signal.aborted) setState({ kind: "error", requestKey });
      }
    })();
    return () => abort.abort();
  }, [customerID, orderID, page, requestKey]);
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") setState((previous) => ({ kind: "loading", requestKey: previous.requestKey }));
      else setRetry((value) => value + 1);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  const loading = state.requestKey !== requestKey || state.kind === "loading";
  const ready = state.requestKey === requestKey && state.kind === "ready";
  return <section aria-label={orderID ? t("orderRecord") : t("history")} aria-busy={loading} className="space-y-8">
    {loading && <p role="status" className="py-8 text-sm text-muted-foreground">{t("loading")}</p>}
    {!loading && state.kind === "error" && <div className="rounded-xl border border-border p-6">
      <h2 className="font-heading text-2xl">{t("unavailable")}</h2>
      <p role="status" className="mt-4 text-sm leading-relaxed text-muted-foreground">{state.status === 401 ? t("authenticationRequired") : state.status === 403 ? t("accessUnavailable") : state.status === 429 ? t("rateLimited") : t("readFailed")}</p>
      {state.status === 401 && <Link href="/account?next=/me/orders" className="mt-4 inline-flex min-h-12 items-center text-sm underline underline-offset-4 outline-offset-4 focus-visible:outline-2">{t("signIn")}</Link>}
    </div>}
    {ready && (orderID ? state.result.docs[0] ? <OrderRecordView order={state.result.docs[0]} customerID={customerID} />
      : <p role="status" className="py-8 text-sm leading-relaxed text-muted-foreground">{t("orderUnavailable")}</p>
      : state.result.docs.length ? <>
        <ul className="divide-y divide-border border-y border-border">
          {state.result.docs.map((order) => <li key={order.id}>
            <Link href={"/me/orders/" + encodeURIComponent(order.id)} className="group grid min-h-32 gap-4 py-7 outline-offset-4 focus-visible:outline-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <h2 className="font-heading text-xl tracking-tight underline-offset-4 group-hover:underline">{t("orderPlaced", { date: new Intl.DateTimeFormat(locale, { timeZone: "Asia/Seoul", dateStyle: "long" }).format(new Date(order.createdAt)) })}</h2>
                <p className="mt-3 break-all font-mono text-xs text-muted-foreground">{t("orderNumber", { id: order.id })}</p>
                <p className="mt-3 text-sm">{t("recordStatus", { status: order.status ? t(`status.${order.status}`) : t("unknownStatus") })}</p>
              </div>
              <div className="text-base tabular-nums sm:text-right"><RecordedAmount order={order} /><p className="mt-2 text-xs text-muted-foreground">{t("viewRecord")}</p></div>
            </Link>
          </li>)}
        </ul>
      </> : <div className="py-8">
        <h2 className="font-heading text-2xl">{state.result.totalDocs > 0 ? t("emptyPage") : t("empty")}</h2>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">{state.result.totalDocs > 0 ? t("emptyPageDetail") : t("emptyDetail")}</p>
      </div>)}
    {!orderID && <nav aria-label={t("pages")} className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)} className="min-h-12 rounded-full border border-border px-5 text-sm outline-offset-4 hover:bg-muted focus-visible:outline-2 disabled:opacity-40">{t("previous")}</button>
      <p role="status" className="text-sm tabular-nums text-muted-foreground">{loading ? t("loading") : !ready || !pagination ? t("pagesUnavailable") : pagination.totalPages === 0 ? t("noPages") : page > pagination.totalPages ? t("emptyPage") : t("page", { current: page, total: pagination.totalPages })}</p>
      <button type="button" disabled={loading || !ready || !pagination?.hasNextPage} onClick={() => setPage((value) => value + 1)} className="min-h-12 rounded-full border border-border px-5 text-sm outline-offset-4 hover:bg-muted focus-visible:outline-2 disabled:opacity-40">{t("next")}</button>
    </nav>}
    <nav aria-label={t("actions")} className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-6">
      <button type="button" disabled={loading} onClick={() => setRetry((value) => value + 1)} className="min-h-12 rounded-md px-3 text-sm outline-offset-4 hover:bg-muted focus-visible:outline-2 disabled:opacity-40">{t("refresh")}</button>
      <Link href={orderID ? "/me/orders" : "/me"} className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{orderID ? t("backToOrders") : t("backToAccount")}</Link>
      <Link href="/shop" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("shop")}</Link>
    </nav>
  </section>;
}

function RecordedAmount({ order }: { order: OrderRecord }) {
  const t = useTranslations("Customer.components_commerce_orders");
  const locale = useLocale();
  const amount = order.commerceVersion === "commerce-v1" ? order.amount : order.commerceVersion === "legacy" ? order.totalAmount : undefined;
  return <>{amount != null && Number.isSafeInteger(amount) && order.currency
    ? new Intl.NumberFormat(locale, { style: "currency", currency: order.currency }).format(amount / (order.currency === "USD" ? 100 : 1))
    : t("amountUnavailable")}</>;
}

function OrderRecordView({ order, customerID }: { order: OrderRecord; customerID: string }) {
  const t = useTranslations("Customer.components_commerce_orders");
  const locale = useLocale();
  const parsed = commerceSnapshotSchema.safeParse(order.commerceSnapshot);
  const snapshot = order.commerceVersion === "commerce-v1" && parsed.success && parsed.data.customerID === customerID
    && order.currency === parsed.data.currency && order.amount === parsed.data.totalAmount ? parsed.data : null;
  const fulfillment = order.fulfillment;
  return <div className="space-y-10">
    <header>
      <p className="break-all font-mono text-xs text-muted-foreground">{t("orderNumber", { id: order.id })}</p>
      <h2 className="mt-5 font-heading text-3xl tracking-tight sm:text-4xl">{snapshot?.orderName ?? t("orderRecord")}</h2>
      <p className="mt-4 text-sm text-muted-foreground"><time dateTime={order.createdAt}>{new Intl.DateTimeFormat(locale, { timeZone: "Asia/Seoul", dateStyle: "long", timeStyle: "short" }).format(new Date(order.createdAt))} KST</time></p>
    </header>
    <dl className="divide-y divide-border border-y border-border text-sm">
      <div className="grid gap-3 py-5 sm:grid-cols-[10rem_1fr]"><dt className="text-muted-foreground">{t("orderStatus")}</dt><dd>{order.status ? t(`status.${order.status}`) : t("unknownStatus")}</dd></div>
      <div className="grid gap-3 py-5 sm:grid-cols-[10rem_1fr]"><dt className="text-muted-foreground">{t("recordedAmount")}</dt><dd className="text-lg tabular-nums"><RecordedAmount order={order} /></dd></div>
      {snapshot && <>
        <div className="grid gap-3 py-5 sm:grid-cols-[10rem_1fr]"><dt className="text-muted-foreground">{t("quantity")}</dt><dd className="tabular-nums">{snapshot.quantity}</dd></div>
        <div className="grid gap-3 py-5 sm:grid-cols-[10rem_1fr]"><dt className="text-muted-foreground">{t("unitPrice")}</dt><dd className="tabular-nums">{new Intl.NumberFormat(locale, { style: "currency", currency: "KRW" }).format(snapshot.unitAmount)}</dd></div>
        <div className="grid gap-3 py-5 sm:grid-cols-[10rem_1fr]"><dt className="text-muted-foreground">{t("shippingFee")}</dt><dd className="tabular-nums">{new Intl.NumberFormat(locale, { style: "currency", currency: "KRW" }).format(snapshot.shippingAmount)}</dd></div>
      </>}
    </dl>
    <p className="text-sm leading-relaxed text-muted-foreground">{t("recordDetail")}</p>
    {snapshot ? <section aria-labelledby="order-delivery-heading" className="rounded-xl border border-border p-6 sm:p-8">
      <h3 id="order-delivery-heading" className="font-heading text-xl">{t("delivery")}</h3>
      <address className="mt-5 space-y-2 text-sm leading-relaxed not-italic">
        <p>{snapshot.shippingAddress.recipientName}</p>
        <p>{snapshot.shippingAddress.phone}</p>
        <p className="break-words">{snapshot.shippingAddress.addressLine1}</p>
        {snapshot.shippingAddress.addressLine2 && <p className="break-words">{snapshot.shippingAddress.addressLine2}</p>}
        <p>{snapshot.shippingAddress.postalCode}, {snapshot.shippingAddress.country}</p>
      </address>
      {fulfillment?.status && <p className="mt-6 border-t border-border pt-5 text-sm">{t("deliveryStatus", { status: t(`fulfillment.${fulfillment.status}`) })}</p>}
      {fulfillment?.carrier && <p className="mt-3 break-words text-sm">{t("carrier", { carrier: fulfillment.carrier })}</p>}
      {fulfillment?.trackingNumber && <p className="mt-3 break-all text-sm">{t("tracking", { number: fulfillment.trackingNumber })}</p>}
    </section> : <p className="border-l-2 border-border pl-5 text-sm leading-relaxed text-muted-foreground">{order.commerceVersion === "legacy" ? t("legacyDetail") : t("snapshotUnavailable")}</p>}
    {snapshot && <section className="border-t border-border pt-8">
      <h3 className="font-heading text-xl">{t("guestAdmissions")}</h3>
      <Link href={"/shop/orders/" + encodeURIComponent(order.id)} className="mt-3 inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("openAdmissions")}</Link>
    </section>}
    <section className="border-t border-border pt-8">
      <h3 className="font-heading text-xl">{t("support")}</h3>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("supportDetail")}</p>
      <Link href="/help" className="mt-3 inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("help")}</Link>
    </section>
  </div>;
}
