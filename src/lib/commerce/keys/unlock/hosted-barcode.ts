import { decodeJwt } from "jose";
import { isAddressEqual, recoverMessageAddress, type Address, type Hex } from "viem";
import { z } from "zod";
import type { PassKey } from "./pass-holder";

/*
 * Our own Wallet passes carry Unlock's signed check-in QR, so staff keep scanning with Unlock's EVENTS app (ADR-0012).
 * The QR comes from the hosted Android route, read once per pass after the holder check. Source, unlock-protocol/unlock
 * master, read 26 Nov:
 * - locksmith passController.generateGoogleWalletPass: the route answers { passObjectUrl }, a "fat" save JWT
 *   (createPassObject.ts: payload.genericObjects[0].barcode = { type: "QR_CODE", value }). Answering it signs a JWT and
 *   ensures Unlock's class exists; no pass object is written until someone opens that save link, which we never do.
 * - utils/qrcode.ts + fulfillment/dispatcher.signToken: value = <unlockApp>/verification?data=<JSON>&sig=<signature>,
 *   data = {network, account, lockAddress, tokenId, timestamp}, signed (EIP-191) by Locksmith's purchaser.
 * - unlock-app VerificationStatus + invalidMembership: the scan is valid when the signature recovers to a Locksmith
 *   signer, the key owner or the key granter, the token and lock match, the current owner equals `account`, and the
 *   key hasn't expired. `timestamp` is shown, never checked, so a pass made today still scans at the door.
 * Every check here fails closed: anything else, and no pass is built.
 */
export const UNLOCK_VERIFICATION_ORIGIN = "https://app.unlock-protocol.com";
/** unlock-app src/config/app.ts `locksmithSigners` (26 Nov). If Unlock rotates its signer, passes refuse until updated. */
export const LOCKSMITH_SIGNERS: readonly Address[] = [
  "0x58b5CeDE554a39666091F96C8058920dF5906581",
  "0x22c095c69c38b66afAad4eFd4280D94Ec9D12f4C",
  "0xd851fe9ba8EfA66e65d7865690bD2B9522C6E99f",
];

const saveURL = z.object({ passObjectUrl: z.string().max(16_384) });
const claims = z.object({
  aud: z.literal("google"),
  typ: z.literal("savetowallet"),
  payload: z.object({
    genericObjects: z.tuple([z.object({ barcode: z.object({ type: z.literal("QR_CODE"), value: z.string().min(1).max(2_048) }) })]),
  }),
});
const verification = z.strictObject({
  network: z.literal(137),
  account: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  lockAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  tokenId: z.string().regex(/^[1-9][0-9]{0,76}$/),
  timestamp: z.number().int().positive(),
});

/** The QR value from the hosted Android route's JSON, or null. Never throws; never returns anything it didn't prove. */
export async function hostedBarcode(body: string, key: PassKey, signers: readonly Address[] = LOCKSMITH_SIGNERS): Promise<string | null> {
  try {
    const { passObjectUrl } = saveURL.parse(JSON.parse(body));
    const save = new URL(passObjectUrl);
    const jwt = /^\/gp\/v\/save\/([\w-]+\.[\w-]+\.[\w-]+)$/.exec(save.pathname)?.[1];
    if (save.origin !== "https://pay.google.com" || save.username || save.password || save.search || save.hash || !jwt) return null;
    const value = claims.parse(decodeJwt(jwt)).payload.genericObjects[0].barcode.value;
    const qr = new URL(value);
    const names = [...qr.searchParams.keys()];
    const raw = qr.searchParams.get("data");
    const sig = qr.searchParams.get("sig");
    if (qr.origin !== UNLOCK_VERIFICATION_ORIGIN || qr.pathname !== "/verification" || qr.username || qr.password || qr.hash ||
      names.length !== 2 || !names.includes("data") || !names.includes("sig") || !raw || !sig || !/^0x[0-9a-fA-F]{130}$/.test(sig)) return null;
    const data = verification.parse(JSON.parse(raw));
    if (data.tokenId !== key.tokenID || !isAddressEqual(data.lockAddress as Address, key.lock as Address) ||
      !isAddressEqual(data.account as Address, key.recipient as Address)) return null;
    const signer = await recoverMessageAddress({ message: raw, signature: sig as Hex });
    return signers.some(known => isAddressEqual(known, signer)) ? value : null;
  } catch {
    return null;
  }
}
