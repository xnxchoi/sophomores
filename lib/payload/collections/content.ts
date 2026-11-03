import type { CollectionConfig } from "payload";
import { isCmsStaff } from "@/lib/auth/access";

const staffWrite = ({ req }: { req: { user?: unknown } }) => isCmsStaff(req.user);
const staffField = ({ req }: { req: { user?: unknown } }) => isCmsStaff(req.user);

type MemberPrincipal = { id?: string; collection?: string } | null | undefined;

/** Members cannot choose the bookmark owner. Staff can. */
export function assignBookmarkOwner<T extends { user?: unknown }>(
  data: T | undefined,
  user: MemberPrincipal
): T | undefined {
  if (!data || isCmsStaff(user)) return data;
  if (user?.collection !== "users" || !user.id) return data;
  return { ...data, user: user.id };
}

/** Members cannot move a notice onto someone else's account. */
export function lockNoticeRecipient<T extends { recipient?: unknown }>(
  data: T | undefined,
  user: MemberPrincipal
): T | undefined {
  if (!data || isCmsStaff(user)) return data;
  if (user?.collection !== "users" || !user.id) return data;
  return { ...data, recipient: user.id };
}

const publishedOrStaff = ({ req }: { req: { user?: unknown } }) => {
  if (isCmsStaff(req.user)) return true;
  return { status: { equals: "published" } };
};

/**
 * Slim content collections for the Hideaway port.
 * Tags, heroes, and authors are plain values so a fixture can occupy the
 * same shape as a stored document. No locker, commerce, or polymorphic uploads.
 */
export const Tags: CollectionConfig = {
  slug: "tags",
  admin: { useAsTitle: "label", group: "Reading" },
  access: { read: () => true, create: staffWrite, update: staffWrite, delete: staffWrite },
  fields: [
    { name: "label", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true, index: true }
  ]
};

export const Categories: CollectionConfig = {
  slug: "categories",
  admin: { useAsTitle: "label", group: "Reading" },
  access: { read: () => true, create: staffWrite, update: staffWrite, delete: staffWrite },
  fields: [
    { name: "label", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true, index: true }
  ]
};

export const ContentMedia: CollectionConfig = {
  slug: "media",
  admin: { useAsTitle: "alt", group: "Reading" },
  access: { read: () => true, create: staffWrite, update: staffWrite, delete: staffWrite },
  upload: true,
  fields: [{ name: "alt", type: "text" }]
};

export const Posts: CollectionConfig = {
  slug: "posts",
  admin: { useAsTitle: "title", group: "Reading", defaultColumns: ["title", "status", "publishedAt"] },
  access: {
    read: publishedOrStaff,
    create: staffWrite,
    update: staffWrite,
    delete: staffWrite
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true, index: true },
    { name: "dek", type: "textarea" },
    { name: "body", type: "textarea" },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" }
      ]
    },
    { name: "publishedAt", type: "date" },
    { name: "heroUrl", type: "text" },
    { name: "authorName", type: "text" },
    { name: "authorImageUrl", type: "text" },
    { name: "category", type: "relationship", relationTo: "categories" },
    { name: "tags", type: "relationship", relationTo: "tags", hasMany: true }
  ]
};

export const Bookmarks: CollectionConfig = {
  slug: "bookmarks",
  admin: { useAsTitle: "targetId", group: "Reading" },
  hooks: {
    beforeValidate: [
      ({ data, req }) => assignBookmarkOwner(data, req.user)
    ]
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

export const Citations: CollectionConfig = {
  slug: "citations",
  admin: { useAsTitle: "quote", group: "Reading" },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: staffWrite,
    delete: staffWrite
  },
  fields: [
    { name: "post", type: "relationship", relationTo: "posts", required: true },
    { name: "quote", type: "textarea", required: true },
    { name: "start", type: "number", required: true },
    { name: "end", type: "number", required: true },
    { name: "note", type: "textarea" },
    { name: "authorLabel", type: "text" }
  ]
};

export const Albums: CollectionConfig = {
  slug: "albums",
  admin: { useAsTitle: "title", group: "Radio" },
  access: { read: () => true, create: staffWrite, update: staffWrite, delete: staffWrite },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "artist", type: "text" },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "coverUrl", type: "text" }
  ]
};

export const Tracks: CollectionConfig = {
  slug: "tracks",
  admin: { useAsTitle: "title", group: "Radio" },
  access: { read: () => true, create: staffWrite, update: staffWrite, delete: staffWrite },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "artist", type: "text" },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "coverUrl", type: "text" },
    { name: "audioUrl", type: "text", required: true },
    { name: "duration", type: "number" },
    { name: "album", type: "relationship", relationTo: "albums" },
    { name: "tags", type: "relationship", relationTo: "tags", hasMany: true }
  ]
};

export const Playlists: CollectionConfig = {
  slug: "playlists",
  admin: { useAsTitle: "title", group: "Radio" },
  access: { read: () => true, create: staffWrite, update: staffWrite, delete: staffWrite },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "coverUrl", type: "text" },
    { name: "tracks", type: "relationship", relationTo: "tracks", hasMany: true }
  ]
};

export const Notifications: CollectionConfig = {
  slug: "notifications",
  admin: { useAsTitle: "title", group: "Reading" },
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
    beforeValidate: [
      ({ data, req }) => lockNoticeRecipient(data, req.user)
    ]
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

export const contentCollections: CollectionConfig[] = [
  Tags,
  Categories,
  ContentMedia,
  Posts,
  Bookmarks,
  Citations,
  Albums,
  Tracks,
  Playlists,
  Notifications
];
