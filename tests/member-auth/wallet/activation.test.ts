import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { createWalletActivation, WalletError } from "@/lib/member-auth/wallet/activation";
import { loadWalletConfig } from "@/lib/member-auth/wallet/config";
import { relyingParty } from "@/lib/member-auth/wallet/credentials";
import { safeConfigHash, type PredictSafe } from "@/lib/member-auth/wallet/safe";
import type { MemberPrincipal } from "@/lib/member-auth/contracts";
import { commerceStorageFake } from "../../commerce/domain/storage-fake";
import { softwareAuthenticator } from "./webauthn-fixture";

process.env.MEMBER_WALLET_LOCK_ADDRESS = "0x00000000000000000000000000000000000000a1";
const config = loadWalletConfig()!;
const rp = relyingParty("http://localhost:3000");
const ceremony = { origin: rp.origin, rpID: rp.rpID };
const MEMBER = "11111111-1111-4111-8111-111111111111";
const SESSION = "22222222-2222-4222-8222-222222222222";
const principal = (extra: Partial<MemberPrincipal> = {}): MemberPrincipal => ({ userId: MEMBER, sessionId: SESSION, emailVerified: true, sessionCreatedAt: new Date(), email: "member@fixture.invalid", ...extra });

/** Deterministic, offline stand-in for the read-only Safe SDK path. */
let predictions = 0;
const predict: PredictSafe = async ({ coordinates, config: wallet }) => {
  predictions++;
  const digest = createHash("sha256").update(coordinates.x + coordinates.y).digest("hex");
  const safe = { chainID: wallet.chainID, safeVersion: wallet.safeVersion, saltNonce: wallet.saltNonce, verifierAddress: `0x${"1".repeat(40)}`,
    ownerAddress: `0x${digest.slice(24, 64)}`, safeAddress: `0x${digest.slice(0, 40)}`, proxyFactoryAddress: `0x${"2".repeat(40)}`, singletonAddress: `0x${"3".repeat(40)}` };
  return { ...safe, configHash: safeConfigHash({ ...safe, coordinates }) };
};

function setup(options: { paid?: boolean; passkeys?: ReturnType<typeof softwareAuthenticator>[] } = {}) {
  const fake = commerceStorageFake({
    users: [{ id: MEMBER, membershipStatus: "approved" }, { id: "other", membershipStatus: "approved" }],
    transactions: [{ id: "pay", status: "succeeded" }],
    "commerce-admissions": [{ id: "adm-1", status: "available", benefitReview: false }],
    "commerce-key-grant-intents": options.paid === false ? [] : [{ id: "intent-1", operationKey: "k:1", order: "order", payment: "pay", entitlement: "adm-1",
      beneficiaryUser: MEMBER, recipientMode: "member_safe", state: "awaiting_wallet", cancelRequested: false }],
    passkeys: (options.passkeys ?? []).map((key, index) => ({ id: `pk-${index}`, user: MEMBER, credentialId: key.id, publicKey: key.storedPublicKey, counter: 0, transports: "internal" })),
    "member-wallets": [], "member-wallet-challenges": [],
  });
  const activation = createWalletActivation({ rp, config, predict, transact: (work) => fake.transaction({}, work) });
  return { fake, activation };
}
const rejects = (promise: Promise<unknown>, code: string) => assert.rejects(promise, (error: unknown) => error instanceof WalletError && error.code === code);

async function registerAndBind(activation: ReturnType<typeof setup>["activation"], key = softwareAuthenticator("ES256")) {
  const options = await activation.registerOptions(principal());
  const bindOptions = await activation.registerVerify(principal(), key.register({ challenge: options.challenge, ...ceremony }));
  const assertion = key.assert({ challenge: bindOptions.challenge, ...ceremony });
  return { key, bindOptions, assertion, result: await activation.bindVerify(principal(), assertion) };
}

test("a new ES256 wallet passkey registers, binds once and attaches the member's key", async () => {
  const { fake, activation } = setup();
  const { result, assertion } = await registerAndBind(activation);
  assert.deepEqual(result, { status: "active", replay: false, attached: 1 });
  const [wallet] = fake.rows["member-wallets"];
  assert.equal(wallet.status, "active");
  assert.equal(wallet.activeSlot, `${MEMBER}:84532`);
  assert.equal(wallet.credentialSource, "wallet_passkey");
  assert.equal(fake.rows["commerce-key-grant-intents"][0].state, "pending");
  assert.equal((fake.rows["commerce-key-grant-intents"][0].target as { recipient: string }).recipient, wallet.safeAddress);
  await rejects(activation.bindVerify(principal(), assertion), "INVALID_CHALLENGE");
});

test("a compatible ES256 sign-in passkey is reused with a fresh wallet-bind approval", async () => {
  const signIn = softwareAuthenticator("ES256");
  const { fake, activation } = setup({ passkeys: [signIn] });
  const options = await activation.bindOptions(principal(), signIn.id);
  assert.deepEqual(options.allowCredentials?.map((credential) => credential.id), [signIn.id]);
  const result = await activation.bindVerify(principal(), signIn.assert({ challenge: options.challenge, ...ceremony }));
  assert.equal(result.status, "active");
  assert.equal(fake.rows["member-wallets"][0].credentialSource, "sign_in_passkey");
  assert.equal(fake.rows["member-wallets"][0].signInPasskey, "pk-0");
});

test("a replayed or cross-purpose challenge is rejected", async () => {
  const { activation } = setup();
  const key = softwareAuthenticator("ES256");
  const registration = await activation.registerOptions(principal());
  // A registration challenge cannot approve a bind.
  await rejects(activation.bindVerify(principal(), key.assert({ challenge: registration.challenge, ...ceremony })), "INVALID_CHALLENGE");
  const bind = await activation.registerVerify(principal(), key.register({ challenge: registration.challenge, ...ceremony }));
  // The registration challenge was consumed, and a bind challenge cannot register.
  await rejects(activation.registerVerify(principal(), key.register({ challenge: registration.challenge, ...ceremony })), "INVALID_CHALLENGE");
  await rejects(activation.registerVerify(principal(), key.register({ challenge: bind.challenge, ...ceremony })), "INVALID_CHALLENGE");
  // A sign-in style assertion over an unknown challenge is refused too.
  await rejects(activation.bindVerify(principal(), key.assert({ challenge: "c2lnbi1pbi1jaGFsbGVuZ2UtdmFsdWU", ...ceremony })), "INVALID_CHALLENGE");
});

test("an RS256 credential is rejected for registration and for reuse, without touching sign-in", async () => {
  const rsa = softwareAuthenticator("RS256");
  const { fake, activation } = setup({ passkeys: [rsa] });
  const options = await activation.registerOptions(principal());
  assert.deepEqual(options.pubKeyCredParams.map((param) => param.alg), [-7], "wallet registration asks for ES256 only");
  await rejects(activation.registerVerify(principal(), rsa.register({ challenge: options.challenge, ...ceremony })), "INCOMPATIBLE_CREDENTIAL");
  await rejects(activation.bindOptions(principal(), rsa.id), "INCOMPATIBLE_CREDENTIAL");
  assert.equal(fake.rows.passkeys.length, 1, "the RS256 sign-in passkey stays as it was");
  assert.equal(fake.rows["member-wallets"].length, 0);
});

test("another member's session cannot use a member's challenge", async () => {
  const { activation } = setup();
  const key = softwareAuthenticator("ES256");
  const options = await activation.registerOptions(principal());
  const bind = await activation.registerVerify(principal(), key.register({ challenge: options.challenge, ...ceremony }));
  const assertion = key.assert({ challenge: bind.challenge, ...ceremony });
  await rejects(activation.bindVerify(principal({ userId: "other" }), assertion), "INVALID_CHALLENGE");
  await rejects(activation.bindVerify(principal({ sessionId: "33333333-3333-4333-8333-333333333333" }), assertion), "INVALID_CHALLENGE");
  assert.equal((await activation.bindVerify(principal(), assertion)).status, "active", "the owner's session still completes");
});

test("the same wallet replays to its existing state; a different wallet is refused while one is active", async () => {
  const other = softwareAuthenticator("ES256");
  const { fake, activation } = setup({ passkeys: [other] });
  // A bind challenge for a different credential, issued before activation.
  const early = await activation.bindOptions(principal(), other.id);
  const { key } = await registerAndBind(activation);
  const before = predictions;
  const again = await activation.bindOptions(principal(), key.id);
  assert.equal(predictions, before, "replay reuses the stored candidate");
  assert.deepEqual(await activation.bindVerify(principal(), key.assert({ challenge: again.challenge, ...ceremony })), { status: "active", replay: true, attached: 0 });
  assert.equal(fake.rows["member-wallets"].filter((row) => row.status === "active").length, 1);
  await rejects(activation.registerOptions(principal()), "WALLET_ACTIVE");
  await rejects(activation.bindOptions(principal(), other.id), "WALLET_CONFLICT");
  await rejects(activation.bindVerify(principal(), other.assert({ challenge: early.challenge, ...ceremony })), "WALLET_CONFLICT");
  assert.equal(fake.rows["member-wallets"].filter((row) => row.status === "active").length, 1);
});

test("activation needs a paid entitlement and, for a new passkey, a recent sign-in", async () => {
  await rejects(setup({ paid: false }).activation.registerOptions(principal()), "NOT_ELIGIBLE");
  await rejects(setup().activation.registerOptions(principal({ sessionCreatedAt: new Date(Date.now() - 16 * 60_000) })), "FRESH_AUTH_REQUIRED");
  await rejects(setup().activation.registerOptions(principal({ emailVerified: false })), "EMAIL_REQUIRED");
  await rejects(setup().activation.registerOptions(null), "UNAUTHENTICATED");
});
