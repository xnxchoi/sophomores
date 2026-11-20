import { z } from "zod";
import { isReviewEditorProfile, reviewEditorOrigin, staffAuthOrigin } from "@/lib/auth/review-editor-policy";
import { loadPaymentMode, loadPortOneConfig } from "@/lib/tickets/portone/config";

// Configuration belongs to Payload; use installed Zod validation directly, not
// a parallel environment parser or a shared utility with unrelated consumers.
// Loose so boot validation can see PortOne keys; only the declared keys are used.
export const payloadEnvironmentSchema = z.looseObject({
  DATABASE_URI: z.url({ protocol: /^postgres(?:ql)?$/ }),
  PAYLOAD_SECRET: z.string().min(32),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
}).superRefine((environment, context) => {
  // Live payments fail fast at boot when any PortOne key is missing or invalid.
  const env = environment as Record<string, string | undefined>;
  const origin = staffAuthOrigin(env);
  if (isReviewEditorProfile(origin, env)) {
    for (const key of ["NEXT_PUBLIC_SERVER_URL", "BETTER_AUTH_URL", "NEXT_PUBLIC_BETTER_AUTH_URL"]) {
      if ((key === "NEXT_PUBLIC_SERVER_URL" || env[key] !== undefined) && env[key] !== reviewEditorOrigin) {
        context.addIssue({ code: "custom", path: [key], message: "Review copy requires the exact HTTPS origin" });
      }
    }
    for (const key of ["MEMBER_AUTH_MODE", "PHONE_VERIFICATION_MODE", "PORTONE_PAYMENT_MODE"]) {
      if (env[key] !== undefined && env[key] !== "disabled") {
        context.addIssue({ code: "custom", path: [key], message: "Review copy cannot enable customer providers" });
      }
    }
  }
  try {
    if (loadPaymentMode(env) === "live") loadPortOneConfig(env);
  } catch {
    context.addIssue({ code: "custom", path: ["PORTONE_PAYMENT_MODE"], message: "PortOne live configuration is incomplete" });
  }
});
