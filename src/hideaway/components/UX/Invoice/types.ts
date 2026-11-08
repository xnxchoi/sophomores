export type InvoiceCurrency = "krw" | "usd" | "eur";

/**
 * Sprint 2 expanded the Invoice FSM from `paid | pending | void` to
 * Stripe-style `draft → open → paid | void`. `pending` remains as a
 * legacy alias for `open` to mirror the DB enum.
 */
export type InvoiceStatus = "draft" | "paid" | "pending" | "void";

export type InvoicePaymentMethod = {
  method: "bank_transfer" | "cash";
  amount: number;
  currency: InvoiceCurrency;
  payment_date: string;
  reference?: string | null;
};

export type InvoiceClient = {
  name?: string | null;
  email?: string | null;
  handle?: string | null;
};

export type InvoicePlan = {
  title?: string | null;
  description?: string | null;
};

export type InvoiceDisplay = {
  invoice_number: number;
  status: InvoiceStatus;
  amount: number;
  currency: InvoiceCurrency;
  paid_at?: string | null;
  cycle_start?: string | null;
  cycle_end?: string | null;
  bank_reference?: string | null;
  payment_method?: InvoicePaymentMethod[] | null;
  client: InvoiceClient;
  plan: InvoicePlan;
  issued_at?: string | null;
};

export type InvoiceCertificateProps = {
  invoice: InvoiceDisplay;
  onPrint?: () => void;
  onDownload?: () => void | Promise<void>;
  className?: string;
};
