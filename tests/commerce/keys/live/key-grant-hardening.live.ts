import PublicLockV14 from "@unlock-protocol/contracts/dist/abis/PublicLock/PublicLockV14.json";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { encodeFunctionData, formatEther, http, maxUint256, zeroAddress, type Abi, type Address, type Hex, type LocalAccount, type Transport } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { signerAccountID, type KeyCancelAdapter, type KeyGrantAdapter } from "@/lib/commerce/keys/contracts";
import { createUnlockKeyGrantAdapter } from "@/lib/commerce/keys/unlock/adapter";
import { createUnlockKeyCancelAdapter } from "@/lib/commerce/keys/unlock/cancel";
import { loadKeyGranterAccount, loadLockManagerAccount } from "@/lib/commerce/keys/unlock/signer";
import { confirmationDepth } from "@/lib/commerce/keys/unlock/transactions";
import { cancelKeyGrants, dispatchKeyGrants, reconcileKeyGrants, REPLACE_AFTER_MS, replaceStuckKeyGrants } from "@/lib/commerce/keys/worker";
import { assertCanSpend, BASE_SEPOLIA_RPC, baseSepoliaClient, MAX_TRANSACTIONS, readFixture, recordBroadcast, recordReceipt, SpendStop, upperCost, writeFixture, type TestLockFixture } from "../../../../scripts/unlock-test-lock-budget";
import { fakePayload } from "../support/fake-payload";

/*
 * Live proof for SPH-KEY-GRANT-HARDENING-20261116-01, opt-in only (not a
 * *.test.ts file, so the default suite never discovers it). Base Sepolia only,
 * through the real worker and adapters with an in-memory intent store.
 *
 *   --replace: one grant is sent with a deliberately low fee (a fee cap under
 *     the chain's floor base fee), so it cannot mine; `replaceStuckKeyGrants`
 *     then re-signs the same nonce with a higher fee; reconcile settles on
 *     whichever hash mined. Two transactions.
 *   --cancel: one existing test key is cancelled by the lock-manager key through
 *     `cancelKeyGrants`, and reconciled to `cancelled`. One transaction.
 *
 * Every transaction passes the shared ledger's guard first (14 in total across
 * both keys; neither key below 0.00001 ETH), and enters the ledger before it is
 * broadcast.
 *
 *   node --import tsx tests/commerce/keys/live/key-grant-hardening.live.ts --send --replace --cancel
 */
const lockAbi = PublicLockV14.abi as Abi;
const eth = (wei: bigint) => `${formatEther(wei)} ETH`;
const client = baseSepoliaClient();
const read = (lock: Address, functionName: string, args: unknown[] = []) => client.readContract({ address: lock, abi: lockAbi, functionName, args });
const bounded = (error: unknown) => (error instanceof Error ? ("shortMessage" in error ? String(error.shortMessage) : error.message) : "error").slice(0, 200);

/** Every broadcast through `adapter` is written to the public ledger first. */
function ledgered<A extends KeyGrantAdapter | KeyCancelAdapter>(adapter: A, fixture: TestLockFixture, from: Address, step: string): A {
  const broadcast = adapter.broadcast.bind(adapter);
  adapter.broadcast = async (input) => {
    if (fixture.transactions.length >= MAX_TRANSACTIONS) return { kind: "definitelyNotSent", code: "ledger_cap" };
    recordBroadcast(fixture, { step: `${step}-${fixture.transactions.length + 1}`, from, hash: input.txHash as Hex });
    return broadcast(input);
  };
  return adapter;
}

/**
 * The public RPC, except that fee estimates are lowered: the floor base fee is
 * reported as 3,200,000 wei and the tip as 1 wei, so viem signs a fee cap of
 * 3,840,001 wei, below the 5,000,000 wei the chain charges. Gas estimation is
 * asked without fees (a node refuses to estimate under its base fee). The
 * node's answer to the send is printed, bounded.
 */
function lowFeeTransport(): Transport {
  const base = http(BASE_SEPOLIA_RPC);
  return (parameters) => {
    const transport = base(parameters);
    return {
      ...transport,
      async request(args: { method: string; params?: unknown }) {
        if (args.method === "eth_maxPriorityFeePerGas") return "0x1";
        if (args.method === "eth_estimateGas") {
          const [call, ...rest] = args.params as [Record<string, unknown>, ...unknown[]];
          const { maxFeePerGas: _fee, maxPriorityFeePerGas: _tip, gasPrice: _price, ...plain } = call;
          return transport.request({ ...args, params: [plain, ...rest] } as never);
        }
        if (args.method === "eth_sendRawTransaction") {
          try { const answer = await transport.request(args as never); console.log("low-fee send: node accepted it"); return answer; }
          catch (error) { console.log(`low-fee send: node answered with an error: ${bounded(error)}`); throw error; }
        }
        const answer = await transport.request(args as never) as Record<string, unknown> | null;
        return args.method === "eth_getBlockByNumber" && answer ? { ...answer, baseFeePerGas: "0x30d400" } : answer;
      },
    } as ReturnType<Transport>;
  };
}

async function balances(granter: Address, manager: Address): Promise<string> {
  const [g, m] = await Promise.all([client.getBalance({ address: granter }), client.getBalance({ address: manager })]);
  return `grant signer ${eth(g)}, lock manager ${eth(m)}`;
}

async function replace(fixture: TestLockFixture, lock: Address, granter: LocalAccount): Promise<void> {
  console.log("\n== replacement ==");
  const recipient = privateKeyToAccount(generatePrivateKey()).address; // a fresh address; its key is discarded
  const data = encodeFunctionData({ abi: lockAbi, functionName: "grantKeys", args: [[recipient], [maxUint256], [zeroAddress]] });
  const gas = await client.estimateGas({ account: granter, to: lock, data });
  const fees = await client.estimateFeesPerGas();
  // Either transaction could be the one that mines: the guard assumes both cost the higher fee, twice over.
  const each = await upperCost(client, { account: granter, to: lock, data, gas: gas * 13n / 10n, maxFeePerGas: fees.maxFeePerGas * 2n });
  if (fixture.transactions.length + 2 > MAX_TRANSACTIONS) throw new SpendStop(`Transaction cap: ${fixture.transactions.length} sent, 2 more would pass ${MAX_TRANSACTIONS}`);
  assertCanSpend(fixture, { from: granter.address, balance: await client.getBalance({ address: granter.address }), cost: each * 2n });
  const nonceBefore = await client.getTransactionCount({ address: granter.address, blockTag: "pending" });
  console.log(`grant signer nonce (pending) before: ${nonceBefore}; recipient ${recipient}`);

  const { payload, rows } = fakePayload([{ id: "live-replace-1", operationKey: "unlock-grant:v1:live-hardening:1", entitlement: "adm", state: "pending", attempts: 0, target: { chainID: 84532, lock, recipient } }]);
  const [intent] = rows["commerce-key-grant-intents"];
  const low = ledgered(createUnlockKeyGrantAdapter({ chainID: 84532, account: granter, transport: lowFeeTransport() }), fixture, granter.address, "live-low-fee-grant");
  // Dry probe, nothing sent: the low fee cap must sit under the chain's current base fee, or the "stuck" grant would simply mine.
  const probe = await low.prepare({ intentID: "probe", attemptID: "probe", target: intent.target as never, nonceFloor: 0 });
  assert.equal(probe.kind, "prepared", `probe: ${JSON.stringify(probe)}`);
  low.release({ txHash: (probe as { txHash: string }).txHash });
  const floorBaseFee = (await client.getBlock()).baseFeePerGas!;
  const probeFee = BigInt((probe as { fee: { maxFeePerGas: string } }).fee.maxFeePerGas);
  console.log(`probe (not sent): low fee cap ${probeFee} wei against a base fee of ${floorBaseFee} wei`);
  if (probeFee >= floorBaseFee) throw new SpendStop("The low fee would not be stuck; nothing sent");
  assert.equal(await dispatchKeyGrants({ payload, adapter: low }), 1);
  const sends = () => intent.sends as { txHash: Hex; maxFeePerGas: string; maxPriorityFeePerGas: string }[];
  console.log(`dispatch: state ${intent.state}${intent.lastErrorCode ? ` (${intent.lastErrorCode})` : ""}, nonce ${intent.nonce}, hash ${sends()[0].txHash}, maxFeePerGas ${sends()[0].maxFeePerGas} wei, tip ${sends()[0].maxPriorityFeePerGas} wei`);
  assert.ok(["submitted", "ambiguous"].includes(String(intent.state)));

  const honest = ledgered(createUnlockKeyGrantAdapter({ chainID: 84532, account: granter, transport: http(BASE_SEPOLIA_RPC) }), fixture, granter.address, "live-replacement-grant");
  await delay(20_000);
  const first = await honest.inspect(sends()[0].txHash);
  const latest = await client.getTransactionCount({ address: granter.address, blockTag: "latest" });
  const baseFee = (await client.getBlock()).baseFeePerGas;
  console.log(`after 20 s: low-fee transaction is ${first.status}; latest nonce count ${latest}; current base fee ${baseFee} wei`);
  assert.ok(first.status !== "mined" && first.status !== "reverted", "the low-fee grant did not mine");

  assertCanSpend(fixture, { from: granter.address, balance: await client.getBalance({ address: granter.address }), cost: each });
  // Past the replacement deadline (the worker's clock is moved; nothing else is faked).
  const later = () => new Date(Date.now() + REPLACE_AFTER_MS + 1000);
  assert.equal(await replaceStuckKeyGrants({ payload, adapter: honest, now: later }), 1, "one replacement broadcast");
  console.log(`replacement: nonce ${intent.nonce}, hash ${sends()[1].txHash}, maxFeePerGas ${sends()[1].maxFeePerGas} wei, tip ${sends()[1].maxPriorityFeePerGas} wei`);

  let mined: Hex | undefined;
  for (let attempt = 0; attempt < 60 && !mined; attempt++) {
    for (const { txHash } of sends()) {
      const seen = await honest.inspect(txHash);
      if (seen.status === "mined" || seen.status === "reverted") mined = txHash;
    }
    if (!mined) await delay(3000);
  }
  assert.ok(mined, "one of the two hashes mined");
  await recordReceipt(client, fixture, mined, confirmationDepth[84532]);
  for (const { txHash } of sends()) {
    if (txHash === mined) continue;
    const entry = fixture.transactions.find((transaction) => transaction.hash === txHash);
    if (entry) entry.status = "replaced";
    console.log(`the other hash ${txHash} is now ${(await honest.inspect(txHash)).status}`);
  }
  writeFixture(fixture);
  const nonceMined = (await client.getTransaction({ hash: mined })).nonce;
  assert.equal(await reconcileKeyGrants({ payload, adapter: honest, now: later }), 1);
  console.log(`reconcile: state ${intent.state}, token ${intent.tokenID}, settled on ${intent.settledTxHash} (${intent.settledTxHash === sends()[0].txHash ? "the low-fee original" : "the replacement"}), mined at nonce ${nonceMined}`);
  assert.equal(intent.state, "granted");
  assert.equal(nonceMined, intent.nonce, "the mined transaction used the intent's own nonce");
  const owner = await read(lock, "ownerOf", [BigInt(String(intent.tokenID))]) as Address;
  assert.equal(owner.toLowerCase(), recipient.toLowerCase());
  console.log(`on chain: token ${intent.tokenID} owned by ${owner}, valid ${await read(lock, "isValidKey", [BigInt(String(intent.tokenID))])}`);
}

async function cancel(fixture: TestLockFixture, lock: Address, granter: LocalAccount, manager: LocalAccount): Promise<void> {
  console.log("\n== cancel ==");
  const token = 1n; // granted in the adapter slice's first live run (handback), to a throwaway recipient
  const recipient = await read(lock, "ownerOf", [token]) as Address;
  console.log(`token ${token}: owner ${recipient}, valid ${await read(lock, "isValidKey", [token])}; grant signer is lock manager: ${await read(lock, "isLockManager", [granter.address])}; manager is lock manager: ${await read(lock, "isLockManager", [manager.address])}`);
  const data = encodeFunctionData({ abi: lockAbi, functionName: "expireAndRefundFor", args: [token, 0n] });
  const gas = await client.estimateGas({ account: manager, to: lock, data });
  const fees = await client.estimateFeesPerGas();
  const cost = await upperCost(client, { account: manager, to: lock, data, gas: gas * 13n / 10n, maxFeePerGas: fees.maxFeePerGas * 2n });
  assertCanSpend(fixture, { from: manager.address, balance: await client.getBalance({ address: manager.address }), cost });

  const { payload, rows } = fakePayload([{
    id: "live-cancel-1", operationKey: "unlock-grant:v1:live-proof-1:1", entitlement: "adm", state: "granted", attempts: 1, target: { chainID: 84532, lock, recipient },
    signer: signerAccountID(84532, granter.address), tokenID: String(token), cancelRequested: true,
  }]);
  const [intent] = rows["commerce-key-grant-intents"];
  const adapter = ledgered(createUnlockKeyCancelAdapter({ chainID: 84532, account: manager, transport: http(BASE_SEPOLIA_RPC) }), fixture, manager.address, "live-cancel");
  assert.equal(await cancelKeyGrants({ payload, adapter }), 1);
  console.log(`cancel dispatched: hash ${intent.cancelTxHash}, signer ${intent.cancelSigner}, nonce ${intent.cancelNonce}`);
  assert.equal(intent.cancelSigner, adapter.signer);
  await recordReceipt(client, fixture, intent.cancelTxHash as Hex, confirmationDepth[84532]);
  intent.nextAttemptAt = new Date(0).toISOString();
  await cancelKeyGrants({ payload, adapter });
  console.log(`reconcile: state ${intent.state}, cancelledAt ${intent.cancelledAt}`);
  assert.equal(intent.state, "cancelled");
  const expiry = await read(lock, "keyExpirationTimestampFor", [token]) as bigint;
  console.log(`on chain: token ${token} owner ${await read(lock, "ownerOf", [token])}, valid ${await read(lock, "isValidKey", [token])}, expiry ${new Date(Number(expiry) * 1000).toISOString()}`);
  assert.equal(await read(lock, "isValidKey", [token]), false);
  const entries = fixture.transactions.length;
  await cancelKeyGrants({ payload, adapter });
  assert.equal(fixture.transactions.length, entries, "a further pass sends nothing: the cancel went out once");
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  if (!args.has("--send") || !(args.has("--replace") || args.has("--cancel"))) return console.log("Live proof not run: pass --send with --replace and/or --cancel.");
  const fixture = readFixture();
  if (!fixture?.lock || !fixture.manager) throw new Error("No test lock recorded");
  const lock = fixture.lock;
  const granter = await loadKeyGranterAccount();
  const manager = await loadLockManagerAccount();
  assert.equal(granter.address.toLowerCase(), fixture.granter.toLowerCase());
  assert.equal(manager.address.toLowerCase(), fixture.manager.toLowerCase());
  const before = await balances(granter.address, manager.address);
  console.log(`before: ${before}; ledger ${fixture.transactions.length}/${MAX_TRANSACTIONS}`);
  try {
    if (args.has("--replace")) await replace(fixture, lock, granter);
    if (args.has("--cancel")) await cancel(fixture, lock, granter, manager);
  } finally {
    console.log(`\nafter: ${await balances(granter.address, manager.address)}; ledger ${fixture.transactions.length}/${MAX_TRANSACTIONS}`);
  }
}

main().catch((error: unknown) => {
  console.error(`Stopped: ${error instanceof Error ? `${error.name}: ${bounded(error)}` : "error"}`);
  process.exitCode = 1;
});
