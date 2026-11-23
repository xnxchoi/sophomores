import assert from "node:assert/strict";
import test from "node:test";
import type { PayloadRequest } from "payload";
import { inPaymentTransaction } from "@/lib/commerce/_shared/transaction";
import { attachBoundMemberWalletGrant } from "@/lib/commerce/keys/wallet-attachment";
import { loadWalletConfig, predictMemberSafe } from "@/lib/member-auth/wallet/safe";
import { nativeTransactionFixture } from "../core/native-transaction-fixture";

const member = "0195a1f2-7c3e-7d4b-9a10-2b3c4d5e6f70";
const env = {
  MEMBER_WALLET_CHAIN_ID: "84532",
  MEMBER_WALLET_OWNER_ADDRESS: "0x1111111111111111111111111111111111111111",
  MEMBER_WALLET_LOCK_ADDRESS: "0x2222222222222222222222222222222222222222",
};
const identity = {
  id: "intent", beneficiaryUser: member, order: "order", payment: "payment", entitlement: "admission",
  operationKey: "unlock-grant:v1:order:1", recipientMode: "member_safe", state: "awaiting_wallet", attempts: 0,
};
const admission = { id: "admission", order: "order", transaction: "payment", buyer: member, unit: 1, status: "available" };
const payment = { id: "payment", order: "order", customer: member, status: "succeeded" };
const guestLock = "0x" + "b".repeat(40);
const guestTarget = { chainID: 84532, lock: guestLock };
const guestSnapshot = {
  version: 3, kind: "guest-ticket-v1", customerID: member, cartID: "cart", productID: "guest-product",
  releaseID: "guest-product", eventID: "event", quantity: 1, accountLimit: 2, currency: "KRW",
  unitAmount: 100, shippingAmount: 0, totalAmount: 100, orderName: "Fixture", productVersion: "1", eventVersion: "1",
  shippingAddress: { country: "KR", recipientName: "Fixture", phone: "01012345678", postalCode: "12345", addressLine1: "Fixture" },
  ticketTarget: guestTarget,
};

async function fixture({
  noWallet = false, intent = {}, admissionPatch = {}, paymentPatch = {}, walletPatch = {}, configuredGuestLock = guestLock,
}: { noWallet?: boolean; intent?: object; admissionPatch?: object; paymentPatch?: object; walletPatch?: object; configuredGuestLock?: string } = {}) {
  const f = await nativeTransactionFixture();
  const config = loadWalletConfig(env);
  assert.ok(config);
  const safe = await predictMemberSafe(config, member);
  const wallet = { ...safe, id: "wallet", member, activeSlot: member, walletKey: `84532:${safe.safeAddress}`, status: "active", ...walletPatch };
  let row = { ...identity, ...intent };
  const changes: object[] = [];
  Object.assign(f.req.payload, {
    findByID: async ({ req, collection }: { req: PayloadRequest; collection: string }) => {
      assert.equal(req === f.req, true);
      if (collection === "commerce-key-grant-intents") return row;
      if (collection === "commerce-admissions") return { ...admission, ...admissionPatch };
      if (collection === "transactions") return { ...payment, ...paymentPatch };
      if (collection === "orders") return { id: "order", commerceSnapshot: guestSnapshot };
      if (collection === "commerce-events") return { id: "event", checkInAuthority: "unlock-events",
        unlockTicketConfiguration: { chainID: 84532, guestLock: configuredGuestLock, memberLock: env.MEMBER_WALLET_LOCK_ADDRESS, guestProductID: "guest-product" } };
      throw new Error("Unexpected collection");
    },
    find: async ({ req, collection }: { req: PayloadRequest; collection: string }) => {
      assert.equal(req === f.req && collection === "member-wallets", true);
      return { docs: noWallet ? [] : [wallet], totalDocs: noWallet ? 0 : 1 };
    },
    update: async ({ req, collection, id, data }: { req: PayloadRequest; collection: string; id: string; data: object }) => {
      assert.equal(req === f.req && collection === "commerce-key-grant-intents" && id === identity.id, true);
      changes.push(data);
      row = { ...row, ...data };
      return row;
    },
  });
  return { ...f, changes, safe, attach: (configEnv = env) =>
    inPaymentTransaction(f.req, () => attachBoundMemberWalletGrant(f.req, identity.id, configEnv)) };
}

test("Guest attachment uses the pinned event lock and verified buyer Safe; drift never retargets", async (t) => {
  const admissionPatch = { ticketTier: "guest", ticketTarget: guestTarget, event: "event" };
  const f = await fixture({ admissionPatch });
  t.after(f.cleanup);
  assert.equal(await f.attach(), "attached");
  assert.equal(await f.attach(), "already-attached");
  assert.deepEqual(f.changes, [{ state: "pending", target: {
    ...guestTarget, recipient: f.safe.safeAddress, ticketTier: "guest",
  } }]);
  const drift = await fixture({ admissionPatch, configuredGuestLock: "0x" + "c".repeat(40) });
  t.after(drift.cleanup);
  assert.equal(await drift.attach(), "conflict");
  assert.deepEqual(drift.changes, []);
});

test("only the owned request attaches an exact canonical target and replay is read-only", async (t) => {
  const f = await fixture();
  t.after(f.cleanup);
  await assert.rejects(attachBoundMemberWalletGrant(f.req, identity.id, env), /native transaction owner/);
  assert.equal(await f.attach(), "attached");
  assert.equal(await f.attach(), "already-attached");
  assert.deepEqual(f.changes, [{
    state: "pending", target: { chainID: 84532, lock: env.MEMBER_WALLET_LOCK_ADDRESS, recipient: f.safe.safeAddress },
  }]);
  const keys = f.queries.filter((entry) => entry.text.includes("pg_advisory_xact_lock")).map((entry) => entry.values[0]);
  assert.deepEqual(keys, Array.from({ length: 2 }, () => [
    "commerce:order-benefits:order", "commerce:admission:admission",
    `commerce:member-wallet:${member}`, "commerce:key-grant:unlock-grant:v1:order:1",
  ]).flat());
});

test("missing or conflicting bindings, holds and prior attempt evidence never write a target", async (t) => {
  for (const [patch, expected] of [
    [{ noWallet: true }, "wallet-missing"],
    [{ walletPatch: { chainID: 137 } }, "conflict"],
    [{ walletPatch: { member: "different-member" } }, "conflict"],
    [{ walletPatch: { safeAddress: env.MEMBER_WALLET_LOCK_ADDRESS } }, "conflict"],
    [{ paymentPatch: { commerceReviewHold: true } }, "held"],
    [{ paymentPatch: { commerceResolutionConflict: true } }, "held"],
    [{ paymentPatch: { status: "pending" } }, "held"],
    [{ admissionPatch: { benefitReview: true } }, "held"],
    [{ admissionPatch: { returnAcceptedAt: "2026-11-22" } }, "held"],
    [{ intent: { cancelRequested: true } }, "held"],
    [{ intent: { nonce: 0 } }, "conflict"],
    [{ intent: { target: { chainID: 137, lock: env.MEMBER_WALLET_LOCK_ADDRESS, recipient: env.MEMBER_WALLET_OWNER_ADDRESS }, state: "pending" } }, "conflict"],
  ] as const) {
    const f = await fixture(patch);
    t.after(f.cleanup);
    assert.equal(await f.attach(), expected, JSON.stringify(patch));
    assert.deepEqual(f.changes, []);
  }
});

test("malformed intent ownership aborts rather than using the current request principal", async (t) => {
  const f = await fixture({ admissionPatch: { buyer: "different-member" } });
  t.after(f.cleanup);
  await assert.rejects(f.attach(), /entitlement identity/);
  assert.deepEqual(f.changes, []);
  assert.equal(f.events.at(-1), "rollback");
});
