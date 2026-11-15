import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, formatEther, http, keccak256, parseEther, type Address, type Hex, type LocalAccount, type PublicClient, type WalletClient } from "viem";
import { baseSepolia } from "viem/chains";
import { publicActionsL2 } from "viem/op-stack";

/*
 * Spending guard for the Base Sepolia test lock fixture and the live proofs
 * (SPH-UNLOCK-ADAPTER-20261116-01, then SPH-KEY-GRANT-HARDENING-20261116-01).
 * All write to one committed, public ledger so the cap holds across runs: at
 * most 14 transactions in total across both keys, and neither the grant signer
 * nor the lock manager drops below 0.00001 ETH. Only those two keys may spend.
 * Holds addresses and transaction hashes only; never key material.
 */
export const BASE_SEPOLIA_RPC = "https://sepolia.base.org";
export const MAX_TRANSACTIONS = 14;
export const SIGNER_FLOOR_WEI = parseEther("0.00001");
export const fixtureFile = fileURLToPath(new URL("../tests/commerce/keys/fixtures/base-sepolia-test-lock.json", import.meta.url));

/**
 * `replaced`: signed and broadcast, then superseded by a transaction at the same nonce that mined instead; it never mined and cost nothing.
 * `unsent`: signed and entered here, but the run was stopped before the node received it (checked on chain: unknown hash, nonce unused). It still counts toward the cap.
 */
export type LedgerEntry = { step: string; from: Address; hash: Hex; status: "broadcast" | "success" | "reverted" | "replaced" | "unsent"; feeWei?: string };
export type TestLockFixture = {
  note: string;
  chainID: 84532;
  unlockFactory: Address;
  publicLockVersion: 14;
  lockName: string;
  /** Test-only values: the product's token model is not decided by this fixture. */
  testOnlySettings: { expirationDurationSeconds: string; keyPrice: string; tokenAddress: Address; maxNumberOfKeys: string };
  granter: Address;
  manager: Address | null;
  lock: Address | null;
  transactions: LedgerEntry[];
};

export class SpendStop extends Error {
  override name = "SpendStop";
}

export function baseSepoliaClient() {
  return createPublicClient({ chain: baseSepolia, transport: http(BASE_SEPOLIA_RPC) }).extend(publicActionsL2());
}
type L2Client = ReturnType<typeof baseSepoliaClient>;

export function readFixture(): TestLockFixture | null {
  return existsSync(fixtureFile) ? JSON.parse(readFileSync(fixtureFile, "utf8")) as TestLockFixture : null;
}
export function writeFixture(fixture: TestLockFixture): void {
  mkdirSync(dirname(fixtureFile), { recursive: true });
  writeFileSync(fixtureFile, `${JSON.stringify(fixture, null, 2)}\n`);
}

const eth = (wei: bigint): string => `${formatEther(wei)} ETH`;

/** Refuses a send that would break the cap or the floor, before anything is signed. */
export function assertCanSpend(fixture: TestLockFixture, { from, balance, cost }: { from: Address; balance: bigint; cost: bigint }): void {
  if (fixture.transactions.length >= MAX_TRANSACTIONS) throw new SpendStop(`Transaction cap reached (${fixture.transactions.length}/${MAX_TRANSACTIONS})`);
  const known = [fixture.granter, fixture.manager].some((signer) => signer && signer.toLowerCase() === from.toLowerCase());
  if (!known) throw new SpendStop(`Stopping: ${from} is neither the grant signer nor the lock manager`);
  if (balance - cost < SIGNER_FLOOR_WEI) throw new SpendStop(`Stopping: ${from} holds ${eth(balance)}; this send may cost up to ${eth(cost)}, below the ${eth(SIGNER_FLOOR_WEI)} floor`);
}

/** Upper bound for one transaction: value + gas × maxFeePerGas + the Base L1 data fee. */
export async function upperCost(client: L2Client, request: { account: LocalAccount; to: Address; data?: Hex; value?: bigint; gas: bigint; maxFeePerGas: bigint }): Promise<bigint> {
  const l1Fee = await client.estimateL1Fee({ account: request.account, to: request.to, data: request.data, value: request.value, gas: request.gas, maxFeePerGas: request.maxFeePerGas, maxPriorityFeePerGas: 0n, chain: baseSepolia });
  return (request.value ?? 0n) + request.gas * request.maxFeePerGas + l1Fee;
}

export function recordBroadcast(fixture: TestLockFixture, entry: Omit<LedgerEntry, "status">): void {
  fixture.transactions.push({ ...entry, status: "broadcast" });
  writeFixture(fixture);
}

export async function recordReceipt(client: PublicClient | L2Client, fixture: TestLockFixture, hash: Hex, confirmations = 1) {
  const receipt = await client.waitForTransactionReceipt({ hash, confirmations, timeout: 180_000 });
  // The latest entry: a stopped run can leave an `unsent` entry for byte-identical signed bytes (same nonce, fee and call).
  const entry = fixture.transactions.findLast((transaction) => transaction.hash === hash)!;
  const l1Fee = (receipt as { l1Fee?: bigint | null }).l1Fee ?? 0n;
  Object.assign(entry, { status: receipt.status, feeWei: (receipt.gasUsed * receipt.effectiveGasPrice + l1Fee).toString() });
  writeFixture(fixture);
  return receipt;
}

/**
 * Prepares, checks, signs, records and broadcasts one transaction, then waits
 * for its receipt. The hash is written to the ledger before broadcast, so an
 * interrupted run still counts the send against the cap.
 */
export async function sendGuarded(client: L2Client, wallet: WalletClient, fixture: TestLockFixture, step: string, request: { to: Address; data?: Hex; value?: bigint }) {
  const account = wallet.account as LocalAccount;
  const prepared = await wallet.prepareTransactionRequest({ account, chain: baseSepolia, ...request });
  const cost = await upperCost(client, { account, ...request, gas: prepared.gas!, maxFeePerGas: prepared.maxFeePerGas! });
  assertCanSpend(fixture, { from: account.address, balance: await client.getBalance({ address: account.address }), cost });
  const signed = await wallet.signTransaction(prepared as never);
  const hash = keccak256(signed);
  recordBroadcast(fixture, { step, from: account.address, hash });
  console.log(`${step}: broadcasting ${hash}`);
  try { await client.sendRawTransaction({ serializedTransaction: signed }); }
  catch { console.log(`${step}: broadcast answer unclear; waiting for the receipt of ${hash}`); }
  const receipt = await recordReceipt(client, fixture, hash);
  if (receipt.status !== "success") throw new SpendStop(`${step} reverted: ${hash}`);
  return receipt;
}
