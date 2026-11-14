import english from "../../../../messages/en.json";
import { ledgerCollection, relation } from "@/lib/commerce/_shared/collection";

export const CommerceReservations = ledgerCollection("commerce-reservations", [
  { name: "attemptID", type: "text", required: true, unique: true },
  relation("customer", "users"), relation("product", "products"), relation("event", "commerce-events"),
  { name: "releaseID", type: "text", required: true },
  { name: "quantity", type: "number", required: true, min: 1, max: 3 },
  { name: "snapshotHash", type: "text", required: true, minLength: 64, maxLength: 64 },
  { name: "state", type: "select", required: true, options: [{ label: english.Staff.schema.reserved, value: "reserved" }, { label: english.Staff.schema.settled, value: "settled" }, { label: english.Staff.schema.released, value: "released" }] },
  { name: "order", type: "relationship", relationTo: "orders" },
  { name: "releaseReason", type: "select", options: [{ label: english.Staff.schema.confirmedCancel, value: "confirmed-cancel" }, { label: english.Staff.schema.acceptedReturn, value: "accepted-return" }, { label: english.Staff.schema.verifiedFailure, value: "verified-failure" }] },
  { name: "providerEventID", type: "text" },
  { name: "returnedUnits", type: "json", defaultValue: [] },
]);
