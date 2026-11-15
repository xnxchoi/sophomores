import type { PrivateKeyAccount } from "viem/accounts";

export const LOCK = "0x1111111111111111111111111111111111111111";

/** An Unlock-shaped verification URL signed by a throwaway in-test key (EIP-191, like Locksmith). */
export async function unlockQr(signer: PrivateKeyAccount, payload: { raw?: string; network?: number; lockAddress?: string; tokenId?: string }): Promise<string> {
  const data = payload.raw ?? JSON.stringify({ network: payload.network ?? 84532, account: "0x0000000000000000000000000000000000000001", lockAddress: payload.lockAddress ?? LOCK, tokenId: payload.tokenId ?? "7", timestamp: 1_763_000_000_000 });
  const sig = await signer.signMessage({ message: data });
  return `https://app.unlock-protocol.com/verification?data=${encodeURIComponent(data)}&sig=${sig}`;
}
