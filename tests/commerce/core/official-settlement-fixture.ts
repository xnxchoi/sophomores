import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { PayloadRequest } from "payload";
import { inPaymentEndpoint, lockCommerce } from "../../../src/lib/commerce/_shared/transaction";
import { withCommerceWrite } from "../../../src/lib/commerce/access";
import { nativeTransactionFixture, type NativeFaults } from "./native-transaction-fixture";

const require = createRequire(import.meta.url);
const entry = path.join(path.dirname(require.resolve("@payloadcms/plugin-ecommerce")), "endpoints/confirmOrder.js");
type State = { effects: string[]; transaction: Record<string, unknown>; orders: { id: string }[] };
export const settlementEffects = ["claim", "order", "cart", "inventory", "transaction", "reservation", "allowance", "admission"];
type Options = NativeFaults & {
  afterEffect?: (effect: string, req: PayloadRequest) => void | Promise<void>;
  commitAppliedBeforeError?: boolean;
};

/** Real installed official finalizer; Local API rows/hooks are explicitly synthetic. */
export async function officialSettlementFixture(options: Options = {}) {
  let committed: State = { effects: [], transaction: { id: "attempt", status: "pending", items: [{ product: "product", quantity: 1 }] }, orders: [] };
  let staged = structuredClone(committed);
  const f = await nativeTransactionFixture({ ...options, onQuery: async (kind) => {
    if (kind === "begin") staged = structuredClone(committed);
    if (kind === "commit" && (!options.commitError || options.commitAppliedBeforeError)) committed = structuredClone(staged);
    await options.onQuery?.(kind);
  } });
  const { req, adapter } = f;
  const state = async () => (await req.transactionID && adapter.sessions[String(await req.transactionID)]) ? staged : committed;
  const effect = async (name: string) => {
    const current = await state();
    current.effects.push(name);
    await options.afterEffect?.(name, req);
  };
  const check = (input: { req: PayloadRequest }) => assert.equal(input.req === req, true, "official finalizer must retain the exact request");
  Object.assign(req, { user: { id: "customer", email: "member@example.com", collection: "users" },
    data: { cartID: "cart", transactionID: "attempt" } });
  Object.assign(req.payload, {
    findByID: async (input: { collection: string; req: PayloadRequest }) => {
      check(input);
      return input.collection === "carts" ? { id: "cart", currency: "KRW" } : structuredClone((await state()).transaction);
    },
    find: async (input: { req: PayloadRequest }) => { check(input); const docs = (await state()).orders; return { docs, totalDocs: docs.length }; },
    create: async (input: { req: PayloadRequest }) => {
      check(input); (await state()).orders.push({ id: "order" }); await effect("order"); return { id: "order" };
    },
    update: async (input: { collection: string; data: Record<string, unknown>; req: PayloadRequest }) => {
      check(input);
      if (input.collection === "carts") await effect("cart");
      else {
        Object.assign((await state()).transaction, input.data);
        await effect("transaction");
        // Synthetic afterChange effects model the real same-request hooks. Real
        // domain hook behavior remains covered by its separate regression suite.
        for (const name of ["reservation", "allowance", "admission"]) await effect(name);
      }
      return { id: "attempt" };
    },
  });
  adapter.updateOne = (async (input: { collection: string; req: PayloadRequest }) => {
    check(input);
    if (input.collection === "transactions") {
      (await state()).transaction.status = "processing";
      await effect("claim");
      return structuredClone((await state()).transaction);
    }
    await effect("inventory"); return { id: "product" };
  }) as typeof adapter.updateOne;
  const endpointModule: unknown = await import(pathToFileURL(entry).href);
  assert.ok(endpointModule && typeof endpointModule === "object" && "confirmOrderHandler" in endpointModule && typeof endpointModule.confirmOrderHandler === "function");
  const handler = endpointModule.confirmOrderHandler({ currenciesConfig: { defaultCurrency: "KRW" }, paymentMethod: {
    confirmOrder: async ({ req: same, finalizeOrder }: { req: PayloadRequest; finalizeOrder: (input: unknown) => Promise<{ id: string }> }) => {
      assert.equal(same === req, true);
      await f.capture();
      await lockCommerce(req, ["attempt:attempt"]);
      const order = await withCommerceWrite(req, () => finalizeOrder({ transactionID: "attempt", orderData: {} }));
      return { orderID: order.id, transactionID: "attempt" };
    },
  } }) as (req: PayloadRequest) => Promise<Response>;
  return { ...f, committed: () => structuredClone(committed), run: (owned = true) => owned ? inPaymentEndpoint(req, handler) : handler(req) };
}
