import assert from "node:assert/strict";
import test from "node:test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { doorCheckIn, doorCount, searchDoorAdmissions } from "../../../src/lib/commerce/door/check-in";
import { commerceStorageFake, saleSeed } from "../domain/storage-fake";
import { LOCK, unlockQr } from "./fixtures";

const locksmith = privateKeyToAccount(generatePrivateKey());
const signers = [locksmith.address];
const doorStaff = { collection: "admins", _strategy: "staff-better-auth", role: "staff", id: "door" };

function seed(admission: Record<string, unknown> = {}, extra: Record<string, Record<string, unknown>[]> = {}) {
  return commerceStorageFake({ ...saleSeed(),
    "commerce-events": [...saleSeed()["commerce-events"], { id: "other-event", capacity: 10 }],
    users: [{ id: "member", name: "Mina Park" }, { id: "buyer", name: "Bora Kim" }],
    "commerce-admissions": [
      { id: "admission", order: "order", event: "e", buyer: "buyer", unit: 1, status: "available", guestName: "Jun Lee", ...admission },
      { id: "member-seat", order: "order", event: "e", buyer: "member", unit: 2, status: "available", eventAccountKey: "member-key" },
      { id: "unassigned", order: "order", event: "e", buyer: "buyer", unit: 3, status: "available" },
    ],
    "commerce-key-grant-intents": [{ id: "intent", entitlement: "admission", state: "granted", tokenID: "7", target: { chainID: 84532, lock: LOCK, recipient: "0x0000000000000000000000000000000000000002" } }],
    ...extra,
  });
}

const attempts = (fake: ReturnType<typeof seed>) => fake.rows["commerce-door-attempts"] ?? [];

test("a valid QR from a pinned signer admits once; a second scan is refused with the first check-in time", async () => {
  const fake = seed();
  const scan = await unlockQr(locksmith, { tokenId: "7" });
  const first = await fake.transaction(doorStaff, (req) => doorCheckIn({ req, eventID: "e", method: "qr", scan, signers }));
  assert.equal(first.outcome, "admitted");
  assert.deepEqual(first.guest, { admissionID: "admission", name: "Jun Lee", kind: "guest" });
  const checkedInAt = fake.rows["commerce-admissions"][0].checkedInAt;
  assert.equal(typeof checkedInAt, "string");
  const second = await fake.transaction(doorStaff, (req) => doorCheckIn({ req, eventID: "e", method: "qr", scan, signers }));
  assert.deepEqual({ outcome: second.outcome, checkedInAt: "checkedInAt" in second ? second.checkedInAt : undefined }, { outcome: "already-checked-in", checkedInAt });
  assert.equal(fake.rows["commerce-admissions"][0].checkedInAt, checkedInAt);
  assert.deepEqual(attempts(fake).map(({ operator, event, admission, method, result, tokenID }) => ({ operator, event, admission, method, result, tokenID })), [
    { operator: "door", event: "e", admission: "admission", method: "qr", result: "admitted", tokenID: "7" },
    { operator: "door", event: "e", admission: "admission", method: "qr", result: "already-checked-in", tokenID: "7" },
  ]);
  assert.ok(attempts(fake).every((row) => typeof row.attemptedAt === "string"));
});

test("bad, re-serialised, unpinned and unknown QRs are refused with their codes and consume nothing", async () => {
  const fake = seed({}, { "commerce-key-grant-intents": [
    { id: "intent", entitlement: "admission", state: "granted", tokenID: "7", target: { chainID: 84532, lock: LOCK, recipient: "0x0000000000000000000000000000000000000002" } },
    { id: "cancelled", entitlement: "member-seat", state: "cancelled", tokenID: "8", target: { chainID: 84532, lock: LOCK, recipient: "0x0000000000000000000000000000000000000002" } },
  ] });
  const good = await unlockQr(locksmith, { tokenId: "7" });
  const badSig = new URL(good); badSig.searchParams.set("sig", `0x${"ab".repeat(65)}`);
  const reserialised = new URL(good); reserialised.searchParams.set("data", JSON.stringify(JSON.parse(String(reserialised.searchParams.get("data"))), null, 1));
  const cases: [string, string][] = [
    [badSig.toString(), "bad-signature"],
    [reserialised.toString(), "unpinned-signer"],
    [await unlockQr(privateKeyToAccount(generatePrivateKey()), { tokenId: "7" }), "unpinned-signer"],
    [await unlockQr(locksmith, { tokenId: "7", network: 1 }), "unknown-network"],
    [await unlockQr(locksmith, { tokenId: "7", lockAddress: "0x2222222222222222222222222222222222222222" }), "unknown-lock"],
    [await unlockQr(locksmith, { tokenId: "99" }), "unknown-token"],
    [await unlockQr(locksmith, { tokenId: "8" }), "key-not-active"],
    ["hello", "unreadable-qr"],
  ];
  for (const [scan, code] of cases) {
    const result = await fake.transaction(doorStaff, (req) => doorCheckIn({ req, eventID: "e", method: "qr", scan, signers }));
    assert.deepEqual(result, { outcome: "refused", code }, code);
  }
  assert.deepEqual(fake.rows["commerce-admissions"].map((row) => row.status), ["available", "available", "available"]);
  assert.deepEqual(attempts(fake).map((row) => [row.result, row.reason, row.admission ?? null]), cases.map(([, code]) => ["refused", code, null]));
});

test("held, revoked and refunded admissions are refused", async () => {
  const scan = await unlockQr(locksmith, { tokenId: "7" });
  const cases: [Record<string, unknown>, Record<string, Record<string, unknown>[]>, string][] = [
    [{ benefitReview: true }, {}, "held"],
    [{ returnAcceptedAt: new Date().toISOString() }, {}, "held"],
    [{}, { transactions: [{ id: "transaction", status: "succeeded", order: "order", commerceReviewHold: true }] }, "held"],
    [{ status: "revoked" }, {}, "revoked"],
    [{ status: "revoked", benefitReview: true }, { transactions: [{ id: "transaction", status: "refunded", order: "order", commerceReviewHold: true }] }, "refunded"],
  ];
  for (const [admission, extra, code] of cases) {
    const fake = seed(admission, extra);
    const result = await fake.transaction(doorStaff, (req) => doorCheckIn({ req, eventID: "e", method: "qr", scan, signers }));
    assert.deepEqual(result, { outcome: "refused", code, guest: { admissionID: "admission", name: "Jun Lee", kind: "guest" } }, code);
    assert.notEqual(fake.rows["commerce-admissions"][0].status, "checked-in");
    assert.deepEqual(attempts(fake).map((row) => [row.result, row.reason, row.admission]), [["refused", code, "admission"]]);
  }
});

test("a name check-in uses the same admission once, and a later QR scan finds it used", async () => {
  const fake = seed();
  const byName = await fake.transaction(doorStaff, (req) => doorCheckIn({ req, eventID: "e", method: "name", admissionID: "admission" }));
  assert.equal(byName.outcome, "admitted");
  const again = await fake.transaction(doorStaff, (req) => doorCheckIn({ req, eventID: "e", method: "name", admissionID: "admission" }));
  assert.equal(again.outcome, "already-checked-in");
  const scan = await unlockQr(locksmith, { tokenId: "7" });
  assert.equal((await fake.transaction(doorStaff, (req) => doorCheckIn({ req, eventID: "e", method: "qr", scan, signers }))).outcome, "already-checked-in");
  assert.deepEqual(attempts(fake).map((row) => [row.method, row.result]), [["name", "admitted"], ["name", "already-checked-in"], ["qr", "already-checked-in"]]);
});

test("name check-ins admit a member's own seat, refuse an unassigned seat, another event's admission and a missing one", async () => {
  const fake = seed();
  const member = await fake.transaction(doorStaff, (req) => doorCheckIn({ req, eventID: "e", method: "name", admissionID: "member-seat" }));
  assert.deepEqual({ outcome: member.outcome, guest: member.guest }, { outcome: "admitted", guest: { admissionID: "member-seat", name: "Mina Park", kind: "member" } });
  assert.deepEqual(await fake.transaction(doorStaff, (req) => doorCheckIn({ req, eventID: "e", method: "name", admissionID: "unassigned" })), { outcome: "refused", code: "unassigned", guest: { admissionID: "unassigned", name: "", kind: "guest" } });
  assert.deepEqual(await fake.transaction(doorStaff, (req) => doorCheckIn({ req, eventID: "other-event", method: "name", admissionID: "admission" })), { outcome: "refused", code: "other-event" });
  assert.deepEqual(await fake.transaction(doorStaff, (req) => doorCheckIn({ req, eventID: "e", method: "name", admissionID: "nope" })), { outcome: "refused", code: "unknown-admission" });
  assert.equal(fake.rows["commerce-admissions"][0].status, "available");
  assert.equal(attempts(fake).length, 4);
});

test("only CMS staff work the door; customers are rejected and nothing is logged", async () => {
  const fake = seed();
  for (const user of [{ collection: "users", id: "member" }, { ...doorStaff, _strategy: "local" }, {}]) {
    await fake.transaction(user, async (req) => {
      await assert.rejects(doorCheckIn({ req, eventID: "e", method: "name", admissionID: "admission" }), /door staff/i);
      await assert.rejects(searchDoorAdmissions({ req, eventID: "e", query: "Jun" }), /door staff/i);
    });
  }
  assert.equal(fake.rows["commerce-admissions"][0].status, "available");
  assert.equal(attempts(fake).length, 0);
});

test("staff search an event's admissions by guest or member name, and see a running count", async () => {
  const fake = seed();
  const search = (query: string) => fake.transaction(doorStaff, (req) => searchDoorAdmissions({ req, eventID: "e", query }));
  assert.deepEqual((await search("jun")).map((row) => [row.admissionID, row.name, row.kind, row.status]), [["admission", "Jun Lee", "guest", "available"]]);
  assert.deepEqual((await search(" PARK ")).map((row) => [row.admissionID, row.kind]), [["member-seat", "member"]]);
  assert.deepEqual(await search("nobody"), []);
  assert.deepEqual(await search(" "), []);
  await fake.transaction(doorStaff, (req) => doorCheckIn({ req, eventID: "e", method: "name", admissionID: "admission" }));
  assert.deepEqual(await fake.transaction(doorStaff, (req) => doorCount({ req, eventID: "e" })), { checkedIn: 1, total: 3 });
});

test("two concurrent scans of one admission: exactly one admits", async () => {
  const fake = seed();
  const scan = await unlockQr(locksmith, { tokenId: "7" });
  const results = await Promise.all([0, 1].map(() => fake.transaction(doorStaff, (req) => doorCheckIn({ req, eventID: "e", method: "qr", scan, signers }))));
  assert.deepEqual(results.map((result) => result.outcome).sort(), ["admitted", "already-checked-in"]);
});
