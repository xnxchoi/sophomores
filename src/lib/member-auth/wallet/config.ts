// Member wallet activation (ADR-0001, ADR-0005). Pure configuration: no
// connection, RPC or provider call happens at import or load time.

type Environment = Readonly<Record<string, string | undefined>>;

/**
 * Chains this slice may predict Safe addresses on, with the only RPC endpoint
 * each may read. Only the test network (84532) is listed: the live chain is
 * set by configuration at integration, together with its read-only RPC.
 */
export const WALLET_RPC_BY_CHAIN: Readonly<Record<number, string>> =
  Object.freeze({ 84532: "https://sepolia.base.org" });
/** Default when MEMBER_WALLET_CHAIN_ID is unset: the test network. */
export const DEFAULT_WALLET_CHAIN_ID = 84532;

/**
 * Provisional Safe deployment configuration (the plan leaves version and salt
 * for owner approval). Changing either changes every member's address, so both
 * are part of each wallet's configuration hash.
 */
export const WALLET_SAFE_VERSION = "1.4.1" as const;
export const WALLET_SALT_NONCE = "0" as const;

export type WalletConfig = Readonly<{
  chainID: number;
  rpcUrl: string;
  /** The Unlock lock keys are granted on. Until the Unlock slice's committed lock file lands, it comes from the environment. */
  lock: `0x${string}`;
  safeVersion: typeof WALLET_SAFE_VERSION;
  saltNonce: typeof WALLET_SALT_NONCE;
}>;

const addressPattern = /^0x[0-9a-fA-F]{40}$/;

/**
 * Null when wallet activation is not configured: activation then reports
 * itself unavailable and settlement leaves intents awaiting a wallet.
 */
export function loadWalletConfig(
  env: Environment = process.env
): WalletConfig | null {
  const lock = env.MEMBER_WALLET_LOCK_ADDRESS?.trim();
  if (!lock) return null;
  if (!addressPattern.test(lock))
    throw new Error("Member wallet lock address is invalid");
  const chainText = env.MEMBER_WALLET_CHAIN_ID?.trim();
  const chainID = chainText ? Number(chainText) : DEFAULT_WALLET_CHAIN_ID;
  const rpcUrl = Number.isSafeInteger(chainID)
    ? WALLET_RPC_BY_CHAIN[chainID]
    : undefined;
  if (!rpcUrl) throw new Error("Member wallets are not enabled on this chain");
  const rpc = env.MEMBER_WALLET_RPC_URL?.trim();
  if (rpc && rpc !== rpcUrl)
    throw new Error("Member wallets may only read the configured chain's RPC");
  return Object.freeze({
    chainID,
    rpcUrl,
    lock: lock as `0x${string}`,
    safeVersion: WALLET_SAFE_VERSION,
    saltNonce: WALLET_SALT_NONCE
  });
}

/** The member+chain lock that activation and settlement both take before touching a member's intents. */
export const walletLockKey = (memberID: string, chainID: number): string =>
  `member-wallet:${memberID}:${chainID}`;
