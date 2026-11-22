import { createDecipheriv, timingSafeEqual } from "node:crypto";
import { aes128Cmac } from "./aes-cmac";

/**
 * AES SUN v1: literal HTTPS URI, 128-bit base64url public ref, uppercase
 * mirrors. File 02h: 00 69 D1 01 65 55 04, then the ASCII URI without
 * "https://". PICC and MAC-input offsets are 53; MAC output offset is 91.
 * Authenticate file bytes [53, 91): the PICC mirror and literal "&cmac=".
 * The station must prove this profile against a real capture before use.
 */
const TAP_URI = /^https:\/\/sophomores\.co\/nfc\/([A-Za-z0-9_-]{21}[AQgw])\?picc=([0-9A-F]{32})&cmac=([0-9A-F]{16})$/;
const TAP_URI_LENGTH = "https://sophomores.co/nfc/".length + 22 + "?picc=".length + 32 + "&cmac=".length + 16;
const MAX_COUNTER = 0xff_ffff;
const SV2_PREFIX = Buffer.from("3CC300010080", "hex");

export type SunCardSnapshot = Readonly<{
  cardRef: string;
  profile: string;
  epochId: string;
  status: "active" | "retired" | "stock";
  lastReadCounter: number | null;
  metaReadKey: Uint8Array;
  fileReadKey: Uint8Array;
  /** Compare against the trusted inventory UID fingerprint in constant time. */
  matchesUid: (uid: Buffer) => boolean;
}>;

type AesPiccData = Readonly<{ uid: Buffer; counter: number }>;
type VerifiedSunTap = Readonly<{ cardRef: string; epochId: string; counter: number }>;

export function readAesPiccData(key: Uint8Array, encrypted: Uint8Array): AesPiccData | null {
  if (key.byteLength !== 16 || encrypted.byteLength !== 16) return null;
  const decipher = createDecipheriv("aes-128-cbc", key, Buffer.alloc(16)).setAutoPadding(false);
  const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  // AN12196 section 3.4.2.2: UID and counter mirrored, seven-byte UID, no other flags.
  if (plaintext[0] !== 0xc7) return null;
  return { uid: Buffer.from(plaintext.subarray(1, 8)), counter: plaintext.readUIntLE(8, 3) };
}

export function computeAesSdmMac(key: Uint8Array, picc: AesPiccData, mirroredRange: Uint8Array): Buffer {
  const counter = Buffer.alloc(3);
  counter.writeUIntLE(picc.counter, 0, 3);
  const sessionKey = aes128Cmac(key, Buffer.concat([SV2_PREFIX, picc.uid, counter]));
  const fullTag = aes128Cmac(sessionKey, mirroredRange);
  return Buffer.from(fullTag.filter((_, index) => index % 2 === 1));
}

export function parseSunTapUri(rawUri: string) {
  if (rawUri.length !== TAP_URI_LENGTH) return null;
  const match = TAP_URI.exec(rawUri);
  if (!match) return null;
  const [, cardRef, piccHex, macHex] = match;
  return { cardRef, piccHex, macHex };
}

/**
 * Verify only, never spend or authorize a session. A returned proof must be
 * rechecked against current binding, epoch and high-water in Slice 2.
 * Use only the current epoch's independently provisioned keys; no key fallback.
 * Pass the original undecoded URI, not a reformatted URLSearchParams value.
 */
export function verifySunTap(rawUri: string, card: SunCardSnapshot): VerifiedSunTap | null {
  const parsed = parseSunTapUri(rawUri);
  if (!parsed) return null;
  const { cardRef, piccHex, macHex } = parsed;
  if (cardRef !== card.cardRef || card.profile !== "aes-sun-v1" || card.status !== "active" || !card.epochId) {
    return null;
  }
  const highWater = card.lastReadCounter;
  if (highWater !== null && (!Number.isInteger(highWater) || highWater < 0 || highWater > MAX_COUNTER)) {
    return null;
  }
  if (card.fileReadKey.byteLength !== 16) return null;

  const picc = readAesPiccData(card.metaReadKey, Buffer.from(piccHex, "hex"));
  if (!picc) return null;
  const mac = computeAesSdmMac(card.fileReadKey, picc, Buffer.from(`${piccHex}&cmac=`, "ascii"));
  if (!timingSafeEqual(mac, Buffer.from(macHex, "hex")) || !card.matchesUid(picc.uid)) return null;
  if (picc.counter <= (highWater ?? 0)) return null;
  return { cardRef, epochId: card.epochId, counter: picc.counter };
}
