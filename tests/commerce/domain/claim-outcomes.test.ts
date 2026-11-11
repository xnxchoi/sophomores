import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { APIError } from "payload";
import { claimGuestAdmission } from "../../../src/lib/commerce/guests";
import { commerceStorageFake, saleSeed } from "./storage-fake";

const token = "a".repeat(43);
const digest = createHash("sha256").update(token).digest("hex");
const customer = { collection: "users", id: "guest" };

function fixture() {
  return { ...saleSeed(), users: [{ id: "guest", emailVerified: true, banned: false }],
    "commerce-admissions": [{ id: "admission", order: "order", buyer: "buyer", event: "e", guestName: "Guest", status: "available" }],
    "commerce-claims": [{ id: "claim", admission: "admission", tokenDigest: digest, expiresAt: new Date(Date.now() + 60_000).toISOString(), consumedAt: null, revokedAt: null }] };
}

async function rejectsWith(seed: Record<string, (Record<string, unknown> & { id: string })[]>, code: string, status: number, suppliedToken: string = token, active = true) {
  const fake = commerceStorageFake(seed);
  const before = structuredClone(fake.rows);
  await fake.transaction(customer, async (req) => {
    await assert.rejects(claimGuestAdmission({ req, token: suppliedToken }, async () => active), (error: unknown) => {
      assert.ok(error instanceof APIError);
      assert.equal(error.status, status);
      assert.deepEqual(error.data, { code });
      assert.equal(error.isPublic, true);
      assert.equal(error.message.includes(token), false);
      assert.equal(error.message.includes("private-other-account"), false);
      return true;
    });
  });
  assert.deepEqual(fake.rows, before, "A classified rejection changes no claim or binding");
}

for (const supplied of ["", "!", "a".repeat(44), null as unknown as string]) {
  test("malformed claim is invalid without inventing its history: " + String(supplied?.length), async () => {
    await rejectsWith(fixture(), "CLAIM_INVALID", 400, supplied);
  });
}

test("a well-shaped missing bearer is invalid", async () => {
  await rejectsWith({ ...fixture(), "commerce-claims": [] }, "CLAIM_INVALID", 400);
});

test("a digest changed while acquiring locks stays invalid, not proven rotated", async (t) => {
  const fake = commerceStorageFake(fixture());
  await fake.transaction(customer, async (req) => {
    const original = req.payload.findByID.bind(req.payload);
    t.mock.method(req.payload, "findByID", async (args: Parameters<typeof original>[0]) => {
      const row = await original(args);
      return String(args.collection) === "commerce-claims" ? { ...row, tokenDigest: "different" } : row;
    });
    await assert.rejects(claimGuestAdmission({ req, token }, async () => true), (error: unknown) => error instanceof APIError && error.status === 400 && error.data?.code === "CLAIM_INVALID");
  });
});

test("matched invitation expiry and event cutoff have explicit authoritative outcomes", async () => {
  const expired = fixture();
  await rejectsWith({ ...expired, "commerce-claims": [{ ...expired["commerce-claims"][0], expiresAt: new Date(Date.now() - 1000).toISOString() }] }, "CLAIM_EXPIRED", 410);
  const cutoff = fixture();
  await rejectsWith({ ...cutoff, "commerce-events": [{ ...cutoff["commerce-events"][0], claimCutoffAt: new Date(Date.now() - 1000).toISOString() }] }, "CLAIM_EXPIRED", 410);
});

for (const field of ["expiresAt", "claimCutoffAt"] as const) {
  test("invalid stored " + field + " is integrity uncertainty, not expiry", async () => {
    const seed = fixture();
    const fake = commerceStorageFake(field === "expiresAt" ? { ...seed, "commerce-claims": [{ ...seed["commerce-claims"][0], expiresAt: "invalid" }] } : { ...seed, "commerce-events": [{ ...seed["commerce-events"][0], claimCutoffAt: "invalid" }] });
    await fake.transaction(customer, async (req) => {
      await assert.rejects(claimGuestAdmission({ req, token }, async () => true), (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(error instanceof APIError, false);
        return true;
      });
    });
  });
}

test("consumed is bearer state regardless of which account consumed it", async () => {
  for (const claimedAccount of ["guest", "private-other-account"]) {
    const seed = fixture();
    await rejectsWith({ ...seed, "commerce-claims": [{ ...seed["commerce-claims"][0], consumedAt: new Date().toISOString() }], "commerce-admissions": [{ ...seed["commerce-admissions"][0], claimedAccount }] }, "CLAIM_CONSUMED", 409);
  }
});

test("revoked and nonclaimable admissions are unavailable without exposing another identity", async () => {
  const revoked = fixture();
  await rejectsWith({ ...revoked, "commerce-claims": [{ ...revoked["commerce-claims"][0], revokedAt: new Date().toISOString() }] }, "CLAIM_UNAVAILABLE", 409);
  const unavailable = fixture();
  await rejectsWith({ ...unavailable, "commerce-admissions": [{ ...unavailable["commerce-admissions"][0], status: "revoked" }] }, "CLAIM_UNAVAILABLE", 409);
  const claimed = fixture();
  await rejectsWith({ ...claimed, "commerce-admissions": [{ ...claimed["commerce-admissions"][0], claimedAccount: "private-other-account" }] }, "CLAIM_UNAVAILABLE", 409);
});

test("own-account combined readiness rejection does not diagnose phone specifically", async () => {
  for (const account of [{ id: "guest", emailVerified: false, banned: false }, { id: "guest", emailVerified: true, banned: true }]) {
    await rejectsWith({ ...fixture(), users: [account] }, "ACCOUNT_NOT_ELIGIBLE", 403);
  }
  await rejectsWith(fixture(), "ACCOUNT_NOT_ELIGIBLE", 403, token, false);
});

test("active readiness storage errors remain unclassified uncertainty", async () => {
  const fake = commerceStorageFake(fixture());
  await fake.transaction(customer, async (req) => {
    await assert.rejects(claimGuestAdmission({ req, token }, async () => { throw new Error("storage unavailable"); }), (error: unknown) => error instanceof Error && !(error instanceof APIError));
  });
});

test("the authenticated account's existing event binding has an explicit conflict", async () => {
  const seed = fixture();
  const eventAccountKey = createHash("sha256").update(JSON.stringify(["e", "guest"])).digest("hex");
  await rejectsWith({ ...seed, "commerce-admissions": [...seed["commerce-admissions"], { id: "previous", event: "e", buyer: "buyer", claimedAccount: "guest", eventAccountKey }] }, "EVENT_ALREADY_BOUND", 409);
});

test("successful claim keeps its receipt shape and consumes exactly its existing allocation", async () => {
  const fake = commerceStorageFake(fixture());
  await fake.transaction(customer, async (req) => {
    assert.deepEqual(await claimGuestAdmission({ req, token }, async () => true), { admissionID: "admission" });
  });
  assert.equal(fake.rows["commerce-admissions"].length, 1);
  assert.equal(fake.rows["commerce-admissions"][0].claimedAccount, "guest");
  assert.equal(typeof fake.rows["commerce-claims"][0].consumedAt, "string");
});
