import { createPrivateKey, X509Certificate } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { PKPass } from "passkit-generator";
import messages from "../../../../messages/en.json";
import type { PassEvent } from "./google-wallet-pass";
import { readOwnerOnly, signerDirectory } from "./unlock/signer";

/*
 * Our own Apple Wallet event ticket (owner GO, 26 Nov: "And the passkit generator please"). Same QR as the Google pass:
 * Unlock's, harvested and proved first (unlock/hosted-barcode.ts). Signed with the owner's Pass Type ID certificate.
 * Nothing personal on the pass: the serial is a hash, and it shows the event's name and start only.
 * Files (Staff manual, Apple Wallet, 26 Nov), all owner-only in ~/.config/sphmrs:
 *   apple-pass-cert.pem   the Pass Type ID certificate (PEM)
 *   apple-pass-key.pem    its private key, encrypted
 *   apple-pass-signing.env  APPLE_PASS_KEY_PASSPHRASE=...
 * Pass art (icon.png is required by Wallet) is public and comes from public/wallet-pass/; until the owner approves it,
 * there is none and the Apple pass refuses.
 */
export const APPLE_PASS_TYPE_ID = "pass.co.sophomores.ticket";
export const appleSigningFiles = {
  cert: join(signerDirectory, "apple-pass-cert.pem"),
  key: join(signerDirectory, "apple-pass-key.pem"),
  env: join(signerDirectory, "apple-pass-signing.env"),
};
export const applePassArtDirectory = join(process.cwd(), "public", "wallet-pass");

/** Apple Worldwide Developer Relations CA, G4 (public; apple.com/certificateauthority, verified against Apple Root CA on
 * 26 Nov; SHA-256 EA:47:57:88:…:B5:BC:E1:4C; expires 10 Dec 2030). Every Pass Type ID certificate is issued by it. */
export const APPLE_WWDR_G4 = `-----BEGIN CERTIFICATE-----
MIIEVTCCAz2gAwIBAgIUE9x3lVJx5T3GMujM/+Uh88zFztIwDQYJKoZIhvcNAQEL
BQAwYjELMAkGA1UEBhMCVVMxEzARBgNVBAoTCkFwcGxlIEluYy4xJjAkBgNVBAsT
HUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRYwFAYDVQQDEw1BcHBsZSBS
b290IENBMB4XDTIwMTIxNjE5MzYwNFoXDTMwMTIxMDAwMDAwMFowdTFEMEIGA1UE
Aww7QXBwbGUgV29ybGR3aWRlIERldmVsb3BlciBSZWxhdGlvbnMgQ2VydGlmaWNh
dGlvbiBBdXRob3JpdHkxCzAJBgNVBAsMAkc0MRMwEQYDVQQKDApBcHBsZSBJbmMu
MQswCQYDVQQGEwJVUzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANAf
eKp6JzKwRl/nF3bYoJ0OKY6tPTKlxGs3yeRBkWq3eXFdDDQEYHX3rkOPR8SGHgjo
v9Y5Ui8eZ/xx8YJtPH4GUnadLLzVQ+mxtLxAOnhRXVGhJeG+bJGdayFZGEHVD41t
QSo5SiHgkJ9OE0/QjJoyuNdqkh4laqQyziIZhQVg3AJK8lrrd3kCfcCXVGySjnYB
5kaP5eYq+6KwrRitbTOFOCOL6oqW7Z+uZk+jDEAnbZXQYojZQykn/e2kv1MukBVl
PNkuYmQzHWxq3Y4hqqRfFcYw7V/mjDaSlLfcOQIA+2SM1AyB8j/VNJeHdSbCb64D
YyEMe9QbsWLFApy9/a8CAwEAAaOB7zCB7DASBgNVHRMBAf8ECDAGAQH/AgEAMB8G
A1UdIwQYMBaAFCvQaUeUdgn+9GuNLkCm90dNfwheMEQGCCsGAQUFBwEBBDgwNjA0
BggrBgEFBQcwAYYoaHR0cDovL29jc3AuYXBwbGUuY29tL29jc3AwMy1hcHBsZXJv
b3RjYTAuBgNVHR8EJzAlMCOgIaAfhh1odHRwOi8vY3JsLmFwcGxlLmNvbS9yb290
LmNybDAdBgNVHQ4EFgQUW9n6HeeaGgujmXYiUIY+kchbd6gwDgYDVR0PAQH/BAQD
AgEGMBAGCiqGSIb3Y2QGAgEEAgUAMA0GCSqGSIb3DQEBCwUAA4IBAQA/Vj2e5bbD
eeZFIGi9v3OLLBKeAuOugCKMBB7DUshwgKj7zqew1UJEggOCTwb8O0kU+9h0UoWv
p50h5wESA5/NQFjQAde/MoMrU1goPO6cn1R2PWQnxn6NHThNLa6B5rmluJyJlPef
x4elUWY0GzlxOSTjh2fvpbFoe4zuPfeutnvi0v/fYcZqdUmVIkSoBPyUuAsuORFJ
EtHlgepZAE9bPFo22noicwkJac3AfOriJP6YRLj477JxPxpd1F1+M02cHSS+APCQ
A1iZQT0xWmJArzmoUUOSqwSonMJNsUvSq3xKX+udO7xPiEAGE/+QF4oIRynoYpgp
pU8RBWk6z/Kf
-----END CERTIFICATE-----
`;

export const APPLE_SIGNER_CODES = ["signer_files_unreadable", "signer_env_invalid", "signer_cert_invalid", "signer_cert_not_ours",
  "signer_cert_expired", "signer_cert_not_wwdr", "signer_key_invalid", "signer_key_mismatch", "pass_art_missing"] as const;
export class AppleSignerError extends Error {
  override name = "AppleSignerError";
  constructor(readonly code: (typeof APPLE_SIGNER_CODES)[number]) { super(code); }
}
export type AppleSigner = { teamIdentifier: string; signerCert: string; signerKey: string; signerKeyPassphrase: string; wwdr: string;
  art: Record<string, Buffer> };

const subjectField = (subject: string, name: string) =>
  subject.split("\n").filter(line => line.startsWith(name + "=")).map(line => line.slice(name.length + 1));
const ART = ["icon.png", "icon@2x.png", "icon@3x.png", "logo.png", "logo@2x.png", "logo@3x.png"] as const;

/** Everything a pass needs, checked before anything is fetched; each failure is a fixed code with nothing from the files. */
export async function loadAppleSigner({ files = appleSigningFiles, artDirectory = applePassArtDirectory, uid = process.getuid?.(),
  wwdr = APPLE_WWDR_G4, now = new Date() } = {}): Promise<AppleSigner> {
  let certPem: string, keyPem: string, envText: string;
  try { [certPem, keyPem, envText] = await Promise.all([files.cert, files.key, files.env].map(file => readOwnerOnly(file, uid))); }
  catch { throw new AppleSignerError("signer_files_unreadable"); }
  let passphrase: string | undefined;
  try { passphrase = parseEnv(envText).APPLE_PASS_KEY_PASSPHRASE; } catch { throw new AppleSignerError("signer_env_invalid"); }
  if (!passphrase) throw new AppleSignerError("signer_env_invalid");
  let cert: X509Certificate, issuer: X509Certificate;
  try { cert = new X509Certificate(certPem); issuer = new X509Certificate(wwdr); } catch { throw new AppleSignerError("signer_cert_invalid"); }
  const [passType] = subjectField(cert.subject, "UID");
  const teams = subjectField(cert.subject, "OU");
  if (passType !== APPLE_PASS_TYPE_ID || teams.length !== 1 || !/^[A-Z0-9]{10}$/.test(teams[0])) throw new AppleSignerError("signer_cert_not_ours");
  if (now < new Date(cert.validFrom) || now >= new Date(cert.validTo)) throw new AppleSignerError("signer_cert_expired");
  if (!cert.checkIssued(issuer) || !cert.verify(issuer.publicKey)) throw new AppleSignerError("signer_cert_not_wwdr");
  let key: ReturnType<typeof createPrivateKey>;
  try { key = createPrivateKey({ key: keyPem, format: "pem", passphrase }); } catch { throw new AppleSignerError("signer_key_invalid"); }
  if (!cert.checkPrivateKey(key)) throw new AppleSignerError("signer_key_mismatch");
  const art: Record<string, Buffer> = {};
  await Promise.all(ART.map(async name => { try { art[name] = await readFile(join(artDirectory, name)); } catch { /* optional */ } }));
  if (!art["icon.png"]) throw new AppleSignerError("pass_art_missing");
  return { teamIdentifier: teams[0], signerCert: certPem, signerKey: keyPem, signerKeyPassphrase: passphrase, wwdr, art };
}

/** The .pkpass bytes: an event ticket with Unlock's proved QR. Serial = the Google object's hash, so both name one key. */
export async function appleWalletPass(signer: AppleSigner, { serial, event, barcode }: { serial: string; event: PassEvent; barcode: string }) {
  const copy = messages.Customer.components_commerce_wallet_pass;
  const pass = new PKPass({ ...signer.art }, { wwdr: signer.wwdr, signerCert: signer.signerCert, signerKey: signer.signerKey,
    signerKeyPassphrase: signer.signerKeyPassphrase }, {
    formatVersion: 1,
    passTypeIdentifier: APPLE_PASS_TYPE_ID,
    teamIdentifier: signer.teamIdentifier,
    serialNumber: serial,
    // A name, not interface copy; the pass art's wordmark is with the owner (26 Nov).
    organizationName: "Sophomores",
    description: copy.description,
  });
  pass.type = "eventTicket";
  pass.primaryFields.push({ key: "event", label: copy.event, value: event.name });
  pass.secondaryFields.push({ key: "starts", label: copy.starts, value: event.startsAt, dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleShort" });
  pass.setRelevantDates([{ date: event.startsAt, relevantDate: event.startsAt }]);  // "date" from iOS 26, "relevantDate" before
  pass.setBarcodes({ message: barcode, format: "PKBarcodeFormatQR", messageEncoding: "iso-8859-1" });
  return pass.getAsBuffer();
}

