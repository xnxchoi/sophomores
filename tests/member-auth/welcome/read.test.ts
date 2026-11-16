import assert from "node:assert/strict";
import { test } from "node:test";
import type { PayloadRequest } from "payload";
import { readWelcome } from "@/lib/member-auth/welcome/read";
import { commerceStorageFake } from "../../commerce/domain/storage-fake";

// ADR-0013: the welcome page needs nothing but a signed-in member. It shows
// where the Signet stands (no activation step exists any more) and whether a
// sign-in passkey can be added; it never writes anything.

const principal = {
  userId: "member",
  sessionId: "s",
  emailVerified: true,
  sessionCreatedAt: new Date()
};
const intent = (id: string, state: string, extra: Record<string, unknown> = {}) => ({
  id,
  beneficiaryUser: "member",
  recipientMode: "member_safe",
  state,
  payment: `pay-${id}`,
  entitlement: `adm-${id}`,
  cancelRequested: false,
  ...extra
});
function seeded(
  intents: ReturnType<typeof intent>[],
  extra: Record<string, Record<string, unknown>[]> = {}
) {
  return commerceStorageFake({
    users: [{ id: "member", membershipStatus: "approved" }],
    "commerce-key-grant-intents": intents,
    transactions: intents.map((row) => ({ id: row.payment, status: "succeeded" })),
    "commerce-admissions": intents.map((row) => ({
      id: row.entitlement,
      status: "available",
      benefitReview: false
    })),
    passkeys: [],
    ...extra
  });
}
const read = (
  fake: ReturnType<typeof seeded>,
  options: { principal?: typeof principal | null } = {}
) =>
  fake.transaction({}, (req) =>
    readWelcome({
      req: req as PayloadRequest,
      principal: options.principal === undefined ? principal : options.principal
    })
  );

test("a signed-out visitor is asked to sign in", async () => {
  assert.deepEqual(await read(seeded([]), { principal: null }), { state: "signed_out" });
});

test("the Signet reads pending from payment until it is granted, with no activation step", async () => {
  for (const state of ["awaiting_wallet", "pending", "submitted", "failed_retryable"]) {
    const view = await read(seeded([intent("a", state)]));
    assert.deepEqual(view, { state: "welcome", signet: "pending", passkeys: 0, emailVerified: true }, state);
  }
  assert.equal(((await read(seeded([intent("a", "granted")]))) as { signet: string }).signet, "issued");
});

test("a held Signet reads on hold; a cancelled or unpaid one reads none", async () => {
  const held = seeded([intent("a", "pending")]);
  held.rows["commerce-admissions"][0].benefitReview = true;
  assert.equal(((await read(held)) as { signet: string }).signet, "on_hold");
  assert.equal(((await read(seeded([intent("a", "cancelled")]))) as { signet: string }).signet, "none");
  const unpaid = seeded([intent("a", "awaiting_wallet")]);
  unpaid.rows.transactions[0].status = "refunded";
  assert.equal(((await read(unpaid)) as { signet: string }).signet, "none");
  assert.equal(((await read(seeded([]))) as { signet: string }).signet, "none");
});

test("works for a member with or without passkeys; no phone binding is consulted", async () => {
  const withPasskeys = seeded([], {
    passkeys: [
      { id: "p1", user: "member", credentialId: "c1" },
      { id: "p2", user: "member", credentialId: "c2" },
      { id: "p3", user: "someone", credentialId: "c3" }
    ]
  });
  assert.deepEqual(await read(withPasskeys), { state: "welcome", signet: "none", passkeys: 2, emailVerified: true });
  assert.deepEqual(await read(seeded([])), { state: "welcome", signet: "none", passkeys: 0, emailVerified: true });
});

test("an unverified email is reported, so the page doesn't offer a passkey the server would refuse", async () => {
  const view = await read(seeded([]), { principal: { ...principal, emailVerified: false } });
  assert.deepEqual(view, { state: "welcome", signet: "none", passkeys: 0, emailVerified: false });
});

test("the passkey count is the server's total, not a capped page of passkeys", async () => {
  const many = seeded([], { passkeys: Array.from({ length: 60 }, (_, index) => ({ id: `p${index}`, user: "member" })) });
  assert.equal(((await read(many)) as { passkeys: number }).passkeys, 60);
  const { countPasskeys } = await import("@/lib/member-auth/welcome/read");
  assert.equal(await many.transaction({}, (req) => countPasskeys(req as PayloadRequest, "member")), 60);
});

test("a suspended account shows no Signet", async () => {
  const fake = seeded([intent("a", "pending")]);
  fake.rows.users[0].membershipStatus = "suspended";
  assert.equal(((await read(fake)) as { signet: string }).signet, "none");
});

test("reading writes nothing", async () => {
  const fake = seeded([intent("a", "awaiting_wallet")]);
  const before = structuredClone(fake.rows);
  await read(fake);
  assert.deepEqual(fake.rows, before);
});
