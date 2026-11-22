import assert from "node:assert/strict";
import { createCipheriv, timingSafeEqual } from "node:crypto";
import test from "node:test";
import { aes128Cmac, nativeAes128CmacAvailable } from "../../src/lib/nfc/aes-cmac";
import { diversifyStationAes128Key } from "../../src/lib/nfc/station-diversification";
import {
  computeAesSdmMac,
  parseSunTapUri,
  readAesPiccData,
  verifySunTap,
  type SunCardSnapshot,
} from "../../src/lib/nfc/sun-verifier";

const hex = (value: string) => Buffer.from(value, "hex");
const rfcKey = hex("2b7e151628aed2a6abf7158809cf4f3c");
const rfcMessage = hex(
  "6bc1bee22e409f96e93d7e117393172aae2d8a571e03ac9c9eb76fac45af8e51" +
  "30c81c46a35ce411e5fbc1191a0a52eff69f2445df4f9b17ad2b417be66c3710",
);
const vendorKey = Buffer.alloc(16); // Public AN12196 example key, never provisioning material.
const vendorUid = hex("04958CAA5C5E80");
const vendorPicc = "FD91EC264309878BE6345CBE53BADF40";
const cardRef = "ABEiM0RVZneImaq7zN3u_w";
const otherRef = "ABEiM0RVZneImaq7zN3u_g";
const origin = "https://sophomores.co";
const uri = `${origin}/nfc/${cardRef}?picc=${vendorPicc}&cmac=DA977C27B3DAB6C1`;

const card: SunCardSnapshot = {
  cardRef,
  profile: "aes-sun-v1",
  epochId: "fixture-epoch-1",
  status: "active",
  lastReadCounter: 3,
  metaReadKey: vendorKey,
  fileReadKey: vendorKey,
  matchesUid: (uid) => timingSafeEqual(vendorUid, uid),
};

test("01: native CMAC matches all four RFC 4493 section 4 answers", () => {
  assert.equal(nativeAes128CmacAvailable(), true);
  for (const [length, expected] of [
    [0, "bb1d6929e95937287fa37d129b756746"],
    [16, "070a16b46b4d4144f79bdd9dd04a287c"],
    [40, "dfa66747de9ae63030ca32611497c827"],
    [64, "51f0bebf7e3b9d92fc49741779363cfe"],
  ] as const) {
    assert.equal(aes128Cmac(rfcKey, rfcMessage.subarray(0, length)).toString("hex"), expected);
  }
});

test("01: readiness rejects missing, unavailable, or incorrect provider CMAC", () => {
  assert.equal(nativeAes128CmacAvailable(null), false);
  assert.equal(nativeAes128CmacAvailable({}), false);
  assert.equal(nativeAes128CmacAvailable({ createMac() { throw new Error("unavailable"); } }), false);
  assert.equal(
    nativeAes128CmacAvailable({ createMac: () => ({ update() {}, final: () => Buffer.alloc(16) }) }),
    false,
  );
  assert.throws(() => aes128Cmac(Buffer.alloc(15), Buffer.alloc(0)), RangeError);
});

test("02: AN12196 r2 Tables 2 and 4 decrypt the PICC and match the empty-range example", () => {
  const picc = readAesPiccData(vendorKey, hex("EF963FF7828658A599F3041510671E88"));
  assert.ok(picc);
  assert.equal(picc.uid.toString("hex"), "04de5f1eacc040");
  assert.equal(picc.counter, 61);
  assert.equal(computeAesSdmMac(vendorKey, picc, Buffer.alloc(0)).toString("hex"), "94eed9ee65337086");
});

test("02: AN12196 r2 Table 5 matches the published session key, full MAC and short MAC", () => {
  const picc = readAesPiccData(vendorKey, hex(vendorPicc));
  assert.ok(picc);
  assert.deepEqual(picc.uid, vendorUid);
  assert.equal(picc.counter, 8);
  const range = Buffer.from("CEE9A53E3E463EF1F459635736738962&cmac=", "ascii");
  const sessionKey = aes128Cmac(vendorKey, hex("3CC30001008004958CAA5C5E80080000"));
  assert.equal(sessionKey.toString("hex"), "3ed0920e5e6a0320d823d5987feafbb1");
  assert.equal(aes128Cmac(sessionKey, range).toString("hex"), "81ec45c175e72ff6fac61bc7ab3baef6");
  assert.equal(computeAesSdmMac(vendorKey, picc, range).toString("hex"), "ecc1e7f6c6c73bf6");
});

test("02: the canonical profile authenticates an independently calculated nonempty range", () => {
  // OpenSSL CLI CMAC over the ASCII PICC mirror followed by &cmac=:
  // 5BDA3B97C67C8F27F2B30BDA6EB6EAC1; NXP retains byte indexes 1,3,...,15.
  assert.deepEqual(parseSunTapUri(uri), { cardRef, piccHex: vendorPicc, macHex: "DA977C27B3DAB6C1" });
  const mirroredFile = Buffer.concat([hex("0069D101655504"), Buffer.from(uri.slice("https://".length), "ascii")]);
  assert.equal(mirroredFile.length, 107);
  assert.equal(mirroredFile.subarray(53, 91).toString("ascii"), `${vendorPicc}&cmac=`);
  assert.equal(mirroredFile.subarray(91).toString("ascii"), "DA977C27B3DAB6C1");
  const sessionKey = hex("3ED0920E5E6A0320D823D5987FEAFBB1");
  assert.equal(
    aes128Cmac(sessionKey, mirroredFile.subarray(53, 91)).toString("hex"),
    "5bda3b97c67c8f27f2b30bda6eb6eac1",
  );
  assert.deepEqual(verifySunTap(uri, card), { cardRef, epochId: "fixture-epoch-1", counter: 8 });
  for (const badMac of [
    "5BDA3B97C67C8F27", "5B3BC68FF20B6EEA", "C1B6DAB3277C97DA",
    "ECC1E7F6C6C73BF6", "DA977C27B3DAB6C0",
  ]) {
    assert.equal(verifySunTap(uri.replace("DA977C27B3DAB6C1", badMac), card), null);
  }
});

test("03: AN10922 r2.2 Table 2 and both final-block treatments", () => {
  const root = hex("00112233445566778899AABBCCDDEEFF");
  assert.equal(
    diversifyStationAes128Key(root, hex("04782E21801D803042F54E585020416275")).toString("hex"),
    "a8dd63a3b89d54b37ca802473fda9175",
  );
  // Independent OpenSSL AES-CBC over the two blocks from AN10922 Fig. 2,
  // with the published Table 2 K2 XORed into the final block for input 02.
  assert.equal(diversifyStationAes128Key(root, hex("02")).toString("hex"), "1071ae0aecc2714d6472fd34e8d51f6f");
  assert.equal(
    diversifyStationAes128Key(root, hex("000102030405060708090A0B0C0D0E")).toString("hex"),
    "5a3c7f6f0687f24f82dee7eda0970d08",
  );
  assert.equal(
    diversifyStationAes128Key(root, hex("000102030405060708090A0B0C0D0E0F")).toString("hex"),
    "feed9fbd36cdb16819a72d30bcf9240b",
  );
  // No padding (31 input bytes): independently calculated with OpenSSL CMAC.
  assert.equal(
    diversifyStationAes128Key(root, hex("000102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E")).toString("hex"),
    "21c28cd89bb3147f66c7dbd4851cab20",
  );
  const roleA = hex("04782E21801D8001");
  const roleB = hex("04782E21801D8002");
  const nextCard = hex("04782E21801D8101");
  assert.notDeepEqual(diversifyStationAes128Key(root, roleA), diversifyStationAes128Key(root, roleB));
  assert.notDeepEqual(diversifyStationAes128Key(root, roleA), diversifyStationAes128Key(root, nextCard));
  for (const length of [0, 32]) assert.throws(() => diversifyStationAes128Key(root, Buffer.alloc(length)), RangeError);
  assert.throws(() => diversifyStationAes128Key(Buffer.alloc(15), roleA), RangeError);
});

test("04: noncanonical or oversized URI is not accepted", () => {
  const variants = [
    `${uri}&picc=${vendorPicc}`, `${uri}&cmac=DA977C27B3DAB6C1`, `${uri}&extra=1`,
    uri.split("&")[0], uri.replace(`picc=${vendorPicc}&`, ""),
    uri.replace(`picc=${vendorPicc}&cmac=DA977C27B3DAB6C1`, `cmac=DA977C27B3DAB6C1&picc=${vendorPicc}`),
    uri.replace(vendorPicc, vendorPicc.toLowerCase()), uri.replace("DA977C27B3DAB6C1", "da977c27b3dab6c1"),
    uri.replace("picc=F", "picc=%46"), uri.replace("picc=", "%70icc="),
    uri.replace("picc=FD", "picc=GD"), uri.replace("picc=FD", "picc=F"), `${uri}0`,
    uri.replace(vendorPicc, "F".repeat(8192)), `${uri}\n`, `${uri}#fragment`,
    uri.replace("https:", "http:"), uri.replace(".co", ".co:443"), uri.replace("/nfc/", "/./nfc/"),
    uri.replace(cardRef, ""), uri.replace(cardRef, `${cardRef.slice(0, -1)}x`),
  ];
  for (const [index, raw] of variants.entries()) {
    assert.equal(verifySunTap(raw, card), null, `malformed variant ${index}`);
  }
});

function syntheticTap(counter: number, flag = 0xc7, fileReadKey = vendorKey) {
  const picc = Buffer.alloc(16);
  picc[0] = flag;
  vendorUid.copy(picc, 1);
  picc.writeUIntLE(counter, 8, 3);
  const cipher = createCipheriv("aes-128-cbc", vendorKey, Buffer.alloc(16)).setAutoPadding(false);
  const encrypted = Buffer.concat([cipher.update(picc), cipher.final()]).toString("hex").toUpperCase();
  const vector = Buffer.concat([hex("3CC300010080"), vendorUid, picc.subarray(8, 11)]);
  const full = aes128Cmac(aes128Cmac(fileReadKey, vector), Buffer.from(`${encrypted}&cmac=`, "ascii"));
  const mac = Buffer.from(full.filter((_, index) => index % 2 === 1)).toString("hex").toUpperCase();
  return `${origin}/nfc/${cardRef}?picc=${encrypted}&cmac=${mac}`;
}

test("04: unsupported PICCData flags or lengths reject even when the synthetic MAC matches", () => {
  for (const flag of [0x87, 0x47, 0xc6, 0xd7]) {
    assert.equal(verifySunTap(syntheticTap(9, flag), card), null);
  }
  assert.equal(readAesPiccData(vendorKey, Buffer.alloc(15)), null);
  assert.equal(readAesPiccData(vendorKey, Buffer.alloc(17)), null);
});

test("05: reject swapped refs, mismatched UID, invalid profile or epoch, and tampered proof", () => {
  const unexpectedKey = Buffer.alloc(16, 7);
  assert.equal(verifySunTap(uri.replace(cardRef, otherRef), card), null);
  assert.equal(verifySunTap(uri.replace(cardRef, otherRef), { ...card, cardRef: otherRef, fileReadKey: unexpectedKey }), null);
  assert.equal(verifySunTap(uri, { ...card, matchesUid: () => false }), null);
  assert.equal(verifySunTap(uri, { ...card, profile: "unknown-profile" }), null);
  assert.equal(verifySunTap(uri, { ...card, status: "retired" }), null);
  assert.equal(verifySunTap(uri, { ...card, epochId: "" }), null);
  assert.equal(verifySunTap(uri, { ...card, metaReadKey: unexpectedKey }), null);
  assert.equal(verifySunTap(uri, { ...card, fileReadKey: unexpectedKey }), null);
  assert.equal(verifySunTap(uri.replace("FD91", "ED91"), card), null);
  assert.equal(verifySunTap(uri, { ...card, epochId: "epoch-2", fileReadKey: unexpectedKey }), null);
  assert.equal(verifySunTap(uri.replace("DA977C27B3DAB6C1", "DA977C27B3DAB6C0"), {
    ...card,
    matchesUid: () => assert.fail("UID lookup must not run for unverified data"),
  }), null);
});

test("05: strict epoch high-water, valid gaps, LE maximum and attempted wrap", () => {
  assert.equal(verifySunTap(uri, { ...card, lastReadCounter: 8 }), null);
  assert.equal(verifySunTap(uri, { ...card, lastReadCounter: 9 }), null);
  assert.equal(verifySunTap(uri, { ...card, lastReadCounter: null })?.counter, 8);
  assert.equal(verifySunTap(syntheticTap(0x123456), card)?.counter, 0x123456);
  assert.equal(verifySunTap(syntheticTap(0xffffff), { ...card, lastReadCounter: 0xfffffe })?.counter, 0xffffff);
  assert.equal(verifySunTap(syntheticTap(0xffffff), { ...card, lastReadCounter: 0xffffff }), null);
  assert.equal(verifySunTap(syntheticTap(0), { ...card, lastReadCounter: 0xffffff }), null);
  assert.equal(verifySunTap(syntheticTap(0), { ...card, lastReadCounter: null }), null);
  for (const lastReadCounter of [-1, 0x1000000, NaN, 0.5]) {
    assert.equal(verifySunTap(uri, { ...card, lastReadCounter }), null);
  }
});

test("05: same UID and ref after rekey accept only proof under the new MAC key", () => {
  const fileReadKey = Buffer.alloc(16, 9);
  const rotated = { ...card, epochId: "fixture-epoch-2", fileReadKey, lastReadCounter: null };
  const unusedOldProof = syntheticTap(10);
  assert.equal(verifySunTap(unusedOldProof, card)?.epochId, card.epochId);
  assert.equal(verifySunTap(unusedOldProof, rotated), null);
  assert.deepEqual(verifySunTap(syntheticTap(1, 0xc7, fileReadKey), rotated), {
    cardRef, epochId: rotated.epochId, counter: 1,
  });
});
