import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
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
  for (const [key, value] of Object.entries({ UNLOCK_HOSTED_PASSES_ENABLED: "1", UNLOCK_PASS_ORIGIN: passOrigin,
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
    fetcher,
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
      fetcher: async () => upstream,
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
async function memberTicket(t: { after: (fn: () => void) => void }) {
  const buyerID = "123e4567-e89b-42d3-a456-426614174011";
  const passOrigin = "https://passes.example.invalid";
  for (const [key, value] of Object.entries({ UNLOCK_HOSTED_PASSES_ENABLED: "1", UNLOCK_PASS_ORIGIN: passOrigin,
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
    "commerce-events": [{ ...seed["commerce-events"][0], checkInAuthority: "unlock-events",
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
  const endpoint = createEventPassEndpoint({
    getMemberRuntime: () => ({ config: { origin }, toMemberPrincipal: async () => ({ userId: buyerID, emailVerified: true }) }),
    fetcher: async url => { calls.push(String(url)); return upstream(); },
  });
  // A click on the card's link is a same-origin top-level navigation.
  const open = (platform: "ios" | "android", user: object | null = member, accept?: string) =>
    fake.transaction(member, async req => endpoint.handler(Object.assign(req, {
      user, url: origin + "/api/commerce/wallet-pass", method: "GET",
      headers: new Headers({ "sec-fetch-site": "same-origin", ...(accept ? { accept } : { "sec-fetch-mode": "navigate" }) }),
      routeParams: { orderID: order.id, admissionID: admission.id, platform },
    })));
  const links = () => fake.transaction(member, req => readEventPassLinks(req, fake.rows["commerce-admissions"][0], order, buyerID));
  const back = `/shop/orders/${order.id}#wallet-pass-unavailable`;
  return { fake, intent, open, links, calls, back, passOrigin, setUpstream: (next: () => Response) => { upstream = next; },
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
