import english from "../../../../messages/en.json";
import type { CollectionConfig } from "payload";
import { isCmsStaff } from "@/lib/auth/access";
import { type MemberPrincipal, staffField, staffWrite } from "../access";

/** Members cannot move a notification onto someone else's account. */
export function lockNotificationRecipient<T extends { recipient?: unknown }>(
  data: T | undefined,
  user: MemberPrincipal
): T | undefined {
  if (!data || isCmsStaff(user)) return data;
  if (user?.collection !== "users" || !user.id) return data;
  return { ...data, recipient: user.id };
}

export const Notifications: CollectionConfig = {
  slug: "notifications",
  admin: { useAsTitle: "title", group: english.Staff.schema.reading },
  access: {
    read: ({ req }) => {
      if (isCmsStaff(req.user)) return true;
      if (req.user?.collection !== "users") return false;
      return { recipient: { equals: req.user.id } };
    },
    create: staffWrite,
    update: ({ req }) => {
      if (isCmsStaff(req.user)) return true;
      if (req.user?.collection !== "users") return false;
      return { recipient: { equals: req.user.id } };
    },
    delete: ({ req }) => {
      if (isCmsStaff(req.user)) return true;
      if (req.user?.collection !== "users") return false;
      return { recipient: { equals: req.user.id } };
    }
  },
  hooks: {
    beforeValidate: [({ data, req }) => lockNotificationRecipient(data, req.user)]
  },
  fields: [
    {
      name: "recipient",
      type: "relationship",
      relationTo: "users",
      required: true,
      access: { create: staffField, update: staffField }
    },
    { name: "title", type: "text", required: true },
    { name: "body", type: "textarea" },
    { name: "href", type: "text" },
    { name: "imageUrl", type: "text" },
    { name: "read", type: "checkbox", defaultValue: false }
  ]
};
