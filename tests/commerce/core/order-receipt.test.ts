import assert from "node:assert/strict";
import { test } from "node:test";
import type { Payload, TypedUser } from "payload";
import { projectOrderReceipt, receiptWithoutDelivery } from "@/lib/commerce/receipt/order-receipt";
import { createReceiptDeliveryHandler, createReceiptPdfHandler, readOrderDetail } from "@/lib/commerce/receipt/http";
import { renderReceiptPdf } from "@/lib/commerce/receipt/pdf";
import { guestPurchaseSnapshotSchema } from "@/lib/commerce/purchase-snapshot";
import english from "../../../messages/en.json";

const orderID = "915de316-e98d-4ca7-9d32-f5cb6785daf0";
const buyer = { collection: "users", id: "buyer" } as TypedUser;
const staff = { collection: "admins", id: "staff", _strategy: "staff-better-auth", role: "admin",
  email: "staff@example.invalid", name: "Fixture staff",
  createdAt: "2026-11-22T00:00:00Z", updatedAt: "2026-11-22T00:00:00Z",
} satisfies Extract<TypedUser, { collection: "admins" }> & { _strategy: string };
const facts = {
  customerID: "buyer", cartID: "cart", productID: "book", quantity: 1, currency: "KRW",
  unitAmount: 35000, shippingAmount: 3000, totalAmount: 38000, orderName: "한글 Book",
  shippingAddress: { country: "KR", recipientName: "Fixture", phone: "01012345678",
    postalCode: "12345", addressLine1: "서울", deliveryInstructions: "private instruction" },
  productVersion: "1",
};
const native = { ...facts, version: 2, kind: "native-edition-v1", releaseID: "book", eventID: null,
  optionID: "option", variantID: "sku", variantVersion: "1", variantTypeID: "type", editionLabel: "Book only",
  editionKind: "book-only", editionRuleVersion: 1, maximumQuantity: 1,
  editionEntitlements: { membershipSignet: false, freeLaunchTicket: false },
  termsRevision: "1", disclosureRevision: "1", fulfillmentRevision: "1", benefitRevision: "1" };
const current = { ...facts, version: 1, eventID: "event", eventVersion: "1", releaseID: "membership", accountLimit: 1 };
const order = { id: orderID, customer: "buyer", commerceVersion: "commerce-v1", amount: 38000,
  currency: "KRW", status: "processing", createdAt: "2026-11-22T00:00:00Z",
  commerceSnapshot: native, commerceAttemptID: "private attempt",
  fulfillment: { status: "packed", trackingNumber: "tracking", returnDisposition: "private review" } };

test("guest-ticket v3 does not produce a membership or shipping receipt", async () => {
  const snapshot = guestPurchaseSnapshotSchema.parse({
    ...current, version: 3, kind: "guest-ticket-v1", releaseID: current.productID,
    shippingAmount: 0, totalAmount: current.unitAmount,
    ticketTarget: { chainID: 84532, lock: "0x1111111111111111111111111111111111111111" },
  });
  const guestOrder = { ...order, amount: snapshot.totalAmount, commerceSnapshot: snapshot };
  assert.equal(projectOrderReceipt(guestOrder, orderID), null);
  const payload = { findByID: async () => guestOrder } as unknown as Payload;
  const detail = await readOrderDetail({ payload, user: buyer }, orderID);
  assert.equal(detail?.kind, "record");
  if (detail?.kind === "record") assert.equal(detail.record.amount, snapshot.totalAmount);
});

test("one projection reads the frozen amount and recorded entitlements without private payment fields", () => {
  const v2 = projectOrderReceipt(order, orderID);
  assert.ok(v2);
  assert.equal(v2.id, orderID);
  assert.equal(v2.name, facts.orderName);
  assert.equal(v2.totalAmount, 38000);
  assert.deepEqual(v2.benefits, { membershipSignet: false, freeLaunchTicket: false });
  assert.equal(v2.fulfillment?.status, "packed");
  assert.doesNotMatch(JSON.stringify(v2), /private (attempt|review|instruction)|productVersion/);
  const initial = receiptWithoutDelivery(v2);
  assert.equal("address" in initial || "fulfillment" in initial, false);
  const v1 = projectOrderReceipt({ ...order, commerceSnapshot: current }, orderID);
  assert.deepEqual(v1?.benefits, { membershipSignet: true, freeLaunchTicket: true });
  for (const [editionKind, unitAmount] of [["personal", 82000], ["premium", 329000]] as const) {
    const totalAmount = unitAmount + 3000;
    const receipt = projectOrderReceipt({ ...order, amount: totalAmount, commerceSnapshot: {
      ...native, editionKind, eventID: "launch", unitAmount, totalAmount,
      editionEntitlements: { membershipSignet: true, freeLaunchTicket: true },
    } }, orderID);
    assert.equal(receipt?.totalAmount, totalAmount);
    assert.deepEqual(receipt?.benefits, { membershipSignet: true, freeLaunchTicket: true });
  }
  for (const raw of [{ ...order, amount: 1 }, { ...order, customer: "other" },
    { ...order, commerceVersion: "legacy" }, { ...order, commerceSnapshot: { ...native, editionRuleVersion: 999 } }]) {
    assert.equal(projectOrderReceipt(raw, orderID), null);
  }
});

test("delivery requires a fresh session for the page principal and the order owner", async () => {
  let user: TypedUser | null = buyer;
  let reads = 0;
  const payload = { findByID: async (input: { overrideAccess: boolean; user: TypedUser }) => {
    reads++;
    assert.equal(input.overrideAccess, false);
    assert.equal(input.user, user);
    return order;
  } } as unknown as Payload;
  const handler = createReceiptDeliveryHandler(async () => user ? { payload, user } : null);
  const read = (principal = "users:buyer") => handler(new Request("http://localhost/api/invoice/delivery?order=" + orderID,
    { headers: { "x-receipt-principal": principal } }));
  const own = await read();
  assert.equal(own.status, 200);
  assert.equal(own.headers.get("cache-control"), "private, no-store");
  const data = await own.json();
  assert.equal(data.address.phone, facts.shippingAddress.phone);
  assert.equal("deliveryInstructions" in data.address || "returnDisposition" in data.fulfillment, false);
  user = null;
  assert.equal((await read()).status, 401);
  user = staff;
  assert.equal((await read()).status, 403, "a freshly authorized staff account cannot revive an old buyer page");
  user = { ...buyer, id: "other" };
  assert.equal((await read()).status, 403);
  assert.equal(reads, 1);
  assert.equal((await read("users:other")).status, 404, "matching a caller header cannot authorize a different buyer");
  assert.equal(reads, 2);
});

test("receipt PDF route admits only authenticated owners and authorized staff, and limits attempts", async () => {
  let user: TypedUser | null = null;
  let reads = 0;
  let renders = 0;
  const payload = { findByID: async (input: { overrideAccess: unknown; user: TypedUser; id: string }) => {
    reads++;
    assert.equal(input.overrideAccess, false);
    assert.equal(input.id, orderID);
    assert.equal(input.user, user);
    // Deliberately return the row even to other buyers: the boundary checks the owner too.
    return order;
  } } as unknown as Payload;
  const handler = createReceiptPdfHandler(async () => user ? { payload, user } : null, async (receipt) => {
    renders++;
    assert.equal(receipt.id, orderID);
    return new TextEncoder().encode("%PDF-test");
  });
  const request = (suffix = "") => handler(new Request("http://localhost/api/invoice/pdf?order=" + orderID + suffix));
  assert.equal((await request()).status, 401);
  assert.equal(reads, 0);
  user = { ...buyer, id: "other" };
  assert.equal((await request()).status, 404);
  assert.equal(renders, 0);
  user = buyer;
  const downloaded = await request();
  assert.equal(downloaded.status, 200);
  assert.equal(downloaded.headers.get("cache-control"), "private, no-store");
  assert.equal(downloaded.headers.get("content-disposition"), `attachment; filename="receipt-${orderID}.pdf"`);
  assert.equal(await downloaded.text(), "%PDF-test");
  const printable = await request("&view=inline");
  assert.equal(printable.status, 200);
  assert.equal(printable.headers.get("content-disposition"), `inline; filename="receipt-${orderID}.pdf"`);
  assert.equal((await request("&view=external")).status, 404);
  user = staff;
  assert.equal((await request()).status, 200);
  const unverifiedStaff = { ...staff, _strategy: "wrong" };
  user = unverifiedStaff;
  assert.equal((await request()).status, 403);
  user = buyer;
  const statuses = [];
  for (let i = 0; i < 8; i++) statuses.push((await request()).status);
  assert.ok(statuses.includes(429));
});

test("the installed pdfmake renderer produces a PDF for the same Korean-capable receipt", async () => {
  const receipt = projectOrderReceipt(order, orderID);
  assert.ok(receipt);
  const strings = english.Customer.components_commerce_orders;
  const bytes = await renderReceiptPdf(receipt, "ko", {
    receipt: "Receipt", orderNumber: receipt.id, date: "Date", status: "Processing",
    quantity: strings.quantity, unitPrice: strings.unitPrice, shipping: strings.shippingFee,
    total: strings.recordedAmount, benefits: "Included with the order", delivery: strings.delivery,
    signet: "Membership Signet", ticket: "Launch ticket",
  });
  assert.equal(Buffer.from(bytes).subarray(0, 4).toString(), "%PDF");
  assert.ok(bytes.byteLength > 1000);
});

test("an owned legacy order keeps its date, status and USD/KRW total without a receipt", async () => {
  const legacy = { id: orderID, user: "buyer", commerceVersion: "legacy",
    status: "paid", createdAt: order.createdAt, currency: "USD", totalAmount: 1234 };
  let row: Record<string, unknown> = legacy;
  const payload = { findByID: async (input: { overrideAccess: boolean; select: Record<string, boolean> }) => {
    assert.equal(input.overrideAccess, false);
    assert.equal(input.select.user, true);
    assert.equal(input.select.totalAmount, true);
    return row;
  } } as unknown as Payload;
  const detail = () => readOrderDetail({ payload, user: buyer }, orderID);
  assert.deepEqual(await detail(), { kind: "record", record: {
    id: orderID, createdAt: order.createdAt, status: "paid", amount: 1234, currency: "USD", legacy: true,
  } });
  row = { ...row, currency: "KRW", totalAmount: 35000 };
  assert.deepEqual(await detail(), { kind: "record", record: {
    id: orderID, createdAt: order.createdAt, status: "paid", amount: 35000, currency: "KRW", legacy: true,
  } });
  let rendered = false;
  const pdf = createReceiptPdfHandler(async () => ({ payload, user: buyer }), async () => {
    rendered = true;
    throw new Error("No PDF for an order record");
  });
  assert.equal((await pdf(new Request("http://localhost/api/invoice/pdf?order=" + orderID))).status, 404);
  assert.equal(rendered, false);
  row = { id: orderID, user: "buyer", commerceVersion: "legacy" };
  assert.deepEqual(await detail(), { kind: "record", record: {
    id: orderID, createdAt: null, status: null, amount: null, currency: null, legacy: true,
  } });
  // The second owner fence must hold even if the storage seam returns a foreign row.
  row = { ...legacy, user: "other", customer: "buyer" };
  assert.equal(await detail(), null);
});

test("an owned current order with an invalid snapshot keeps its record but cannot issue a PDF", async () => {
  const row = { ...order, commerceSnapshot: { ...native, editionRuleVersion: 999 } };
  const payload = { findByID: async () => row } as unknown as Payload;
  const detail = await readOrderDetail({ payload, user: buyer }, orderID);
  assert.deepEqual(detail, { kind: "record", record: {
    id: orderID, createdAt: order.createdAt, status: "processing", amount: 38000, currency: "KRW", legacy: false,
  } });
  let rendered = false;
  const pdf = createReceiptPdfHandler(async () => ({ payload, user: buyer }), async () => {
    rendered = true;
    throw new Error("No PDF for an order record");
  });
  assert.equal((await pdf(new Request("http://localhost/api/invoice/pdf?order=" + orderID))).status, 404);
  assert.equal(rendered, false);
});
