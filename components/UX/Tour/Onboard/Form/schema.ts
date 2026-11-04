import { z } from "zod";
import { httpUrl } from "@/lib/api/httpUrlSchema";

// ─── Per-step schemas (used by parseValuesWithSchema in validators) ──────────

// Profile = identity + bio (merged step)
export const profileSchema = z.object({
  profile: z.object({
    bio: z
      .string()
      .max(250, { message: "Bio cannot exceed 250 characters." })
      .optional()
      .nullable(),
    firstName: z
      .string()
      .min(2, { message: "First name must be at least 2 characters." }),
    lastName: z
      .string()
      .min(2, { message: "Last name must be at least 2 characters." })
  })
});

// Details are optional — empty strings accepted, but if provided must meet criteria
export const detailsSchema = z.object({
  details: z.object({
    location: z.string().optional(),
    link: httpUrl.optional()
  })
});

// ─── Combined schema ────────────────────────────────────────────────────────

export const FormSchema = z.object({
  step: z.enum(["welcome", "profile", "details", "complete"]),
  ...profileSchema.shape,
  ...detailsSchema.shape
});
export type FormValues = z.infer<typeof FormSchema>;
