import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { PayloadRequest } from "payload";
import type { MemberWallet } from "../../../src/payload-types";
import { inPaymentTransaction } from "../../../src/lib/commerce/_shared/transaction";
import { recordMemberWallet, requireWalletCreate } from "../../../src/lib/commerce/keys/member-wallet";
import { loadWalletConfig, predictMemberSafe, SAFE_PROXY_CREATION_CODE } from "../../../src/lib/member-auth/wallet/safe";
import { nativeTransactionFixture, type NativeFaults } from "../core/native-transaction-fixture";

const member = "0195a1f2-7c3e-7d4b-9a10-2b3c4d5e6f70";
const owner = "0x1111111111111111111111111111111111111111";
const polygon = { MEMBER_WALLET_OWNER_ADDRESS: owner, MEMBER_WALLET_CHAIN_ID: "137" };
const testNetwork = { ...polygon, MEMBER_WALLET_CHAIN_ID: "84532" };
const expected = "0x312890e4095506c65d9dd2caf73ecfde84930f78";

test("offline Safe 1.4.1 address matches the archived SDK vector on both pinned chains", async () => {
  assert.equal(createHash("sha256").update(Buffer.from(SAFE_PROXY_CREATION_CODE.slice(2), "hex")).digest("hex"),
    "cdac0e1d7a8897472ab08d29d19e028896c4feaaff65bba661c2e5e49a39bf61");
  const a = await predictMemberSafe(getConfig(polygon), member);
  const b = await predictMemberSafe(getConfig(testNetwork), member);
  assert.equal(a.safeAddress, expected);
  assert.equal(b.safeAddress, expected);
  assert.notEqual(a.configHash, b.configHash);
  assert.match(a.configHash, /^v1:[a-f0-9]{64}$/);
  assert.notEqual((await predictMemberSafe(getConfig(polygon), "4f0c9a8e-0d43-4b8f-9a55-1d2f3e4a5b6c")).safeAddress, expected);
  await assert.rejects(predictMemberSafe(getConfig(polygon), member.toUpperCase()), /canonical member/i);
});

function getConfig(env: typeof polygon) {
  const config = loadWalletConfig(env);
  assert.ok(config);
  return config;
}

test("wallet config is explicitly disabled or fully configured, without chain or owner defaults", () => {
  assert.equal(loadWalletConfig({}), null);
  for (const env of [
    { MEMBER_WALLET_OWNER_ADDRESS: owner },
    { MEMBER_WALLET_CHAIN_ID: "137" },
    { ...polygon, MEMBER_WALLET_CHAIN_ID: "0137" },
    { ...polygon, MEMBER_WALLET_CHAIN_ID: "1" },
    { ...polygon, MEMBER_WALLET_OWNER_ADDRESS: "0x" + "0".repeat(40) },
    { ...polygon, MEMBER_WALLET_OWNER_ADDRESS: owner + "f" },
  ]) assert.throws(() => loadWalletConfig(env), /wallet/i);
});

type CreateData = Omit<MemberWallet, "id" | "createdAt" | "updatedAt">;
async function writer(stored: MemberWallet[] = [], faults: NativeFaults & { writeError?: Error } = {}) {
  const f = await nativeTransactionFixture(faults);
  const reports: unknown[] = [];
  const t = Object.assign(f.req.payload, {
    logger: { ...f.req.payload.logger, warn: (event: unknown) => reports.push(event) },
    async find(input: { collection: string; req: PayloadRequest; where: unknown; overrideAccess: boolean; depth: number }) {
      assert.equal(input.collection, "member-wallets");
      assert.equal(input.req === f.req, true);
      assert.equal(input.overrideAccess, true);
      assert.equal(input.depth, 0);
      assert.deepEqual(input.where, { or: [
        { activeSlot: { equals: member } }, { and: [{ member: { equals: member } }, { status: { equals: "active" } }] },
      ] });
      const docs = stored.filter((row) => row.activeSlot === member || row.member === member);
      return { docs, totalDocs: docs.length };
    },
    async create(input: { collection: string; req: PayloadRequest; data: CreateData; overrideAccess: boolean; depth: number }) {
      assert.equal(input.req === f.req, true);
      assert.equal(input.collection, "member-wallets");
      assert.equal(input.overrideAccess, true);
      assert.equal(input.depth, 0);
      await assert.rejects(requireWalletCreate({ ...f.req }, "create", input.data), { status: 403 });
      await assert.rejects(requireWalletCreate(f.req, "create", { ...input.data, chainID: 1 }), { status: 403 });
      const verified = await requireWalletCreate(f.req, "create", { ...input.data, id: "untrusted" });
      assert.deepEqual(verified, input.data);
      await assert.rejects(requireWalletCreate(f.req, "create", input.data), { status: 403 });
      if (faults.writeError) throw faults.writeError;
      assert.ok(!stored.some((row) => row.activeSlot === input.data.activeSlot || row.walletKey === input.data.walletKey));
      const row = { ...verified, id: member, createdAt: "", updatedAt: "" };
      stored.push(row);
      return row;
    },
  });
  assert.equal(t, f.req.payload);
  return { ...f, stored, reports, bind: (env: Readonly<Record<string, string | undefined>> = polygon) =>
    inPaymentTransaction(f.req, () => recordMemberWallet(f.req, member, env)) };
}

test("one member lock covers replay and chain/owner drift without replacing the original", async (t) => {
  const f = await writer();
  t.after(f.cleanup);
  assert.equal(await f.bind(), "recorded");
  const [original] = f.stored;
  assert.equal(original.activeSlot, member);
  assert.equal(original.walletKey, `137:${expected}`);
  assert.equal(await f.bind(), "already-recorded");
  assert.equal(await f.bind(testNetwork), "config-drift");
  assert.equal(await f.bind({ ...polygon, MEMBER_WALLET_OWNER_ADDRESS: "0x" + "2".repeat(40) }), "config-drift");
  assert.deepEqual(f.stored, [original]);
  assert.deepEqual(f.reports, Array(2).fill({ msg: "Member wallet configuration differs from the existing record", cause: "wallet-config-drift" }));
  const locks = f.queries.filter(({ text }) => text.includes("pg_advisory_xact_lock"));
  assert.equal(locks.length, 4);
  for (const { values } of locks) assert.deepEqual(values, [`commerce:member-wallet:${member}`]);
  for (const operation of ["create", "update", "delete"]) await assert.rejects(requireWalletCreate(f.req, operation, { ...original }), { status: 403 });
});

test("legacy per-chain slots are not replaced, and ambiguous records fail closed", async (t) => {
  const f = await writer();
  t.after(f.cleanup);
  await f.bind();
  const legacy = { ...f.stored[0], activeSlot: `${member}:137`, configHash: "legacy" };
  const g = await writer([legacy]);
  t.after(g.cleanup);
  assert.equal(await g.bind(), "config-drift");
  assert.deepEqual(g.stored, [legacy]);
  const h = await writer([legacy, { ...legacy, activeSlot: `${member}:84532` }]);
  t.after(h.cleanup);
  await assert.rejects(h.bind(), /wallet identity/i);
  assert.equal(h.events.at(-1), "rollback");
});

test("no wallet writes occur with no configuration, no payment authority, or failed persistence", async (t) => {
  const error = new Error("persistence failed");
  const f = await writer([], { writeError: error });
  t.after(f.cleanup);
  await assert.rejects(recordMemberWallet(f.req, member, polygon), /native transaction owner/);
  assert.equal(await f.bind({}), "disabled");
  await assert.rejects(f.bind({ ...polygon, MEMBER_WALLET_CHAIN_ID: "" }), /wallet/i);
  await assert.rejects(f.bind(), error);
  assert.deepEqual(f.stored, []);
  assert.deepEqual(f.events, ["begin", "commit", "begin", "rollback", "begin", "select", "rollback"]);
});

test("two settling requests share one member slot in a serialized model", { timeout: 10_000 }, async (t) => {
  const stored: MemberWallet[] = [];
  let entered = () => {};
  let release = () => {};
  const firstLock = new Promise<void>((resolve) => { entered = resolve; });
  const firstCommitted = new Promise<void>((resolve) => { release = resolve; });
  let secondEntered = () => {};
  const secondLock = new Promise<void>((resolve) => { secondEntered = resolve; });
  const a = await writer(stored, { onQuery: (kind) => {
    if (kind === "select") { entered(); return secondLock; }
    if (kind === "commit" || kind === "rollback") release();
  } });
  const b = await writer(stored, { onQuery: (kind) => {
    if (kind === "select") { secondEntered(); return firstCommitted; }
  } });
  t.after(a.cleanup);
  t.after(b.cleanup);
  const first = a.bind();
  await Promise.race([firstLock, first]);
  const second = b.bind(testNetwork);
  void second.finally(secondEntered).catch(() => {});
  assert.deepEqual(await Promise.all([first, second]), ["recorded", "config-drift"]);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].chainID, 137);
  for (const f of [a, b]) {
    const lock = f.queries.find(({ text }) => text.includes("pg_advisory_xact_lock"));
    assert.deepEqual(lock?.values, [`commerce:member-wallet:${member}`]);
  }
});

test("the settlement success hook passes the same request and admitted units to wallet attachment", () => {
  const source = readFileSync("src/lib/commerce/ecommerce.ts", "utf8");
  const sameRequest = /if \(doc.status !== "succeeded" \|\| previousDoc\?\.status === "succeeded"\) return doc;[\s\S]*?await grantOrderAdmissions\([\s\S]*?await recordSettlementWalletGrants\(\{ req, orderID, transactionID: String\(doc.id\), beneficiaryID: memberID, admissions \}\)/.test(source);
  assert.equal(sameRequest, true);
});
