import PublicLockV14 from "@unlock-protocol/contracts/dist/abis/PublicLock/PublicLockV14.json";
import assert from "node:assert/strict";
import { encodeFunctionData, formatEther, http, maxUint256, zeroAddress, type Abi, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { confirmationDepth, createUnlockKeyGrantAdapter } from "@/lib/commerce/keys/unlock/adapter";
import { loadKeyGranterAccount } from "@/lib/commerce/keys/unlock/signer";
import { dispatchKeyGrants, reconcileKeyGrants } from "@/lib/commerce/keys/worker";
import { assertCanSpend, BASE_SEPOLIA_RPC, baseSepoliaClient, readFixture, recordBroadcast, recordReceipt, upperCost } from "../../../../scripts/unlock-test-lock-budget";
import { fakePayload } from "../support/fake-payload";

/*
 * Live proof, opt-in only (not a *.test.ts file, so the default suite never
 * discovers it). Grants one key on the Base Sepolia test lock to a fresh
 * throwaway recipient through the real worker functions and the Unlock adapter,
 * then reads the token back from chain. Spends one transaction from the shared
 * ledger and respects the grant signer's floor.
 *
 *   node --import tsx tests/commerce/keys/live/unlock-grant.live.ts --send
 */
const lockAbi = PublicLockV14.abi as Abi;
const eth = (wei: bigint) => `${formatEther(wei)} ETH`;

async function main(): Promise<void> {
  if (!process.argv.includes("--send")) return console.log("Live proof not run: pass --send to spend one Base Sepolia transaction.");
  const fixture = readFixture();
  if (!fixture?.lock) throw new Error("No test lock recorded; run scripts/unlock-test-lock.ts --send first");
  const lock = fixture.lock;
  const client = baseSepoliaClient();
  const granter = await loadKeyGranterAccount();
  // The recipient's key is discarded at once: it only needs to be a fresh address.
  const recipient: Address = privateKeyToAccount(generatePrivateKey()).address;
  const target = { chainID: 84532, lock, recipient };

  // Spending guard before the worker is allowed to send anything.
  const data = encodeFunctionData({ abi: lockAbi, functionName: "grantKeys", args: [[recipient], [maxUint256], [zeroAddress]] });
  const gas = await client.estimateGas({ account: granter, to: lock, data });
  const fees = await client.estimateFeesPerGas();
  const before = await client.getBalance({ address: granter.address });
  assertCanSpend(fixture, { from: granter.address, balance: before, cost: await upperCost(client, { account: granter, to: lock, data, gas: gas * 13n / 10n, maxFeePerGas: fees.maxFeePerGas * 2n }) });
  console.log(`before: granter ${granter.address} holds ${eth(before)}; recipient ${recipient} holds ${await client.readContract({ address: lock, abi: lockAbi, functionName: "balanceOf", args: [recipient] })} key(s)`);

  const { payload, rows } = fakePayload([{ id: "live-intent", operationKey: "unlock-grant:v1:live-proof:1", entitlement: "adm", state: "pending", attempts: 0, target }]);
  const intent = rows["commerce-key-grant-intents"][0];
  const adapter = createUnlockKeyGrantAdapter({ chainID: 84532, account: granter, transport: http(BASE_SEPOLIA_RPC) });

  assert.equal(await dispatchKeyGrants({ payload, adapter }), 1);
  console.log(`dispatchKeyGrants: state ${intent.state}, txHash ${intent.txHash ?? "none"}${intent.lastErrorCode ? `, code ${intent.lastErrorCode}` : ""}`);
  assert.ok(typeof intent.txHash === "string", "the worker recorded a transaction hash");
  recordBroadcast(fixture, { step: "live-grant", from: granter.address, hash: intent.txHash as Hex });
  // Reconcile trusts a receipt only at the chain's depth, so wait for it before the single reconcile pass.
  await recordReceipt(client, fixture, intent.txHash as Hex, confirmationDepth[84532]);

  assert.equal(await reconcileKeyGrants({ payload, adapter }), 1);
  console.log(`reconcileKeyGrants: state ${intent.state}, tokenID ${intent.tokenID}`);
  assert.equal(intent.state, "granted");

  const tokenId = BigInt(String(intent.tokenID));
  const read = (functionName: string, args: unknown[]) => client.readContract({ address: lock, abi: lockAbi, functionName, args });
  const owner = await read("ownerOf", [tokenId]) as Address;
  const valid = await read("isValidKey", [tokenId]);
  const expiry = await read("keyExpirationTimestampFor", [tokenId]) as bigint;
  console.log(`on chain: token ${tokenId} on ${lock} is owned by ${owner}, valid ${valid}, expires ${expiry === maxUint256 ? "never" : new Date(Number(expiry) * 1000).toISOString()}; recipient holds ${await read("balanceOf", [recipient])} key(s)`);
  assert.equal(owner.toLowerCase(), recipient.toLowerCase());
  assert.equal(valid, true);
  const after = await client.getBalance({ address: granter.address });
  console.log(`after: granter holds ${eth(after)} (spent ${eth(before - after)}); ledger ${fixture.transactions.length} transaction(s)`);
}

main().catch((error: unknown) => {
  console.error(`Stopped: ${error instanceof Error ? `${error.name}: ${"shortMessage" in error ? String(error.shortMessage) : error.message}` : "error"}`);
  process.exitCode = 1;
});
