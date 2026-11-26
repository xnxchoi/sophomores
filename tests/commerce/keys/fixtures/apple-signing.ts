import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

/*
 * TEST ONLY. A throwaway "WWDR" CA and a Pass Type ID signer made with the system openssl, using the same key and
 * conversion commands as the owner's Staff manual (req -newkey with an encrypted key; the portal's DER .cer to PEM).
 * Nothing here is or resembles a real Sophomores or Apple credential.
 */
export const toolsAvailable = () => spawnSync("openssl", ["version"]).status === 0 && spawnSync("unzip", ["-v"]).status === 0;

function openssl(cwd: string, ...args: string[]) {
  const run = spawnSync("openssl", args, { cwd, encoding: "utf8" });
  if (run.status !== 0) throw new Error(`openssl ${args[0]} failed: ${run.stderr.slice(0, 400)}`);
}

/** A 1×1 PNG, enough for Wallet's required icon in a bundle. */
export function tinyPng() {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 0, 0, 0, 0]);
  return Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), chunk("IHDR", header), chunk("IDAT", deflateSync(Buffer.from([0, 0]))),
    chunk("IEND", Buffer.alloc(0))]);
}
function crc32(bytes: Buffer) {
  let crc = ~0;
  for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return ~crc >>> 0;
}

export type AppleFixture = { dir: string; files: { cert: string; key: string; env: string }; art: string; wwdr: string; caFile: string;
  passphrase: string; cleanup: () => Promise<void> };

export async function appleSigningFixture({ uid = "pass.co.sophomores.ticket", team = "ABCDE12345" } = {}): Promise<AppleFixture> {
  const dir = await mkdtemp(join(tmpdir(), "apple-pass-"));
  const passphrase = "test-only-passphrase";
  openssl(dir, "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", "ca.key", "-out", "ca.pem", "-days", "2",
    "-subj", "/CN=Test Only WWDR/OU=G4/O=Test Only/C=US");
  // The owner's manual: an encrypted key and a CSR from one command (Apple replaces the subject when it issues).
  openssl(dir, "req", "-new", "-newkey", "rsa:2048", "-keyout", "apple-pass-key.pem", "-passout", `pass:${passphrase}`,
    "-out", "pass.certSigningRequest", "-subj", `/UID=${uid}/CN=Pass Type ID: ${uid}/OU=${team}/O=Test Only/C=US`);
  openssl(dir, "x509", "-req", "-in", "pass.certSigningRequest", "-CA", "ca.pem", "-CAkey", "ca.key", "-CAcreateserial",
    "-days", "1", "-outform", "der", "-out", "pass.cer");
  // The manual's conversion of the portal's download.
  openssl(dir, "x509", "-inform", "der", "-in", "pass.cer", "-out", "apple-pass-cert.pem");
  await writeFile(join(dir, "apple-pass-signing.env"), `APPLE_PASS_KEY_PASSPHRASE=${passphrase}\n`);
  for (const name of ["apple-pass-cert.pem", "apple-pass-key.pem", "apple-pass-signing.env"]) await chmod(join(dir, name), 0o600);
  const art = join(dir, "art");
  await mkdir(art);
  await writeFile(join(art, "icon.png"), tinyPng());
  return {
    dir, passphrase, art, caFile: join(dir, "ca.pem"), wwdr: await readFile(join(dir, "ca.pem"), "utf8"),
    files: { cert: join(dir, "apple-pass-cert.pem"), key: join(dir, "apple-pass-key.pem"), env: join(dir, "apple-pass-signing.env") },
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}

/** Unzips a .pkpass and checks its PKCS#7 signature over manifest.json against the fixture CA with openssl. */
export async function openPass(bytes: Buffer, caFile: string) {
  const dir = await mkdtemp(join(tmpdir(), "pkpass-"));
  try {
    await writeFile(join(dir, "pass.pkpass"), bytes);
    const unzip = spawnSync("unzip", ["-q", "pass.pkpass", "-d", "out"], { cwd: dir });
    if (unzip.status !== 0) throw new Error("unzip failed");
    const out = join(dir, "out");
    const verify = spawnSync("openssl", ["smime", "-verify", "-binary", "-inform", "der", "-in", join(out, "signature"),
      "-content", join(out, "manifest.json"), "-CAfile", caFile, "-purpose", "any", "-out", "/dev/null"], { encoding: "utf8" });
    const read = async (name: string) => readFile(join(out, name), "utf8").catch(() => null);
    return { verified: verify.status === 0, pass: JSON.parse((await read("pass.json"))!), manifest: JSON.parse((await read("manifest.json"))!),
      files: spawnSync("ls", [out], { encoding: "utf8" }).stdout.trim().split("\n") };
  } finally { await rm(dir, { recursive: true, force: true }); }
}
