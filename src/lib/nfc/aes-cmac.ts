import * as crypto from "node:crypto";

type CreateMac = (
  algorithm: "CMAC",
  key: Uint8Array,
  options: { cipher: "aes-128-cbc" },
) => { update(data: Uint8Array): unknown; final(): Buffer };
type MacProvider = { createMac?: CreateMac };

// The runtime API starts at Node 24.22.0; the pinned @types/node predates it.
const nativeProvider = crypto as typeof crypto & MacProvider;

function nativeCmac(provider: MacProvider, key: Uint8Array, data: Uint8Array): Buffer {
  if (key.byteLength !== 16) throw new RangeError("AES-128-CMAC requires a 16-byte key");
  if (typeof provider.createMac !== "function") throw new Error("Native AES-128-CMAC is unavailable");
  const mac = provider.createMac("CMAC", key, { cipher: "aes-128-cbc" });
  mac.update(data);
  const tag = mac.final();
  if (tag.byteLength !== 16) throw new Error("Unexpected native AES-128-CMAC output size");
  return tag;
}

export function aes128Cmac(key: Uint8Array, data: Uint8Array): Buffer {
  return nativeCmac(nativeProvider, key, data);
}

/** Run at verifier admission, not on every tap. The key and tag are public RFC 4493 data. */
export function nativeAes128CmacAvailable(provider: MacProvider | null = nativeProvider): boolean {
  if (!provider) return false;
  try {
    const tag = nativeCmac(provider, Buffer.from("2b7e151628aed2a6abf7158809cf4f3c", "hex"), Buffer.alloc(0));
    return tag.toString("hex") === "bb1d6929e95937287fa37d129b756746";
  } catch {
    return false;
  }
}
