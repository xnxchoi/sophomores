import type { PayloadRequest } from "payload";
import { z } from "zod";
import type { MemberPrincipal } from "@/lib/member-auth/contracts";
import { parseSunTapUri, verifySunTap } from "./sun-verifier";
import { loadNfcEpochKeys, matchesFingerprint, nfcFingerprint, type NfcSecrets } from "./storage-keys";
import { getActiveEpoch, getNfcCard, nfcRecords, relationId } from "./storage-records";
import { inNfcTransaction, lockNfcCards, lockNfcMember } from "./storage-transaction";

type ProofDetails = Readonly<{ ref: string; cardId: string; memberId: string; epochId: string; counter: number }>;
type TapProof = Readonly<{ verified: true }>;
const verified = new WeakMap<TapProof, ProofDetails>();
const uuid = z.uuid();

/** Principal must come from canonical member auth, never from the URI or body. */
export async function resolveNfcTap(req: PayloadRequest, principal: MemberPrincipal, uri: string, secrets: NfcSecrets): Promise<TapProof | null> {
  if (!uuid.safeParse(principal.userId).success || req.transactionID) return null;
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
    lastReadCounter: epoch.lastReadCounter ?? null,
    matchesUid: (uid) => matchesFingerprint(card.uidFingerprint, nfcFingerprint(secrets, "uid", uid)),
  });
  if (!proof) return null;
  const token: TapProof = Object.freeze({ verified: true });
  verified.set(token, { ref: proof.cardRef, cardId: card.id, memberId: principal.userId, epochId: proof.epochId, counter: proof.counter });
  return token;
}

export async function consumeNfcTap(req: PayloadRequest, principal: MemberPrincipal, token: TapProof): Promise<"welcome" | "membership" | null> {
  const proof = verified.get(token);
  if (!proof || proof.memberId !== principal.userId) return null;
  return inNfcTransaction(req, async (tx) => {
    if (!await lockNfcMember(tx, proof.memberId)) return null;
    await lockNfcCards(tx, [proof.ref]);
    const card = await getNfcCard(req, proof.ref);
    if (!card || card.id !== proof.cardId || card.status !== "active" || relationId(card.member) !== proof.memberId) return null;
    const epoch = await getActiveEpoch(req, card.id);
    if (!epoch || epoch.id !== proof.epochId || proof.counter <= (epoch.lastReadCounter ?? 0)) return null;

    const records = nfcRecords(req);
    const prior = await records.find("nfc-member-welcome", { member: { equals: proof.memberId } });
    await records.update("nfc-card-epochs", epoch.id, { lastReadCounter: proof.counter });
    if (prior) return "membership";
    await records.create("nfc-member-welcome", { member: proof.memberId });
    return "welcome";
  });
}
