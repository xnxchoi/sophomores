"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCursor } from "@/providers/RP_Pro";
import {
  CRESTS_SVG_HEIGHT,
  CRESTS_SVG_PATHS,
  CRESTS_SVG_WIDTH,
  HIDEAWAY_LOGO_DATA_URL
} from "./branding";
import {
  formatAmount,
  formatInvoiceNumber,
  formatInvoiceOrderNumber
} from "./format";
import { InvoicePanel } from "./InvoicePanel";
import type { InvoiceCertificateProps, InvoiceDisplay } from "./types";
import { instrumentSerif } from "../../../../fonts";

const PAPER_TEXTURE = "/assets/three/materials/paper/paper_d.png";
const PDF_ENDPOINT = "/api/invoice/pdf";

const cn = (...c: Array<string | false | null | undefined>) =>
  c.filter(Boolean).join(" ");

type ShareState = "idle" | "copied" | "shared" | "error";
type SaveState = "idle" | "saving" | "done" | "error";
type PrintState = "idle" | "loading" | "error";

async function fetchInvoicePdf(invoice: InvoiceDisplay): Promise<Blob> {
  const res = await fetch(PDF_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(invoice)
  });
  if (!res.ok) {
    throw new Error(`PDF generation failed (${res.status})`);
  }
  return res.blob();
}

export function InvoiceCertificate({
  invoice,
  onPrint,
  onDownload,
  className
}: InvoiceCertificateProps) {
  const paperRef = useRef<HTMLElement>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [shareState, setShareState] = useState<ShareState>("idle");
  const [printState, setPrintState] = useState<PrintState>("idle");
  // Action-rail labels (Print / Save as PDF / Share + their busy and error
  // variants). Scoped to the `Invoice.actions` namespace so the call sites
  // below stay short.
  const tActions = useTranslations("Invoice.actions");

  // The custom cursor's `cursorTheme` value is the cursor's OWN color (light
  // = near-white, dark = near-black). The site is dark-themed, so the global
  // cursor sits at "light" to read against the dark canvas. When the user is
  // looking at the white invoice paper, that same light cursor disappears
  // against the page. While this component is mounted we push the cursor
  // into its dark variant, then call `resetCursorTheme()` on unmount so the
  // global state is restored to whatever it was before.
  const setCursorTheme = useCursor((s) => s.setCursorTheme);
  const resetCursorTheme = useCursor((s) => s.resetCursorTheme);
  useEffect(() => {
    setCursorTheme("dark");
    return () => {
      resetCursorTheme();
    };
  }, [setCursorTheme, resetCursorTheme]);

  const pdfFilename = useCallback(
    () => `hideaway-invoice-${formatInvoiceNumber(invoice.invoice_number)}.pdf`,
    [invoice.invoice_number]
  );

  const handlePrint = useCallback(async () => {
    if (onPrint) {
      onPrint();
      return;
    }
    setPrintState("loading");
    try {
      const blob = await fetchInvoicePdf(invoice);
      const url = URL.createObjectURL(blob);
      // Open in a new tab; the browser's PDF viewer exposes both print and
      // save controls, which is the right affordance once we have a real PDF.
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) {
        // Pop-up blocked — fall back to download so the action still completes.
        const a = document.createElement("a");
        a.href = url;
        a.download = pdfFilename();
        a.click();
      }
      // Revoke after a short delay so the new tab has time to parse the blob.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setPrintState("idle");
    } catch {
      setPrintState("error");
      window.setTimeout(() => setPrintState("idle"), 2200);
    }
  }, [invoice, onPrint, pdfFilename]);

  const handleSavePdf = useCallback(async () => {
    setSaveState("saving");
    try {
      const blob = await fetchInvoicePdf(invoice);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfFilename();
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      onDownload?.();
      setSaveState("done");
      window.setTimeout(() => setSaveState("idle"), 1800);
    } catch {
      setSaveState("error");
      window.setTimeout(() => setSaveState("idle"), 2200);
    }
  }, [invoice, onDownload, pdfFilename]);

  const handleShare = useCallback(async () => {
    try {
      const blob = await fetchInvoicePdf(invoice);
      const file = new File([blob], pdfFilename(), {
        type: "application/pdf"
      });
      const navAny = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (
        typeof navigator.share === "function" &&
        navAny.canShare?.({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: `Invoice № ${formatInvoiceNumber(invoice.invoice_number)}`,
          text: "Hideaway membership invoice"
        });
        setShareState("shared");
      } else {
        const url = typeof window !== "undefined" ? window.location.href : "";
        await navigator.clipboard?.writeText?.(url);
        setShareState("copied");
      }
      window.setTimeout(() => setShareState("idle"), 1800);
    } catch {
      setShareState("error");
      window.setTimeout(() => setShareState("idle"), 2200);
    }
  }, [invoice, pdfFilename]);

  const printLabel = tActions(`print.${printState}`);
  const saveLabel = tActions(`save.${saveState}`);
  const shareLabel = tActions(`share.${shareState}`);

  const tCertChrome = useTranslations("Invoice.panel");

  return (
    <div className={cn("relative w-full", className)}>
      {/* Three-pane composition at desktop:
           ┌──────────────┬────────────────┬────────────┐
           │ Info panel   │  Paper preview │  Actions   │
           │ (readable    │  (visual /     │  rail      │
           │  source of   │   printable    │            │
           │  truth)      │   artifact)    │            │
           └──────────────┴────────────────┴────────────┘
         At lg- the three stack vertically: panel → paper → actions.
         The paper is height-capped to the viewport (`max-h: 80vh`) and
         its width follows from the A4 aspect ratio, so the whole layout
         fits on one screen on a typical desktop without scroll. */}
      <div className="relative mx-auto grid w-full max-w-[1440px] grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(280px,1fr)_auto_minmax(0,200px)] lg:items-stretch lg:gap-12">
        {/* ── Left: Info panel (the "actual" component) ─────────────── */}
        <InvoicePanel invoice={invoice} />

        {/* ── Center: Paper preview ────────────────────────────────────
        Sized so its A4 height never exceeds 80% of the viewport; its
        width is then derived from that height via the aspect-ratio. On
        mobile the paper centers and respects a maximum width. */}
        <div
          className={cn(
            "relative mx-auto flex w-full max-w-[520px] flex-col items-center font-instrument lg:max-w-none"
          )}
        >
          {/* Eyebrow that names this column — labels the paper as the
          printable artifact, not the source of truth. */}
          <p className="mb-3 font-sans text-[10px] tracking-[0.28em] text-muted-foreground/65 uppercase">
            {tCertChrome("printedLabel")}
          </p>
          <article
            ref={paperRef}
            className={cn(
              "invoice-paper group/paper relative isolate origin-top text-[#1a1612]",
              // First-pass microinteraction: the paper lifts a hair on hover
              // and its shadow deepens. Sets up the "alive" feel — future
              // passes can layer parallax grain, a paper-rustle sound, an
              // embossed "PAID" stamp reveal, etc.
              "transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
              "hover:-translate-y-1 hover:shadow-[0_42px_80px_-22px_rgba(0,0,0,0.65),_0_12px_32px_-10px_rgba(0,0,0,0.45)]"
            )}
            aria-label="Invoice certificate"
            style={{
              aspectRatio: "1 / 1.414",
              // Vertical cap keeps the paper inside the viewport. We subtract
              // ~240px to leave room for the page-level header (eyebrow +
              // h1 + container padding) above and a comfortable margin below.
              // `width: auto` lets the aspect-ratio drive width from there.
              maxHeight: "min(calc(100vh - 240px), 880px)",
              width: "auto",
              maxWidth: "100%",
              backgroundColor: "#ffffff",
              boxShadow:
                "0 30px 60px -20px rgba(0,0,0,0.55), 0 8px 24px -8px rgba(0,0,0,0.35)"
            }}
          >
            {/* Paper-grain texture overlay at low opacity. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `url(${PAPER_TEXTURE})`,
                backgroundRepeat: "repeat",
                backgroundSize: "320px",
                opacity: 0.35,
                mixBlendMode: "multiply"
              }}
            />
            {/* Subtle sheen */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(120% 60% at 50% -10%, rgba(255,255,255,0.5), transparent 60%), radial-gradient(80% 40% at 50% 110%, rgba(60,50,40,0.05), transparent 70%)",
                mixBlendMode: "soft-light"
              }}
            />
            {/* Status stamp — a stamped status mark in the upper-right of
            the paper. Renders for paid / void only (pending invoices read
            as the default state and don't need a mark). The mark closes
            the parity gap with the panel's status chip: same information,
            stylistically appropriate to each surface. */}
            <StatusStamp status={invoice.status} />
            {/* Inner content padding — see PaperContent for the reasoning
            behind the asymmetric top/bottom percentages. */}
            <div className="relative flex h-full flex-col px-[9%] pt-[6%] pb-[5%]">
              <PaperContent invoice={invoice} />
            </div>
          </article>
        </div>

        {/* ── Right: Action rail ──────────────────────────────────── */}
        <aside className="flex w-full flex-col gap-3 self-start print:hidden">
          <ActionButton
            onClick={handlePrint}
            label={printLabel}
            busy={printState === "loading"}
          />
          <ActionButton
            onClick={handleSavePdf}
            label={saveLabel}
            busy={saveState === "saving"}
          />
          <ActionButton onClick={handleShare} label={shareLabel} />
        </aside>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 *  Paper content — HTML twin of the pdfmake invoice template.
 *  Sections mirror the PDF top-to-bottom:
 *    1. Header band (crests → logo → wordmark → sub-wordmark → tagline)
 *    2. Issued date (right-aligned, US-long format)
 *    3. Purchased by (italic label + name + email + handle + member since)
 *    4. Metadata rows ("Invoice number  : …", "Order no  : …")
 *    5. Client copy + 220px hairline rule
 *    6. Line-items table (Description / Quantity / Total Amount / Tax Amount)
 *    7. Totals (Subtotal / Tax / Total) full-width, label left / value right
 *    8. Terms paragraph
 *    9. Means of Payment row (paid invoices only, natural gaps)
 *   10. Footer band (italic tagline → thank-you → brand line)
 * ---------------------------------------------------------------- */

// Locale-aware long date formatter. en-US → "April 28, 2026", ko-KR →
// "2026년 4월 28일". Falls back to en-US for any unknown locale.
const formatLongDate = (
  iso: string | null | undefined,
  locale: string
): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const bcp47 = locale === "ko" ? "ko-KR" : "en-US";
  return new Intl.DateTimeFormat(bcp47, {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
};

// Short variant used inside compact metadata rows (e.g. the cycle range).
// "Apr 28, 2026" / "2026. 4. 28." — keeps the row from wrapping.
const formatShortDate = (
  iso: string | null | undefined,
  locale: string
): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const bcp47 = locale === "ko" ? "ko-KR" : "en-US";
  return new Intl.DateTimeFormat(bcp47, {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
};

function PaperContent({ invoice }: { invoice: InvoiceDisplay }) {
  // All user-facing copy comes from next-intl per project convention. The
  // locale also drives the long-form date renderer and a couple of layout
  // tweaks (Korean labels are visually wider, so the metadata column gets
  // a touch more room in KO).
  const t = useTranslations("Invoice");
  // The cycle label lives under `Invoice.panel` because it was first added
  // for the reading panel; reuse it here so we don't fork a second key for
  // the same concept.
  const tPanel = useTranslations("Invoice.panel");
  const locale = useLocale();
  const isKo = locale === "ko";

  const issuedAt = invoice.issued_at ?? invoice.paid_at ?? null;
  const clientPrimary = invoice.client.name ?? invoice.client.email ?? "—";
  const orderRef = formatInvoiceOrderNumber({
    invoiceNumber: invoice.invoice_number,
    issuedAt,
    bankReference: invoice.bank_reference
  });
  const memberYear = issuedAt ? new Date(issuedAt).getFullYear() : null;
  const planName = invoice.plan.title ?? t("planFallback");
  const isPaid =
    invoice.status === "paid" &&
    !!invoice.paid_at &&
    Array.isArray(invoice.payment_method) &&
    invoice.payment_method.length > 0;
  // Cycle range — only rendered when at least one of the dates is set. Joined
  // by an arrow so it reads as a span rather than two separate facts.
  const cycleStart = invoice.cycle_start ?? null;
  const cycleEnd = invoice.cycle_end ?? null;
  const hasCycle = !!cycleStart || !!cycleEnd;
  const cycleRange = hasCycle
    ? `${formatShortDate(cycleStart, locale)} → ${formatShortDate(
        cycleEnd,
        locale
      )}`
    : null;

  return (
    <>
      {/* ── 1. Header band ───────────────────────────────────────── */}
      <header className="flex flex-col items-center text-[#1a1612]" lang="en">
        {/* Crests strip — same SVG paths the PDF uses, font-independent.
        Scaled up roughly 1.5× over the PDF so they actually register at HTML
        viewing sizes rather than reading as a tiny pinprick row. */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${CRESTS_SVG_WIDTH} ${CRESTS_SVG_HEIGHT}`}
          width={CRESTS_SVG_WIDTH * 1.5}
          height={CRESTS_SVG_HEIGHT * 1.5}
          className="block"
          aria-hidden
        >
          <g fill="#1a1612">
            {CRESTS_SVG_PATHS.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        </svg>

        {/* Logo sigil. Sized small (42px) so it reads as a mark, not as
        the dominant header element — the wordmark below it carries the
        identity weight. Width-only + `height: auto` so the intrinsic
        aspect ratio is preserved and the bottom of the H isn't cropped. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HIDEAWAY_LOGO_DATA_URL}
          alt=""
          aria-hidden
          className="mt-[20px] mb-[4px] block"
          style={{ width: 42, height: "auto" }}
        />

        {/* Wordmark + sub-wordmark + tagline. The wordmark and sub-wordmark
        stay English-language proper nouns across locales; only the editorial
        tagline beneath them swaps with the locale. */}
        <p
          className={`${instrumentSerif.className} mt-[6px] text-[22px] leading-none`}
        >
          The Hideaway
        </p>
        <p className="mt-[8px] mb-[5px] font-sans text-[11px] font-bold tracking-[0.32em]">
          {t("subWordmark")}
        </p>
        {/* Brand tagline. Locked to English across every locale — this is
        chrome, not localizable copy. `lang="en"` keeps font/AT behaviour
        consistent even when the page locale is Korean. */}
        <p
          className={`${instrumentSerif.className} text-[14px] leading-none text-[#3a342e] italic`}
          lang="en"
        >
          {t("tagline")}
        </p>
      </header>

      {/* ── 2. Issued date (right-aligned) ──────────────────────── */}
      <p
        className={`${instrumentSerif.className} mt-[28px] mb-[16px] text-right text-[14px] text-[#1a1612]`}
        lang={locale}
      >
        {formatLongDate(issuedAt, locale)}
      </p>

      {/* ── 3. Purchased by ─────────────────────────────────────── */}
      <section className="mb-[20px] flex flex-col text-[#1a1612]">
        <p
          className={`${instrumentSerif.className} text-[15px] leading-[1.35] italic`}
          lang={locale}
        >
          {t("purchasedBy")}
        </p>
        <p
          className={`${instrumentSerif.className} text-[15px] leading-[1.2] font-bold`}
        >
          {clientPrimary}
        </p>
        {invoice.client.email ? (
          <p
            className={`${instrumentSerif.className} text-[14px] leading-[1.2]`}
            lang="en"
          >
            {invoice.client.email}
          </p>
        ) : null}
        {invoice.client.handle ? (
          <p
            className={`${instrumentSerif.className} text-[14px] leading-[1.2]`}
            lang="en"
          >
            hideawayseoul.com/@{invoice.client.handle}
          </p>
        ) : null}
        {memberYear ? (
          <p
            className={`${instrumentSerif.className} text-[14px] leading-[1.2]`}
            lang={locale}
          >
            {t("memberSince", { year: memberYear })}
          </p>
        ) : null}
      </section>

      {/* ── 4. Metadata rows. KO labels run longer so the label column
      widens from 150 → 180 px when Korean is the active locale.
      Service period only renders for subscription invoices that carry a
      cycle (one-off product invoices skip the row entirely). ────── */}
      <dl
        className={`${instrumentSerif.className} mb-[18px] grid gap-x-[2px] gap-y-[2px] text-[14px] text-[#1a1612]`}
        style={{
          gridTemplateColumns: `${isKo ? "180px" : "150px"} 1fr`
        }}
      >
        <dt lang={locale}>{t("fields.invoiceNumber")}</dt>
        <dd>: {formatInvoiceNumber(invoice.invoice_number)}</dd>
        <dt lang={locale}>{t("fields.orderNo")}</dt>
        <dd>: {orderRef}</dd>
        {cycleRange ? (
          <>
            <dt lang={locale}>{tPanel("cycleLabel")}</dt>
            <dd>: {cycleRange}</dd>
          </>
        ) : null}
      </dl>

      {/* ── 5. Client copy + rule. Rule shortened from 220 → 160px so it
      reads as a subtle underscore rather than a separator dividing the
      page in half. ──────────────────────────────────────── */}
      <div className="mt-[4px] mb-[12px]">
        <p
          className={`${instrumentSerif.className} mb-[3px] text-[14px] text-[#1a1612] italic`}
          lang={locale}
        >
          {t("clientCopy")}
        </p>
        <div className="h-[0.5px] w-[160px] bg-[#1a1612]" />
      </div>

      {/* ── 6. Line items table ─────────────────────────────────── */}
      <table
        className={`${instrumentSerif.className} w-full border-collapse text-[15px] text-[#1a1612]`}
      >
        <thead>
          <tr className="border-b-[0.5px] border-[#1a1612]">
            <th className="py-[6px] text-left font-normal" />
            <th
              className="py-[6px] pr-0 pl-[6px] text-right font-normal"
              lang={locale}
            >
              {t("table.quantity")}
            </th>
            <th
              className="py-[6px] pr-0 pl-[6px] text-right font-normal"
              lang={locale}
            >
              {t("table.totalAmount")}
            </th>
            <th
              className="py-[6px] pr-0 pl-[6px] text-right font-normal"
              lang={locale}
            >
              {t("table.taxAmount")}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-[6px] pr-[6px] text-left font-bold">
              {planName}
            </td>
            <td className="py-[6px] pr-0 pl-[6px] text-right">1</td>
            <td className="py-[6px] pr-0 pl-[6px] text-right">
              {formatAmount(invoice.amount, invoice.currency)}
            </td>
            <td className="py-[6px] pr-0 pl-[6px] text-right">0</td>
          </tr>
        </tbody>
      </table>

      {/* ── 7. Totals (Subtotal / Tax / Total) ──────────────────── */}
      <table
        className={`${instrumentSerif.className} mt-[8px] mb-[16px] w-full border-collapse text-[15px] text-[#1a1612]`}
      >
        <tbody>
          <tr>
            <td className="py-[6px] pr-[6px] text-left" lang={locale}>
              {t("totals.subtotal")}
            </td>
            <td className="py-[6px] pr-0 pl-[6px] text-right">
              {formatAmount(invoice.amount, invoice.currency)}
            </td>
          </tr>
          <tr>
            <td className="py-[6px] pr-[6px] text-left" lang={locale}>
              {t("totals.tax")}
            </td>
            <td className="py-[6px] pr-0 pl-[6px] text-right">0</td>
          </tr>
          <tr className="border-t-[0.5px] border-[#1a1612]">
            <td className="py-[6px] pr-[6px] text-left font-bold" lang={locale}>
              {t("totals.total")}
            </td>
            <td className="py-[6px] pr-0 pl-[6px] text-right font-bold">
              {formatAmount(invoice.amount, invoice.currency)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── 8. Terms paragraph ─────────────────────────────────── */}
      <p
        className={`${instrumentSerif.className} mt-[8px] mb-[8px] text-[11px] leading-[1.2] text-[#1a1612]`}
        lang={locale}
      >
        {t("terms")}
      </p>

      {/* ── 9. Means of Payment (paid invoices only).
      `mb-[48px]` gives the row real distance from the footer so it stops
      feeling stapled to the closing tagline. ──────────────────── */}
      {isPaid && invoice.payment_method ? (
        <div
          className={`${instrumentSerif.className} mt-[16px] mb-[48px] flex flex-col gap-[3px] text-[15px] text-[#1a1612]`}
        >
          {invoice.payment_method.map((m, i) => (
            <div key={i} className="flex flex-wrap items-baseline gap-x-[22px]">
              <span lang={locale}>{i === 0 ? t("methods.label") : ""}</span>
              <span lang={locale}>{t(`methods.${m.method}`)}</span>
              <span lang={locale}>{i === 0 ? t("methods.amt") : ""}</span>
              <span>{formatAmount(m.amount, m.currency)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── 10. Footer band. Entirely brand chrome, English-only across
      every locale, so all three lines carry `lang="en"`. ──────────── */}
      <footer
        className={`${instrumentSerif.className} mt-auto flex flex-col items-center text-center text-[#1a1612]`}
        lang="en"
      >
        <p className="text-[14px]">{t("footer.tagline")}</p>
        <p className="mt-[2px] mb-[12px] text-[11px]">{t("footer.thanks")}</p>
        <p className="mt-[8px] text-[11px] font-bold">{t("footer.brand")}</p>
      </footer>
    </>
  );
}

/* ---------------------------------------------------------------- *
 *  Action button
 * ---------------------------------------------------------------- */

type ActionButtonProps = {
  label: string;
  onClick: () => void;
  busy?: boolean;
};

function ActionButton({ label, onClick, busy }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "inline-flex w-full items-center justify-between gap-3 border border-border/30 bg-foreground/[0.02] px-4 py-3 font-sans text-[10.5px] tracking-[0.2em] text-foreground/75 uppercase transition-all",
        "hover:border-border/70 hover:bg-foreground/[0.05] hover:text-foreground",
        "disabled:cursor-progress disabled:opacity-60"
      )}
    >
      <span>{label}</span>
      <span aria-hidden className="text-foreground/55">
        →
      </span>
    </button>
  );
}

/* ---------------------------------------------------------------- *
 *  Status stamp — paper-side analogue to the panel's status chip
 *
 *  Renders a bordered, slightly rotated stamp mark in the paper's
 *  upper-right. Always visible (subtle), then becomes a touch more
 *  saturated on paper-hover thanks to the group/paper context. Future
 *  passes can layer a paper-impressed shadow, a fade-in on first
 *  render, or a slight wobble — the structure is here for that.
 * ---------------------------------------------------------------- */
type StatusStampProps = { status: InvoiceDisplay["status"] };

function StatusStamp({ status }: StatusStampProps) {
  const t = useTranslations("Invoice");

  // Pending invoices read as the document's default state — no stamp.
  const isPaid = status === "paid";
  const color = isPaid ? "#7a2e2a" : "#666060";
  switch (status) {
    case "paid":
    case "draft":
    case "pending":
      return (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-[8%] right-[7%] origin-center",
            "transition-[opacity,transform] duration-500 ease-out",
            "opacity-65 group-hover/paper:opacity-90"
          )}
          style={{ transform: "rotate(-8deg)" }}
        >
          <span
            className="block px-3 py-1 font-sans text-[11px] font-bold tracking-[0.32em] uppercase"
            style={{
              color,
              border: `1.5px solid ${color}`,
              backgroundColor: "transparent"
            }}
          >
            {t(`panel.status.${status}`)}
          </span>
        </div>
      );
    default:
      return null;
  }
}
