import {
  getAddress,
  isAddress,
  isHex,
  recoverMessageAddress,
  verifyMessage,
  type Address,
  type Hex
} from "viem";

/**
 * Unlock's emailed event QR: `{unlockApp}/verification?data=<payload>&sig=<signature>`.
 * The payload is Locksmith's `JSON.stringify({network, account, lockAddress, tokenId, timestamp})`,
 * signed (EIP-191) by a Locksmith wallet. See docs/qa/auth-payment-nfc/unlock-qr-verification.md.
 *
 * Offline: no chain or Locksmith read. The host is ignored because the signature does not cover it.
 */
export type UnlockQrKey = {
  network: number;
  lockAddress: string;
  tokenID: string;
};
export type QrRefusalCode =
  "unreadable-qr" | "bad-signature" | "unpinned-signer";
export type QrVerification =
  { ok: true; key: UnlockQrKey } | { ok: false; code: QrRefusalCode };

const MAX_SCAN_LENGTH = 4096;

/** Pinned Locksmith signers, current and earlier, so QRs signed before a rotation still pass. */
export function pinnedQrSigners(
  value = process.env.UNLOCK_QR_SIGNERS
): Address[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (!isAddress(entry, { strict: false }))
        throw new Error("UNLOCK_QR_SIGNERS holds an invalid address");
      return getAddress(entry);
    });
}

function readScan(scan: string): { data: string; sig: Hex } | undefined {
  if (typeof scan !== "string" || !scan.trim() || scan.length > MAX_SCAN_LENGTH)
    return;
  let url: URL;
  try {
    url = new URL(scan.trim());
  } catch {
    return;
  }
  const data = url.searchParams.get("data");
  const sig = url.searchParams.get("sig");
  if (!data || !sig || !isHex(sig, { strict: true })) return;
  return { data, sig };
}

function readPayload(data: string): UnlockQrKey | undefined {
  let payload: unknown;
  try {
    payload = JSON.parse(data);
  } catch {
    return;
  }
  if (!payload || typeof payload !== "object") return;
  const { network, lockAddress, tokenId } = payload as Record<string, unknown>;
  const chain =
    typeof network === "string" && /^\d{1,12}$/.test(network)
      ? Number(network)
      : network;
  const token =
    typeof tokenId === "number" && Number.isSafeInteger(tokenId)
      ? String(tokenId)
      : tokenId;
  if (
    !Number.isSafeInteger(chain) ||
    Number(chain) < 1 ||
    typeof lockAddress !== "string" ||
    !isAddress(lockAddress, { strict: false }) ||
    typeof token !== "string" ||
    !/^\d{1,78}$/.test(token)
  )
    return;
  return {
    network: Number(chain),
    lockAddress: lockAddress.toLowerCase(),
    tokenID: BigInt(token).toString()
  };
}

/** Verifies the exact `data` string as scanned. Never re-serialise it: the signature covers those bytes. */
export async function verifyUnlockQr(
  scan: string,
  signers: readonly Address[] = pinnedQrSigners()
): Promise<QrVerification> {
  const parts = readScan(scan);
  if (!parts) return { ok: false, code: "unreadable-qr" };
  let signed = false;
  for (const address of signers) {
    try {
      if (
        await verifyMessage({
          address,
          message: parts.data,
          signature: parts.sig
        })
      ) {
        signed = true;
        break;
      }
    } catch {
      return { ok: false, code: "bad-signature" };
    }
  }
  if (!signed) {
    try {
      await recoverMessageAddress({
        message: parts.data,
        signature: parts.sig
      });
    } catch {
      return { ok: false, code: "bad-signature" };
    }
    // A well-formed signature over these bytes that no pinned signer made: an unpinned
    // signer, or data altered after signing (both recover to some other address).
    return { ok: false, code: "unpinned-signer" };
  }
  const key = readPayload(parts.data);
  return key ? { ok: true, key } : { ok: false, code: "unreadable-qr" };
}
