import assert from "node:assert/strict";
import { test } from "node:test";
import { parseEther, type Address } from "viem";
import { assertCanSpend, MAX_TRANSACTIONS, SpendStop, type TestLockFixture } from "../../../scripts/unlock-test-lock-budget";

// Characterisation of the live-run spending guard (written after the live run, not test-first).
const granter: Address = `0x${"1".repeat(40)}`;
const manager: Address = `0x${"2".repeat(40)}`;
const fixture = (sent: number): TestLockFixture => ({
  note: "", chainID: 84532, unlockFactory: `0x${"3".repeat(40)}`, publicLockVersion: 14, lockName: "test",
  testOnlySettings: { expirationDurationSeconds: "1", keyPrice: "0", tokenAddress: `0x${"0".repeat(40)}`, maxNumberOfKeys: "0" },
  granter, manager, lock: null,
  transactions: Array.from({ length: sent }, (_, index) => ({ step: `s${index}`, from: granter, hash: `0x${"a".repeat(64)}`, status: "success" as const })),
});

test("the grant signer may not fall below 0.00002 ETH", () => {
  assert.doesNotThrow(() => assertCanSpend(fixture(0), { from: granter, balance: parseEther("0.00003"), cost: parseEther("0.00001") }));
  assert.throws(() => assertCanSpend(fixture(0), { from: granter, balance: parseEther("0.00003"), cost: parseEther("0.0000100001") }), SpendStop);
});

test("the lock manager may spend down to zero, never below", () => {
  assert.doesNotThrow(() => assertCanSpend(fixture(0), { from: manager, balance: 10n, cost: 10n }));
  assert.throws(() => assertCanSpend(fixture(0), { from: manager, balance: 10n, cost: 11n }), SpendStop);
});

test("no ninth transaction, whatever the balance", () => {
  assert.equal(MAX_TRANSACTIONS, 8);
  assert.doesNotThrow(() => assertCanSpend(fixture(7), { from: manager, balance: parseEther("1"), cost: 1n }));
  assert.throws(() => assertCanSpend(fixture(8), { from: manager, balance: parseEther("1"), cost: 1n }), /cap/);
});
