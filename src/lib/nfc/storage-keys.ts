import { createHmac, timingSafeEqual } from "node:crypto";

export type NfcSecrets = Readonly<{
  // Stable dedicated server secret across epochs, not the station setup root.
  fingerprintSecret: Uint8Array;
  readVerifierKey: (ref: string) => Promise<Uint8Array | null>;
}>;

export function nfcFingerprint(secrets: NfcSecrets, kind: "uid" | "aes-key", bytes: Uint8Array): string {
  if (secrets.fingerprintSecret.length < 32) throw new Error("NFC fingerprint secret unavailable");
  return createHmac("sha256", secrets.fingerprintSecret).update(`nfc/v1/${kind}\0`).update(bytes).digest("hex");
}

export async function loadNfcEpochKeys(secrets: NfcSecrets, metaKeyRef: string, macKeyRef: string) {
  if (metaKeyRef === macKeyRef) return null;
  const [metaReadKey, fileReadKey] = await Promise.all([
    secrets.readVerifierKey(metaKeyRef),
    secrets.readVerifierKey(macKeyRef),
  ]);
  if (metaReadKey?.length !== 16 || fileReadKey?.length !== 16 || timingSafeEqual(metaReadKey, fileReadKey)) return null;
  return {
    metaReadKey: Buffer.from(metaReadKey),
    fileReadKey: Buffer.from(fileReadKey),
    metaFingerprint: nfcFingerprint(secrets, "aes-key", metaReadKey),
    macFingerprint: nfcFingerprint(secrets, "aes-key", fileReadKey),
  };
}

export function matchesFingerprint(stored: string, calculated: string): boolean {
  return /^[a-f0-9]{64}$/.test(stored) && timingSafeEqual(Buffer.from(stored, "hex"), Buffer.from(calculated, "hex"));
}
