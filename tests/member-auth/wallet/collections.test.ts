import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { PayloadRequest } from "payload";
import { withWalletWrite } from "@/lib/member-auth/wallet/access";
import {
  es256Coordinates,
  storedPasskeyCoordinates
} from "@/lib/member-auth/wallet/credentials";
import { MemberWallets } from "@/payload/collections/member-wallets";
import { MemberWalletChallenges } from "@/payload/collections/member-wallet-challenges";
import { softwareAuthenticator } from "./webauthn-fixture";

const walletHook = MemberWallets.hooks!.beforeChange![0];
const challengeHook = MemberWalletChallenges.hooks!.beforeChange![0];
const SAFE = `0x${"b".repeat(40)}`;
const pending = {
  id: "w",
  member: "m",
  chainID: 84532,
  status: "pending",
  walletKey: `84532:${SAFE}`,
  memberWalletKey: `m:84532:${SAFE}`,
  safeAddress: SAFE,
  credentialID: "c",
  counter: 3
};
const active = {
  ...pending,
  status: "active",
  activeSlot: "m:84532",
  activeWalletKey: `84532:${SAFE}`,
  boundAt: "2026-11-16T00:00:00.000Z"
};
const run = (
  hook: typeof walletHook,
  data: Record<string, unknown>,
  originalDoc: Record<string, unknown> = {},
  operation = "update"
) => {
  const req = {} as PayloadRequest;
  return withWalletWrite(req, async () =>
    hook({ data, originalDoc, operation, req } as never)
  );
};

test("wallets and challenges are server owned and hidden from members", async () => {
  await assert.rejects(
    Promise.resolve().then(() =>
      walletHook({
        data: pending,
        originalDoc: {},
        operation: "create",
        req: {}
      } as never)
    ),
    /server owned/
  );
  await assert.rejects(
    Promise.resolve().then(() =>
      challengeHook({
        data: {},
        originalDoc: {},
        operation: "create",
        req: {}
      } as never)
    ),
    /server owned/
  );
  for (const collection of [MemberWallets, MemberWalletChallenges]) {
    for (const action of ["create", "update", "delete"] as const)
      assert.equal(
        await (collection.access![action] as (args: unknown) => unknown)({
          req: { user: { collection: "users", id: "m" } }
        }),
        false
      );
    assert.equal(
      await (collection.access!.read as (args: unknown) => unknown)({
        req: { user: { collection: "users", id: "m" } }
      }),
      false
    );
  }
});

test("an active wallet keeps its identity, slot and counter order, and cannot be retired", async () => {
  await assert.rejects(
    run(walletHook, { safeAddress: `0x${"c".repeat(40)}` }, active),
    /immutable/
  );
  await assert.rejects(
    run(walletHook, { status: "pending", activeSlot: null }, active),
    /cannot be retired/
  );
  await assert.rejects(
    run(walletHook, { activeSlot: "other:84532" }, active),
    /write-once/
  );
  await assert.rejects(
    run(walletHook, { counter: 2 }, active),
    /cannot go back/
  );
  await run(walletHook, { counter: 4 }, active);
  await assert.rejects(
    run(
      walletHook,
      {
        status: "active",
        activeSlot: "someone:84532",
        boundAt: active.boundAt
      },
      pending
    ),
    /member slot/
  );
  await run(
    walletHook,
    {
      status: "active",
      activeSlot: "m:84532",
      activeWalletKey: `84532:${SAFE}`,
      boundAt: active.boundAt
    },
    pending
  );
  await assert.rejects(
    run(walletHook, { ...active, walletKey: "84532:0xother" }, {}, "create"),
    /Wallet key mismatch/
  );
  await assert.rejects(
    run(walletHook, { ...active, activeSlot: "x:84532" }, {}, "create"),
    /member slot/
  );
});

test("a challenge is used once and never edited", async () => {
  const challenge = {
    id: "c",
    purpose: "wallet-bind",
    challenge: "abc",
    credentialID: "c",
    candidate: {},
    candidateDigest: "d"
  };
  await run(
    challengeHook,
    { consumedAt: "2026-11-16T00:00:00.000Z" },
    challenge
  );
  await assert.rejects(
    run(
      challengeHook,
      { consumedAt: "2026-11-16T00:01:00.000Z" },
      { ...challenge, consumedAt: "2026-11-16T00:00:00.000Z" }
    ),
    /already used/
  );
  await assert.rejects(
    run(challengeHook, { candidateDigest: "e" }, challenge),
    /immutable/
  );
  await assert.rejects(
    run(
      challengeHook,
      { member: "member", purpose: "wallet-bind", challenge: "x" },
      {},
      "create"
    ),
    /fixes its candidate/
  );
});

test("only an on-curve P-256 ES256 key yields Safe coordinates; other sign-in keys are left alone", () => {
  const es256 = softwareAuthenticator("ES256");
  const coordinates = storedPasskeyCoordinates(es256.storedPublicKey);
  assert.match(coordinates?.x ?? "", /^0x[0-9a-f]{64}$/);
  assert.equal(
    storedPasskeyCoordinates(softwareAuthenticator("RS256").storedPublicKey),
    null
  );
  const offCurve = Buffer.from(es256.storedPublicKey, "base64");
  offCurve[offCurve.length - 1] ^= 1; // flip a bit of y
  assert.throws(() => es256Coordinates(offCurve), /INCOMPATIBLE_CREDENTIAL/);
});

test("the wallet modules never deploy, sign or send on chain", () => {
  for (const file of [
    "safe",
    "activation",
    "credentials",
    "config",
    "read",
    "http"
  ]) {
    const source = readFileSync(
      new URL(
        `../../../src/lib/member-auth/wallet/${file}.ts`,
        import.meta.url
      ),
      "utf8"
    );
    assert.doesNotMatch(
      source,
      /createSafeDeploymentTransaction|deploySafe|executeTransaction|sendTransaction|signTransaction|createTransaction|\.connect\(|eth_send/,
      file
    );
  }
});

test("the wallet chain comes from configuration and only a chain with a listed read-only RPC is accepted", async () => {
  const { loadWalletConfig } = await import("@/lib/member-auth/wallet/config");
  const lock = `0x${"a".repeat(40)}`;
  assert.equal(
    loadWalletConfig({}),
    null,
    "unconfigured activation is unavailable, not guessed"
  );
  assert.equal(
    loadWalletConfig({ MEMBER_WALLET_LOCK_ADDRESS: lock })?.chainID,
    84532
  );
  assert.equal(
    loadWalletConfig({
      MEMBER_WALLET_LOCK_ADDRESS: lock,
      MEMBER_WALLET_CHAIN_ID: "84532"
    })?.rpcUrl,
    "https://sepolia.base.org"
  );
  for (const chain of ["137", "8453", "1", "x"])
    assert.throws(
      () =>
        loadWalletConfig({
          MEMBER_WALLET_LOCK_ADDRESS: lock,
          MEMBER_WALLET_CHAIN_ID: chain
        }),
      /not enabled/,
      chain
    );
  assert.throws(
    () =>
      loadWalletConfig({
        MEMBER_WALLET_LOCK_ADDRESS: lock,
        MEMBER_WALLET_RPC_URL: "https://example.invalid"
      }),
    /RPC/
  );
  assert.throws(
    () => loadWalletConfig({ MEMBER_WALLET_LOCK_ADDRESS: "nope" }),
    /lock address/
  );
});
