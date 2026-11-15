import UnlockV13 from "@unlock-protocol/contracts/dist/abis/Unlock/UnlockV13.json";
import PublicLockV14 from "@unlock-protocol/contracts/dist/abis/PublicLock/PublicLockV14.json";
import { existsSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  createWalletClient, encodeFunctionData, formatEther, http, isAddressEqual, keccak256, parseEventLogs, toBytes, zeroAddress,
  type Abi, type Address, type Hex, type LocalAccount,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { keyGranterFile, loadKeyGranterAccount, loadSignerAccount, lockManagerFile } from "../src/lib/commerce/keys/unlock/signer";
import { BASE_SEPOLIA_RPC, baseSepoliaClient, GRANTER_FLOOR_WEI, readFixture, sendGuarded, SpendStop, upperCost, writeFixture, type TestLockFixture } from "./unlock-test-lock-budget";

/*
 * Base Sepolia test lock fixture (SPH-UNLOCK-ADAPTER-20261116-01). Explicitly
 * invoked only; never on import or a schedule:
 *
 *   node --import tsx scripts/unlock-test-lock.ts          # dry run: checks and estimates, sends nothing
 *   node --import tsx scripts/unlock-test-lock.ts --send   # funds, deploys and grants the role
 *
 * ADR-0008 split: a separate throwaway lock manager deploys and manages the
 * lock; the existing grant signer only receives KEY_GRANTER. Resumable: every
 * finished step is read back from the committed ledger and the chain, and is
 * never repeated. Prints addresses, hashes and balances only.
 */

// Unlock's Base Sepolia factory. Not recorded in the repo; verified on chain
// below (Unlock v13 with a registered PublicLock v14 implementation).
const UNLOCK_FACTORY: Address = "0x259813B665C8f6074391028ef782e27B65840d89";
const LOCK_VERSION = 14;
const LOCK_NAME = "Sophomores test lock";
// Test-only lock settings. They decide nothing about the product's token model.
const TEST_SETTINGS = { expirationDurationSeconds: 365n * 86_400n, keyPrice: 0n, tokenAddress: zeroAddress, maxNumberOfKeys: 0n } as const;
const ROLE_GAS_PLAN = 120_000n; // planning bound only; the real send is estimated
const unlockAbi = UnlockV13.abi as Abi;
const lockAbi = PublicLockV14.abi as Abi;
const role = (name: string): Hex => keccak256(toBytes(name));
const eth = (wei: bigint) => `${formatEther(wei)} ETH`;

/** Creates the lock-manager signer file beside the grant signer's, once, at 0600. */
function ensureManagerFile(): void {
  if (existsSync(lockManagerFile)) return;
  const key = generatePrivateKey();
  const address = privateKeyToAccount(key).address;
  writeFileSync(lockManagerFile, [
    "# Throwaway Base Sepolia (84532) LOCK_MANAGER test signer for the Sophomores test lock. Testnet only; never fund on mainnet.",
    `UNLOCK_TEST_LOCK_MANAGER_ADDRESS=${address}`,
    `UNLOCK_TEST_LOCK_MANAGER_PRIVATE_KEY=${key}`,
    "",
  ].join("\n"), { mode: 0o600, flag: "wx" });
  console.log(`lock manager: created a new throwaway signer ${address}`);
}

async function main(send: boolean): Promise<void> {
  const client = baseSepoliaClient();
  if (await client.getChainId() !== baseSepolia.id) throw new Error("RPC is not Base Sepolia");
  const granter = await loadKeyGranterAccount(keyGranterFile);
  ensureManagerFile();
  const manager = await loadSignerAccount(lockManagerFile, "UNLOCK_TEST_LOCK_MANAGER");
  const wallet = (account: LocalAccount) => createWalletClient({ account, chain: baseSepolia, transport: http(BASE_SEPOLIA_RPC) });

  // Factory provenance, read-only.
  const factoryVersion = await client.readContract({ address: UNLOCK_FACTORY, abi: unlockAbi, functionName: "unlockVersion" });
  const implementation = await client.readContract({ address: UNLOCK_FACTORY, abi: unlockAbi, functionName: "publicLockImpls", args: [LOCK_VERSION] }) as Address;
  const implementationVersion = await client.readContract({ address: implementation, abi: lockAbi, functionName: "publicLockVersion" });
  console.log(`factory ${UNLOCK_FACTORY}: Unlock v${factoryVersion}; PublicLock v${LOCK_VERSION} implementation ${implementation} reports v${implementationVersion}`);
  if (Number(implementationVersion) !== LOCK_VERSION) throw new Error("Factory does not serve PublicLock v14");

  const fixture: TestLockFixture = readFixture() ?? {
    note: "Throwaway Base Sepolia test lock for the Unlock adapter. Public data only. Settings are test-only and decide nothing about the product.",
    chainID: 84532, unlockFactory: UNLOCK_FACTORY, publicLockVersion: 14, lockName: LOCK_NAME,
    testOnlySettings: {
      expirationDurationSeconds: TEST_SETTINGS.expirationDurationSeconds.toString(), keyPrice: TEST_SETTINGS.keyPrice.toString(),
      tokenAddress: TEST_SETTINGS.tokenAddress, maxNumberOfKeys: TEST_SETTINGS.maxNumberOfKeys.toString(),
    },
    granter: granter.address, manager: manager.address, lock: null, transactions: [],
  };
  if (!isAddressEqual(fixture.granter, granter.address) || !fixture.manager || !isAddressEqual(fixture.manager, manager.address)) throw new Error("Signers differ from the recorded fixture");
  const balances = async () => `granter ${eth(await client.getBalance({ address: granter.address }))}, manager ${eth(await client.getBalance({ address: manager.address }))}`;
  console.log(`balances before: ${await balances()}`);

  const initialize = encodeFunctionData({ abi: lockAbi, functionName: "initialize", args: [
    manager.address, TEST_SETTINGS.expirationDurationSeconds, TEST_SETTINGS.tokenAddress, TEST_SETTINGS.keyPrice, TEST_SETTINGS.maxNumberOfKeys, LOCK_NAME,
  ] });
  const deploy = { to: UNLOCK_FACTORY, data: encodeFunctionData({ abi: unlockAbi, functionName: "createUpgradeableLockAtVersion", args: [initialize, LOCK_VERSION] }) };

  // 1. Fund the manager with just enough for the deploy and the role grant.
  if (!fixture.lock && !fixture.transactions.some((entry) => entry.step === "fund-manager" && entry.status === "success")) {
    const fees = await client.estimateFeesPerGas();
    const maxFeePerGas = fees.maxFeePerGas * 2n;
    const deployGas = BigInt(await client.request({ method: "eth_estimateGas", params: [{ from: manager.address, ...deploy }] }));
    const deployCost = await upperCost(client, { account: granter, ...deploy, gas: deployGas * 13n / 10n, maxFeePerGas });
    const roleCost = await upperCost(client, { account: granter, to: UNLOCK_FACTORY, data: encodeFunctionData({ abi: lockAbi, functionName: "grantRole", args: [role("KEY_GRANTER"), granter.address] }), gas: ROLE_GAS_PLAN, maxFeePerGas });
    const amount = (deployCost + roleCost) * 3n / 2n;
    console.log(`plan: deploy gas ${deployGas}, funding the manager with ${eth(amount)} (deploy ≤ ${eth(deployCost)}, role ≤ ${eth(roleCost)}, ×1.5)`);
    if (!send) return console.log(`dry run: nothing sent. The grant signer must keep ${eth(GRANTER_FLOOR_WEI)} after funding.`);
    await sendGuarded(client, wallet(granter), fixture, "fund-manager", { to: manager.address, value: amount });
  }
  if (!send) return console.log("dry run: nothing sent.");

  // 2. Deploy the lock from the manager, through the factory, pinned to v14.
  if (!fixture.lock) {
    await client.simulateContract({ account: manager, address: UNLOCK_FACTORY, abi: unlockAbi, functionName: "createUpgradeableLockAtVersion", args: [initialize, LOCK_VERSION] });
    const receipt = await sendGuarded(client, wallet(manager), fixture, "deploy-lock", deploy);
    const [created] = parseEventLogs({ abi: unlockAbi, eventName: "NewLock", logs: receipt.logs }) as unknown as { args: { newLockAddress: Address } }[];
    fixture.lock = created.args.newLockAddress;
    writeFixture(fixture);
    console.log(`deploy-lock: lock ${fixture.lock}`);
  }
  const lock = fixture.lock;
  const read = (functionName: string, args: unknown[] = []) => client.readContract({ address: lock, abi: lockAbi, functionName, args });
  if (Number(await read("publicLockVersion")) !== LOCK_VERSION) throw new Error("Deployed lock is not PublicLock v14");
  if (await read("hasRole", [role("LOCK_MANAGER"), manager.address]) !== true) throw new Error("Manager is not a lock manager");
  console.log(`lock: "${await read("name")}", v${await read("publicLockVersion")}, KEY_GRANTER admin is LOCK_MANAGER: ${await read("getRoleAdmin", [role("KEY_GRANTER")]) === role("LOCK_MANAGER")}`);

  // 3. Give the grant signer KEY_GRANTER, after proving the lock config can mint by grant.
  const probe = privateKeyToAccount(generatePrivateKey()).address;
  const grantArgs = [[probe], [BigInt(Math.floor(Date.now() / 1000)) + 86_400n], [zeroAddress]];
  if (await read("hasRole", [role("KEY_GRANTER"), granter.address]) !== true) {
    await client.simulateContract({ account: manager, address: lock, abi: lockAbi, functionName: "grantKeys", args: grantArgs });
    await client.simulateContract({ account: manager, address: lock, abi: lockAbi, functionName: "grantRole", args: [role("KEY_GRANTER"), granter.address] });
    await sendGuarded(client, wallet(manager), fixture, "grant-key-granter-role", { to: lock, data: encodeFunctionData({ abi: lockAbi, functionName: "grantRole", args: [role("KEY_GRANTER"), granter.address] }) });
  }
  if (await read("hasRole", [role("KEY_GRANTER"), granter.address]) !== true) throw new Error("Grant signer is not a key granter");
  if (await read("isLockManager", [granter.address]) !== false) throw new Error("Grant signer must not be a lock manager");
  await client.simulateContract({ account: granter, address: lock, abi: lockAbi, functionName: "grantKeys", args: grantArgs });
  console.log(`ready: grant signer ${granter.address} is KEY_GRANTER (not lock manager) on ${lock}; a grant simulates cleanly`);
  console.log(`balances after: ${await balances()}`);
  console.log(`ledger: ${fixture.transactions.length} transaction(s): ${fixture.transactions.map((entry) => `${entry.step} ${entry.hash} ${entry.status}`).join("; ")}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.includes("--send")).catch((error: unknown) => {
    // Signer and spend errors carry fixed, key-free messages; anything else is reduced to its name.
    console.error(error instanceof SpendStop || (error instanceof Error && error.name === "SignerLoadError") ? error.message : `Stopped: ${error instanceof Error ? error.name : "error"}${error instanceof Error && "code" in error ? ` (${String(error.code)})` : ""}${error instanceof Error && "shortMessage" in error ? `: ${String(error.shortMessage)}` : ""}`);
    process.exitCode = 1;
  });
}
