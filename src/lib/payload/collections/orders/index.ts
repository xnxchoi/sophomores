import english from "../../../../../messages/en.json";
import type { CollectionConfig } from "payload";
import { v7 as uuidv7 } from "uuid";
import { orderAccess, serverOwnedField } from "@/lib/auth/access";

export const Orders: CollectionConfig = {
  slug: "orders",
  access: orderAccess,
  admin: {
    useAsTitle: "id",
    group: english.Staff.schema.eCommerceTicketing,
    description: english.Staff.schema.ticketPurchasesEventReservationsAndPaymentReceipts
  },
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === "create" && data && !data.id) {
          return { ...data, id: uuidv7() };
        }
        return data;
      }
    ]
  },
  fields: [
    {
      name: "user",
      access: { create: serverOwnedField, update: serverOwnedField },
      type: "relationship",
      relationTo: "users",
      required: true,
      admin: {
        description:
          english.Staff.schema.registeredGuestOrMemberPlacingTheTicketReservation
      }
    },
    {
      name: "ticketQuantity",
      access: { create: serverOwnedField, update: serverOwnedField },
      type: "number",
      min: 1,
      max: 6,
      defaultValue: 1,
      required: true,
      admin: {
        description: english.Staff.schema.numberOfTickets16
      }
    },
    {
      name: "totalAmount",
      access: { create: serverOwnedField, update: serverOwnedField },
      type: "number",
      required: true,
      admin: {
        description:
          english.Staff.schema.totalInIntegerMinorUnitsEG50000
      }
    },
    {
      name: "currency",
      access: { create: serverOwnedField, update: serverOwnedField },
      type: "select",
      defaultValue: "KRW",
      options: [
        { label: english.Staff.schema.kRW, value: "KRW" },
        { label: english.Staff.schema.uSD, value: "USD" }
      ],
      required: true
    },
    {
      name: "status",
      access: { create: serverOwnedField, update: serverOwnedField },
      type: "select",
      defaultValue: "pending",
      options: [
        { label: english.Staff.schema.pendingPayment, value: "pending" },
        { label: english.Staff.schema.paidConfirmed, value: "paid" },
        { label: english.Staff.schema.cancelled, value: "cancelled" },
        { label: english.Staff.schema.refunded, value: "refunded" },
        { label: english.Staff.schema.heldForPaymentReview, value: "held" }
      ],
      required: true
    },
    {
      name: "paymentProvider",
      access: { create: serverOwnedField, update: serverOwnedField },
      type: "select",
      defaultValue: "portone",
      options: [
        {
          label: english.Staff.schema.portOneTossPaymentsKRWKakaoPayNaverPay,
          value: "portone"
        },
        { label: english.Staff.schema.stripeInternationalCreditCards, value: "stripe" },
        { label: english.Staff.schema.complimentaryStaffGuestList, value: "complimentary" }
      ],
      required: true
    },
    {
      name: "paymentReference",
      access: { create: serverOwnedField, update: serverOwnedField },
      type: "text",
      admin: {
        description:
          english.Staff.schema.transactionIDPaymentGatewayReceiptNumberOrApproval
      }
    },
    {
      name: "prepareKey",
      access: { create: serverOwnedField, update: serverOwnedField },
      type: "text",
      unique: true,
      minLength: 64,
      maxLength: 64,
      admin: {
        readOnly: true,
        description: english.Staff.schema.serverOwnedHashIdentifyingOnePaymentPreparationAttempt
      }
    },
    {
      name: "prepareFingerprint",
      access: { create: serverOwnedField, update: serverOwnedField },
      type: "text",
      minLength: 64,
      maxLength: 64,
      admin: {
        readOnly: true,
        description: english.Staff.schema.serverOwnedHashBindingAnAttemptToIts
      }
    }
  ]
};
