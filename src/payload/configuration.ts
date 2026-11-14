import { z } from "zod";
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
  try {
    if (loadPaymentMode(env) === "live") loadPortOneConfig(env);
  } catch {
    context.addIssue({ code: "custom", path: ["PORTONE_PAYMENT_MODE"], message: "PortOne live configuration is incomplete" });
  }
});
