import { resolve } from "node:path";
import pdfmake from "pdfmake";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { OrderReceipt } from "./order-receipt";

const normal = resolve("public/fonts/Pretendard/Pretendard-Regular.otf");
const bold = resolve("public/fonts/Pretendard/Pretendard-Bold.otf");
pdfmake.setFonts({ Pretendard: { normal, bold } });
// Receipt rendering may only read its bundled fonts and never fetch a URL.
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy((path) => path === normal || path === bold);

export type ReceiptPdfLabels = {
  receipt: string; orderNumber: string; date: string; status: string;
  quantity: string; unitPrice: string; shipping: string; total: string;
  benefits: string; delivery: string; signet: string; ticket: string;
};

/** Adapted from Hideaway's A4 invoice: certificate heading, item table, total and supporting facts. */
export async function renderReceiptPdf(receipt: OrderReceipt, locale: string, labels: ReceiptPdfLabels) {
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: receipt.currency });
  const date = new Intl.DateTimeFormat(locale, { timeZone: "Asia/Seoul", dateStyle: "long" });
  const { address, benefits } = receipt;
  const included = [benefits.membershipSignet && labels.signet, benefits.freeLaunchTicket && labels.ticket]
    .filter((text): text is string => Boolean(text));
  const content: Content[] = [
    { text: labels.receipt, fontSize: 29, bold: true, margin: [0, 0, 0, 14] },
    { text: labels.orderNumber },
    { text: `${labels.date}: ${date.format(new Date(receipt.createdAt))}` },
    { text: labels.status, margin: [0, 0, 0, 24] },
    { text: receipt.name, fontSize: 17, bold: true },
    ...(receipt.edition && receipt.edition !== receipt.name ? [{ text: receipt.edition }] : []),
    { layout: "lightHorizontalLines", margin: [0, 16, 0, 20], table: {
      widths: ["*", "auto"],
      body: [[labels.quantity, String(receipt.quantity)], [labels.unitPrice, money.format(receipt.unitAmount)],
        [labels.shipping, money.format(receipt.shippingAmount)],
        [{ text: labels.total, bold: true }, { text: money.format(receipt.totalAmount), bold: true }]],
    } },
    ...(included.length ? [{ text: labels.benefits, bold: true }, { ul: included }] : []),
    { text: labels.delivery, bold: true, margin: [0, 20, 0, 5] },
    { text: [address.recipientName, address.phone, address.addressLine1, address.addressLine2,
      `${address.postalCode}, ${address.country}`].filter(Boolean).join("\n") },
  ];
  const document: TDocumentDefinitions = {
    pageSize: "A4", pageMargins: [48, 48, 48, 48], content,
    defaultStyle: { font: "Pretendard", fontSize: 11, lineHeight: 1.25 },
    info: { title: labels.receipt },
  };
  return Uint8Array.from(await pdfmake.createPdf(document).getBuffer());
}
