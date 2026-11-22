import assert from "node:assert/strict";
import test from "node:test";
import type { PayloadRequest } from "payload";
import { reservePurchase, releaseReservation, settleReservation } from "../../../src/lib/commerce/reservations";
import { commerceStorageFake, saleSeed } from "./storage-fake";

test("reservation refuses transactionless execution before touching storage", async () => {
  const req = { payload: { db: {} } } as unknown as PayloadRequest;
  await assert.rejects(reservePurchase({ req, attemptID: "a", customerID: "u", releaseID: "membership" as const, accountLimit: 1, productID: "p", eventID: "e", quantity: 1, snapshotHash: "a".repeat(64) }), /transaction/i);
});

test("unknown or READY payment cannot release a reservation", async () => {
  await assert.rejects(releaseReservation({ req: {} as PayloadRequest, attemptID: "a", verifiedReason: "READY" as never, providerEventID: "event" }), /verified|reason/i);
});

test("quantity is bounded by the recorded account limit before any counter is changed", async () => {
  await assert.rejects(reservePurchase({ req: {} as PayloadRequest, attemptID: "a", customerID: "u", releaseID: "membership" as const, accountLimit: 1, productID: "p", eventID: "e", quantity: 2, snapshotHash: "a".repeat(64) }), /quantity/i);
});

const purchase = { productID: "p", releaseID: "membership" as const, accountLimit: 1, eventID: "e", snapshotHash: "a".repeat(64) };

test("serialized concurrent fake transactions enforce net account allowance", async () => {
  const fake = commerceStorageFake(saleSeed());
  // Owner decision 2026-11-14: one unit per buyer per release.
  const results = await Promise.allSettled(["a", "b"].map((attemptID) => fake.transaction({}, (req) => reservePurchase({ req, ...purchase, customerID: "u", attemptID, quantity: 1 }))));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(fake.rows["commerce-allowances"][0].reservedQuantity, 1);
  assert.equal(fake.rows.products[0].inventory, 10, "reservations never decrement plugin inventory");
});

test("a paid membership token prevents another order for the same account", async () => {
  const fake = commerceStorageFake(saleSeed());
  await fake.transaction({}, async (req) => {
    await reservePurchase({ req, ...purchase, customerID: "u", attemptID: "a", quantity: 1 });
    await settleReservation({ req, attemptID: "a", orderID: "order" });
  });
  await assert.rejects(fake.transaction({}, req =>
    reservePurchase({ req, ...purchase, customerID: "u", attemptID: "b", quantity: 1 })), /Account membership allowance exceeded/);
  await fake.transaction({}, req =>
    reservePurchase({ req, ...purchase, customerID: "other", attemptID: "c", quantity: 1 }));
  assert.equal(fake.rows["commerce-reservations"].length, 2, "another account can still reserve its own membership token");
});

test("serialized concurrent fake transactions cannot oversell last stock or admission", async () => {
  for (const [stock, capacity] of [[1, 10], [10, 1]]) {
    const fake = commerceStorageFake(saleSeed(stock, capacity));
    const results = await Promise.allSettled(["a", "b"].map((attemptID) => fake.transaction({}, (req) => reservePurchase({ req, ...purchase, customerID: attemptID, attemptID, quantity: 1 }))));
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(fake.rows["commerce-events"][0].reservedQuantity, 1);
  }
});

test("settlement is idempotent and verified cancellation releases net allowance once", async () => {
  const fake = commerceStorageFake(saleSeed());
  await fake.transaction({}, async (req) => {
    await reservePurchase({ req, ...purchase, customerID: "u", attemptID: "a", quantity: 1 });
    await settleReservation({ req, attemptID: "a", orderID: "order" });
    await settleReservation({ req, attemptID: "a", orderID: "order" });
    await req.payload.create({ collection: "commerce-admissions" as never, data: { orderUnitKey: "order:1", status: "available" } as never, req });
    await releaseReservation({ req, attemptID: "a", verifiedReason: "confirmed-cancel", providerEventID: "verified-cancel-1" });
    await releaseReservation({ req, attemptID: "a", verifiedReason: "confirmed-cancel", providerEventID: "verified-cancel-1" });
  });
  assert.equal(fake.rows["commerce-allowances"][0].paidQuantity, 0);
  assert.equal(fake.rows["commerce-events"][0].committedQuantity, 0);
  assert.equal(fake.rows.products[0].inventory, 10);
  assert.equal(fake.rows["commerce-admissions"][0].status, "revoked");
});

// Owner, 22 Nov: single membership token per account, across every release.
function twoProductSeed() {
  const seed = saleSeed();
  return { ...seed,
    products: [...seed.products, { ...seed.products[0], id: "q", event: "f" }],
    "commerce-events": [...seed["commerce-events"], { ...seed["commerce-events"][0], id: "f" }],
  };
}
const otherProduct = { ...purchase, productID: "q", eventID: "f" };

test("a single membership token per account holds across different products and events", async () => {
  const fake = commerceStorageFake(twoProductSeed());
  await fake.transaction({}, async (req) => {
    await reservePurchase({ req, ...purchase, customerID: "u", attemptID: "a", quantity: 1 });
    await settleReservation({ req, attemptID: "a", orderID: "order" });
  });
  await assert.rejects(fake.transaction({}, (req) =>
    reservePurchase({ req, ...otherProduct, customerID: "u", attemptID: "b", quantity: 1 })), /Account membership allowance exceeded/);
  // Concurrent attempts on two products serialize on the one account allowance.
  const results = await Promise.allSettled([purchase, otherProduct].map((offer, index) => fake.transaction({}, (req) =>
    reservePurchase({ req, ...offer, customerID: "v", attemptID: `v${index}`, quantity: 1 }))));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  await fake.transaction({}, (req) => reservePurchase({ req, ...otherProduct, customerID: "w", attemptID: "c", quantity: 1 }));
  assert.equal(fake.rows["commerce-allowances"].length, 3, "one membership allowance per account, not per product");
});

test("a cancelled membership token frees the account only after its key is cancelled", async () => {
  const fake = commerceStorageFake(twoProductSeed());
  await fake.transaction({}, async (req) => {
    await reservePurchase({ req, ...purchase, customerID: "u", attemptID: "a", quantity: 1 });
    await settleReservation({ req, attemptID: "a", orderID: "order" });
    // Settlement records the key this order is owed (ADR-0004).
    await req.payload.create({ collection: "commerce-key-grant-intents" as never, data: { order: "order", state: "granted", beneficiaryUser: "u" } as never, req });
    await req.payload.create({ collection: "commerce-admissions" as never, data: { orderUnitKey: "order:1", status: "available" } as never, req });
    await releaseReservation({ req, attemptID: "a", verifiedReason: "confirmed-cancel", providerEventID: "verified-cancel-1" });
  });
  assert.equal(fake.rows["commerce-allowances"][0].paidQuantity, 0);
  await assert.rejects(fake.transaction({}, (req) =>
    reservePurchase({ req, ...otherProduct, customerID: "u", attemptID: "b", quantity: 1 })), /earlier membership key is not yet cancelled/);
  fake.rows["commerce-key-grant-intents"][0].state = "cancelled";
  await fake.transaction({}, (req) => reservePurchase({ req, ...otherProduct, customerID: "u", attemptID: "b", quantity: 1 }));
});

test("event and invitation keys stay independent of the membership allowance", async () => {
  // A live key from an order that is not this account's membership order never blocks it.
  const seed = saleSeed();
  const fake = commerceStorageFake({ ...seed, orders: [...seed.orders, { id: "event-order", commerceVersion: "event-v1" }],
    "commerce-key-grant-intents": [{ id: "event-key", order: "event-order", state: "granted", beneficiaryUser: "u" }] });
  await fake.transaction({}, (req) => reservePurchase({ req, ...purchase, customerID: "u", attemptID: "a", quantity: 1 }));
  // Guest claims and key intents use their own authorities and never read the allowance.
  const { readFileSync } = await import("node:fs");
  for (const file of ["src/lib/commerce/guests.ts", "src/lib/commerce/keys/intents.ts"]) {
    assert.equal(readFileSync(file, "utf8").includes("commerce-allowances"), false, file);
  }
});

test("the live-key check reads every page of the account's keys and finds a membership key past the first", async () => {
  const seed = saleSeed();
  const eventKeys = Array.from({ length: 120 }, (_, index) => ({ id: `event-key-${String(index).padStart(3, "0")}`, order: "event-order", state: "granted", beneficiaryUser: "u" }));
  const fake = commerceStorageFake({ ...seed, orders: [...seed.orders, { id: "event-order", commerceVersion: "event-v1" }],
    "commerce-key-grant-intents": [...eventKeys, { id: "membership-key", order: "order", state: "submitted", beneficiaryUser: "u" }] });
  await assert.rejects(fake.transaction({}, (req) =>
    reservePurchase({ req, ...purchase, customerID: "u", attemptID: "a", quantity: 1 })), /earlier membership key is not yet cancelled/);
  assert.equal(fake.rows["commerce-reservations"]?.length ?? 0, 0);
});

test("a live key whose order is missing or unreadable fails closed", async () => {
  for (const intent of [{ id: "orphan", state: "pending", beneficiaryUser: "u" }, { id: "dangling", order: "gone", state: "pending", beneficiaryUser: "u" }]) {
    const fake = commerceStorageFake({ ...saleSeed(), "commerce-key-grant-intents": [intent] });
    await assert.rejects(fake.transaction({}, (req) => reservePurchase({ req, ...purchase, customerID: "u", attemptID: "a", quantity: 1 })));
  }
});

test("recorded limits and quantities stay within the three units storage holds", async () => {
  for (const [accountLimit, quantity] of [[4, 1], [0, 1], [3, 4]]) {
    await assert.rejects(reservePurchase({ req: {} as PayloadRequest, attemptID: "a", customerID: "u", releaseID: "membership" as const,
      accountLimit, productID: "p", eventID: "e", quantity, snapshotHash: "a".repeat(64) }), /recorded account limit/);
  }
});

test("the live-key check still finds a membership key when earlier keys are cancelled between pages", async () => {
  // 100 event keys fill two pages; the membership key sorts after them. A cancel
  // commits between pages (its own intent lock), so 10 already-read rows leave the
  // live set. An offset read would then skip the membership key; a keyset read cannot.
  const seed = saleSeed();
  const eventKeys = Array.from({ length: 100 }, (_, index) => ({ id: `event-key-${String(index).padStart(3, "0")}`, order: "event-order", state: "granted", beneficiaryUser: "u" }));
  const fake = commerceStorageFake({ ...seed, orders: [...seed.orders, { id: "event-order", commerceVersion: "event-v1" }],
    "commerce-key-grant-intents": [...eventKeys, { id: "membership-key", order: "order", state: "submitted", beneficiaryUser: "u" }] });
  await assert.rejects(fake.transaction({}, async (req) => {
    const find = req.payload.find.bind(req.payload);
    let reads = 0;
    req.payload.find = (async (args: Parameters<typeof find>[0]) => {
      const result = await find(args);
      if (args.collection === "commerce-key-grant-intents" && ++reads === 2) {
        for (const row of fake.rows["commerce-key-grant-intents"].slice(0, 10)) row.state = "cancelled";
      }
      return result;
    }) as typeof find;
    await reservePurchase({ req, ...purchase, customerID: "u", attemptID: "a", quantity: 1 });
  }), /earlier membership key is not yet cancelled/);
});
