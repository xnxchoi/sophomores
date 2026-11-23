"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import { Link } from "@/components/core/Link/Link";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";

const orderRecordSchema = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime({ offset: true }),
  status: z.enum(["processing", "completed", "cancelled", "refunded", "pending", "paid", "held"]).nullish(),
  amount: z.int().min(0).nullish(),
  totalAmount: z.int().min(0).nullish(),
  currency: z.enum(["KRW", "USD"]).nullish(),
  commerceVersion: z.enum(["legacy", "commerce-v1"]).nullish(),
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
export function CommerceOrders({ customerID }: { customerID: string }) {
  const t = useTranslations("Customer.components_commerce_orders");
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [pagination, setPagination] = useState<{ totalPages: number; hasNextPage: boolean } | null>(null);
  const requestKey = JSON.stringify([customerID, page, retry]);
  const [state, setState] = useState<OrderRead>({ kind: "loading", requestKey });
  useEffect(() => {
    const abort = new AbortController();
    const query = new URLSearchParams({ depth: "0", limit: "10", page: String(page), sort: "-createdAt" });
    query.set("where[or][0][customer][equals]", customerID);
    query.set("where[or][1][user][equals]", customerID);
    for (const field of ["id", "createdAt", "status", "amount", "totalAmount", "currency", "commerceVersion"]) query.set(`select[${field}]`, "true");
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
  }, [customerID, page, requestKey]);
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
  return <section aria-label={t("history")} aria-busy={loading} className="space-y-8">
    {loading && <p role="status" className="py-8 text-sm text-muted-foreground">{t("loading")}</p>}
    {!loading && state.kind === "error" && <div className="rounded-xl border border-border p-6">
      <h2 className="text-2xl">{t("unavailable")}</h2>
      <p role="status" className="mt-4 text-sm leading-relaxed text-muted-foreground">{state.status === 401 ? t("authenticationRequired") : state.status === 403 ? t("accessUnavailable") : state.status === 429 ? t("rateLimited") : t("readFailed")}</p>
      {state.status === 401 && <Link href="/account?next=/me/orders" className="group/focus mt-4 inline-flex min-h-12 items-center text-sm underline underline-offset-4"><FocusShape className="outline-offset-4">{t("signIn")}</FocusShape></Link>}
    </div>}
    {ready && (state.result.docs.length ? <>
        <ul className="divide-y divide-border border-y border-border">
          {state.result.docs.map((order) => <li key={order.id}>
            <Link href={"/me/orders/" + encodeURIComponent(order.id)} prefetch={false} className="group grid min-h-24 gap-3 py-5 outline-offset-4 hover:bg-muted/40 focus-visible:outline-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <h2 className="text-xl tracking-tight underline-offset-4 group-hover:underline">{t("orderPlaced", { date: new Intl.DateTimeFormat(locale, { timeZone: "Asia/Seoul", dateStyle: "long" }).format(new Date(order.createdAt)) })}</h2>
                <p className="mt-1.5 text-xs tabular-nums text-muted-foreground [overflow-wrap:anywhere]">{t("orderNumber", { id: order.id })}</p>
                <p className="mt-2 text-sm font-medium">{t("recordStatus", { status: order.status ? t(`status.${order.status}`) : t("unknownStatus") })}</p>
              </div>
              <div className="text-base tabular-nums [overflow-wrap:anywhere] sm:text-right"><RecordedAmount order={order} /><p className="mt-2 text-xs text-muted-foreground">{t("viewRecord")}</p></div>
            </Link>
          </li>)}
        </ul>
      </> : <div className="py-8">
        <h2 className="text-2xl">{state.result.totalDocs > 0 ? t("emptyPage") : t("empty")}</h2>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">{state.result.totalDocs > 0 ? t("emptyPageDetail") : t("emptyDetail")}</p>
      </div>)}
    <nav aria-label={t("pages")} className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)} className="min-h-12 rounded-full border border-border px-5 text-sm outline-offset-4 hover:bg-muted focus-visible:outline-2 disabled:opacity-40">{t("previous")}</button>
      <p role="status" className="text-sm tabular-nums text-muted-foreground">{loading ? t("loading") : !ready || !pagination ? t("pagesUnavailable") : pagination.totalPages === 0 ? t("noPages") : page > pagination.totalPages ? t("emptyPage") : t("page", { current: page, total: pagination.totalPages })}</p>
      <button type="button" disabled={loading || !ready || !pagination?.hasNextPage} onClick={() => setPage((value) => value + 1)} className="min-h-12 rounded-full border border-border px-5 text-sm outline-offset-4 hover:bg-muted focus-visible:outline-2 disabled:opacity-40">{t("next")}</button>
    </nav>
    <nav aria-label={t("actions")} className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-6">
      <button type="button" disabled={loading} onClick={() => setRetry((value) => value + 1)} className="min-h-12 rounded-full border border-border px-5 text-sm outline-offset-4 transition-colors hover:bg-muted focus-visible:outline-2 disabled:opacity-40">{t("refresh")}</button>
      <Link href="/me" className="group/focus inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 hover:decoration-current"><FocusShape className="outline-offset-4">{t("backToAccount")}</FocusShape></Link>
      <Link href="/shop" className="group/focus inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 hover:decoration-current"><FocusShape className="outline-offset-4">{t("shop")}</FocusShape></Link>
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
