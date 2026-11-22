import { APIError, type CollectionConfig, type CollectionBeforeChangeHook } from "payload";

const deny = () => false;
const writable = new WeakSet<object>();

// Only the server service can grant a one-operation write scope on its owned req.
export async function writeNfcDocument<T>(req: object, write: () => Promise<T>): Promise<T> {
  if (writable.has(req)) throw new Error("Overlapping NFC document write");
  writable.add(req);
  try {
    return await write();
  } finally {
    writable.delete(req);
  }
}

const requireWrite: CollectionBeforeChangeHook = ({ req, data }) => {
  if (!writable.has(req) || !req.transactionID) throw new APIError("NFC write denied", 403);
  return data;
};
const noDelete = () => { throw new APIError("NFC records cannot be deleted", 403); };
const appendOnly: CollectionBeforeChangeHook = (args) => {
  if (args.operation !== "create") throw new APIError("NFC audit is append-only", 403);
  return requireWrite(args);
};

const restricted = {
  access: { read: deny, create: deny, update: deny, delete: deny },
  admin: { hidden: true },
  lockDocuments: false,
  graphQL: false,
  hooks: { beforeChange: [requireWrite], beforeDelete: [noDelete] },
} satisfies Partial<CollectionConfig>;

export const nfcCollections: CollectionConfig[] = [
  {
    ...restricted,
    slug: "nfc-cards",
    fields: [
      { name: "ref", type: "text", required: true, unique: true },
      { name: "uidFingerprint", type: "text", required: true, unique: true },
      { name: "member", type: "relationship", relationTo: "users", index: true },
      { name: "status", type: "select", options: ["stock", "active", "retired"], required: true },
    ],
  },
  {
    ...restricted,
    slug: "nfc-card-epochs",
    fields: [
      { name: "card", type: "relationship", relationTo: "nfc-cards", required: true, index: true },
      { name: "status", type: "select", options: ["active", "retired"], required: true },
      { name: "previousEpoch", type: "relationship", relationTo: "nfc-card-epochs", unique: true },
      { name: "profile", type: "select", options: ["aes-sun-v1"], required: true },
      { name: "metaKeyRef", type: "text", required: true },
      { name: "macKeyRef", type: "text", required: true },
      { name: "macFingerprint", type: "text", required: true, unique: true },
      { name: "metaFingerprint", type: "text", required: true },
      { name: "lastReadCounter", type: "number", min: 1, max: 0xff_ffff },
    ],
  },
  {
    ...restricted,
    slug: "nfc-member-welcome",
    fields: [
      { name: "member", type: "relationship", relationTo: "users", required: true, unique: true },
    ],
  },
  {
    ...restricted,
    slug: "nfc-card-events",
    hooks: { beforeChange: [appendOnly], beforeDelete: [noDelete] },
    fields: [
      { name: "action", type: "select", options: ["stock", "issue", "revoke", "replace", "retire-epoch", "activate-epoch"], required: true },
      { name: "actor", type: "relationship", relationTo: "admins", required: true },
      { name: "card", type: "relationship", relationTo: "nfc-cards", required: true },
      { name: "replacement", type: "relationship", relationTo: "nfc-cards" },
      { name: "epoch", type: "relationship", relationTo: "nfc-card-epochs" },
      { name: "member", type: "relationship", relationTo: "users" },
      { name: "reason", type: "select", options: ["provisioning", "fulfillment", "lost", "damaged", "rotation"], required: true },
    ],
  },
];
