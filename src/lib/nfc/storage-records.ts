import type { PayloadRequest } from "payload";
import { writeNfcDocument } from "@/payload/collections/nfc";
import type { NfcCard, NfcCardEpoch, NfcCardEvent, NfcMemberWelcome } from "@/payload-types";

type Records = {
  "nfc-cards": NfcCard;
  "nfc-card-epochs": NfcCardEpoch;
  "nfc-card-events": NfcCardEvent;
  "nfc-member-welcome": NfcMemberWelcome;
};
type Slug = keyof Records;
type NewRecord<K extends Slug> = Omit<Records[K], "id" | "createdAt" | "updatedAt">;
export const relationId = (value: string | { id: string } | null | undefined): string | undefined =>
  typeof value === "string" ? value : value?.id;

export function nfcRecords(req: PayloadRequest) {
  const scope = { req, overrideAccess: true, depth: 0 };
  return {
    async find<K extends Slug>(collection: K, where: import("payload").Where): Promise<Records[K] | undefined> {
      const result = await req.payload.find({ collection, where, limit: 1, ...scope });
      return result.docs[0] as Records[K] | undefined;
    },
    create<K extends Slug>(collection: K, data: NewRecord<K>): Promise<Records[K]> {
      return writeNfcDocument(req, () => req.payload.create({ collection, data: data as never, ...scope })) as Promise<Records[K]>;
    },
    update<K extends Slug>(collection: K, id: string, data: Partial<NewRecord<K>>): Promise<Records[K]> {
      return writeNfcDocument(req, () => req.payload.update({ collection, id, data: data as never, ...scope })) as Promise<Records[K]>;
    },
  };
}

export function getNfcCard(req: PayloadRequest, ref: string) {
  return nfcRecords(req).find("nfc-cards", { ref: { equals: ref } });
}

export function getActiveEpoch(req: PayloadRequest, card: string) {
  return nfcRecords(req).find("nfc-card-epochs", {
    and: [{ card: { equals: card } }, { status: { equals: "active" } }],
  });
}
