import { join } from "node:path";
import { getAddress, isAddressEqual, type Address } from "viem";
import type { PrivateKeyAccount } from "viem/accounts";
import { loadSignerAccount, signerDirectory, SignerLoadError } from "./signer";

/*
 * Polygon (137) key grants for paid orders: one pinned lock and one pinned grant signer, behind a go-live switch the
 * owner flips (KEY_GRANT_POLYGON_LIVE=1). Off, every Polygon transaction is refused exactly as before this slice.
 *
 * - Lock: the Signet membership lock the owner deployed. The owner's one manual grant on it (24 Nov, tx 0x8dc0c2a6…,
 *   block 97714798, token 1) is final at 436/256 confirmations.
 * - Grant signer: the KEY_GRANTER-only account (ADR-0008). Its key lives outside the repo in
 *   ~/.config/sphmrs/polygon-key-granter.env (mode 0600), as UNLOCK_LIVE_GRANTER_PRIVATE_KEY and _ADDRESS, the same
 *   file the owner's one-grant script reads. A key that derives any other address is refused.
 */
export const POLYGON_CHAIN_ID = 137 as const;
export const POLYGON_SIGNET_LOCK: Address = getAddress("0xcc95180d590365d88f8aad870c264d127b221506");
export const POLYGON_KEY_GRANTER: Address = getAddress("0x2cdb060e373f0efe93beffd1478cde739cbc5336");
export const polygonKeyGranterFile = join(signerDirectory, "polygon-key-granter.env");

/** What a Polygon adapter is pinned to. Production uses the defaults; tests supply throwaway pins. */
export type PolygonPins = Readonly<{ lock: Address; granter: Address }>;
export const polygonPins: PolygonPins = Object.freeze({ lock: POLYGON_SIGNET_LOCK, granter: POLYGON_KEY_GRANTER });

/** The owner's go-live switch. Only the exact value "1" turns Polygon on; anything else, or nothing, keeps it off. */
export function polygonKeyGrantsLive(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env.KEY_GRANT_POLYGON_LIVE === "1";
}

/** The pinned grant signer. Refuses a file whose key derives any other address (fixed messages, no key material). */
export async function loadPolygonKeyGranterAccount(file = polygonKeyGranterFile): Promise<PrivateKeyAccount> {
  const account = await loadSignerAccount(file, "UNLOCK_LIVE_GRANTER");
  if (!isAddressEqual(account.address, POLYGON_KEY_GRANTER)) throw new SignerLoadError("Signer is not the pinned Polygon key granter");
  return account;
}
