import english from "../../../../messages/en.json";
import type { CollectionConfig } from "payload";
import { commerceDeny, commerceOperator, numberField } from "@/lib/commerce/_shared/collection";
import { isCmsSuperAdmin, serverOwnedField } from "@/lib/auth/access";
import { lockCommerce, type CommerceDocument } from "@/lib/commerce/_shared/transaction";
import { unlockEventTicketConfiguration } from "@/lib/commerce/event-tickets";

export const CommerceEvents: CollectionConfig = {
  slug: "commerce-events",
  admin: { group: english.Staff.schema.commerceOperations, useAsTitle: "name" },
  access: { admin: ({ req }) => isCmsSuperAdmin(req.user), read: commerceOperator, create: commerceOperator, update: commerceOperator, delete: commerceDeny },
  hooks: { beforeValidate: [async ({ data, originalDoc, req }) => {
    if (originalDoc?.id) await lockCommerce(req, [`event:${originalDoc.id}`]);
    const current = originalDoc?.id ? await req.payload.db.findOne<CommerceDocument>({ collection: "commerce-events" as never, where: { id: { equals: String(originalDoc.id) } }, req }) : originalDoc;
    if (originalDoc?.id && !current) throw new Error("Canonical event is missing");
    // Payload may normalize missing fields from a pre-lock originalDoc. Never
    // let an ordinary CMS save overwrite the post-lock operational counters.
    const next = current ? { ...data, reservedQuantity: current.reservedQuantity, committedQuantity: current.committedQuantity } : data;
    const event = { ...current, ...next };
    if (current?.checkInAuthority === "unlock-events" && event.checkInAuthority !== "unlock-events") throw new Error("Unlock EVENTS authority cannot be removed");
    if (event.checkInAuthority != null && event.checkInAuthority !== "unlock-events") throw new Error("Unknown event entry authority");
    if (event.checkInAuthority === "unlock-events") {
      const config = unlockEventTicketConfiguration.parse(event.unlockTicketConfiguration);
      if (config.guestLock && config.guestLock === process.env.MEMBER_WALLET_LOCK_ADDRESS?.trim().toLowerCase()) {
        throw new Error("Guest lock must differ from Signet");
      }
      if (current?.checkInAuthority === "unlock-events") {
        const before = unlockEventTicketConfiguration.parse(current.unlockTicketConfiguration);
        const { guestProductID: previousOffer, guestLock: previousGuestLock, ...previousTarget } = before;
        const { guestProductID: nextOffer, guestLock: nextGuestLock, ...nextTarget } = config;
        // Adding a Guest lock preserves the original sale target. Once set, both locks stay pinned.
        const firstSharedGuestLock = "mode" in before && "mode" in config &&
          previousGuestLock === undefined && nextGuestLock !== undefined;
        const guestLockPreserved = previousGuestLock === nextGuestLock || firstSharedGuestLock;
        if (!guestLockPreserved || JSON.stringify(previousTarget) !== JSON.stringify(nextTarget) || (previousOffer && previousOffer !== nextOffer)) {
          throw new Error("Configured event ticket targets are immutable");
        }
      }
    } else if (event.unlockTicketConfiguration != null) throw new Error("Unlock ticket configuration requires Unlock EVENTS authority");
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
    { name: "guestManifest", type: "ui", admin: { components: { Field: "@/payload/admin/commerce/fields#EventManifestField" } } },
    { name: "name", type: "text", required: true },
    { name: "checkInAuthority", type: "text" },
    { name: "unlockTicketConfiguration", type: "json" },
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
