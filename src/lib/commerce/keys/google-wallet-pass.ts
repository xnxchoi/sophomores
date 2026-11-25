import { createHash } from "node:crypto";
import { join } from "node:path";
import { importPKCS8, SignJWT } from "jose";
import { z } from "zod";
import type { PassKey } from "./unlock/pass-holder";
import { readOwnerOnly, signerDirectory } from "./unlock/signer";

/*
 * Our own Google Wallet event ticket (owner GO, 26 Nov, relayed by Cordy: our own passes; jose for Google). One "fat"
 * save JWT carries the class and the object, so issuing needs no Google API call: Google creates both when the member
 * saves (developers.google.com/wallet/tickets/events/use-cases/jwt). The QR is Unlock's, harvested and proved first
 * (unlock/hosted-barcode.ts). Nothing personal goes to Google: IDs are hashes, and the pass holds the event's name and
 * times and the QR only (no member name, email, order or Safe beyond what the QR itself already states).
 */

/** The owner's service-account key file (Staff manual, 26 Nov: ~/.config/sphmrs/google-wallet-issuer.json, mode 0600). */
export const googleWalletIssuerFile = join(signerDirectory, "google-wallet-issuer.json");
export const GOOGLE_WALLET_ISSUER_CODES = ["issuer_id_invalid", "issuer_file_unreadable", "issuer_file_invalid", "issuer_key_invalid"] as const;
export class GoogleWalletIssuerError extends Error {
  override name = "GoogleWalletIssuerError";
  constructor(readonly code: (typeof GOOGLE_WALLET_ISSUER_CODES)[number]) { super(code); }
}
export type GoogleWalletIssuer = { issuerID: string; serviceAccount: string; key: CryptoKey };
export type PassEvent = { id: string; name: string; startsAt: string; endsAt: string | null };

const serviceAccount = z.object({
  type: z.literal("service_account"),
  client_email: z.string().regex(/^[a-z0-9-]{6,30}@[a-z0-9-]{6,30}\.iam\.gserviceaccount\.com$/),
  private_key: z.string().regex(/^-{5}BEGIN PRIVATE KEY-{5}\n/).max(8_192),  // PKCS#8 PEM, as Google issues it
});

/** Fails closed with a fixed code; nothing read from the file is ever in an error. */
export async function loadGoogleWalletIssuer(file = googleWalletIssuerFile, uid = process.getuid?.()): Promise<GoogleWalletIssuer> {
  const issuerID = process.env.GOOGLE_WALLET_ISSUER_ID;
  if (!issuerID || !/^[0-9]{10,25}$/.test(issuerID)) throw new GoogleWalletIssuerError("issuer_id_invalid");
  let text: string;
  try { text = await readOwnerOnly(file, uid); } catch { throw new GoogleWalletIssuerError("issuer_file_unreadable"); }
  let account: z.infer<typeof serviceAccount>;
  try { account = serviceAccount.parse(JSON.parse(text)); } catch { throw new GoogleWalletIssuerError("issuer_file_invalid"); }
  try {
    return { issuerID, serviceAccount: account.client_email, key: await importPKCS8(account.private_key, "RS256") };
  } catch { throw new GoogleWalletIssuerError("issuer_key_invalid"); }
}

const digest = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 32);
const text = (value: string) => ({ defaultValue: { language: "en-US", value } });

/** Stable per key on its lock: a reissued key (new token) is a new pass, and two locks never share one. Apple's serial too. */
export const passSerial = (key: PassKey) => digest(`137:${key.lock.toLowerCase()}:${key.tokenID}`);
export const googleTicketObjectID = (issuerID: string, key: PassKey) => `${issuerID}.ticket-${passSerial(key)}`;
export const googleEventClassID = (issuerID: string, eventID: string) => `${issuerID}.event-${digest(`event:${eventID}`)}`;

export async function googleWalletSaveURL(issuer: GoogleWalletIssuer,
  { key, event, barcode, origin }: { key: PassKey; event: PassEvent; barcode: string; origin: string }): Promise<string> {
  const classId = googleEventClassID(issuer.issuerID, event.id);
  const jwt = await new SignJWT({
    typ: "savetowallet",
    origins: [origin],
    payload: {
      eventTicketClasses: [{
        id: classId,
        // A name, not interface copy; the wordmark question for the pass art is with the owner (26 Nov).
        issuerName: "Sophomores",
        reviewStatus: "UNDER_REVIEW",
        eventName: text(event.name),
        dateTime: { start: event.startsAt, ...(event.endsAt ? { end: event.endsAt } : {}) },
      }],
      eventTicketObjects: [{
        id: googleTicketObjectID(issuer.issuerID, key),
        classId,
        state: "ACTIVE",
        barcode: { type: "QR_CODE", value: barcode, alternateText: "" },
      }],
    },
  }).setProtectedHeader({ alg: "RS256", typ: "JWT" }).setIssuer(issuer.serviceAccount).setAudience("google").setIssuedAt().sign(issuer.key);
  return `https://pay.google.com/gp/v/save/${jwt}`;
}
