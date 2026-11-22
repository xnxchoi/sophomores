import { APIError, type CollectionConfig } from "payload";
import { commerceServerWrite } from "@/lib/commerce/access";
import { requirePaymentTransaction } from "@/lib/commerce/_shared/transaction";
import { ledgerCollection } from "@/lib/commerce/_shared/collection";

const deny = () => false;

export const MemberWalletCatchUp: CollectionConfig = {
  ...ledgerCollection("member-wallet-catch-up", [
    { name: "workKey", type: "text", required: true, unique: true },
    { name: "configuration", type: "text", required: true },
    { name: "horizon", type: "date", required: true },
    { name: "cursorCreatedAt", type: "date" },
    { name: "cursorID", type: "text" },
    { name: "cycleComplete", type: "checkbox", required: true, defaultValue: false },
    { name: "lastInspected", type: "number", required: true, min: 0 },
    { name: "lastMoved", type: "number", required: true, min: 0 },
    { name: "lastConflicts", type: "number", required: true, min: 0 },
    { name: "lastCompletedAt", type: "date" },
  ]),
  admin: { hidden: true },
  lockDocuments: false,
  access: { admin: deny, read: deny, create: deny, update: deny, delete: deny },
  hooks: {
    beforeChange: [async ({ data, originalDoc, operation, req }) => {
      if (!commerceServerWrite(req)) throw new APIError("Wallet catch-up is server owned", 403);
      await requirePaymentTransaction(req);
      if (operation !== "create" && "workKey" in data && data.workKey !== originalDoc.workKey) {
        throw new APIError("Wallet catch-up identity is immutable", 409);
      }
      return data;
    }],
    beforeDelete: [() => { throw new APIError("Wallet catch-up progress cannot be removed", 409); }],
  },
};
