import type { CollectionConfig } from "payload";
import { commerceDeny, commerceOperator, numberField } from "@/lib/commerce/_shared/collection";
import { isCmsSuperAdmin, serverOwnedField } from "@/lib/auth/access";
import { lockCommerce, type CommerceDocument } from "@/lib/commerce/_shared/transaction";

export const CommerceEvents: CollectionConfig = {
  slug: "commerce-events",
  admin: { group: "Commerce operations", useAsTitle: "name" },
  access: { admin: ({ req }) => isCmsSuperAdmin(req.user), read: commerceOperator, create: commerceOperator, update: commerceOperator, delete: commerceDeny },
  hooks: { beforeValidate: [async ({ data, originalDoc, req }) => {
    if (originalDoc?.id) await lockCommerce(req, [`event:${originalDoc.id}`]);
    const current = originalDoc?.id ? await req.payload.db.findOne<CommerceDocument>({ collection: "commerce-events" as never, where: { id: { equals: String(originalDoc.id) } }, req }) : originalDoc;
    if (originalDoc?.id && !current) throw new Error("Canonical event is missing");
    // Payload may normalize missing fields from a pre-lock originalDoc. Never
    // let an ordinary CMS save overwrite the post-lock operational counters.
    const next = current ? { ...data, reservedQuantity: current.reservedQuantity, committedQuantity: current.committedQuantity } : data;
    const event = { ...current, ...next };
    const obligated = Number(event.committedQuantity ?? 0) + Number(event.reservedQuantity ?? 0);
    if (!Number.isSafeInteger(obligated) || obligated < 0 || Number(event.capacity) < obligated || Number(event.transportCapacity) < obligated) throw new Error("Event and shared transport capacity cannot strand paid or reserved admissions");
    if (event.publicationApproved) {
      const starts = new Date(event.partIStartsAt).getTime();
      const ends = new Date(event.partIEndsAt).getTime();
      const cutoff = new Date(event.claimCutoffAt).getTime();
      if (!Number.isFinite(starts) || !Number.isFinite(ends) || starts >= ends || !Number.isFinite(cutoff)) throw new Error("Owner-provided event times and claim cutoff are required; Part I must end after it starts");
      if (!Number.isSafeInteger(event.capacity) || event.capacity < 1 || !Number.isSafeInteger(event.transportCapacity) || event.transportCapacity < event.capacity) throw new Error("Guaranteed shared transport must cover every eligible admission before publication");
    }
    return next;
  }], beforeChange: [async ({ data, originalDoc, operation, req }) => {
    if (operation === "create") return { ...data, reservedQuantity: 0, committedQuantity: 0 };
    await lockCommerce(req, [`event:${originalDoc.id}`]);
    const current = await req.payload.db.findOne<CommerceDocument>({ collection: "commerce-events" as never, where: { id: { equals: String(originalDoc.id) } }, req });
    if (!current) throw new Error("Canonical event is missing");
    return { ...data, reservedQuantity: current.reservedQuantity, committedQuantity: current.committedQuantity };
  }] },
  fields: [
    { name: "guestManifest", type: "ui", admin: { components: { Field: "@/lib/payload/admin/commerce/fields#EventManifestField" } } },
    { name: "name", type: "text", required: true },
    { name: "publicationApproved", type: "checkbox", defaultValue: false },
    { name: "capacity", type: "number", min: 1, required: true },
    { name: "transportCapacity", type: "number", min: 1, required: true },
    { name: "partIStartsAt", type: "date", required: true },
    { name: "partIEndsAt", type: "date", required: true },
    { name: "claimCutoffAt", type: "date", required: true },
    { ...numberField("reservedQuantity"), access: { create: serverOwnedField, update: serverOwnedField } },
    { ...numberField("committedQuantity"), access: { create: serverOwnedField, update: serverOwnedField } },
  ],
};
