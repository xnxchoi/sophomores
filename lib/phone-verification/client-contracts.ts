import { z } from "zod";

export const challengeIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const expirySchema = z.iso.datetime({ offset: true });
const common = { id: challengeIdSchema, expiresAt: expirySchema, mode: z.literal("trial") };
export const trialChallengeSchema = z.object({
  ...common,
  recipient: z.email().max(254),
  body: z.string().min(1).max(500).refine((body) => Boolean(body.trim()) && !/[\u0000-\u001f\u007f]/.test(body))
});
export const trialStatusSchema = z.object({
  ...common,
  state: z.enum(["pending", "review", "verified", "cancelled", "expired", "consumed"])
});
export type TrialChallenge = z.infer<typeof trialChallengeSchema>;
export type TrialStatus = z.infer<typeof trialStatusSchema>;
export type TrialSnapshot = {
  challenge: TrialChallenge | null;
  status: TrialStatus | null;
  busy: boolean;
  error: "create" | "status" | "cancel" | null;
};
