import PublicLockV14 from "@unlock-protocol/contracts/dist/abis/PublicLock/PublicLockV14.json";
import assert from "node:assert/strict";
import { encodeFunctionData, formatEther, http, maxUint256, zeroAddress, type Abi, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { confirmationDepth, createUnlockKeyGrantAdapter } from "@/lib/commerce/keys/unlock/adapter";
import { loadKeyGranterAccount } from "@/lib/commerce/keys/unlock/signer";
import { dispatchKeyGrants, reconcileKeyGrants } from "@/lib/commerce/keys/worker";
import { assertCanSpend, BASE_SEPOLIA_RPC, baseSepoliaClient, MAX_TRANSACTIONS, readFixture, recordBroadcast, recordReceipt, SpendStop, upperCost } from "../../../../scripts/unlock-test-lock-budget";
import { fakePayload } from "../support/fake-payload";

/*
 * Live proof, opt-in only (not a *.test.ts file, so the default suite never
 * discovers it). Grants two keys on the Base Sepolia test lock, to two fresh
 * throwaway recipients, in ONE `dispatchKeyGrants` pass through the real worker
 * and the Unlock adapter, so the two grants are sent back to back from one
 * signer. Then one `reconcileKeyGrants` pass, and the tokens and nonces are read
 * back from chain. Spends two transactions from the shared ledger and respects
 * the grant signer's floor for both.
 *
 *   node --import tsx tests/commerce/keys/live/unlock-grant.live.ts --send
 */
const lockAbi = PublicLockV14.abi as Abi;
const eth = (wei: bigint) => `${formatEther(wei)} ETH`;
const GRANTS = 2;

async function main(): Promise<void> {
  if (!process.argv.includes("--send")) return console.log(`Live proof not run: pass --send to spend ${GRANTS} Base Sepolia transactions.`);
  const fixture = readFixture();
  if (!fixture?.lock) throw new Error("No test lock recorded; run scripts/unlock-test-lock.ts --send first");
  const lock = fixture.lock;
  const client = baseSepoliaClient();
  const granter = await loadKeyGranterAccount();
  // Recipients' keys are discarded at once: they only need to be fresh addresses.
  const recipients: Address[] = Array.from({ length: GRANTS }, () => privateKeyToAccount(generatePrivateKey()).address);

  // Spending guard for every grant before the worker may send anything.
  if (fixture.transactions.length + GRANTS > MAX_TRANSACTIONS) throw new SpendStop(`Transaction cap: ${fixture.transactions.length} sent, ${GRANTS} more would pass ${MAX_TRANSACTIONS}`);
  const data = encodeFunctionData({ abi: lockAbi, functionName: "grantKeys", args: [[recipients[0]], [maxUint256], [zeroAddress]] });
  const gas = await client.estimateGas({ account: granter, to: lock, data });
  const fees = await client.estimateFeesPerGas();
  const before = await client.getBalance({ address: granter.address });
  const each = await upperCost(client, { account: granter, to: lock, data, gas: gas * 13n / 10n, maxFeePerGas: fees.maxFeePerGas * 2n });
  assertCanSpend(fixture, { from: granter.address, balance: before, cost: each * BigInt(GRANTS) });
  console.log(`before: granter ${granter.address} holds ${eth(before)}; nonce (pending) ${await client.getTransactionCount({ address: granter.address, blockTag: "pending" })}`);

  const { payload, rows } = fakePayload(recipients.map((recipient, index) => ({
    id: `live-intent-${index + 1}`, operationKey: `unlock-grant:v1:live-proof-2:${index + 1}`, entitlement: "adm", state: "pending", attempts: 0, target: { chainID: 84532, lock, recipient },
  })));
  const intents = rows["commerce-key-grant-intents"];
  const adapter = createUnlockKeyGrantAdapter({ chainID: 84532, account: granter, transport: http(BASE_SEPOLIA_RPC) });

  assert.equal(await dispatchKeyGrants({ payload, adapter }), GRANTS, "one pass dispatches both grants");
  for (const intent of intents) {
    console.log(`dispatchKeyGrants: ${intent.id} state ${intent.state}, txHash ${intent.txHash ?? "none"}${intent.lastErrorCode ? `, code ${intent.lastErrorCode}` : ""}`);
    assert.ok(typeof intent.txHash === "string", "the worker recorded a transaction hash");
    recordBroadcast(fixture, { step: `live-grant-${String(intent.id).slice(-1)}-of-${GRANTS}`, from: granter.address, hash: intent.txHash as Hex });
  }
  // Reconcile trusts a receipt only at the chain's depth, so wait for both before the single reconcile pass.
  for (const intent of intents) await recordReceipt(client, fixture, intent.txHash as Hex, confirmationDepth[84532]);
  const nonces = await Promise.all(intents.map(async (intent) => (await client.getTransaction({ hash: intent.txHash as Hex })).nonce));
  console.log(`nonces on chain: ${nonces.join(", ")}`);
  assert.equal(nonces[1], nonces[0] + 1, "back-to-back grants took consecutive nonces");

  assert.equal(await reconcileKeyGrants({ payload, adapter }), GRANTS);
  const read = (functionName: string, args: unknown[]) => client.readContract({ address: lock, abi: lockAbi, functionName, args });
  for (const [index, intent] of intents.entries()) {
    assert.equal(intent.state, "granted");
    const tokenId = BigInt(String(intent.tokenID));
    const owner = await read("ownerOf", [tokenId]) as Address;
    const valid = await read("isValidKey", [tokenId]);
    const expiry = await read("keyExpirationTimestampFor", [tokenId]) as bigint;
    console.log(`reconcileKeyGrants: ${intent.id} granted, token ${tokenId} owned by ${owner}, valid ${valid}, expires ${expiry === maxUint256 ? "never" : new Date(Number(expiry) * 1000).toISOString()}`);
    assert.equal(owner.toLowerCase(), recipients[index].toLowerCase());
    assert.equal(valid, true);
  }
  const after = await client.getBalance({ address: granter.address });
  console.log(`after: granter holds ${eth(after)} (spent ${eth(before - after)}); ledger ${fixture.transactions.length} transaction(s)`);
}

main().catch((error: unknown) => {
  console.error(`Stopped: ${error instanceof Error ? `${error.name}: ${"shortMessage" in error ? String(error.shortMessage) : error.message}` : "error"}`);
  process.exitCode = 1;
});
