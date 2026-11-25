import assert from "node:assert/strict";
import { chmod, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import messages from "../../../messages/en.json";
import { APPLE_PASS_TYPE_ID, appleWalletPass, loadAppleSigner, type AppleSignerError } from "@/lib/commerce/keys/apple-wallet-pass";
import { appleSigningFixture, openPass, opensslAvailable } from "./fixtures/apple-signing";

// Our own Apple Wallet pass (owner GO, 26 Nov: "And the passkit generator please"). Signing material is checked before
// anything is fetched; the pass is an event ticket carrying Unlock's QR and nothing personal.
const skip = !opensslAvailable() && "openssl is not installed";
const event = { id: "e", name: "Launch night", startsAt: "2026-12-05T10:00:00.000Z", endsAt: "2026-12-05T14:00:00.000Z" };
const barcode = "https://app.unlock-protocol.com/verification?data=%7B%7D&sig=0x" + "1".repeat(130);

async function code(load: Promise<unknown>) {
  try { await load; return "ok"; } catch (error) { return (error as AppleSignerError).code ?? String(error); }
}

test("a signer made the manual's way loads, and the pass it signs verifies and says only what it should", { skip }, async t => {
  const f = await appleSigningFixture();
  t.after(f.cleanup);
  const signer = await loadAppleSigner({ files: f.files, artDirectory: f.art, wwdr: f.wwdr });
  assert.equal(signer.teamIdentifier, "ABCDE12345", "the team comes from the certificate");
  const opened = await openPass(await appleWalletPass(signer, { serial: "a".repeat(32), event, barcode }), f.caFile);
  assert.equal(opened.verified, true, "manifest signature verifies against the issuing CA");
  assert.deepEqual(opened.files.sort(), ["icon.png", "manifest.json", "pass.json", "signature"]);
  const { pass } = opened;
  assert.equal(pass.passTypeIdentifier, APPLE_PASS_TYPE_ID);
  assert.equal(pass.teamIdentifier, "ABCDE12345");
  assert.equal(pass.serialNumber, "a".repeat(32));
  assert.equal(pass.organizationName, "Sophomores");
  assert.equal(pass.description, messages.Customer.components_commerce_wallet_pass.description);
  assert.deepEqual(pass.eventTicket.primaryFields, [{ key: "event", label: "Event", value: "Launch night" }]);
  assert.equal(pass.eventTicket.secondaryFields[0].value, event.startsAt);
  assert.deepEqual(pass.barcodes, [{ message: barcode, format: "PKBarcodeFormatQR", messageEncoding: "iso-8859-1" }]);
  for (const absent of ["backgroundColor", "foregroundColor", "logoText", "expirationDate", "voided"]) assert.equal(absent in pass, false, absent);
});

test("every way the signing material can be wrong refuses with its own fixed code", { skip }, async t => {
  const f = await appleSigningFixture();
  t.after(f.cleanup);
  const load = (over: Partial<Parameters<typeof loadAppleSigner>[0]> = {}) =>
    code(loadAppleSigner({ files: f.files, artDirectory: f.art, wwdr: f.wwdr, ...over }));
  assert.equal(await load(), "ok");
  assert.equal(await load({ wwdr: undefined }), "signer_cert_not_wwdr", "the real WWDR G4 didn't issue a test certificate");
  assert.equal(await load({ now: new Date(Date.now() + 3 * 86_400_000) }), "signer_cert_expired");
  assert.equal(await load({ artDirectory: join(f.dir, "no-art") }), "pass_art_missing");
  const other = await appleSigningFixture({ uid: "pass.example.other" });
  t.after(other.cleanup);
  assert.equal(await code(loadAppleSigner({ files: other.files, artDirectory: other.art, wwdr: other.wwdr })), "signer_cert_not_ours");
  assert.equal(await load({ files: { ...f.files, key: other.files.key, env: other.files.env } }), "signer_key_mismatch");
  await writeFile(f.files.env, "APPLE_PASS_KEY_PASSPHRASE=wrong\n");
  assert.equal(await load(), "signer_key_invalid");
  await writeFile(f.files.env, "OTHER=x\n");
  assert.equal(await load(), "signer_env_invalid");
  await chmod(f.files.key, 0o644);
  assert.equal(await load(), "signer_files_unreadable", "a key readable by others is refused");
  await rm(f.files.cert);
  const thrown = await loadAppleSigner({ files: f.files, artDirectory: f.art, wwdr: f.wwdr }).catch((error: Error) => error);
  assert.equal(String(thrown).includes(f.dir), false, "no path or content in the error");
});
