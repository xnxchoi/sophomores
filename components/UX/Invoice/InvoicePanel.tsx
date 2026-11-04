"use client";

/**
 * Plain-typography readout of an invoice. Sits alongside the paper
 * `<InvoiceCertificate>` and carries the *actual* information clearly,
 * leaving the paper to do its visual / printability job. When the paper
 * is scaled down to fit the viewport its body copy can become hard to
 * read; the panel is the legibility-first surface so nothing important
 * depends on the paper rendering at full size.
 *
 * Reads from the same `Invoice` next-intl namespace the paper uses, so
 * KO / EN switch in lockstep across both surfaces.
 */

import { useLocale, useTranslations } from "next-intl";
import {
  formatAmount,
  formatInvoiceNumber,
  formatInvoiceOrderNumber
} from "./format";
import type { InvoiceDisplay, InvoicePaymentMethod } from "./types";

const cn = (...c: Array<string | false | null | undefined>) =>
  c.filter(Boolean).join(" ");

const formatPanelDate = (
  iso: string | null | undefined,
  locale: string
): string => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
};

export type InvoicePanelProps = {
  invoice: InvoiceDisplay;
  className?: string;
};

export function InvoicePanel({ invoice, className }: InvoicePanelProps) {
  const t = useTranslations("Invoice");
  const tPanel = useTranslations("Invoice.panel");
  const locale = useLocale();

  const issuedAt = invoice.issued_at ?? invoice.paid_at ?? null;
  const cycleStart = invoice.cycle_start ?? null;
  const cycleEnd = invoice.cycle_end ?? null;
  const hasCycle = !!cycleStart || !!cycleEnd;
  const orderRef = formatInvoiceOrderNumber({
    invoiceNumber: invoice.invoice_number,
    issuedAt,
    bankReference: invoice.bank_reference
  });
  const planName = invoice.plan.title ?? t("planFallback");
  const totalLabel = formatAmount(invoice.amount, invoice.currency);
  const memberYear = issuedAt ? new Date(issuedAt).getFullYear() : null;
  // Quantity is currently always 1 for the membership/single-item line, but
  // we still surface the marker on the panel so the line-item parity with
  // the paper's `Quantity` column is explicit. When more line types arrive
  // this number will come from the line data.
  const lineQty = 1;
  const isPaid =
    invoice.status === "paid" &&
    !!invoice.paid_at &&
    Array.isArray(invoice.payment_method) &&
    invoice.payment_method.length > 0;

  return (
    <section
      className={cn("flex w-full flex-col gap-7 text-foreground", className)}
      aria-label={tPanel("heading")}
    >
      {/* Eyebrow + chip label that distinguishes this from the paper.
      "Reading copy" makes the contract explicit: this column is the
      legibility-first surface, the paper to the right is the artifact. */}
      <header className="flex flex-col gap-3">
        <p className="font-sans text-[10px] tracking-[0.28em] text-muted-foreground/70 uppercase">
          {tPanel("digitalLabel")}
        </p>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-light tracking-tight xl:text-3xl">
            {tPanel("heading")}{" "}
            <span className="font-sans text-foreground/65 tabular-nums">
              {formatInvoiceNumber(invoice.invoice_number)}
            </span>
          </h2>
          <StatusChip
            status={invoice.status}
            label={tPanel(`status.${invoice.status}`)}
          />
        </div>
      </header>

      {/* Top-of-fold facts: order ref, issue date, optional service period.
      All in mono so the values stay tabular and align between rows. */}
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
        <PanelRow
          label={t("fields.orderNo")}
          value={<span className="font-mono">{orderRef}</span>}
        />
        <PanelRow
          label={tPanel("issuedLabel")}
          value={formatPanelDate(issuedAt, locale)}
        />
        {hasCycle ? (
          <PanelRow
            label={tPanel("cycleLabel")}
            value={`${formatPanelDate(cycleStart, locale)} → ${formatPanelDate(cycleEnd, locale)}`}
          />
        ) : null}
      </dl>

      {/* Member block — same fields the paper carries, but rendered with
      the same hierarchy you'd see anywhere else on the site. */}
      <section className="flex flex-col gap-1.5">
        <p className="font-sans text-[10px] tracking-[0.22em] text-muted-foreground/65 uppercase">
          {t("purchasedBy")}
        </p>
        <p className="text-base font-medium tracking-tight">
          {invoice.client.name ?? invoice.client.email ?? "—"}
        </p>
        {invoice.client.email ? (
          <p className="font-sans text-xs text-foreground/65" lang="en">
            {invoice.client.email}
          </p>
        ) : null}
        {invoice.client.handle ? (
          <p className="font-sans text-xs text-foreground/65" lang="en">
            hideawayseoul.com/@{invoice.client.handle}
          </p>
        ) : null}
        {memberYear ? (
          <p className="mt-1 text-xs text-foreground/70">
            {t("memberSince", { year: memberYear })}
          </p>
        ) : null}
      </section>

      {/* Line item summary. One row for now (membership), but laid out so
      adding more lines later is trivial. The trailing `× 1` marker mirrors
      the Quantity column on the paper so the per-line breakdown is still
      explicit on the panel. */}
      <section className="flex flex-col gap-2.5">
        <p className="font-sans text-[10px] tracking-[0.22em] text-muted-foreground/65 uppercase">
          {tPanel("lineItemHeading")}
        </p>
        <div className="flex items-baseline justify-between gap-4 border-b border-border/30 pb-2.5">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium">{planName}</span>
            <span className="font-sans text-[11px] text-muted-foreground/55 tabular-nums">
              {tPanel("lineQuantityShort", { n: lineQty })}
            </span>
          </div>
          <span className="font-sans text-sm tabular-nums">{totalLabel}</span>
        </div>
        {invoice.plan.description ? (
          <p className="text-xs leading-relaxed text-foreground/65">
            {invoice.plan.description}
          </p>
        ) : null}
      </section>

      {/* Totals — Subtotal / Tax / Total, with Total emphasized. */}
      <section className="flex flex-col gap-2">
        <p className="font-sans text-[10px] tracking-[0.22em] text-muted-foreground/65 uppercase">
          {tPanel("summaryHeading")}
        </p>
        <dl className="flex flex-col gap-1.5 text-sm">
          <SummaryRow label={t("totals.subtotal")} value={totalLabel} />
          <SummaryRow label={t("totals.tax")} value="0" />
          <div className="my-1 h-px w-full bg-border/30" />
          <SummaryRow label={t("totals.total")} value={totalLabel} emphasized />
        </dl>
      </section>

      {/* Payment block — only for paid invoices. */}
      {isPaid && invoice.payment_method ? (
        <section className="flex flex-col gap-2.5">
          <p className="font-sans text-[10px] tracking-[0.22em] text-muted-foreground/65 uppercase">
            {tPanel("paymentHeading")}
          </p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {invoice.payment_method.map((m, i) => (
              <PaymentRow
                key={i}
                method={m}
                methodLabel={t(`methods.${m.method}`)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {/* Terms — collapsed by default so it doesn't dominate the panel,
      but always queryable. The native `<details>` element gives us a
      built-in disclosure with keyboard support; we restyle the summary
      so it looks of-a-piece with the other eyebrow labels. */}
      <details className="group flex flex-col gap-2.5 border-t border-border/20 pt-5">
        <summary className="flex cursor-pointer items-center justify-between gap-3 font-sans text-[10px] tracking-[0.22em] text-muted-foreground/70 uppercase transition-colors outline-none marker:hidden hover:text-foreground/80 [&::-webkit-details-marker]:hidden">
          <span>{tPanel("termsHeading")}</span>
          <span
            aria-hidden
            className="text-[14px] leading-none text-foreground/50 transition-transform duration-300 group-open:rotate-45"
          >
            +
          </span>
        </summary>
        <p
          className="mt-1 text-[11px] leading-relaxed text-foreground/65"
          lang={locale}
        >
          {t("terms")}
        </p>
      </details>
    </section>
  );
}

/* ---------------------------------------------------------------- *
 *  Local presentational primitives
 * ---------------------------------------------------------------- */

type PanelRowProps = {
  label: string;
  value: React.ReactNode;
};

function PanelRow({ label, value }: PanelRowProps) {
  return (
    <>
      <dt className="self-baseline font-sans text-[11px] tracking-[0.2em] text-muted-foreground/65 uppercase">
        {label}
      </dt>
      <dd className="text-foreground/85">{value}</dd>
    </>
  );
}

function SummaryRow({
  label,
  value,
  emphasized
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span
        className={cn(
          emphasized ? "text-base font-medium" : "text-sm text-foreground/75"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-sans tabular-nums",
          emphasized ? "text-base font-medium" : "text-sm text-foreground/85"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function PaymentRow({
  method,
  methodLabel
}: {
  method: InvoicePaymentMethod;
  methodLabel: string;
}) {
  return (
    <li className="flex items-baseline justify-between gap-4">
      <span className="text-foreground/85">{methodLabel}</span>
      <span className="font-sans tabular-nums">
        {formatAmount(method.amount, method.currency)}
      </span>
    </li>
  );
}

function StatusChip({
  status,
  label
}: {
  status: InvoiceDisplay["status"];
  label: string;
}) {
  // Status-coded chip. Paid is the only positive state, so it gets a soft
  // ember-green tint; pending stays neutral; void desaturates.
  const tone =
    status === "paid"
      ? "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-500"
      : status === "pending"
        ? "border-border/40 bg-foreground/[0.04] text-foreground/70"
        : "border-border/30 bg-foreground/[0.02] text-foreground/45";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-sans text-[10px] tracking-[0.18em] uppercase",
        tone
      )}
    >
      {label}
    </span>
  );
}
