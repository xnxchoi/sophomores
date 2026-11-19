import { createHash } from "node:crypto";
import { keccak } from "hash-wasm";
import { z } from "zod";

const scheme = Object.freeze({
  safeVersion: "1.4.1",
  threshold: 1,
  proxyFactoryAddress: "0x4e1dcf7ad4e460cfd30791ccc4f9c8a4f820ec67",
  singletonAddress: "0x29fcb43b46531bca003ddc8fcb67ffe91900c762",
  fallbackHandlerAddress: "0xfd0732dc9e303f09fcef3a7388ad10a83459ec99",
  saltLabel: "sophomores:member-safe:v1:",
});

/**
 * SafeProxy 1.4.1 creation code, as returned by the factory's
 * `proxyCreationCode()`. Source: the `bytecode` field of
 * https://unpkg.com/@safe-global/safe-contracts@1.4.1/build/artifacts/contracts/proxies/SafeProxy.sol/SafeProxy.json
 * (artifact sha256 b05eaeaf7278097e52a9e9b38410de2a812c23fa3622373473e73eaa19646ecd,
 * fetched 2026-11-16 with the coordinator's approval). Code sha256
 * cdac0e1d7a8897472ab08d29d19e028896c4feaaff65bba661c2e5e49a39bf61.
 */
export const SAFE_PROXY_CREATION_CODE: `0x${string}` =
  "0x608060405234801561001057600080fd5b506040516101e63803806101e68339818101" +
    "604052602081101561003357600080fd5b81019080805190602001909291905050506000" +
    "73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffff" +
    "ffffffffffffffff1614156100ca576040517f08c379a000000000000000000000000000" +
    "000000000000000000000000000000815260040180806020018281038252602281526020" +
    "01806101c46022913960400191505060405180910390fd5b806000806101000a81548173" +
    "ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffff" +
    "ffffffffffffffffffff1602179055505060ab806101196000396000f3fe608060405273" +
    "ffffffffffffffffffffffffffffffffffffffff600054167fa619486e00000000000000" +
    "000000000000000000000000000000000000000000600035141560505780600052602060" +
    "00f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d" +
    "6000f3fea264697066735822122003d1488ee65e08fa41e58e888a9865554c535f2c7712" +
    "6a82cb4c0f917f31441364736f6c63430007060033496e76616c69642073696e676c6574" +
    "6f6e20616464726573732070726f7669646564";

type Environment = Readonly<Record<string, string | undefined>>;
type WalletConfig = Readonly<{ chainID: 137 | 84532; ownerAddress: string }>;
const address = /^0x[0-9a-fA-F]{40}$/;
const memberIDSchema = z.uuid().refine((id) => id === id.toLowerCase());

function walletConfig(owner: string | undefined, chain: string | undefined): WalletConfig {
  // Safe rejects the zero and linked-list sentinel addresses as owners.
  if (!owner || !address.test(owner) || BigInt(owner) <= 1n || (chain !== "137" && chain !== "84532")) {
    throw new Error("Member wallet configuration is invalid");
  }
  return Object.freeze({ chainID: chain === "137" ? 137 : 84532, ownerAddress: owner.toLowerCase() });
}

/** No live/test defaults; both variables absent means intentionally unconfigured. */
export function loadWalletConfig(env: Environment = process.env): WalletConfig | null {
  const owner = env.MEMBER_WALLET_OWNER_ADDRESS;
  const chain = env.MEMBER_WALLET_CHAIN_ID;
  if (owner === undefined && chain === undefined) return null;
  return walletConfig(owner, chain);
}

const hexBytes = (value: string) => Buffer.from(value.slice(2), "hex");
const word = (value: number | string) => Buffer.from(
  (typeof value === "number" ? value.toString(16) : value.slice(2)).padStart(64, "0"), "hex",
);
const hash = async (bytes: Uint8Array) => Buffer.from(await keccak(bytes, 256), "hex");

// The installed Keccak library hashes bytes but doesn't encode Ethereum ABI.
// This is only Safe.setup(address[],uint256,address,bytes,address,address,uint256,address):
// eight head words; the one-owner array at byte 256; empty bytes at byte 320.
function setup(ownerAddress: string) {
  return Buffer.concat([
    Buffer.from("b63e800d", "hex"),
    word(256), word(scheme.threshold), word(0), word(320), word(scheme.fallbackHandlerAddress),
    word(0), word(0), word(0), word(1), word(ownerAddress), word(0),
  ]);
}

/** The counterfactual address only: no signer, network, RPC or deployment. */
export async function predictMemberSafe(config: WalletConfig, memberID: string) {
  if (!memberIDSchema.safeParse(memberID).success) throw new Error("Wallet requires a canonical member ID");
  const { ownerAddress, chainID } = walletConfig(config.ownerAddress, String(config.chainID));
  const nonce = await hash(Buffer.from(scheme.saltLabel + memberID, "utf8"));
  const salt = await hash(Buffer.concat([await hash(setup(ownerAddress)), nonce]));
  const initCode = Buffer.concat([hexBytes(SAFE_PROXY_CREATION_CODE), word(scheme.singletonAddress)]);
  const safe = await hash(Buffer.concat([
    Buffer.from([0xff]), hexBytes(scheme.proxyFactoryAddress), salt, await hash(initCode),
  ]));
  const safeAddress = "0x" + safe.subarray(12).toString("hex");
  if (safeAddress === ownerAddress || BigInt(safeAddress) <= 1n) throw new Error("Member Safe address is invalid");

  const saltNonce = BigInt("0x" + nonce.toString("hex")).toString();
  const configHash = "v1:" + createHash("sha256").update(JSON.stringify([
    chainID, scheme, ownerAddress, saltNonce, SAFE_PROXY_CREATION_CODE, safeAddress,
  ])).digest("hex");
  return Object.freeze({
    chainID, safeAddress, ownerAddress, saltNonce, configHash, safeVersion: scheme.safeVersion,
    threshold: scheme.threshold, proxyFactoryAddress: scheme.proxyFactoryAddress,
    singletonAddress: scheme.singletonAddress, fallbackHandlerAddress: scheme.fallbackHandlerAddress,
  });
}
