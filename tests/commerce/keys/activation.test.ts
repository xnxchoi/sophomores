import assert from "node:assert/strict";
import { test } from "node:test";
import { attachMemberKeyGrants } from "@/lib/commerce/keys/activation";
import { recordKeyGrantIntents } from "@/lib/commerce/keys/intents";
import { loadWalletConfig } from "@/lib/member-auth/wallet/config";
import { commerceStorageFake } from "../domain/storage-fake";

const LOCK = "0x00000000000000000000000000000000000000a1";
const SAFE = "0x00000000000000000000000000000000000000b2";
const OTHER = "0x00000000000000000000000000000000000000c3";
process.env.MEMBER_WALLET_LOCK_ADDRESS = LOCK;
const config = loadWalletConfig()!;
const wallet = { memberID: "member", chainID: 84532, safeAddress: SAFE };
const activeWallet = {
  id: "w",
  member: "member",
  chainID: 84532,
  status: "active",
  activeSlot: "member:84532",
  safeAddress: SAFE
};

const intent = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  operationKey: `k:${id}`,
  order: "order",
  payment: "pay",
  entitlement: `adm-${id}`,
  beneficiaryUser: "member",
  recipientMode: "member_safe",
  state: "awaiting_wallet",
  cancelRequested: false,
  ...extra
});
const admission = (id: string, extra: Record<string, unknown> = {}) => ({
  id: `adm-${id}`,
  status: "available",
  benefitReview: false,
  ...extra
});
const seed = () => ({
  "commerce-key-grant-intents": [
    intent("a"),
    intent("b"),
    intent("review"),
    intent("returned"),
    intent("cancelled", { state: "cancelled" }),
    intent("cancel-asked", { cancelRequested: true }),
    intent("held-pay", { payment: "held" }),
    intent("other", { beneficiaryUser: "someone" }),
    intent("dispatched", {
      state: "pending",
      target: { chainID: 84532, lock: LOCK, recipient: OTHER }
    })
  ],
  "commerce-admissions": [
    admission("a"),
    admission("b"),
    admission("review", { benefitReview: true }),
    admission("returned", { returnAcceptedAt: "2026-11-16T00:00:00.000Z" }),
    admission("cancelled"),
    admission("cancel-asked"),
    admission("held-pay"),
    admission("other"),
    admission("dispatched"),
    admission("new")
  ],
  transactions: [
    { id: "pay", status: "succeeded" },
    { id: "held", status: "succeeded", commerceReviewHold: true }
  ],
  "member-wallets": [] as { id: string }[]
});
const byID = (rows: Record<string, unknown>[]) =>
  Object.fromEntries(rows.map((row) => [row.id, row]));
const settle = {
  orderID: "order",
  transactionID: "pay",
  beneficiaryID: "member",
  admissions: [
    {
      id: "adm-new",
      unit: 1,
      order: "order",
      transaction: "pay",
      buyer: "member"
    }
  ]
};

test("activation attaches every eligible awaiting intent and leaves held and cancelled ones untouched", async () => {
  const fake = commerceStorageFake(seed());
  const moved = await fake.transaction({}, (req) =>
    attachMemberKeyGrants(req, wallet, config)
  );
  assert.deepEqual(moved.sort(), ["a", "b"]);
  const rows = byID(fake.rows["commerce-key-grant-intents"]);
  for (const id of ["a", "b"]) {
    assert.equal(rows[id].state, "pending");
    assert.deepEqual(rows[id].target, {
      chainID: 84532,
      lock: LOCK,
      recipient: SAFE
    });
  }
  for (const id of [
    "review",
    "returned",
    "cancel-asked",
    "held-pay",
    "other"
  ]) {
    assert.equal(rows[id].state, "awaiting_wallet", id);
    assert.equal(rows[id].target, undefined, id);
  }
  assert.equal(rows.cancelled.state, "cancelled");
  assert.equal(
    (rows.dispatched.target as { recipient: string }).recipient,
    OTHER,
    "an existing target is never replaced"
  );
});

test("a settlement that lands after activation attaches its intent immediately", async () => {
  const fake = commerceStorageFake({
    ...seed(),
    "commerce-key-grant-intents": [],
    "member-wallets": [activeWallet]
  });
  await fake.transaction({}, (req) =>
    recordKeyGrantIntents({ req, ...settle })
  );
  const [row] = fake.rows["commerce-key-grant-intents"];
  assert.equal(row.state, "pending");
  assert.deepEqual(row.target, { chainID: 84532, lock: LOCK, recipient: SAFE });
});

test("a settlement before activation stays awaiting a wallet", async () => {
  const fake = commerceStorageFake({
    ...seed(),
    "commerce-key-grant-intents": []
  });
  await fake.transaction({}, (req) =>
    recordKeyGrantIntents({ req, ...settle })
  );
  assert.equal(
    fake.rows["commerce-key-grant-intents"][0].state,
    "awaiting_wallet"
  );
  assert.equal(fake.rows["commerce-key-grant-intents"][0].target, undefined);
});

test("invalid wallet configuration never fails a settlement", async () => {
  const fake = commerceStorageFake({
    ...seed(),
    "commerce-key-grant-intents": [],
    "member-wallets": [activeWallet]
  });
  const saved = process.env.MEMBER_WALLET_LOCK_ADDRESS;
  process.env.MEMBER_WALLET_LOCK_ADDRESS = "not-an-address";
  try {
    await fake.transaction({}, (req) =>
      recordKeyGrantIntents({
        req: Object.assign(req, {
          payload: { ...req.payload, logger: { error: () => undefined } }
        }),
        ...settle
      })
    );
  } finally {
    process.env.MEMBER_WALLET_LOCK_ADDRESS = saved;
  }
  assert.equal(
    fake.rows["commerce-key-grant-intents"][0].state,
    "awaiting_wallet"
  );
});

test("a member who activates while their admission is under review gets the key once the hold is released", async () => {
  const { CommerceAdmissions } =
    await import("@/payload/collections/commerce-admissions");
  const base = seed();
  const fake = commerceStorageFake({
    ...base,
    "member-wallets": [activeWallet],
    "commerce-key-grant-intents": [intent("review")]
  });
  // Activation under the hold attaches nothing.
  assert.deepEqual(
    await fake.transaction({}, (req) =>
      attachMemberKeyGrants(req, wallet, config)
    ),
    []
  );
  // The review hold is released: the admission's own hook attaches the member's intent.
  fake.rows["commerce-admissions"] = fake.rows["commerce-admissions"].map(
    (row) => (row.id === "adm-review" ? { ...row, benefitReview: false } : row)
  );
  const hooks = CommerceAdmissions.hooks?.afterChange ?? [];
  assert.ok(
    hooks.length > 0,
    "commerce-admissions releases held keys after a change"
  );
  await fake.transaction({}, async (req) => {
    for (const hook of hooks)
      await hook({
        doc: { id: "adm-review", benefitReview: false, buyer: "member" },
        previousDoc: { id: "adm-review", benefitReview: true, buyer: "member" },
        req,
        operation: "update",
        collection: CommerceAdmissions,
        context: {}
      } as never);
  });
  const [row] = fake.rows["commerce-key-grant-intents"];
  assert.equal(row.state, "pending");
  assert.deepEqual(row.target, { chainID: 84532, lock: LOCK, recipient: SAFE });
});

test("the explicit catch-up sweep attaches cleared intents and reports when more members remain", async () => {
  const { catchUpKeyGrantTargets } =
    await import("@/lib/commerce/keys/activation");
  const fake = commerceStorageFake({
    ...seed(),
    "member-wallets": [activeWallet],
    "commerce-key-grant-intents": [
      intent("a"),
      intent("other", { beneficiaryUser: "someone" })
    ]
  });
  const payload = await fake.transaction({}, async (req) => req.payload);
  const transact = <T>(work: (req: never) => Promise<T>) =>
    fake.transaction({}, work as never);
  const first = await catchUpKeyGrantTargets({
    payload,
    config,
    limit: 1,
    transact: transact as never
  });
  assert.deepEqual(first, { moved: 1, members: 1, more: true });
  const second = await catchUpKeyGrantTargets({
    payload,
    config,
    limit: 10,
    transact: transact as never
  });
  assert.equal(second.more, false);
  assert.equal(
    fake.rows["commerce-key-grant-intents"].find((row) => row.id === "a")
      ?.state,
    "pending"
  );
});
