import type { CollectionConfig } from "payload";
import { v7 as uuidv7 } from "uuid";

export const Orders: CollectionConfig = {
  slug: "orders",
  admin: {
    useAsTitle: "id",
    group: "E-Commerce & Ticketing",
    description: "Ticket purchases, event reservations, and payment receipts.",
  },
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === "create" && data && !data.id) {
          data.id = uuidv7();
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: "user",
      type: "relationship",
      relationTo: "users",
      required: true,
      admin: {
        description: "Registered guest or member placing the ticket reservation.",
      },
    },
    {
      name: "ticketQuantity",
      type: "number",
      min: 1,
      max: 6,
      defaultValue: 1,
      required: true,
      admin: {
        description: "Number of tickets (1–6).",
      },
    },
    {
      name: "totalAmount",
      type: "number",
      required: true,
      admin: {
        description: "Total in integer minor units (e.g. 50000 for ₩50,000 KRW, or 5000 for $50.00 USD).",
      },
    },
    {
      name: "currency",
      type: "select",
      defaultValue: "KRW",
      options: [
        { label: "KRW (₩)", value: "KRW" },
        { label: "USD ($)", value: "USD" },
      ],
      required: true,
    },
    {
      name: "status",
      type: "select",
      defaultValue: "pending",
      options: [
        { label: "Pending Payment", value: "pending" },
        { label: "Paid & Confirmed", value: "paid" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Refunded", value: "refunded" },
      ],
      required: true,
    },
    {
      name: "paymentProvider",
      type: "select",
      defaultValue: "portone",
      options: [
        { label: "PortOne / Toss Payments (KRW, KakaoPay, NaverPay)", value: "portone" },
        { label: "Stripe (International Credit Cards)", value: "stripe" },
        { label: "Complimentary / Staff Guest List", value: "complimentary" },
      ],
      required: true,
    },
    {
      name: "paymentReference",
      type: "text",
      admin: {
        description: "Transaction ID, payment gateway receipt number, or approval token.",
      },
    },
  ],
};
