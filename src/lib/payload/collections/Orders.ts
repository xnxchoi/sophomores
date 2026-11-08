import type { CollectionConfig } from "payload";
import { v7 as uuidv7 } from "uuid";
import { orderAccess, serverOwnedField } from "@/lib/auth/access";

export const Orders: CollectionConfig = {
  slug: "orders",
  access: orderAccess,
  admin: {
    useAsTitle: "id",
    group: "E-Commerce & Ticketing",
    description: "Ticket purchases, event reservations, and payment receipts."
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
          "Registered guest or member placing the ticket reservation."
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
        description: "Number of tickets (1–6)."
      }
    },
    {
      name: "totalAmount",
      access: { create: serverOwnedField, update: serverOwnedField },
      type: "number",
      required: true,
      admin: {
        description:
          "Total in integer minor units (e.g. 50000 for ₩50,000 KRW, or 5000 for $50.00 USD)."
      }
    },
    {
      name: "currency",
      access: { create: serverOwnedField, update: serverOwnedField },
      type: "select",
      defaultValue: "KRW",
      options: [
        { label: "KRW (₩)", value: "KRW" },
        { label: "USD ($)", value: "USD" }
      ],
      required: true
    },
    {
      name: "status",
      access: { create: serverOwnedField, update: serverOwnedField },
      type: "select",
      defaultValue: "pending",
      options: [
        { label: "Pending Payment", value: "pending" },
        { label: "Paid & Confirmed", value: "paid" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Refunded", value: "refunded" },
        { label: "Held for Payment Review", value: "held" }
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
          label: "PortOne / Toss Payments (KRW, KakaoPay, NaverPay)",
          value: "portone"
        },
        { label: "Stripe (International Credit Cards)", value: "stripe" },
        { label: "Complimentary / Staff Guest List", value: "complimentary" }
      ],
      required: true
    },
    {
      name: "paymentReference",
      access: { create: serverOwnedField, update: serverOwnedField },
      type: "text",
      admin: {
        description:
          "Transaction ID, payment gateway receipt number, or approval token."
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
        description: "Server-owned hash identifying one payment preparation attempt."
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
        description: "Server-owned hash binding an attempt to its owner and charge snapshot."
      }
    }
  ]
};
