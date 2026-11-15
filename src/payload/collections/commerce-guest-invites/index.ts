import english from "../../../../messages/en.json";
import { APIError, type CollectionConfig } from "payload";
import { ledgerCollection, relation } from "@/lib/commerce/_shared/collection";
import { commerceServerWrite } from "@/lib/commerce/access";
import { guestInviteTransitions, type GuestInviteState } from "@/lib/commerce/guest-invites";
import { relationshipID } from "@/lib/commerce/_shared/transaction";

const identityFields = ["inviter", "event", "product", "payer", "guestName", "guestEmail", "holdExpiresAt"] as const;
const identityValue = (value: unknown): string | null => value === null || value === undefined ? null
  : value instanceof Date ? value.toISOString() : typeof value === "object" ? relationshipID(value) : String(value);
// Dates may arrive as Date objects or differently formatted ISO strings.
const sameIdentity = (field: string, next: unknown, previous: unknown) => field === "holdExpiresAt"
  ? new Date(String(identityValue(next))).getTime() === new Date(String(identityValue(previous))).getTime()
  : identityValue(next) === identityValue(previous);

/** A member's paid guest invite (ADR-0002). Server owned; one row per invite sent. */
export const CommerceGuestInvites: CollectionConfig = {
  ...ledgerCollection("commerce-guest-invites", [
    relation("inviter", "users"), relation("event", "commerce-events"), relation("product", "products"),
    // "guest" is reserved for the invitee-pays slice, so its rows need no migration.
    { name: "payer", type: "select", required: true, defaultValue: "member", options: [
      { label: english.Staff.schema.member, value: "member" }, { label: english.Staff.schema.guest, value: "guest" }] },
    { name: "guestName", type: "text", required: true, maxLength: 100 },
    { name: "guestEmail", type: "email", required: true },
    { name: "state", type: "select", required: true, index: true, defaultValue: "pending_payment", options: [
      { label: english.Staff.schema.pendingPayment, value: "pending_payment" }, { label: english.Staff.schema.paid, value: "paid" },
      { label: english.Staff.schema.lapsed, value: "lapsed" }, { label: english.Staff.schema.used, value: "used" },
      { label: english.Staff.schema.refunded, value: "refunded" }] },
    // Set while the invite is pending, paid or used: one open invite per member per product.
    { name: "activeKey", type: "text", unique: true },
    { name: "holdExpiresAt", type: "date", required: true, index: true },
    { name: "holdReleasedAt", type: "date" },
    { name: "order", type: "relationship", relationTo: "orders", index: true },
    { name: "transaction", type: "relationship", relationTo: "transactions" },
    { name: "admission", type: "relationship", relationTo: "commerce-admissions", unique: true },
    { name: "paidAt", type: "date" }, { name: "lapsedAt", type: "date" },
    { name: "usedAt", type: "date" }, { name: "refundedAt", type: "date" },
    // "Member to notify" marker. No email is sent in this slice.
    { name: "memberNotice", type: "select", index: true, options: [{ label: english.Staff.schema.lapsed, value: "lapsed" }] },
    { name: "memberNotifiedAt", type: "date" },
  ]),
  hooks: {
    beforeChange: [({ data, originalDoc, operation, req }) => {
      if (!commerceServerWrite(req)) throw new APIError("Guest invites are server owned", 403);
      if (operation === "create") {
        if ((data.payer ?? "member") !== "member") throw new APIError("Only the member pays in this release", 400);
        if ((data.state ?? "pending_payment") !== "pending_payment") throw new APIError("Guest invites start pending payment", 400);
        return { ...data, payer: "member", state: "pending_payment" };
      }
      for (const field of identityFields) {
        if (field in data && !sameIdentity(field, data[field], originalDoc[field])) throw new APIError("Guest invite identity is immutable", 409);
      }
      const from = originalDoc.state as GuestInviteState;
      const to = (data.state ?? from) as GuestInviteState;
      if (to !== from && !guestInviteTransitions[from]?.includes(to)) throw new APIError(`Guest invite cannot move from ${from} to ${to}`, 409);
      return data;
    }],
  },
};
