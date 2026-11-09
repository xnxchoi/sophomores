import type { CollectionConfig } from "payload";
import { isCmsStaff } from "@/lib/auth/access";
import { type MemberPrincipal, staffField, staffWrite } from "../access";

/** Members cannot choose the bookmark owner. Staff can. */
export function assignBookmarkOwner<T extends { user?: unknown }>(
  data: T | undefined,
  user: MemberPrincipal
): T | undefined {
  if (!data || isCmsStaff(user)) return data;
  if (user?.collection !== "users" || !user.id) return data;
  return { ...data, user: user.id };
}

export const Bookmarks: CollectionConfig = {
  slug: "bookmarks",
  admin: { useAsTitle: "targetId", group: "Reading" },
  hooks: {
    beforeValidate: [({ data, req }) => assignBookmarkOwner(data, req.user)]
  },
  access: {
    read: ({ req }) => {
      if (isCmsStaff(req.user)) return true;
      if (req.user?.collection !== "users") return false;
      return { user: { equals: req.user.id } };
    },
    create: ({ req }) => isCmsStaff(req.user) || req.user?.collection === "users",
    update: ({ req }) => {
      if (isCmsStaff(req.user)) return true;
      if (req.user?.collection !== "users") return false;
      return { user: { equals: req.user.id } };
    },
    delete: ({ req }) => {
      if (isCmsStaff(req.user)) return true;
      if (req.user?.collection !== "users") return false;
      return { user: { equals: req.user.id } };
    }
  },
  fields: [
    {
      name: "user",
      type: "relationship",
      relationTo: "users",
      required: true,
      access: { create: staffField, update: staffField }
    },
    {
      name: "kind",
      type: "select",
      required: true,
      options: ["post", "track", "album", "playlist"].map((value) => ({ label: value, value }))
    },
    { name: "targetId", type: "text", required: true, index: true }
  ]
};
