import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .max(254, "Use an email of 254 characters or fewer.")
  .pipe(z.email("Enter a valid email address."));
export const nameSchema = z
  .string()
  .trim()
  .max(80, "Use 80 characters or fewer, or skip this question.");
export const registrationSchema = z.object({
  email: emailSchema,
  preferredName: nameSchema,
  consent: z
    .boolean()
    .refine((value) => value, "Confirm the preview choice before finishing.")
});

export type RegistrationValues = z.infer<typeof registrationSchema>;
export type RegistrationStep =
  "intro" | "email" | "name" | "review" | "complete";

export function initialRegistration(): RegistrationValues {
  return { email: "", preferredName: "", consent: false };
}

export function validateRegistrationStep(
  step: RegistrationStep,
  values: RegistrationValues
): string | null {
  if (step === "intro" || step === "complete") return null;
  const result =
    step === "email"
      ? emailSchema.safeParse(values.email)
      : step === "name"
        ? nameSchema.safeParse(values.preferredName)
        : registrationSchema.safeParse(values);
  return result.success ? null : result.error.issues[0].message;
}
