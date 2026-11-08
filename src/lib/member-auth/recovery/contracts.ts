import { z } from "zod";

// Browser-safe raw claims. Normalization is performed by intake, not proof of ownership.
export const recoveryRequestSchema = z
  .object({
    phone: z
      .string()
      .min(1)
      .max(32)
      .regex(/^[+\d ()-]+$/),
    contactEmail: z.email().max(254)
  })
  .strict();
export const recoveryReceiptSchema = z
  .object({
    success: z.literal(true),
    data: z.object({ status: z.literal("pending_staff_review") }).strict()
  })
  .strict();
export const recoveryReviewSchema = z
  .object({
    expectedRevision: z.number().int().min(0).max(100),
    status: z.enum(["submitted", "needs_proof", "rejected", "closed"]),
    internalNote: z.string().trim().min(1).max(2000)
  })
  .strict();
export const recoveryReviewReceiptSchema = z
  .object({
    success: z.literal(true),
    data: z.object({ revision: z.number().int().min(1).max(100) }).strict()
  })
  .strict();
export type RecoveryReview = z.infer<typeof recoveryReviewSchema>;
export type RecoverySubmission = {
  id: string;
  phone: string;
  contactEmail: string;
  keys: readonly string[];
  now: Date;
  expiresAt: Date;
};
export interface RecoveryRepository {
  submit(input: RecoverySubmission): Promise<void>;
  review(
    input: RecoveryReview & { id: string; reviewerId: string; now: Date }
  ): Promise<number>;
}
export class RecoveryError extends Error {
  constructor(
    readonly code:
      | "INVALID_INPUT"
      | "RATE_LIMITED"
      | "UNAVAILABLE"
      | "CONFLICT"
      | "FORBIDDEN"
  ) {
    super(code);
  }
}
