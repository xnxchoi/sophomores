// Member wallets (ADR-0013). Pure configuration: no connection, RPC or
// provider call happens at import or load time.

import { isMemberSafeChain, type MemberSafeChain } from "./safe";

type Environment = Readonly<Record<string, string | undefined>>;

/** Default when MEMBER_WALLET_CHAIN_ID is unset: the test network. */
export const DEFAULT_WALLET_CHAIN_ID = 84532;

export type WalletConfig = Readonly<{
  chainID: MemberSafeChain;
  /** The Unlock lock Signets are granted on. Until the Unlock slice's committed lock file lands, it comes from the environment. */
  lock: `0x${string}`;
  /** The custody key we hold: the one owner of every member Safe. */
  owner: `0x${string}`;
}>;

const addressPattern = /^0x[0-9a-fA-F]{40}$/;

/**
 * Null when member wallets are not configured (no lock or no custody owner):
 * settlement then leaves intents awaiting a wallet. Invalid values throw;
 * callers on the payment path read that as unconfigured.
 */
export function loadWalletConfig(
  env: Environment = process.env
): WalletConfig | null {
  const lock = env.MEMBER_WALLET_LOCK_ADDRESS?.trim();
  const owner = env.MEMBER_WALLET_OWNER_ADDRESS?.trim();
  if (!lock || !owner) return null;
  if (!addressPattern.test(lock))
    throw new Error("Member wallet lock address is invalid");
  if (!addressPattern.test(owner) || BigInt(owner) === 0n)
    throw new Error("Member wallet owner address is invalid");
  const chainText = env.MEMBER_WALLET_CHAIN_ID?.trim();
  const chainID = chainText ? Number(chainText) : DEFAULT_WALLET_CHAIN_ID;
  if (!Number.isSafeInteger(chainID) || !isMemberSafeChain(chainID))
    throw new Error("Member wallets are not enabled on this chain");
  return Object.freeze({
    chainID,
    lock: lock as `0x${string}`,
    owner: owner as `0x${string}`
  });
}

/** The member+chain lock that settlement, hold release and the sweep take before touching a member's wallet or intents. */
export const walletLockKey = (memberID: string, chainID: number): string =>
  `member-wallet:${memberID}:${chainID}`;
