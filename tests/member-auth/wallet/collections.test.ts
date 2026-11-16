import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import type { PayloadRequest } from "payload";
import { withWalletWrite } from "@/lib/member-auth/wallet/access";
import { loadWalletConfig } from "@/lib/member-auth/wallet/config";
import { predictMemberSafe } from "@/lib/member-auth/wallet/safe";
import { MemberWallets } from "@/payload/collections/member-wallets";

// ADR-0013: a member wallet is a Safe owned by the custody key we hold,
// created at payment. It is server owned, write-once and never removed.

const walletHook = MemberWallets.hooks!.beforeChange![0];
const deleteHook = MemberWallets.hooks!.beforeDelete![0];
const OWNER = "0x1111111111111111111111111111111111111111"; // throwaway
const MEMBER = "0195a1f2-7c3e-7d4b-9a10-2b3c4d5e6f70";
const safe = predictMemberSafe({ chainID: 84532, owner: OWNER, memberID: MEMBER });
const active = {
  member: MEMBER,
  chainID: 84532,
  status: "active",
  activeSlot: `${MEMBER}:84532`,
  walletKey: `84532:${safe.safeAddress.toLowerCase()}`,
  safeAddress: safe.safeAddress,
  ownerAddress: safe.ownerAddress,
  threshold: 1,
  saltNonce: safe.saltNonce,
  safeVersion: safe.safeVersion,
  proxyFactoryAddress: safe.proxyFactoryAddress,
  singletonAddress: safe.singletonAddress,
  fallbackHandlerAddress: safe.fallbackHandlerAddress,
  configHash: safe.configHash,
  boundAt: "2026-11-16T00:00:00.000Z"
};
const run = (
  data: Record<string, unknown>,
  originalDoc: Record<string, unknown> = {},
  operation = "update"
) => {
  const req = {} as PayloadRequest;
  return withWalletWrite(req, async () =>
    walletHook({ data, originalDoc, operation, req } as never)
  );
};

test("wallets are server owned and hidden from members", async () => {
  await assert.rejects(
    Promise.resolve().then(() =>
      walletHook({ data: active, originalDoc: {}, operation: "create", req: {} } as never)
    ),
    /server owned/
  );
  for (const action of ["create", "update", "delete", "read"] as const)
    assert.equal(
      await (MemberWallets.access![action] as (args: unknown) => unknown)({
        req: { user: { collection: "users", id: "m" } }
      }),
      false,
      action
    );
});

test("a wallet is created active, owned by the custody key, at the address its own fields predict", async () => {
  assert.deepEqual(await run(active, {}, "create"), active);
  for (const [field, value] of [
    ["safeAddress", `0x${"c".repeat(40)}`],
    ["ownerAddress", `0x${"2".repeat(40)}`],
    ["saltNonce", "1"],
    ["configHash", "0".repeat(64)],
    ["threshold", 2],
    ["singletonAddress", "0x41675C099F32341bf84BFc5382aF534df5C7461a"]
  ] as const)
    await assert.rejects(run({ ...active, [field]: value }, {}, "create"), /does not match|mismatch/, field);
  await assert.rejects(run({ ...active, activeSlot: "someone:84532" }, {}, "create"), /mismatch/);
  await assert.rejects(run({ ...active, walletKey: "84532:0xabc" }, {}, "create"), /mismatch/);
  await assert.rejects(run({ ...active, status: "pending" }, {}, "create"), /active/);
  await assert.rejects(run({ ...active, member: undefined }, {}, "create"), /belongs to a member/);
  await assert.rejects(run({ ...active, boundAt: undefined }, {}, "create"), /active/);
});

test("a wallet is write-once and can't be removed", async () => {
  const stored = { ...active, id: "w" };
  for (const [field, value] of [
    ["safeAddress", `0x${"c".repeat(40)}`],
    ["ownerAddress", `0x${"2".repeat(40)}`],
    ["status", "retired"],
    ["activeSlot", "other:84532"],
    ["boundAt", "2027-01-01T00:00:00.000Z"]
  ] as const)
    await assert.rejects(run({ [field]: value }, stored), /write-once|immutable/, field);
  await assert.rejects(run({ credentialID: "c" }, stored), /Unknown wallet field/);
  await assert.rejects(
    withWalletWrite({} as PayloadRequest, async () =>
      deleteHook({ id: "w", req: {} } as never)
    ),
    /can't be removed/
  );
});

test("no passkey owns a wallet: the record has no passkey fields and the bind path is gone", () => {
  const names = new Set(
    (MemberWallets.fields as { name?: string }[]).map((field) => field.name)
  );
  for (const field of [
    "credentialSource",
    "signInPasskey",
    "credentialID",
    "publicKey",
    "publicKeyX",
    "publicKeyY",
    "counter",
    "bindChallenge",
    "verifierAddress",
    "rpID",
    "origin"
  ])
    assert.equal(names.has(field), false, field);
  for (const path of [
    "src/payload/collections/member-wallet-challenges/index.ts",
    "src/lib/member-auth/wallet/activation.ts",
    "src/lib/member-auth/wallet/credentials.ts",
    "src/app/api/member/wallet/bind/options/route.ts",
    "src/app/api/member/wallet/bind/verify/route.ts",
    "src/app/api/member/wallet/register/options/route.ts",
    "src/app/api/member/wallet/register/verify/route.ts"
  ])
    assert.equal(existsSync(path), false, path);
  const domain = readFileSync("src/lib/commerce/domain.ts", "utf8");
  assert.doesNotMatch(domain, /MemberWalletChallenges/);
});

test("member wallets need both the lock and the custody owner; the chain must have canonical Safe contracts", () => {
  const lock = `0x${"a".repeat(40)}`;
  assert.equal(loadWalletConfig({}), null);
  assert.equal(loadWalletConfig({ MEMBER_WALLET_LOCK_ADDRESS: lock }), null);
  assert.equal(loadWalletConfig({ MEMBER_WALLET_OWNER_ADDRESS: OWNER }), null);
  const both = { MEMBER_WALLET_LOCK_ADDRESS: lock, MEMBER_WALLET_OWNER_ADDRESS: OWNER };
  assert.deepEqual(loadWalletConfig(both), { chainID: 84532, lock, owner: OWNER });
  assert.equal(loadWalletConfig({ ...both, MEMBER_WALLET_CHAIN_ID: "137" })?.chainID, 137);
  for (const chain of ["8453", "1", "x"])
    assert.throws(() => loadWalletConfig({ ...both, MEMBER_WALLET_CHAIN_ID: chain }), /not enabled/, chain);
  assert.throws(() => loadWalletConfig({ ...both, MEMBER_WALLET_LOCK_ADDRESS: "nope" }), /lock address/);
  for (const owner of ["nope", `0x${"0".repeat(40)}`])
    assert.throws(() => loadWalletConfig({ ...both, MEMBER_WALLET_OWNER_ADDRESS: owner }), /owner address/);
});
