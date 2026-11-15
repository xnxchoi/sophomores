import assert from "node:assert/strict";
import { test } from "node:test";
import { parseEther, type Address } from "viem";
import { assertCanSpend, MAX_TRANSACTIONS, SpendStop, type TestLockFixture } from "../../../scripts/unlock-test-lock-budget";

// The live-run spending guard. The first three tests characterised it after the
// first live run; the cap and floors below were changed test-first for the
// hardening slice (14 transactions across both keys; neither below 0.00001 ETH).
const granter: Address = `0x${"1".repeat(40)}`;
const manager: Address = `0x${"2".repeat(40)}`;
const fixture = (sent: number): TestLockFixture => ({
  note: "", chainID: 84532, unlockFactory: `0x${"3".repeat(40)}`, publicLockVersion: 14, lockName: "test",
  testOnlySettings: { expirationDurationSeconds: "1", keyPrice: "0", tokenAddress: `0x${"0".repeat(40)}`, maxNumberOfKeys: "0" },
  granter, manager, lock: null,
  transactions: Array.from({ length: sent }, (_, index) => ({ step: `s${index}`, from: granter, hash: `0x${"a".repeat(64)}`, status: "success" as const })),
});

test("neither the grant signer nor the lock manager may fall below 0.00001 ETH", () => {
  for (const from of [granter, manager]) {
    assert.doesNotThrow(() => assertCanSpend(fixture(0), { from, balance: parseEther("0.00003"), cost: parseEther("0.00002") }));
    assert.throws(() => assertCanSpend(fixture(0), { from, balance: parseEther("0.00003"), cost: parseEther("0.0000200001") }), SpendStop);
  }
});

test("an address that is neither signer may not spend from the ledger", () => {
  assert.throws(() => assertCanSpend(fixture(0), { from: `0x${"9".repeat(40)}`, balance: parseEther("1"), cost: 1n }), SpendStop);
});

test("no fifteenth transaction across both keys, whatever the balance", () => {
  assert.equal(MAX_TRANSACTIONS, 14);
  assert.doesNotThrow(() => assertCanSpend(fixture(13), { from: manager, balance: parseEther("1"), cost: 1n }));
  assert.throws(() => assertCanSpend(fixture(14), { from: manager, balance: parseEther("1"), cost: 1n }), /cap/);
});
