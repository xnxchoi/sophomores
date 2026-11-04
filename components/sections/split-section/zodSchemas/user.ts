import { z } from "zod/v4";

export const memberSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  slug: z.string(),
  email: z.string(),
  emailVerified: z.string().optional(),
  name: z.string(),
  image: z.string().optional(),
  role: z.enum(["admin", "user", "patron", "author", "editor"]),
  portrait: z.string().optional(),
  firstName: z.string(),
  lastName: z.string(),
  bio: z.string(),
  resume: z.string().optional(),
  favorites: z
    .array(
      z.union([
        z.object({ relationTo: z.literal("posts"), value: z.string() }),
        z.object({ relationTo: z.literal("surf"), value: z.string() })
      ])
    )
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  _status: z.enum(["draft", "published"]),
  link: z.url({ protocol: /^https?$/ }).optional(),
  location: z.string().optional(),
  protected: z.boolean().optional(),
  verified: z.boolean().optional(),
  meta: z
    .object({
      title: z.string().optional(),
      image: z.string().optional()
    })
    .optional(),
  onboarded: z.boolean().optional(),
  accounts: z
    .array(
      z.object({
        id: z.string().optional(),
        provider: z.string(),
        providerAccountId: z.string(),
        type: z.string()
      })
    )
    .optional(),
  sessions: z
    .array(
      z.object({
        id: z.string().optional(),
        sessionToken: z.string(),
        expires: z.string()
      })
    )
    .optional()
});
