import assert from "node:assert/strict";
import { test } from "node:test";
import { attachMemberKeyGrants } from "@/lib/commerce/keys/member-wallet";
import { recordKeyGrantIntents } from "@/lib/commerce/keys/intents";
import { loadWalletConfig } from "@/lib/member-auth/wallet/config";
import { predictMemberSafe } from "@/lib/member-auth/wallet/safe";
import { commerceStorageFake } from "../domain/storage-fake";

const LOCK = "0x00000000000000000000000000000000000000a1";
const SAFE = "0x00000000000000000000000000000000000000b2";
const OTHER = "0x00000000000000000000000000000000000000c3";
const OWNER = "0x1111111111111111111111111111111111111111"; // throwaway custody owner
process.env.MEMBER_WALLET_LOCK_ADDRESS = LOCK;
process.env.MEMBER_WALLET_OWNER_ADDRESS = OWNER;
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
const memberSafe = predictMemberSafe({
  chainID: 84532,
  owner: OWNER,
  memberID: "member"
});
/** Runs with one wallet setting removed, restoring it afterwards. */
async function without<T>(name: string, value: string | undefined, work: () => Promise<T>): Promise<T> {
  const saved = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  try {
    return await work();
  } finally {
    process.env[name] = saved;
  }
}
const quietly = <R extends { payload: object }>(req: R): R =>
  Object.assign(req, {
    payload: { ...req.payload, logger: { error: () => undefined } }
  });

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

test("attaching moves every eligible awaiting intent and leaves held and cancelled ones untouched", async () => {
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

test("a settled membership payment creates the member's one active wallet and moves the intent to pending with that Safe", async () => {
  const fake = commerceStorageFake({
    ...seed(),
    "commerce-key-grant-intents": []
  });
  await fake.transaction({}, (req) =>
    recordKeyGrantIntents({ req, ...settle })
  );
  const wallets = fake.rows["member-wallets"];
  assert.equal(wallets.length, 1);
  const [row] = wallets as Record<string, unknown>[];
  assert.equal(row.member, "member");
  assert.equal(row.chainID, 84532);
  assert.equal(row.status, "active");
  assert.equal(row.activeSlot, "member:84532");
  assert.equal(row.safeAddress, memberSafe.safeAddress);
  assert.equal(row.ownerAddress, OWNER);
  assert.equal(row.threshold, 1);
  assert.equal(row.saltNonce, memberSafe.saltNonce);
  assert.equal(row.safeVersion, "1.4.1");
  assert.equal(row.proxyFactoryAddress, memberSafe.proxyFactoryAddress);
  assert.equal(row.singletonAddress, memberSafe.singletonAddress);
  assert.equal(row.fallbackHandlerAddress, memberSafe.fallbackHandlerAddress);
  assert.equal(row.configHash, memberSafe.configHash);
  assert.ok(row.boundAt);
  const [intentRow] = fake.rows["commerce-key-grant-intents"];
  assert.equal(intentRow.state, "pending");
  assert.deepEqual(intentRow.target, {
    chainID: 84532,
    lock: LOCK,
    recipient: memberSafe.safeAddress
  });
});

test("replaying the settlement changes nothing", async () => {
  const fake = commerceStorageFake({
    ...seed(),
    "commerce-key-grant-intents": []
  });
  await fake.transaction({}, (req) =>
    recordKeyGrantIntents({ req, ...settle })
  );
  const before = structuredClone(fake.rows);
  await fake.transaction({}, (req) =>
    recordKeyGrantIntents({ req, ...settle })
  );
  assert.deepEqual(fake.rows, before);
});

test("without a configured owner, settlement succeeds and the intent stays awaiting a wallet", async () => {
  for (const owner of [undefined, "not-an-address"]) {
    const fake = commerceStorageFake({
      ...seed(),
      "commerce-key-grant-intents": []
    });
    await without("MEMBER_WALLET_OWNER_ADDRESS", owner, () =>
      fake.transaction({}, (req) =>
        recordKeyGrantIntents({ req: quietly(req), ...settle })
      )
    );
    const [intentRow] = fake.rows["commerce-key-grant-intents"];
    assert.equal(intentRow.state, "awaiting_wallet", String(owner));
    assert.equal(intentRow.target, undefined);
    assert.equal(fake.rows["member-wallets"].length, 0);
  }
});

test("invalid wallet configuration never fails a settlement", async () => {
  const fake = commerceStorageFake({
    ...seed(),
    "commerce-key-grant-intents": [],
    "member-wallets": [activeWallet]
  });
  await without("MEMBER_WALLET_LOCK_ADDRESS", "not-an-address", () =>
    fake.transaction({}, (req) =>
      recordKeyGrantIntents({ req: quietly(req), ...settle })
    )
  );
  assert.equal(
    fake.rows["commerce-key-grant-intents"][0].state,
    "awaiting_wallet"
  );
});

test("an existing wallet is kept: settlement attaches to it and never creates a second", async () => {
  const fake = commerceStorageFake({
    ...seed(),
    "commerce-key-grant-intents": [],
    "member-wallets": [activeWallet]
  });
  await fake.transaction({}, (req) =>
    recordKeyGrantIntents({ req, ...settle })
  );
  assert.equal(fake.rows["member-wallets"].length, 1);
  const [row] = fake.rows["commerce-key-grant-intents"];
  assert.equal(row.state, "pending");
  assert.deepEqual(row.target, { chainID: 84532, lock: LOCK, recipient: SAFE });
});

test("an admission under review gets its key once the hold is released", async () => {
  const { CommerceAdmissions } =
    await import("@/payload/collections/commerce-admissions");
  const fake = commerceStorageFake({
    ...seed(),
    "commerce-key-grant-intents": [intent("review")]
  });
  // Under the hold the wallet may exist, but nothing is attached.
  assert.deepEqual(
    await fake.transaction({}, (req) =>
      attachMemberKeyGrants(
        req,
        { ...wallet, safeAddress: memberSafe.safeAddress },
        config
      )
    ),
    []
  );
  // The review hold is released: the admission's own hook creates the
  // member's wallet if it is missing and attaches the intent.
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
  assert.equal(fake.rows["member-wallets"].length, 1);
  const [row] = fake.rows["commerce-key-grant-intents"];
  assert.equal(row.state, "pending");
  assert.deepEqual(row.target, {
    chainID: 84532,
    lock: LOCK,
    recipient: memberSafe.safeAddress
  });
});

test("the catch-up sweep gives members who paid before the owner was configured their wallet, and reports when more remain", async () => {
  const { catchUpKeyGrantTargets } =
    await import("@/lib/commerce/keys/member-wallet");
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
  assert.deepEqual(second, { moved: 1, members: 1, more: false });
  const rows = Object.fromEntries(
    fake.rows["commerce-key-grant-intents"].map((row) => [row.id, row])
  );
  assert.equal(rows.a.state, "pending");
  assert.equal(rows.other.state, "pending");
  const someone = predictMemberSafe({
    chainID: 84532,
    owner: OWNER,
    memberID: "someone"
  });
  assert.equal(
    (rows.other.target as { recipient: string }).recipient,
    someone.safeAddress
  );
  assert.equal(fake.rows["member-wallets"].length, 2);
});
