import { createHash } from "node:crypto";
import {
  concat,
  encodeFunctionData,
  getAddress,
  getContractAddress,
  isAddress,
  keccak256,
  pad,
  parseAbi,
  stringToBytes,
  toHex,
  zeroAddress
} from "viem";

/*
 * ADR-0013: every member's Safe is owned by the one custody key we hold. The
 * address is computed here, offline, from fixed inputs, at payment. Nothing in
 * this module reads a chain, signs, sends or creates a contract: the Safe is
 * put on chain only when it first has to act. Changing ANY value below changes
 * every member's address and strands Signets already granted, so the scheme is
 * fixed before the first live Signet (handback, round 4).
 *
 * tests/member-auth/wallet/safe.test.ts pins this computation to the Safe
 * SDK's own `predictSafeAddress` for fixed inputs, and the contract addresses
 * to the installed safe-deployments package.
 */

/** Chains where Safe 1.4.1 sits at its canonical addresses: Base Sepolia (test) and Polygon (live). */
export const MEMBER_SAFE_CHAINS = Object.freeze([84532, 137] as const);
export type MemberSafeChain = (typeof MEMBER_SAFE_CHAINS)[number];

export const MEMBER_SAFE_SCHEME = Object.freeze({
  safeVersion: "1.4.1",
  threshold: 1,
  /** SafeProxyFactory 1.4.1, canonical. */
  proxyFactoryAddress: "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67",
  /** SafeL2 1.4.1, canonical: the SDK's default singleton on every chain but Ethereum mainnet. */
  singletonAddress: "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762",
  /** CompatibilityFallbackHandler 1.4.1, canonical: the SDK's default handler. */
  fallbackHandlerAddress: "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99",
  /** saltNonce = uint256(keccak256(utf8(saltLabel + memberID))). */
  saltLabel: "sophomores:member-safe:v1:"
} as const);

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
  "6f6e20616464726573732070726f7669646564" as `0x${string}`;

const setupAbi = parseAbi([
  "function setup(address[] _owners, uint256 _threshold, address to, bytes data, address fallbackHandler, address paymentToken, uint256 payment, address paymentReceiver)"
]);

export type MemberSafe = Readonly<{
  chainID: MemberSafeChain;
  safeAddress: `0x${string}`;
  ownerAddress: `0x${string}`;
  threshold: number;
  saltNonce: string;
  safeVersion: string;
  proxyFactoryAddress: string;
  singletonAddress: string;
  fallbackHandlerAddress: string;
  /** sha256 over everything that fixes the address, so a stored wallet can be compared exactly. */
  configHash: string;
}>;

export const isMemberSafeChain = (
  chainID: number
): chainID is MemberSafeChain =>
  (MEMBER_SAFE_CHAINS as readonly number[]).includes(chainID);

/** The decimal uint256 salt nonce for one member. */
export function memberSafeSaltNonce(memberID: string): string {
  if (!memberID) throw new Error("A member Safe needs a member");
  return BigInt(
    keccak256(stringToBytes(`${MEMBER_SAFE_SCHEME.saltLabel}${memberID}`))
  ).toString();
}

/** Pure CREATE2 prediction, identical to the SDK's for the same inputs. */
export function predictMemberSafe({
  chainID,
  owner,
  memberID
}: {
  chainID: number;
  owner: string;
  memberID: string;
}): MemberSafe {
  if (!isMemberSafeChain(chainID))
    throw new Error("Member Safes are not enabled on this chain");
  if (!isAddress(owner, { strict: false }) || BigInt(owner) === 0n)
    throw new Error("The member Safe owner address is invalid");
  const ownerAddress = getAddress(owner);
  const saltNonce = memberSafeSaltNonce(memberID);
  const scheme = MEMBER_SAFE_SCHEME;
  const initializer = encodeFunctionData({
    abi: setupAbi,
    functionName: "setup",
    args: [
      [ownerAddress],
      BigInt(scheme.threshold),
      zeroAddress,
      "0x",
      scheme.fallbackHandlerAddress,
      zeroAddress,
      0n,
      zeroAddress
    ]
  });
  const safeAddress = getContractAddress({
    opcode: "CREATE2",
    from: scheme.proxyFactoryAddress,
    salt: keccak256(
      concat([
        keccak256(initializer),
        pad(toHex(BigInt(saltNonce)), { size: 32 })
      ])
    ),
    bytecode: concat([
      SAFE_PROXY_CREATION_CODE,
      pad(scheme.singletonAddress, { size: 32 })
    ])
  });
  const configHash = createHash("sha256")
    .update(
      JSON.stringify([
        chainID,
        scheme.safeVersion,
        scheme.threshold,
        saltNonce,
        ownerAddress.toLowerCase(),
        scheme.proxyFactoryAddress.toLowerCase(),
        scheme.singletonAddress.toLowerCase(),
        scheme.fallbackHandlerAddress.toLowerCase(),
        keccak256(SAFE_PROXY_CREATION_CODE),
        safeAddress.toLowerCase()
      ])
    )
    .digest("hex");
  return Object.freeze({
    chainID,
    safeAddress,
    ownerAddress,
    threshold: scheme.threshold,
    saltNonce,
    safeVersion: scheme.safeVersion,
    proxyFactoryAddress: scheme.proxyFactoryAddress,
    singletonAddress: scheme.singletonAddress,
    fallbackHandlerAddress: scheme.fallbackHandlerAddress,
    configHash
  });
}
