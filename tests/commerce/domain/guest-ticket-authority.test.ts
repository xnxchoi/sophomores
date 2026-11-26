import assert from "node:assert/strict";
import { createHash, createPrivateKey, generateKeyPairSync } from "node:crypto";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { exportPKCS8, generateKeyPair, jwtVerify, SignJWT } from "jose";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { loadAppleSigner, type AppleSigner } from "@/lib/commerce/keys/apple-wallet-pass";
import { appleSigningFixture, openPass, toolsAvailable } from "../keys/fixtures/apple-signing";
import { googleEventClassID, googleTicketObjectID, passSerial, loadGoogleWalletIssuer, type GoogleWalletIssuer, type GoogleWalletIssuerError } from "@/lib/commerce/keys/google-wallet-pass";
import { checkInGuest, claimGuestAdmission, grantOrderAdmissions, issueGuestClaim } from "@/lib/commerce/guests";
import { loadWalletConfig, predictMemberSafe } from "@/lib/member-auth/wallet/safe";
import { readEventPassLinks } from "@/lib/commerce/keys/event-pass";
import { createEventPassEndpoint } from "@/lib/commerce/keys/event-pass-endpoint";
import { keyGrantOperationKey, MEMBER_EVENT_GRANT, memberEventGrantOperationKey, ticketTokenIdentity } from "@/lib/commerce/keys/contracts";
import { recordKeyGrantIntents } from "@/lib/commerce/keys/intents";
import { guestPurchaseSnapshotSchema } from "@/lib/commerce/purchase-snapshot";
import { commerceSnapshotHash } from "@/lib/commerce/snapshot-hash";
import { commerceStorageFake, saleSeed } from "./storage-fake";

const staff = { collection: "admins", _strategy: "staff-better-auth", role: "admin", id: "staff" };
const buyer = { collection: "users", id: "buyer" };
const guest = { collection: "users", id: "guest" };
const token = "x".repeat(43);
const memberLock = "0x" + "a".repeat(40);
const guestLock = "0x" + "b".repeat(40);
const target = { chainID: 137, lock: guestLock };

function fixture(ticketTier: "member" | "guest") {
  const seed = saleSeed();
  return commerceStorageFake({
    ...seed,
    "commerce-events": [{ ...seed["commerce-events"][0], checkInAuthority: "unlock-events" }],
    "commerce-admissions": [{
      id: "admission", order: "order", transaction: "transaction", buyer: buyer.id, event: "e",
      guestName: "Guest", status: "available", ticketTier,
    }],
    users: [{ ...guest, emailVerified: true }],
    "commerce-claims": [{
      id: "claim", admission: "admission", tokenDigest: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }],
  });
}

for (const tier of ["member", "guest"] as const) {
  test(`staff cannot mark ${tier} attendance for an Unlock EVENTS event`, async () => {
    const fake = fixture(tier);
    const before = structuredClone(fake.rows);
    await assert.rejects(fake.transaction(staff, (req) => checkInGuest({ req, admissionID: "admission" })), /Unlock EVENTS/);
    assert.deepEqual(fake.rows, before);
  });
}

test("a typed Guest Ticket cannot issue a claimant link", async () => {
  const fake = fixture("guest");
  const before = structuredClone(fake.rows);
  await assert.rejects(fake.transaction(buyer, (req) => issueGuestClaim({ req, admissionID: "admission" })));
  assert.deepEqual(fake.rows, before, "buyer ownership and existing token must remain unchanged");
});

test("a typed Guest Ticket cannot consume a historical claimant link", async () => {
  const fake = fixture("guest");
  const before = structuredClone(fake.rows);
  await assert.rejects(fake.transaction(guest, (req) => claimGuestAdmission({ req, token }, async () => true)));
  assert.deepEqual(fake.rows, before, "buyer ownership, legacy token and attendance must remain unchanged");
});

function paidGuestTicket(configuration: unknown) {
  const seed = saleSeed();
  const snapshot = guestPurchaseSnapshotSchema.parse({
    version: 3, kind: "guest-ticket-v1", customerID: buyer.id, cartID: "cart", productID: "g", eventID: "e", releaseID: "g",
    quantity: 2, accountLimit: 2, currency: "KRW", unitAmount: 100, shippingAmount: 0, totalAmount: 200,
    orderName: "Fixture ticket", productVersion: "1", eventVersion: "1", ticketTarget: target,
    shippingAddress: { country: "KR", recipientName: "Fixture", phone: "01012345678", postalCode: "12345", addressLine1: "Fixture" },
  });
  return commerceStorageFake({
    ...seed,
    "commerce-events": [{ ...seed["commerce-events"][0], checkInAuthority: "unlock-events", unlockTicketConfiguration: configuration }],
    orders: [{ ...seed.orders[0], commerceSnapshot: snapshot }],
    transactions: [{ ...seed.transactions[0], customer: buyer.id, amount: 200, currency: "KRW" }],
    "commerce-reservations": [{ id: "reservation", attemptID: "attempt", state: "settled", order: "order",
      product: "g", event: "e", releaseID: "g", customer: buyer.id, quantity: 2, ticketTarget: target, snapshotHash: commerceSnapshotHash(snapshot) }],
  });
}

const config = { chainID: 137, memberLock, guestLock, guestProductID: "g" };

test("two paid Guest Ticket units create exactly two buyer Safe intents and never occupy the member ticket", async () => {
  const fake = paidGuestTicket(config);
  for (let attempt = 0; attempt < 2; attempt++) {
    await fake.transaction(buyer, async (req) => {
      const orderID = "order", transactionID = "transaction";
      const admissions = await grantOrderAdmissions({ req, orderID, transactionID });
      assert.equal(admissions.length, 2);
      assert.ok(admissions.every((row) => row.ticketTier === "guest" && row.buyer === buyer.id &&
        row.claimedAccount == null && row.eventAccountKey == null));
      for (const admission of admissions) assert.deepEqual(admission.ticketTarget, target);
      const intents = await recordKeyGrantIntents({ req, orderID, transactionID, beneficiaryID: buyer.id, admissions });
      assert.deepEqual(intents.map((row) => row.entitlement), admissions.map((row) => row.id));
    });
  }
  assert.equal(fake.rows["commerce-key-grant-intents"].length, 2);
  assert.ok(fake.rows["commerce-key-grant-intents"].every((row) => row.recipientMode === "member_safe" && row.beneficiaryUser === buyer.id));
});

test("absent Guest offer, wrong product, same lock, and changed lock fail before creating admissions", async () => {
  for (const configuration of [null, { ...config, guestProductID: "other" }, { ...config, guestLock: memberLock },
    { ...config, guestLock: "0x" + "c".repeat(40) }]) {
    const fake = paidGuestTicket(configuration);
    const before = structuredClone(fake.rows);
    await assert.rejects(fake.transaction(buyer, (req) => grantOrderAdmissions({ req, orderID: "order", transactionID: "transaction" })), /ticket.*(configuration|mismatch)/i);
    assert.deepEqual(fake.rows, before);
  }
});

test("a verified buyer gets distinct Apple and Google URLs for each matching granted shared Guest ticket", async t => {
  const buyerID = "123e4567-e89b-42d3-a456-426614174001";
  const safeOwner = "0x" + "c".repeat(40);
  const passOrigin = "https://passes.example.invalid";
  for (const [key, value] of Object.entries({ UNLOCK_HOSTED_PASSES_ENABLED: "1", UNLOCK_GOOGLE_WALLET_PASSES_ENABLED: "1", UNLOCK_PASS_ORIGIN: passOrigin,
    UNLOCK_SHARED_TICKET_EVENT_ID: "e", MEMBER_WALLET_CHAIN_ID: "137",
    MEMBER_WALLET_LOCK_ADDRESS: memberLock, MEMBER_WALLET_OWNER_ADDRESS: safeOwner })) {
    const previous = process.env[key];
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
    process.env[key] = value;
  }
  const safe = await predictMemberSafe(loadWalletConfig()!, buyerID);
  const sharedTarget = { ...target, mode: "shared" as const };
  const { rows } = paidGuestTicket({ version: 1, mode: "shared", chainID: 137, eventLock: guestLock, guestProductID: "g" });
  const original = rows.orders[0];
  const order = { ...original, id: "123e4567-e89b-42d3-a456-426614174090", customer: buyerID, commerceSnapshot: { ...(original.commerceSnapshot as Record<string, unknown>),
    customerID: buyerID, ticketTarget: sharedTarget } };
  const admissions = [1, 2].map(unit => ({
    id: `123e4567-e89b-42d3-a456-42661417409${unit}`, unit, buyer: buyerID, transaction: "transaction", order: order.id, event: "e",
    ticketTier: "guest", ticketTarget: sharedTarget, status: "available",
  }));
  const intents = admissions.map(admission => {
    const tokenID = String(41 + admission.unit);
    return { id: `intent-${admission.unit}`, state: "granted", tokenID, entitlement: admission.id, beneficiaryUser: buyerID,
      order: order.id, payment: "transaction", operationKey: keyGrantOperationKey(order.id, admission.unit), recipientMode: "member_safe",
      grantedAt: new Date().toISOString(), settledTxHash: "0x" + "a".repeat(64), ticketTokenKey: ticketTokenIdentity(137, guestLock, tokenID),
      target: { chainID: 137, lock: guestLock, recipient: safe.safeAddress, ticketMode: "shared", ticketTier: "guest" } };
  });
  const fake = commerceStorageFake({
    ...rows, orders: [order], "commerce-admissions": admissions,
    transactions: [{ ...rows.transactions[0], order: order.id, customer: buyerID }],
    "commerce-key-grant-intents": intents,
    "member-wallets": [{ id: "wallet", ...safe, member: buyerID, activeSlot: buyerID, status: "active", walletKey: `137:${safe.safeAddress}` }],
  });
  const sponsor = { collection: "users", id: buyerID };
  const origin = "https://shop.example.invalid";
  const google = "https://pay.google.com/gp/v/save/one.two.three";
  const calls: string[] = [];
  const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push(String(url));
    assert.equal(init?.redirect, "error");
    assert.equal(init?.credentials, "omit");
    assert.equal(init?.headers, undefined);
    return String(url).endsWith("/ios")
      ? new Response(Uint8Array.of(0x50, 0x4b, 3, 4), { headers: { "Content-Type": "application/vnd.apple.pkpass" } })
      : Response.json({ passObjectUrl: google });
  };
  const endpoint = createEventPassEndpoint({
    getMemberRuntime: () => ({ config: { origin }, toMemberPrincipal: async () => ({ userId: buyerID, emailVerified: true }) }),
    fetcher, keyHeld: async () => true,
  });
  const get = (admissionID: string, platform: string, accept?: string, site = "same-origin", user = sponsor) =>
    fake.transaction(user, async req => endpoint.handler(Object.assign(req, {
      url: origin + "/api/commerce/wallet-pass", method: "GET",
      headers: new Headers({ "sec-fetch-site": site, ...(accept ? { accept } : {}) }),
      routeParams: { orderID: order.id, admissionID, platform },
    })));
  await fake.transaction(sponsor, async req => {
    for (const admission of admissions) {
      const base = `/api/commerce/orders/${order.id}/admissions/${admission.id}/wallet-pass`;
      assert.deepEqual(await readEventPassLinks(req, admission, order, buyerID),
        { walletPass: "ready", applePassURL: base + "/ios", androidPassURL: base + "/android" });
    }
  });
  assert.equal(calls.length, 0, "listing admissions must not call Unlock");
  const redirect = await get(admissions[0].id, "android");
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("location"), google);
  assert.equal(redirect.headers.get("referrer-policy"), "no-referrer");
  assert.equal(redirect.headers.get("cache-control"), "private, no-store");
  const share = await get(admissions[1].id, "android", "application/json");
  assert.deepEqual(await share.json(), { passObjectUrl: google });
  assert.equal(share.headers.get("cache-control"), "private, no-store");
  const download = await get(admissions[1].id, "ios");
  assert.equal(download.status, 200);
  assert.equal(download.headers.get("content-type"), "application/vnd.apple.pkpass");
  assert.match(download.headers.get("content-disposition") ?? "", /^attachment/);
  assert.equal(download.headers.get("location"), null);
  assert.deepEqual([...new Uint8Array(await download.arrayBuffer())], [0x50, 0x4b, 3, 4]);
  assert.deepEqual(calls, [`${passOrigin}/v2/pass/137/${guestLock}/42/android`,
    `${passOrigin}/v2/pass/137/${guestLock}/43/android`, `${passOrigin}/v2/pass/137/${guestLock}/43/ios`]);
  assert.equal((await get(admissions[0].id, "ios", undefined, "cross-site")).status, 404);
  assert.equal((await get(admissions[0].id, "ios", undefined, "same-origin", { ...sponsor, id: "other" })).status, 404);
  fake.rows["commerce-admissions"] = admissions.map(a => ({ ...a, buyer: "other" }));
  assert.equal((await get(admissions[0].id, "ios")).status, 404);
  fake.rows["commerce-admissions"] = admissions.map(a => ({ ...a, benefitReview: true }));
  assert.equal((await get(admissions[0].id, "android")).status, 404);
  fake.rows["commerce-admissions"] = admissions;
  fake.rows["commerce-key-grant-intents"] = intents.map(row => ({ ...row, cancelRequested: true }));
  assert.equal((await get(admissions[0].id, "android")).status, 404);
  assert.equal(calls.length, 3, "denied requests must not call Unlock");

  fake.rows["commerce-key-grant-intents"] = intents;
  for (const upstream of [
    Response.json({ passObjectUrl: "https://pay.google.com.evil.invalid/gp/v/save/one.two.three" }),
    Response.json({ passObjectUrl: "https://pay.google.com/not-a-save-page" }),
    Response.json({ passObjectUrl: "http://pay.google.com/gp/v/save/one.two.three" }),
    Response.json({ passObjectUrl: "https://person@pay.google.com/gp/v/save/one.two.three" }),
    Response.json({ passObjectUrl: google + "?extra=1" }),
    Response.json({ passObjectUrl: google + "/" + "x".repeat(20_000) }),
    Response.json({ notAURL: true }),
  ]) {
    const bad = createEventPassEndpoint({
      getMemberRuntime: () => ({ config: { origin }, toMemberPrincipal: async () => ({ userId: buyerID, emailVerified: true }) }),
      fetcher: async () => upstream, keyHeld: async () => true,
    });
    const denied = await fake.transaction(sponsor, async req => bad.handler(Object.assign(req, {
      url: origin + "/api/commerce/wallet-pass", method: "GET", headers: new Headers({ "sec-fetch-site": "same-origin" }),
      routeParams: { orderID: order.id, admissionID: admissions[0].id, platform: "android" },
    })));
    assert.equal(denied.status, 502);
    assert.equal(denied.headers.get("location"), null);
  }
});

// Owner ruling, 25 Nov (Cordy): "and add the wallet pass now" = option (a): Add to Apple Wallet and Add to Google Wallet on
// the member ticket page; our server proves the signed-in member owns the key before it fetches Unlock's pass.
async function memberTicket(t: { after: (fn: () => void) => void }, deps: Partial<Parameters<typeof createEventPassEndpoint>[0]> = {}) {
  const buyerID = "123e4567-e89b-42d3-a456-426614174011";
  const passOrigin = "https://passes.example.invalid";
  for (const [key, value] of Object.entries({ UNLOCK_HOSTED_PASSES_ENABLED: "1", UNLOCK_GOOGLE_WALLET_PASSES_ENABLED: "1", UNLOCK_PASS_ORIGIN: passOrigin,
    UNLOCK_SHARED_TICKET_EVENT_ID: "e", MEMBER_WALLET_CHAIN_ID: "137",
    MEMBER_WALLET_LOCK_ADDRESS: memberLock, MEMBER_WALLET_OWNER_ADDRESS: "0x" + "c".repeat(40) })) {
    const previous = process.env[key];
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
    process.env[key] = value;
  }
  const safe = await predictMemberSafe(loadWalletConfig()!, buyerID);
  const sharedTarget = { chainID: 137, lock: guestLock, mode: "shared" as const };
  const seed = saleSeed();
  const order = { ...seed.orders[0], id: "123e4567-e89b-42d3-a456-426614174190", customer: buyerID, commerceSnapshot: {
    version: 2, kind: "native-edition-v1", customerID: buyerID, cartID: "cart", productID: "edition", releaseID: "edition", eventID: "e",
    productVersion: "1", variantID: "personal", variantVersion: "1", optionID: "personal", variantTypeID: "edition-type", editionLabel: "Personal",
    editionKind: "personal", editionRuleVersion: 1, editionEntitlements: { membershipSignet: true, freeLaunchTicket: true }, maximumQuantity: 1,
    termsRevision: "t", disclosureRevision: "d", fulfillmentRevision: "f", benefitRevision: "b", quantity: 1, currency: "KRW",
    unitAmount: 82_000, shippingAmount: 0, totalAmount: 82_000, orderName: "Personal",
    shippingAddress: { country: "KR", recipientName: "Fixture", phone: "01012345678", postalCode: "12345", addressLine1: "Fixture" },
    memberTicketTarget: sharedTarget,
  } };
  const admission = { id: "123e4567-e89b-42d3-a456-426614174191", unit: 1, buyer: buyerID, transaction: "transaction", order: order.id,
    event: "e", ticketTier: "member", ticketTarget: sharedTarget, status: "available" };
  const intent = { id: "member-intent", state: "granted", tokenID: "7", entitlement: admission.id, beneficiaryUser: buyerID, order: order.id,
    payment: "transaction", purpose: MEMBER_EVENT_GRANT, operationKey: memberEventGrantOperationKey(order.id, 1), recipientMode: "member_safe",
    grantedAt: new Date().toISOString(), settledTxHash: "0x" + "a".repeat(64), ticketTokenKey: ticketTokenIdentity(137, guestLock, "7"),
    target: { chainID: 137, lock: guestLock, recipient: safe.safeAddress, ticketMode: "shared", ticketTier: "member" } };
  const fake = commerceStorageFake({
    ...seed,
    "commerce-events": [{ ...seed["commerce-events"][0], name: "Launch night", checkInAuthority: "unlock-events",
      unlockTicketConfiguration: { version: 1, mode: "shared", chainID: 137, eventLock: guestLock, guestProductID: "g" } }],
    orders: [order], "commerce-admissions": [admission],
    transactions: [{ ...seed.transactions[0], order: order.id, customer: buyerID }],
    "commerce-key-grant-intents": [intent],
    "member-wallets": [{ id: "wallet", ...safe, member: buyerID, activeSlot: buyerID, status: "active", walletKey: `137:${safe.safeAddress}` }],
  });
  const member = { collection: "users", id: buyerID };
  const origin = "https://shop.example.invalid";
  const calls: string[] = [];
  let upstream: () => Response = () => new Response(null, { status: 500 });
  const held: unknown[] = [];
  let holder: () => Promise<boolean> = async () => true;
  const endpoint = createEventPassEndpoint({
    getMemberRuntime: () => ({ config: { origin }, toMemberPrincipal: async () => ({ userId: buyerID, emailVerified: true }) }),
    fetcher: async url => { calls.push(String(url)); return upstream(); },
    keyHeld: async key => { held.push(key); return holder(); },
    ...deps,
  });
  // A click on the card's link is a same-origin top-level navigation.
  const logs: unknown[] = [];
  const open = (platform: "ios" | "android", user: object | null = member, accept?: string) =>
    fake.transaction(member, async req => endpoint.handler(Object.assign(req, {
      payload: Object.assign(req.payload, { logger: { warn: (entry: unknown) => logs.push(entry) } }),
      user, url: origin + "/api/commerce/wallet-pass", method: "GET",
      headers: new Headers({ "sec-fetch-site": "same-origin", ...(accept ? { accept } : { "sec-fetch-mode": "navigate" }) }),
      routeParams: { orderID: order.id, admissionID: admission.id, platform },
    })));
  const links = () => fake.transaction(member, req => readEventPassLinks(req, fake.rows["commerce-admissions"][0], order, buyerID));
  const back = `/shop/orders/${order.id}#wallet-pass-unavailable`;
  return { fake, intent, open, links, calls, back, passOrigin, held, safe, origin, order, logs, setUpstream: (next: () => Response) => { upstream = next; },
    setHolder: (next: () => Promise<boolean>) => { holder = next; },
    base: `/api/commerce/orders/${order.id}/admissions/${admission.id}/wallet-pass` };
}

test("a member ticket with an issued key offers Add to Apple Wallet and Add to Google Wallet", async t => {
  const m = await memberTicket(t);
  assert.deepEqual(await m.links(), { walletPass: "ready", applePassURL: m.base + "/ios", androidPassURL: m.base + "/android" });
  assert.equal(m.calls.length, 0, "listing must not call Unlock");
  const google = "https://pay.google.com/gp/v/save/one.two.three";
  m.setUpstream(() => Response.json({ passObjectUrl: google }));
  const saved = await m.open("android");
  assert.equal(saved.status, 302);
  assert.equal(saved.headers.get("location"), google);
  m.setUpstream(() => new Response(Uint8Array.of(0x50, 0x4b, 3, 4), { headers: { "Content-Type": "application/vnd.apple.pkpass" } }));
  const pass = await m.open("ios");
  assert.equal(pass.status, 200);
  assert.equal(pass.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(m.calls, [`${m.passOrigin}/v2/pass/137/${guestLock}/7/android`, `${m.passOrigin}/v2/pass/137/${guestLock}/7/ios`]);
});

test("a member ticket whose key is not yet issued says so, with no pass links", async t => {
  const m = await memberTicket(t);
  for (const state of ["awaiting_wallet", "pending", "submitted", "failed_retryable", "ambiguous"]) {
    m.fake.rows["commerce-key-grant-intents"] = [{ ...m.intent, state, tokenID: undefined, grantedAt: undefined, settledTxHash: undefined }];
    assert.deepEqual(await m.links(), { walletPass: "pending", applePassURL: null, androidPassURL: null }, state);
    const opened = await m.open("ios");
    assert.equal(opened.status, 303, state);
    assert.equal(opened.headers.get("location"), m.back);
  }
  assert.equal(m.calls.length, 0);
});

test("a member ticket with no key, or a cancelled one, has no Wallet pass", async t => {
  const m = await memberTicket(t);
  m.fake.rows["commerce-key-grant-intents"] = [];
  assert.deepEqual(await m.links(), { walletPass: "unavailable", applePassURL: null, androidPassURL: null });
  m.fake.rows["commerce-key-grant-intents"] = [{ ...m.intent, state: "cancelled" }];
  assert.deepEqual(await m.links(), { walletPass: "unavailable", applePassURL: null, androidPassURL: null });
  m.fake.rows["commerce-key-grant-intents"] = [{ ...m.intent, cancelRequested: true }];
  assert.deepEqual(await m.links(), { walletPass: "unavailable", applePassURL: null, androidPassURL: null });
  const opened = await m.open("android");
  assert.equal(opened.status, 303);
  assert.equal(opened.headers.get("location"), m.back);
  assert.equal(m.calls.length, 0);
});

test("someone else, or a signed-out visitor, opening the pass link gets the plain result and Unlock is never called", async t => {
  const m = await memberTicket(t);
  for (const user of [{ collection: "users", id: "123e4567-e89b-42d3-a456-426614174099" }, null]) {
    for (const platform of ["ios", "android"] as const) {
      const opened = await m.open(platform, user);
      assert.equal(opened.status, 303);
      assert.equal(opened.headers.get("location"), m.back);
      assert.equal(opened.headers.get("cache-control"), "private, no-store");
    }
  }
  const json = await m.open("android", null, "application/json");
  assert.equal(json.status, 404, "the JSON mode keeps its plain error");
  assert.equal(m.calls.length, 0);
});

test("a Locksmith failure while opening a pass returns the member to the ticket with a plain result", async t => {
  const m = await memberTicket(t);
  for (const failure of [() => new Response(null, { status: 500 }), () => { throw new Error("offline"); },
    () => new Response("<html>", { headers: { "Content-Type": "text/html" } })]) {
    m.setUpstream(failure);
    for (const platform of ["ios", "android"] as const) {
      const opened = await m.open(platform);
      assert.equal(opened.status, 303, platform);
      assert.equal(opened.headers.get("location"), m.back);
    }
    const json = await m.open("android", undefined, "application/json");
    assert.equal(json.status, 502);
  }
});

// Review-A HOLD (msg_8076f4870ae9): before the switch can go on, a fail-closed serve-time check that the member's Safe
// still holds a valid key, refusing with zero provider fetches.
test("a pass is fetched only while the member's Safe still holds the valid key on chain", async t => {
  const m = await memberTicket(t);
  m.setUpstream(() => new Response(Uint8Array.of(0x50, 0x4b, 3, 4), { headers: { "Content-Type": "application/vnd.apple.pkpass" } }));
  assert.equal((await m.open("ios")).status, 200);
  assert.deepEqual(m.held, [{ lock: guestLock, tokenID: "7", recipient: m.safe.safeAddress }]);
  for (const refusal of [async () => false, async () => { throw new Error("rpc down"); }]) {
    m.setHolder(refusal);
    const before = m.calls.length;
    for (const platform of ["ios", "android"] as const) {
      const opened = await m.open(platform);
      assert.equal(opened.status, 303);
      assert.equal(opened.headers.get("location"), m.back);
      assert.equal((await m.open(platform, undefined, "application/json")).status, 404);
    }
    assert.equal(m.calls.length, before, "a refused or unproven holder never reaches Unlock");
  }
});

test("the per-member pass rate limit allows 20 a minute, refuses the 21st without Unlock, and resets", async t => {
  const m = await memberTicket(t);
  let now = Date.UTC(2026, 10, 25, 12);
  t.mock.method(Date, "now", () => now);
  m.setUpstream(() => new Response(Uint8Array.of(0x50, 0x4b, 3, 4), { headers: { "Content-Type": "application/vnd.apple.pkpass" } }));
  for (let i = 0; i < 20; i++) assert.equal((await m.open("ios", undefined, "application/json")).status, 200, `request ${i + 1}`);
  assert.equal(m.calls.length, 20);
  assert.equal((await m.open("ios", undefined, "application/json")).status, 429);
  const nav = await m.open("ios");
  assert.equal(nav.status, 303);
  assert.equal(nav.headers.get("location"), m.back);
  assert.equal(m.calls.length, 20, "refused requests never reach Unlock");
  now += 59_999;
  assert.equal((await m.open("ios", undefined, "application/json")).status, 429, "still inside the minute");
  now += 1;
  assert.equal((await m.open("ios", undefined, "application/json")).status, 200, "a new minute starts a new count");
  assert.equal(m.calls.length, 21);
});

// Cordy ruling (msg_ae4f93b66e96): Google Wallet behind its own switch, default off for both tiers. Unlock's Google object
// ID is <issuer>.<class>.<keyId> with no lock or network, so it collides across locks.
test("with passes on but the Google switch off, only Apple is offered and the Google route never reaches Unlock", async t => {
  const m = await memberTicket(t);
  const previous = process.env.UNLOCK_GOOGLE_WALLET_PASSES_ENABLED;
  t.after(() => { if (previous === undefined) delete process.env.UNLOCK_GOOGLE_WALLET_PASSES_ENABLED; else process.env.UNLOCK_GOOGLE_WALLET_PASSES_ENABLED = previous; });
  for (const off of [undefined, "0", "true"]) {
    if (off === undefined) delete process.env.UNLOCK_GOOGLE_WALLET_PASSES_ENABLED; else process.env.UNLOCK_GOOGLE_WALLET_PASSES_ENABLED = off;
    assert.deepEqual(await m.links(), { walletPass: "ready", applePassURL: m.base + "/ios", androidPassURL: null }, String(off));
    const opened = await m.open("android");
    assert.equal(opened.status, 303);
    assert.equal(opened.headers.get("location"), m.back);
  }
  assert.equal(m.calls.length, 0);
  assert.equal(m.held.length, 0, "a hidden Google route does not even read the chain");
});

// Our own Google Wallet pass (owner GO, 26 Nov, via Cordy): Unlock's signed QR, harvested from the hosted Android route
// and proved for this key and Safe, inside a save JWT we sign with jose. Off unless OWN_WALLET_PASSES_ENABLED=1.
async function ownPass(t: { after: (fn: () => void) => void }, { issuerFails = false, apple = null as null | (() => Promise<AppleSigner>),
  loadIssuer = null as null | (() => Promise<GoogleWalletIssuer>) } = {}) {
  const google = await generateKeyPair("RS256", { extractable: true });
  const unlockKey = await generateKeyPair("RS256");
  const locksmith = privateKeyToAccount(generatePrivateKey());
  const issuer: GoogleWalletIssuer = { issuerID: "3388000000022222222", serviceAccount: "wallet-issuer@sophomores-test.iam.gserviceaccount.com", key: google.privateKey };
  const m = await memberTicket(t, {
    googleIssuer: loadIssuer ?? (async () => { if (issuerFails) throw new Error("issuer_file_unreadable"); return issuer; }),
    qrSigners: [locksmith.address],
    ...(apple ? { appleSigner: apple } : {}),
  });
  for (const [key, value] of Object.entries({ OWN_WALLET_PASSES_ENABLED: "1", OWN_APPLE_WALLET_PASSES_ENABLED: apple ? "1" : "0" })) {
    const previous = process.env[key];
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
    process.env[key] = value;
  }
  // What Locksmith's /android answers: a fat save JWT whose object carries <unlockApp>/verification?data=…&sig=….
  const qr = async (data: Record<string, unknown> = {}, { signer = locksmith, url = "https://app.unlock-protocol.com/verification", extra = {} as Record<string, string>,
    tamper = false } = {}) => {
    const raw = JSON.stringify({ network: 137, account: m.safe.safeAddress, lockAddress: guestLock, tokenId: "7", timestamp: Date.now(), ...data });
    const value = new URL(url);
    value.searchParams.append("data", tamper ? raw.replace('"7"', '"8"') : raw);
    value.searchParams.append("sig", await signer.signMessage({ message: raw }));
    for (const [name, extraValue] of Object.entries(extra)) value.searchParams.append(name, extraValue);
    return value.href;
  };
  const hosted = async (value: string, objects?: unknown) => {
    const jwt = await new SignJWT({ typ: "savetowallet", origins: [], payload: { genericObjects: objects ?? [{ id: "x.y.7", barcode: { type: "QR_CODE", value, alternateText: "" } }] } })
      .setProtectedHeader({ alg: "RS256" }).setIssuer("unlock@example.iam.gserviceaccount.com").setAudience("google").sign(unlockKey.privateKey);
    return Response.json({ passObjectUrl: `https://pay.google.com/gp/v/save/${jwt}` });
  };
  return { ...m, issuer, google, qr, hosted, locksmith };
}

test("own passes: the ticket offers Add to Google Wallet only, until our Apple pass lands", async t => {
  const m = await ownPass(t);
  assert.deepEqual(await m.links(), { walletPass: "ready", applePassURL: null, androidPassURL: m.base + "/android" });
  const opened = await m.open("ios");
  assert.equal(opened.status, 303);
  assert.equal(opened.headers.get("location"), m.back);
  assert.equal(m.calls.length, 0);
  assert.equal(m.held.length, 0);
});

test("own passes: Unlock's proved QR goes into our signed save JWT, with nothing personal beside it", async t => {
  const m = await ownPass(t);
  const value = await m.qr();
  let answer = await m.hosted(value);
  m.setUpstream(() => answer.clone());
  const saved = await m.open("android");
  assert.equal(saved.status, 302);
  assert.equal(saved.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(m.calls, [`${m.passOrigin}/v2/pass/137/${guestLock}/7/android`], "one read of the hosted Android route");
  assert.deepEqual(m.held, [{ lock: guestLock, tokenID: "7", recipient: m.safe.safeAddress }], "the holder check ran first");
  const location = new URL(saved.headers.get("location")!);
  assert.equal(location.origin + location.pathname.split("/").slice(0, 4).join("/"), "https://pay.google.com/gp/v/save");
  const { payload: claims, protectedHeader } = await jwtVerify(location.pathname.split("/")[4], m.google.publicKey, { issuer: m.issuer.serviceAccount, audience: "google" });
  assert.equal(protectedHeader.alg, "RS256");
  assert.equal(claims.typ, "savetowallet");
  assert.deepEqual(claims.origins, [m.origin]);
  const body = claims.payload as { eventTicketClasses: Record<string, unknown>[]; eventTicketObjects: Record<string, unknown>[] };
  const [klass] = body.eventTicketClasses;
  const [object] = body.eventTicketObjects;
  assert.equal(klass.id, googleEventClassID(m.issuer.issuerID, "e"));
  assert.deepEqual(klass.eventName, { defaultValue: { language: "en-US", value: "Launch night" } });
  assert.equal(klass.hexBackgroundColor, "#02221B", "the owner's pick: Medici Cypress Darker -1");
  assert.deepEqual(klass.wideLogo, { sourceUri: { uri: new URL("/wallet-pass/logo@3x.png", m.origin).href },
    contentDescription: { defaultValue: { language: "en-US", value: "Sophomores" } } }, "the BrandMark art, from our own site");
  assert.equal(object.id, googleTicketObjectID(m.issuer.issuerID, { lock: guestLock, tokenID: "7", recipient: m.safe.safeAddress }));
  assert.match(String(object.id), /^3388000000022222222\.ticket-[0-9a-f]{32}$/);
  assert.equal(object.classId, klass.id);
  assert.deepEqual(object.barcode, { type: "QR_CODE", value, alternateText: "" });
  const outside = JSON.stringify({ ...body, eventTicketObjects: [{ ...object, barcode: null }] });
  for (const personal of [m.order.id, "123e4567-e89b-42d3-a456-426614174011", "123e4567-e89b-42d3-a456-426614174191", m.safe.safeAddress.toLowerCase(), "Fixture"]) {
    assert.equal(outside.toLowerCase().includes(personal.toLowerCase()), false, `no ${personal} outside the QR`);
  }
  answer = await m.hosted(value);
  const json = await m.open("android", undefined, "application/json");
  assert.equal(json.status, 200);
  assert.match((await json.json() as { passObjectUrl: string }).passObjectUrl, /^https:\/\/pay\.google\.com\/gp\/v\/save\/[\w-]+\.[\w-]+\.[\w-]+$/);
});

test("own passes: without our issuer key nothing is fetched, not even the chain", async t => {
  const m = await ownPass(t, { issuerFails: true });
  const opened = await m.open("android");
  assert.equal(opened.status, 303);
  assert.equal(opened.headers.get("location"), m.back);
  assert.equal((await m.open("android", undefined, "application/json")).status, 503);
  assert.equal(m.calls.length, 0);
  assert.equal(m.held.length, 0);
});

test("own passes: a holder that no longer proves out gets no pass and Unlock is never asked", async t => {
  const m = await ownPass(t);
  m.setHolder(async () => false);
  assert.equal((await m.open("android")).status, 303);
  assert.equal(m.calls.length, 0);
});

test("own passes: any QR that doesn't prove this key in this Safe, signed by Locksmith, builds no pass", async t => {
  const m = await ownPass(t);
  const stranger = privateKeyToAccount(generatePrivateKey());
  const cases: [string, string, () => Promise<Response>][] = [
    ["another network", "qr_data", async () => m.hosted(await m.qr({ network: 1 }))],
    ["another lock", "key_mismatch", async () => m.hosted(await m.qr({ lockAddress: memberLock }))],
    ["another token", "key_mismatch", async () => m.hosted(await m.qr({ tokenId: "8" }))],
    ["another account", "account_mismatch", async () => m.hosted(await m.qr({ account: "0x" + "d".repeat(40) }))],
    ["an extra field", "qr_data", async () => m.hosted(await m.qr({ name: "x" }))],
    ["an unknown signer", "signer_unknown", async () => m.hosted(await m.qr({}, { signer: stranger }))],
    ["data changed after signing", "key_mismatch", async () => m.hosted(await m.qr({}, { tamper: true }))],
    ["another verifier host", "qr_url", async () => m.hosted(await m.qr({}, { url: "https://app.unlock-protocol.com.evil.invalid/verification" }))],
    ["an extra parameter", "qr_url", async () => m.hosted(await m.qr({}, { extra: { next: "x" } }))],
    ["no object", "jwt_shape", async () => m.hosted("", [])],
    ["two objects", "jwt_shape", async () => m.hosted(await m.qr(), [{ barcode: { type: "QR_CODE", value: await m.qr() } }, { barcode: { type: "QR_CODE", value: await m.qr() } }])],
    ["not a QR", "jwt_shape", async () => m.hosted("", [{ barcode: { type: "PDF_417", value: await m.qr() } }])],
    ["a save URL elsewhere", "save_url", async () => Response.json({ passObjectUrl: "https://pay.google.com.evil.invalid/gp/v/save/a.b.c" })],
    ["no JWT", "save_url", async () => Response.json({ passObjectUrl: "https://pay.google.com/gp/v/save/abc" })],
  ];
  for (const [name, cause, make] of cases) {
    const answer = await make();
    m.setUpstream(() => answer.clone());
    const opened = await m.open("android");
    assert.equal(opened.status, 303, name);
    assert.equal(opened.headers.get("location"), m.back, name);
    assert.deepEqual(m.logs.at(-1), { msg: "Own wallet pass: Unlock QR refused", cause }, name);
  }
  assert.equal(m.logs.length, cases.length, "one fixed-reason line per refusal, nothing else");
  // A tampered token is refused before the signature (its data names another key); a tampered timestamp reaches it.
  const signed = await m.qr();
  const forged = new URL(signed);
  forged.searchParams.set("data", forged.searchParams.get("data")!.replace(/"timestamp":\d+/, '"timestamp":1'));
  const tampered = await m.hosted(forged.href);
  m.setUpstream(() => tampered.clone());
  assert.equal((await m.open("android")).status, 303);
  assert.deepEqual(m.logs.at(-1), { msg: "Own wallet pass: Unlock QR refused", cause: "signer_unknown" }, "edited data no longer recovers the signer");
  assert.equal(m.calls.length, cases.length + 1, "each case read Unlock once and stopped there");
});

test("own passes: an event with no name can't make a pass, so the ticket shows none", async t => {
  const m = await ownPass(t);
  m.fake.rows["commerce-events"] = [{ ...m.fake.rows["commerce-events"][0], name: " " }];
  assert.deepEqual(await m.links(), { walletPass: "unavailable", applePassURL: null, androidPassURL: null });
  assert.equal((await m.open("android")).status, 303);
  assert.equal(m.calls.length, 0);
});

const undersizedPem = () => generateKeyPairSync("rsa", { modulusLength: 1024 }).privateKey.export({ type: "pkcs8", format: "pem" }) as string;

test("our Google issuer file: owner-only, well formed, and every failure a fixed code", async t => {
  const dir = await mkdtemp(join(tmpdir(), "gw-issuer-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const previous = process.env.GOOGLE_WALLET_ISSUER_ID;
  t.after(() => { if (previous === undefined) delete process.env.GOOGLE_WALLET_ISSUER_ID; else process.env.GOOGLE_WALLET_ISSUER_ID = previous; });
  const { privateKey } = await generateKeyPair("RS256", { extractable: true });
  const pem = await exportPKCS8(privateKey);
  const file = join(dir, "google-wallet-issuer.json");
  const write = async (body: string, mode = 0o600) => { await writeFile(file, body, { mode }); await chmod(file, mode); };
  const code = async () => { try { await loadGoogleWalletIssuer(file); return "ok"; } catch (error) { return (error as GoogleWalletIssuerError).code; } };
  const account = { type: "service_account", client_email: "wallet-issuer@sophomores-test.iam.gserviceaccount.com", private_key: pem, project_id: "p" };
  delete process.env.GOOGLE_WALLET_ISSUER_ID;
  await write(JSON.stringify(account));
  assert.equal(await code(), "issuer_id_invalid");
  process.env.GOOGLE_WALLET_ISSUER_ID = "3388000000022222222";
  assert.equal(await code(), "ok");
  await write(JSON.stringify(account), 0o644);
  assert.equal(await code(), "issuer_file_unreadable");
  await write("{", 0o600);
  assert.equal(await code(), "issuer_file_invalid");
  await write(JSON.stringify({ ...account, client_email: "someone@gmail.com" }));
  assert.equal(await code(), "issuer_file_invalid");
  await write(JSON.stringify({ ...account, private_key: pem.replace(/\n[\s\S]+\n(?=-)/, "\nnotakey\n") }));
  assert.equal(await code(), "issuer_key_invalid");
  await write(JSON.stringify({ ...account, private_key: undersizedPem() }));
  assert.equal(await code(), "issuer_key_invalid", "a 1024-bit key is refused at load, not when signing");
  await rm(file);
  assert.equal(await code(), "issuer_file_unreadable");
  const thrown = await loadGoogleWalletIssuer(file).catch((error: Error) => error);
  assert.equal(String(thrown).includes(dir), false, "no path or content in the error");
});

test("own Google pass: an undersized issuer key stops the real loader before the chain or Unlock", async t => {
  const dir = await mkdtemp(join(tmpdir(), "gw-issuer-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const previous = process.env.GOOGLE_WALLET_ISSUER_ID;
  t.after(() => { if (previous === undefined) delete process.env.GOOGLE_WALLET_ISSUER_ID; else process.env.GOOGLE_WALLET_ISSUER_ID = previous; });
  process.env.GOOGLE_WALLET_ISSUER_ID = "3388000000022222222";
  const file = join(dir, "google-wallet-issuer.json");
  await writeFile(file, JSON.stringify({ type: "service_account", client_email: "wallet-issuer@sophomores-test.iam.gserviceaccount.com",
    private_key: undersizedPem() }), { mode: 0o600 });
  const m = await ownPass(t, { loadIssuer: () => loadGoogleWalletIssuer(file) });
  assert.equal((await m.open("android", undefined, "application/json")).status, 503);
  assert.equal(m.calls.length, 0, "no Unlock fetch");
  assert.equal(m.held.length, 0, "no chain read");
});

test("own Apple pass: behind its own switch, the same proved QR in a pass we sign", { skip: !toolsAvailable() && "openssl or unzip is not installed" }, async t => {
  const f = await appleSigningFixture();
  t.after(f.cleanup);
  const signer = await loadAppleSigner({ files: f.files, artDirectory: f.art, wwdr: f.wwdr });
  const m = await ownPass(t, { apple: async () => signer });
  assert.deepEqual(await m.links(), { walletPass: "ready", applePassURL: m.base + "/ios", androidPassURL: m.base + "/android" });
  const value = await m.qr();
  const answer = await m.hosted(value);
  m.setUpstream(() => answer.clone());
  const opened = await m.open("ios");
  assert.equal(opened.status, 200);
  assert.equal(opened.headers.get("content-type"), "application/vnd.apple.pkpass");
  assert.equal(opened.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(m.calls, [`${m.passOrigin}/v2/pass/137/${guestLock}/7/android`], "Apple reads Unlock's QR from the same route");
  assert.equal(m.held.length, 1, "the holder check ran first");
  const pass = await openPass(Buffer.from(await opened.arrayBuffer()), f.caFile);
  assert.equal(pass.verified, true);
  assert.deepEqual(pass.pass.barcodes, [{ message: value, format: "PKBarcodeFormatQR", messageEncoding: "iso-8859-1" }]);
  assert.equal(pass.pass.serialNumber, passSerial({ lock: guestLock, tokenID: "7", recipient: m.safe.safeAddress }));
  const outside = JSON.stringify({ ...pass.pass, barcodes: null });
  for (const personal of [m.order.id, "123e4567-e89b-42d3-a456-426614174011", m.safe.safeAddress.toLowerCase(), "Fixture"]) {
    assert.equal(outside.toLowerCase().includes(personal.toLowerCase()), false, `no ${personal} outside the QR`);
  }
  const bad = await m.hosted(await m.qr({ tokenId: "8" }));
  m.setUpstream(() => bad.clone());
  assert.equal((await m.open("ios")).status, 303, "a QR for another token builds no Apple pass either");
});

test("own Apple pass: a matching key stored unencrypted is refused before the chain or Unlock", { skip: !toolsAvailable() && "openssl or unzip is not installed" }, async t => {
  const f = await appleSigningFixture();
  t.after(f.cleanup);
  const plainFile = join(f.dir, "plain-key.pem");
  const key = createPrivateKey({ key: await readFile(f.files.key, "utf8"), passphrase: f.passphrase });
  await writeFile(plainFile, key.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  const m = await ownPass(t, { apple: () => loadAppleSigner({ files: { ...f.files, key: plainFile }, artDirectory: f.art, wwdr: f.wwdr }) });
  assert.equal((await m.open("ios", undefined, "application/json")).status, 503);
  assert.equal(m.calls.length, 0, "no Unlock fetch");
  assert.equal(m.held.length, 0, "no chain read");
});

test("own Apple pass: without our signer or pass art, nothing is fetched, not even the chain", async t => {
  const m = await ownPass(t, { apple: async () => { throw new Error("pass_art_missing"); } });
  const opened = await m.open("ios");
  assert.equal(opened.status, 303);
  assert.equal(opened.headers.get("location"), m.back);
  assert.equal((await m.open("ios", undefined, "application/json")).status, 503);
  assert.equal(m.calls.length, 0);
  assert.equal(m.held.length, 0);
});
