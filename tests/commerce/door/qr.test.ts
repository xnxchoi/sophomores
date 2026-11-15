import assert from "node:assert/strict";
import test from "node:test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { pinnedQrSigners, verifyUnlockQr } from "../../../src/lib/commerce/door/qr";
import { LOCK, unlockQr } from "./fixtures";

// Throwaway in-test keys only; pinned here, never in application configuration.
const locksmith = privateKeyToAccount(generatePrivateKey());
const earlier = privateKeyToAccount(generatePrivateKey());
const stranger = privateKeyToAccount(generatePrivateKey());
const pinned = [locksmith.address, earlier.address];

test("a QR signed by a pinned Locksmith signer yields its network, lock and token", async () => {
  const scan = await unlockQr(locksmith, { tokenId: "7" });
  assert.deepEqual(await verifyUnlockQr(scan, pinned), { ok: true, key: { network: 84532, lockAddress: LOCK.toLowerCase(), tokenID: "7" } });
});

test("an earlier pinned signer still passes, and the URL's host is ignored", async () => {
  const scan = (await unlockQr(earlier, { tokenId: "7" })).replace("https://app.unlock-protocol.com", "https://elsewhere.example");
  assert.equal((await verifyUnlockQr(scan, pinned)).ok, true);
});

test("verification runs over the exact scanned data string, never a re-serialised copy", async () => {
  // Signed bytes that JSON.stringify would never produce: re-serialising would break the signature.
  const data = `{ "tokenId": "7", "lockAddress": "${LOCK}", "network": 84532, "account": "0x0000000000000000000000000000000000000001", "timestamp": 1 }`;
  const scan = await unlockQr(locksmith, { raw: data });
  assert.equal((await verifyUnlockQr(scan, pinned)).ok, true);
  // And a payload re-serialised after signing no longer verifies.
  const url = new URL(scan);
  url.searchParams.set("data", JSON.stringify(JSON.parse(data)));
  assert.deepEqual(await verifyUnlockQr(url.toString(), pinned), { ok: false, code: "unpinned-signer" });
});

test("a malformed signature, an unpinned signer and an unreadable scan are refused with their codes", async () => {
  const good = new URL(await unlockQr(locksmith, { tokenId: "7" }));
  good.searchParams.set("sig", `0x${"ab".repeat(65)}`);
  assert.deepEqual(await verifyUnlockQr(good.toString(), pinned), { ok: false, code: "bad-signature" });
  assert.deepEqual(await verifyUnlockQr(await unlockQr(stranger, { tokenId: "7" }), pinned), { ok: false, code: "unpinned-signer" });
  for (const scan of ["", "not a url", "https://app.unlock-protocol.com/verification?data=x", "x".repeat(5000)]) {
    assert.deepEqual(await verifyUnlockQr(scan, pinned), { ok: false, code: "unreadable-qr" });
  }
  assert.deepEqual(await verifyUnlockQr(await unlockQr(locksmith, { tokenId: "7" }), []), { ok: false, code: "unpinned-signer" });
});

test("pinned signers come from configuration and reject invalid entries", () => {
  assert.deepEqual(pinnedQrSigners(` ${locksmith.address.toLowerCase()} ,${earlier.address}`), pinned);
  assert.deepEqual(pinnedQrSigners(undefined), []);
  assert.throws(() => pinnedQrSigners("0x1234"), /invalid address/);
});
