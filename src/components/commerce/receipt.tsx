import { getLocale, getTranslations } from "next-intl/server";
import type { OrderReceipt, OrderRecord } from "@/lib/commerce/receipt/order-receipt";
import { Link } from "@/components/core/Link/Link";
import { CopyButton } from "@/components/core/ArcFocus/ArcFocus";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { ReceiptShare } from "./receipt-share";
import { ReceiptDelivery } from "./receipt-delivery";

export async function InvoiceCertificate({ receipt, principal }: {
  receipt: Omit<OrderReceipt, "address" | "fulfillment">; principal: string;
}) {
  const t = await getTranslations("Customer.components_commerce_orders");
  const download = "/api/invoice/pdf?order=" + encodeURIComponent(receipt.id);
  return <section aria-labelledby="order-receipt-heading">
    <header className="border-b border-border pb-6">
      <div className="flex items-center gap-2">
        <p className="min-w-0 text-sm tabular-nums text-muted-foreground [overflow-wrap:anywhere]">{t("orderNumber", { id: receipt.id })}</p>
        <CopyButton value={receipt.id} label={t("copyOrderNumber")} variant="plain" iconOnly className="size-12! min-h-12! shrink-0" />
      </div>
      <h2 id="order-receipt-heading" className="mt-2 font-display text-3xl sm:text-4xl">{receipt.name}</h2>
      {receipt.edition && receipt.edition !== receipt.name && <p className="mt-2 text-sm text-muted-foreground">{receipt.edition}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-5">
        <a href={download} className="group/focus inline-flex min-h-12 items-center text-sm underline underline-offset-4"><FocusShape className="outline-offset-4">{t("receipt.download")}</FocusShape></a>
        <a href={download + "&view=inline"} className="group/focus inline-flex min-h-12 items-center text-sm underline underline-offset-4"><FocusShape className="outline-offset-4">{t("receipt.open")}</FocusShape></a>
        <ReceiptShare orderID={receipt.id} label={t("receipt.copyLink")} />
      </div>
    </header>
    <InvoicePanel receipt={receipt} />
    <div className="mt-8"><ReceiptDelivery key={principal + ":" + receipt.id} orderID={receipt.id} principal={principal} /></div>
  </section>;
}

async function InvoicePanel({ receipt }: { receipt: Omit<OrderReceipt, "address" | "fulfillment"> }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Customer.components_commerce_orders")]);
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: receipt.currency });
  const date = new Intl.DateTimeFormat(locale, { timeZone: "Asia/Seoul", dateStyle: "long" }).format(new Date(receipt.createdAt));
  const { benefits } = receipt;
  return <div className="space-y-8">
    <dl className="divide-y divide-border border-b border-border text-sm">
      <ReceiptRow label={t("receipt.date")}><time dateTime={receipt.createdAt}>{date}</time></ReceiptRow>
      <ReceiptRow label={t("orderStatus")}>{t(`status.${receipt.status}`)}</ReceiptRow>
      <ReceiptRow label={t("quantity")}>{receipt.quantity}</ReceiptRow>
      <ReceiptRow label={t("unitPrice")}>{money.format(receipt.unitAmount)}</ReceiptRow>
      <ReceiptRow label={t("shippingFee")}>{money.format(receipt.shippingAmount)}</ReceiptRow>
      <ReceiptRow label={t("recordedAmount")}><strong className="text-lg font-medium">{money.format(receipt.totalAmount)}</strong></ReceiptRow>
    </dl>
    {(benefits.membershipSignet || benefits.freeLaunchTicket) && <section className="border-b border-border pb-6">
      <h3 className="text-xl">{t("receipt.benefits")}</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {benefits.membershipSignet && <li>{t("receipt.signet")}</li>}
        {benefits.freeLaunchTicket && <li>{t("receipt.ticket")}</li>}
      </ul>
      {benefits.freeLaunchTicket && <Link href={"/shop/orders/" + receipt.id} prefetch={false} className="group/focus mt-2 inline-flex min-h-12 items-center text-sm underline underline-offset-4"><FocusShape className="outline-offset-4">{t("openAdmissions")}</FocusShape></Link>}
    </section>}
  </div>;
}

export async function OrderRecordView({ record }: { record: OrderRecord }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Customer.components_commerce_orders")]);
  const amount = record.amount === null || record.currency === null ? t("amountUnavailable") :
    new Intl.NumberFormat(locale, { style: "currency", currency: record.currency })
      .format(record.amount / (record.currency === "USD" ? 100 : 1));
  return <section aria-labelledby="order-record-heading" className="space-y-6">
    <header>
      <div className="flex items-center gap-2">
        <p className="min-w-0 text-sm tabular-nums text-muted-foreground [overflow-wrap:anywhere]">{t("orderNumber", { id: record.id })}</p>
        <CopyButton value={record.id} label={t("copyOrderNumber")} variant="plain" iconOnly className="size-12! min-h-12! shrink-0" />
      </div>
      <h2 id="order-record-heading" className="text-2xl tracking-tight">{t("orderRecord")}</h2>
    </header>
    <dl className="divide-y divide-border border-y border-border text-sm">
      {record.createdAt && <ReceiptRow label={t("receipt.date")}><time dateTime={record.createdAt}>{
        new Intl.DateTimeFormat(locale, { timeZone: "Asia/Seoul", dateStyle: "long" }).format(new Date(record.createdAt))
      }</time></ReceiptRow>}
      <ReceiptRow label={t("orderStatus")}>{record.status ? t(`status.${record.status}`) : t("unknownStatus")}</ReceiptRow>
      <ReceiptRow label={t("recordedAmount")}>{amount}</ReceiptRow>
    </dl>
    <p className="text-sm leading-relaxed text-muted-foreground">{t(record.legacy ? "legacyDetail" : "snapshotUnavailable")}</p>
  </section>;
}

function ReceiptRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-3">
    <dt className="text-muted-foreground">{label}</dt><dd className="text-right tabular-nums">{children}</dd>
  </div>;
}
