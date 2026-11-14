import assert from "node:assert/strict";
import { test } from "node:test";
import { cancelOrderKeyGrants, recordKeyGrantIntents } from "@/lib/commerce/keys/intents";
import { commerceStorageFake } from "../domain/storage-fake";

const admission = { id: "adm-1", unit: 1, order: "order", transaction: "transaction", buyer: "buyer" };
const input = { orderID: "order", transactionID: "transaction", beneficiaryID: "buyer", admissions: [admission] };

test("settlement records one awaiting-wallet intent per admission and replay is a no-op", async () => {
  const fake = commerceStorageFake({ "commerce-key-grant-intents": [] });
  await fake.transaction({}, async (req) => {
    await recordKeyGrantIntents({ req, ...input });
    await recordKeyGrantIntents({ req, ...input });
  });
  const rows = fake.rows["commerce-key-grant-intents"];
  assert.equal(rows.length, 1);
  assert.equal(rows[0].operationKey, "unlock-grant:v1:order:1");
  assert.equal(rows[0].recipientMode, "member_safe");
  assert.equal(rows[0].entitlement, "adm-1");
});

test("a mismatched existing intent or entitlement aborts settlement", async () => {
  const fake = commerceStorageFake({ "commerce-key-grant-intents": [{ id: "k", operationKey: "unlock-grant:v1:order:1", order: "order", payment: "other", entitlement: "adm-1", beneficiaryUser: "buyer", recipientMode: "member_safe" }] });
  await assert.rejects(fake.transaction({}, (req) => recordKeyGrantIntents({ req, ...input })), /identity mismatch/);
  await assert.rejects(fake.transaction({}, (req) => recordKeyGrantIntents({ req, ...input, admissions: [{ ...admission, buyer: "someone-else" }] })), /does not match/);
});

test("revoking benefits cancels undispatched keys and flags dispatched ones", async () => {
  const row = (id: string, entitlement: string, state: string) => ({ id, operationKey: `k:${id}`, order: "order", entitlement, state });
  const fake = commerceStorageFake({ "commerce-key-grant-intents": [row("a", "adm-1", "awaiting_wallet"), row("b", "adm-2", "granted"), row("c", "adm-3", "pending")] });
  await fake.transaction({}, (req) => cancelOrderKeyGrants(req, "order", new Set(["adm-1", "adm-2"])));
  const [a, b, c] = fake.rows["commerce-key-grant-intents"];
  assert.equal(a.state, "cancelled");
  assert.equal(b.state, "granted", "granted evidence is kept");
  assert.equal(b.cancelRequested, true, "the separate cancel authority is asked to cancel it");
  assert.equal(c.state, "pending", "admissions that were not revoked keep their key");
});
