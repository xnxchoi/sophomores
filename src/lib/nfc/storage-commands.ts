import { sql } from "@payloadcms/db-postgres";
import type { PayloadRequest } from "payload";
import { z } from "zod";
import { isCmsSuperAdmin } from "@/lib/auth/access";
import type { NfcCard } from "@/payload-types";
import { loadNfcEpochKeys, nfcFingerprint, type NfcSecrets } from "./storage-keys";
import { getActiveEpoch, getNfcCard, nfcRecords, relationId } from "./storage-records";
import { inNfcTransaction, lockNfcCards, lockNfcMember } from "./storage-transaction";

const uuid = z.uuid();
const ref = z.string().regex(/^[A-Za-z0-9_-]{21}[AQgw]$/);
const keyRef = z.string().regex(/^[a-zA-Z0-9_./:-]{1,128}$/);
type Registration = { ref: string; uid: Uint8Array; metaKeyRef: string; macKeyRef: string };
type Change = {
  ref: string;
  member: string;
  command: "issue" | "revoke" | "replace" | "retire-epoch";
  replacement?: string;
  reason?: "lost" | "damaged";
};

function issuer(req: PayloadRequest): string | null {
  return isCmsSuperAdmin(req.user) && typeof req.user?.id === "string" && uuid.safeParse(req.user.id).success
    ? req.user.id : null;
}

function targetRefs(change: Change): string[] | null {
  if (!ref.safeParse(change.ref).success || !uuid.safeParse(change.member).success) return null;
  if (change.command === "replace") {
    return change.replacement && change.ref !== change.replacement && ref.safeParse(change.replacement).success
      ? [change.ref, change.replacement] : null;
  }
  return change.replacement === undefined ? [change.ref] : null;
}

export async function registerNfcEpoch(
  req: PayloadRequest, input: Registration, secrets: NfcSecrets, previousRetiredEpochId?: string,
): Promise<boolean> {
  const actor = issuer(req);
  if (!actor || !ref.safeParse(input.ref).success || input.uid.length !== 7
    || !keyRef.safeParse(input.metaKeyRef).success || !keyRef.safeParse(input.macKeyRef).success
    || (previousRetiredEpochId !== undefined && !uuid.safeParse(previousRetiredEpochId).success)) return false;
  const { ref: cardRef, metaKeyRef, macKeyRef } = input;
  const uidFingerprint = nfcFingerprint(secrets, "uid", input.uid);
  const keys = await loadNfcEpochKeys(secrets, metaKeyRef, macKeyRef);
  if (!keys) return false;
  const fingerprints = [keys.metaFingerprint, keys.macFingerprint].sort();

  return inNfcTransaction(req, async (tx) => {
    // Serialize absent stock identities and cross-role key claims.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${"nfc:ref:" + cardRef}, 0))`);
    await lockNfcCards(tx, [cardRef]);
    const records = nfcRecords(req);
    const existing = await getNfcCard(req, cardRef);
    if (existing && (existing.status === "retired" || existing.uidFingerprint !== uidFingerprint)) return false;
    if ((!existing && previousRetiredEpochId) || (existing && !previousRetiredEpochId)) return false;
    if (existing) {
      const previous = await records.find("nfc-card-epochs", { id: { equals: previousRetiredEpochId } });
      if (!previous || previous.status !== "retired" || relationId(previous.card) !== existing.id
        || await getActiveEpoch(req, existing.id)) return false;
      if (await records.find("nfc-card-epochs", { previousEpoch: { equals: previousRetiredEpochId } })) return false;
    }
    for (const fingerprint of fingerprints) {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${"nfc:key:" + fingerprint}, 0))`);
    }
    if (await records.find("nfc-card-epochs", { or: [
      { macFingerprint: { in: fingerprints } }, { metaFingerprint: { in: fingerprints } },
    ] })) return false;
    const card = existing ?? await records.create("nfc-cards", { ref: cardRef, uidFingerprint, status: "stock" });
    const epoch = await records.create("nfc-card-epochs", {
      card: card.id, profile: "aes-sun-v1", status: "active", previousEpoch: previousRetiredEpochId, metaKeyRef, macKeyRef,
      metaFingerprint: keys.metaFingerprint, macFingerprint: keys.macFingerprint,
    });
    await records.create("nfc-card-events", {
      actor, action: existing ? "activate-epoch" : "stock", card: card.id, epoch: epoch.id,
      member: relationId(card.member), reason: existing ? "rotation" : "provisioning",
    });
    return true;
  });
}

/** Auth supplies the authoritative fulfillment check; no route is wired. */
export async function changeNfcBinding(
  req: PayloadRequest, change: Change, eligible: (request: PayloadRequest, member: string) => Promise<boolean>,
): Promise<boolean> {
  const actor = issuer(req);
  const refs = targetRefs(change);
  if (!actor || !refs) return false;
  const { ref: cardRef, member, command, replacement, reason } = change;
  if (!["issue", "revoke", "replace", "retire-epoch"].includes(command)) return false;
  if ((command === "revoke" || command === "replace") && reason !== "lost" && reason !== "damaged") return false;
  return inNfcTransaction(req, async (tx) => {
    if (!await lockNfcMember(tx, member)) return false;
    await lockNfcCards(tx, refs);
    const card = await getNfcCard(req, cardRef);
    if (!card) return false;
    const records = nfcRecords(req);
    const epoch = await getActiveEpoch(req, card.id);
    if (command === "issue") {
      if (!isStock(card) || !epoch || await records.find("nfc-cards", {
        and: [{ member: { equals: member } }, { status: { equals: "active" } }],
      }) || !await eligible(req, member)) return false;
      await records.update("nfc-cards", card.id, { status: "active", member });
      await records.create("nfc-card-events", { actor, action: "issue", card: card.id, member, epoch: epoch.id, reason: "fulfillment" });
      return true;
    }
    if (card.status !== "active" || relationId(card.member) !== member) return false;
    const next = replacement ? await getNfcCard(req, replacement) : undefined;
    if (command === "replace" && (!isStock(next) || !await getActiveEpoch(req, next.id) || !await eligible(req, member))) return false;
    if (command === "retire-epoch" && !epoch) return false;
    if (epoch) await records.update("nfc-card-epochs", epoch.id, { status: "retired" });
    if (command !== "retire-epoch") await records.update("nfc-cards", card.id, { status: "retired" });
    if (next) await records.update("nfc-cards", next.id, { status: "active", member });
    await records.create("nfc-card-events", {
      actor, action: command, card: card.id, member, epoch: epoch?.id, replacement: next?.id,
      reason: command === "retire-epoch" ? "rotation" : reason!,
    });
    return true;
  });
}

function isStock(card: NfcCard | undefined): card is NfcCard {
  return Boolean(card?.status === "stock" && !card.member);
}
