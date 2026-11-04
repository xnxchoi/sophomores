import type { InvoiceCurrency } from "./types";

const localeFor: Record<InvoiceCurrency, string> = {
  krw: "ko-KR",
  usd: "en-US",
  eur: "en-IE"
};

const upper: Record<InvoiceCurrency, string> = {
  krw: "KRW",
  usd: "USD",
  eur: "EUR"
};

export const formatAmount = (
  amount: number,
  currency: InvoiceCurrency
): string => {
  const fractionDigits = currency === "krw" ? 0 : 2;
  return new Intl.NumberFormat(localeFor[currency], {
    style: "decimal",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(amount);
};

export const currencyCode = (currency: InvoiceCurrency): string =>
  upper[currency];

export const formatDate = (
  iso: string | null | undefined,
  opts: { withTime?: boolean } = {}
): string => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...(opts.withTime ? { hour: "2-digit", minute: "2-digit" } : {})
  }).format(date);
};

export const formatInvoiceNumber = (n: number): string =>
  String(n).padStart(7, "0");

export const formatInvoiceOrderNumber = ({
  invoiceNumber,
  issuedAt,
  bankReference
}: {
  invoiceNumber: number;
  issuedAt?: string | null;
  bankReference?: string | null;
}): string => {
  const reference = bankReference?.trim();
  if (reference) return reference;

  const issued = issuedAt ? new Date(issuedAt) : null;
  const year =
    issued && !Number.isNaN(issued.getTime()) ? issued.getFullYear() : null;
  const formatted = formatInvoiceNumber(invoiceNumber);
  return year ? `HW-${year}-${formatted}` : `HW-${formatted}`;
};
