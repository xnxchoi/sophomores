import { createCipheriv } from "node:crypto";
import { aes128Cmac } from "./aes-cmac";

function encryptCbc(key: Uint8Array, data: Uint8Array): Buffer {
  const cipher = createCipheriv("aes-128-cbc", key, Buffer.alloc(16)).setAutoPadding(false);
  return Buffer.concat([cipher.update(data), cipher.final()]);
}

function doubleBlock(block: Buffer): Buffer {
  const reduction = 0x87 & -(block[0] >>> 7);
  return Buffer.from(block.map((byte, index) =>
    (byte << 1) ^ (index === 15 ? reduction : block[index + 1] >>> 7),
  ));
}

/**
 * AN10922 rev 2.2 section 2.2, offline station only. Callers own the versioned,
 * collision-free card/role/epoch input. Never import the station root server-side.
 */
export function diversifyStationAes128Key(root: Uint8Array, input: Uint8Array): Buffer {
  if (root.byteLength !== 16 || input.byteLength < 1 || input.byteLength > 31) {
    throw new RangeError("AN10922 AES-128 requires a 16-byte root and 1-31 input bytes");
  }
  const message = Buffer.concat([Buffer.of(0x01), input]);
  if (input.byteLength > 15) return aes128Cmac(root, message);

  // AN10922 always uses two blocks. For short inputs the padding starts
  // in the first block or at the second block boundary. Ordinary CMAC of
  // the pre-padded message would apply K1, whereas AN10922 requires K2.
  const padded = Buffer.concat([message, Buffer.of(0x80)], 32);
  const k2 = doubleBlock(doubleBlock(encryptCbc(root, Buffer.alloc(16))));
  const finalBlock = padded.subarray(16).map((byte, index) => byte ^ k2[index]);
  return Buffer.from(encryptCbc(root, Buffer.concat([padded.subarray(0, 16), finalBlock])).subarray(16));
}
