import type { PayloadRequest } from "payload";
import { z } from "zod";
import { sql } from "@payloadcms/db-postgres";
import type { MemberPrincipal } from "@/lib/member-auth/contracts";
import { parseSunTapUri, verifySunTap } from "./sun-verifier";
import { loadNfcEpochKeys, matchesFingerprint, nfcFingerprint, type NfcSecrets } from "./storage-keys";
import { getActiveEpoch, getNfcCard, nfcRecords, relationId } from "./storage-records";
import { inNfcTransaction, lockNfcCards, lockNfcMember } from "./storage-transaction";

type TapMember = Pick<MemberPrincipal, "userId" | "emailVerified">;

type ProofDetails = Readonly<{ ref: string; cardId: string; memberId: string; epochId: string; counter: number }>;
type TapProof = Readonly<{ verified: true }>;
const verified = new WeakMap<TapProof, ProofDetails>();
const uuid = z.uuid();

export function isEligibleNfcMember(emailVerified: unknown, status: unknown): boolean {
  return emailVerified === true && (status === "approved" || status === "staff");
}

export async function hasNfcWelcomedMember(req: PayloadRequest, memberId: string): Promise<boolean> {
  return Boolean(await nfcRecords(req).find("nfc-member-welcome", { member: { equals: memberId } }));
}

/** Principal must come from canonical member auth, never from the URI or body. */
export async function inspectNfcTap(req: PayloadRequest, principal: TapMember, uri: string, secrets: NfcSecrets): Promise<TapProof | "stale" | null> {
  if (!principal.emailVerified || !uuid.safeParse(principal.userId).success || req.transactionID) return null;
  const parsed = parseSunTapUri(uri);
  if (!parsed) return null;
  const card = await getNfcCard(req, parsed.cardRef);
  if (!card || card.status !== "active" || relationId(card.member) !== principal.userId) return null;
  const epoch = await getActiveEpoch(req, card.id);
  if (!epoch) return null;
  const keys = await loadNfcEpochKeys(secrets, epoch.metaKeyRef, epoch.macKeyRef);
  if (!keys || !matchesFingerprint(epoch.macFingerprint, keys.macFingerprint)
    || !matchesFingerprint(epoch.metaFingerprint, keys.metaFingerprint)) return null;
  const proof = verifySunTap(uri, {
    ...keys, cardRef: card.ref, epochId: epoch.id, profile: epoch.profile, status: card.status,
    lastReadCounter: null,
    matchesUid: (uid) => matchesFingerprint(card.uidFingerprint, nfcFingerprint(secrets, "uid", uid)),
  });
  if (!proof) return null;
  const highWater = epoch.lastReadCounter ?? 0;
  if (!Number.isInteger(highWater) || highWater < 0 || highWater > 0xff_ffff) return null;
  if (proof.counter <= highWater) return "stale";
  const token: TapProof = Object.freeze({ verified: true });
  verified.set(token, { ref: proof.cardRef, cardId: card.id, memberId: principal.userId, epochId: proof.epochId, counter: proof.counter });
  return token;
}

export async function resolveNfcTap(req: PayloadRequest, principal: TapMember, uri: string, secrets: NfcSecrets): Promise<TapProof | null> {
  const result = await inspectNfcTap(req, principal, uri, secrets);
  return result === "stale" ? null : result;
}

type NfcTransaction = Parameters<Parameters<typeof inNfcTransaction>[1]>[0];

async function spendTap(req: PayloadRequest, tx: NfcTransaction, proof: ProofDetails): Promise<"welcome" | "membership" | null> {
  if (!await lockNfcMember(tx, proof.memberId)) return null;
  const eligibility = await tx.execute(sql`SELECT email_verified, membership_status FROM users WHERE id = ${proof.memberId}::uuid`);
  const member = eligibility.rows[0];
  if (!member || !isEligibleNfcMember(member.email_verified, member.membership_status)) return null;
  await lockNfcCards(tx, [proof.ref]);
  const card = await getNfcCard(req, proof.ref);
  if (!card || card.id !== proof.cardId || card.status !== "active" || relationId(card.member) !== proof.memberId) return null;
  const epoch = await getActiveEpoch(req, card.id);
  if (!epoch || epoch.id !== proof.epochId || proof.counter <= (epoch.lastReadCounter ?? 0)) return null;

  const records = nfcRecords(req);
  const prior = await hasNfcWelcomedMember(req, proof.memberId);
  await records.update("nfc-card-epochs", epoch.id, { lastReadCounter: proof.counter });
  if (prior) return "membership";
  await records.create("nfc-member-welcome", { member: proof.memberId });
  return "welcome";
}

export async function consumeNfcTap(req: PayloadRequest, principal: TapMember, token: TapProof): Promise<"welcome" | "membership" | null> {
  const proof = verified.get(token);
  if (!principal.emailVerified || !proof || proof.memberId !== principal.userId) return null;
  return inNfcTransaction(req, tx => spendTap(req, tx, proof));
}

type HandoffPool = { query(sql: string, values: (string | number)[]): Promise<{ rows: { card_ref?: string }[] }> };

export async function persistNfcHandoff(pool: HandoffPool, token: TapProof, id: string, browserHash: string): Promise<void> {
  const proof = verified.get(token);
  if (!proof) throw new Error("NFC handoff requires an inspected proof");
  // Cap retained data at one row per member. Persist only verified identifiers/counter, never the SUN URI.
  await pool.query(`INSERT INTO nfc_tap_handoffs (id, member_id, card_id, card_ref, epoch_id, counter, browser_hash, expires_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,clock_timestamp() + interval '2 minutes')
    ON CONFLICT (member_id) DO UPDATE SET id=EXCLUDED.id, card_id=EXCLUDED.card_id,
      card_ref=EXCLUDED.card_ref, epoch_id=EXCLUDED.epoch_id, counter=EXCLUDED.counter,
      browser_hash=EXCLUDED.browser_hash, expires_at=EXCLUDED.expires_at`,
    [id, proof.memberId, proof.cardId, proof.ref, proof.epochId, proof.counter, browserHash]);
}

export async function readNfcHandoff(pool: HandoffPool, memberId: string, id: string, browserHash: string): Promise<string | null> {
  const result = await pool.query(`SELECT card_ref FROM nfc_tap_handoffs
    WHERE id=$1 AND member_id=$2 AND browser_hash=$3 AND expires_at > clock_timestamp()`, [id, memberId, browserHash]);
  return result.rows[0]?.card_ref ?? null;
}

export async function consumeNfcHandoff(
  req: PayloadRequest, principal: TapMember, id: string, browserHash: string, cardRef: string,
): Promise<"welcome" | "membership" | null> {
  if (!principal.emailVerified || !uuid.safeParse(principal.userId).success) return null;
  return inNfcTransaction(req, async tx => {
    const deleted = await tx.execute(sql`DELETE FROM nfc_tap_handoffs WHERE id=${id}
      AND member_id=${principal.userId}::uuid AND browser_hash=${browserHash} AND card_ref=${cardRef}
      AND expires_at > clock_timestamp() RETURNING card_id, epoch_id, counter`);
    const row = deleted.rows[0];
    if (!row || typeof row.card_id !== "string" || typeof row.epoch_id !== "string" || typeof row.counter !== "number") return null;
    return spendTap(req, tx, { ref: cardRef, cardId: row.card_id, memberId: principal.userId,
      epochId: row.epoch_id, counter: row.counter });
  });
}
