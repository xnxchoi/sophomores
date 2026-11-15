import assert from "node:assert/strict";
import { test } from "node:test";
import { canTransition, keyGrantOperationKey, keyGrantStates, keyStatusOf, parseKeyGrantTarget } from "@/lib/commerce/keys/contracts";

test("ambiguous work is never resubmitted and granted or cancelled work is terminal", () => {
  assert.equal(canTransition("ambiguous", "pending"), false);
  assert.equal(canTransition("ambiguous", "submitted"), false);
  assert.equal(canTransition("submitted", "pending"), false, "a possibly sent grant never returns straight to pending");
  for (const to of keyGrantStates) {
    assert.equal(canTransition("granted", to), false);
    assert.equal(canTransition("cancelled", to), false);
  }
  assert.equal(canTransition("failed_retryable", "pending"), true, "only proven non-execution retries");
  assert.equal(canTransition("awaiting_wallet", "submitted"), false, "a wallet and target must exist first");
});

test("page status hides internals and treats cancelled rows as no key", () => {
  assert.equal(keyStatusOf([]), "no_key");
  assert.equal(keyStatusOf(["cancelled"]), "no_key");
  assert.equal(keyStatusOf(["awaiting_wallet"]), "key_pending");
  assert.equal(keyStatusOf(["ambiguous"]), "key_pending");
  assert.equal(keyStatusOf(["granted", "cancelled"]), "key_issued");
});

test("operation keys and targets are validated", () => {
  assert.equal(keyGrantOperationKey("order", 1), "unlock-grant:v1:order:1");
  assert.throws(() => keyGrantOperationKey("order", 0));
  const target = { chainID: 84532, lock: `0x${"a".repeat(40)}`, recipient: `0x${"b".repeat(40)}` };
  assert.deepEqual(parseKeyGrantTarget(target), target);
  assert.throws(() => parseKeyGrantTarget({ ...target, chainID: 8453 }), /target/, "Base mainnet is not an accepted network (ADR-0010)");
  assert.equal(parseKeyGrantTarget({ ...target, chainID: 137 }).chainID, 137, "Polygon is the live network (ADR-0010)");
  assert.throws(() => parseKeyGrantTarget({ ...target, recipient: "someone@example.com" }), /target/);
});
