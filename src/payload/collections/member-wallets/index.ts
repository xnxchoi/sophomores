import { APIError, type CollectionConfig } from "payload";

export const MEMBER_WALLETS_SLUG = "member-wallets";

export const MemberWallets: CollectionConfig = {
  slug: MEMBER_WALLETS_SLUG,
  lockDocuments: false,
  admin: { hidden: true },
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    // Keep issued-key custody history if the member relationship is removed.
    { name: "member", type: "relationship", relationTo: "users", index: true },
    { name: "chainID", type: "number", required: true, min: 1 },
    { name: "status", type: "select", required: true, options: ["active"], index: true },
    { name: "activeSlot", type: "text", required: true, unique: true },
    { name: "walletKey", type: "text", required: true, unique: true },
    { name: "safeAddress", type: "text", required: true },
    { name: "ownerAddress", type: "text", required: true },
    { name: "threshold", type: "number", required: true, min: 1 },
    { name: "saltNonce", type: "text", required: true },
    { name: "safeVersion", type: "text", required: true },
    { name: "proxyFactoryAddress", type: "text", required: true },
    { name: "singletonAddress", type: "text", required: true },
    { name: "fallbackHandlerAddress", type: "text", required: true },
    { name: "configHash", type: "text", required: true },
    { name: "boundAt", type: "date", required: true },
  ],
  hooks: {
    // Keep server overrideAccess writes closed until the reviewed payment owner exists.
    beforeChange: [() => { throw new APIError("Wallet writes are not enabled", 403); }],
    beforeDelete: [() => { throw new APIError("Wallet records cannot be removed", 403); }],
  },
};
