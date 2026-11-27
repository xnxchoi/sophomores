import { z } from "zod";
import { parseStaffExtraEmails } from "@/lib/auth/staff-email";
import { isReviewEditorProfile, reviewEditorOrigin, staffAuthOrigin } from "@/lib/auth/review-editor-policy";
import { isPinnedSandboxChannel, loadPaymentMode, loadPortOneConfig } from "@/lib/tickets/portone/config";

// Configuration belongs to Payload; use installed Zod validation directly, not
// a parallel environment parser or a shared utility with unrelated consumers.
// Loose so boot validation can see PortOne keys; only the declared keys are used.
export const payloadEnvironmentSchema = z.looseObject({
  DATABASE_URI: z.url({ protocol: /^postgres(?:ql)?$/ }),
  PAYLOAD_SECRET: z.string().min(32),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
}).superRefine((environment, context) => {
  if (!parseStaffExtraEmails(environment.STAFF_EXTRA_EMAILS)) {
    context.addIssue({ code: "custom", path: ["STAFF_EXTRA_EMAILS"], message: "Staff email list must contain only exact email addresses." });
  }
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
  // The sandbox runtime (preview host, real customer flows) fails closed: the exact value, no review
  // owner and a complete PortOne test configuration, never live payments.
  if (env.PREVIEW_RUNTIME !== undefined) {
    if (env.PREVIEW_RUNTIME !== "sandbox") {
      context.addIssue({ code: "custom", path: ["PREVIEW_RUNTIME"], message: "PREVIEW_RUNTIME accepts only sandbox" });
    } else {
      if (env.REVIEW_OWNER_EMAIL !== undefined) {
        context.addIssue({ code: "custom", path: ["REVIEW_OWNER_EMAIL"], message: "The sandbox runtime cannot have a review owner" });
      }
      // Admin access on the preview host comes from a separately approved grant, never the bootstrap address.
      if (env.PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL !== undefined) {
        context.addIssue({ code: "custom", path: ["PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL"], message: "The sandbox runtime never bootstraps a super admin" });
      }
      let testMode = false;
      try {
        testMode = loadPaymentMode(env) === "test" && loadPortOneConfig(env) !== null;
      } catch { /* reported below */ }
      if (!testMode) {
        context.addIssue({ code: "custom", path: ["PORTONE_PAYMENT_MODE"], message: "The sandbox runtime requires a complete PortOne test configuration" });
      }
      if (!isPinnedSandboxChannel({ storeId: env.PORTONE_STORE_ID, channelKey: env.PORTONE_CHANNEL_KEY }, env)) {
        context.addIssue({ code: "custom", path: ["PORTONE_SANDBOX_TEST_CHANNEL_KEY"],
          message: "The sandbox runtime requires the store and channel to equal the pinned TEST store and channel" });
      }
    }
  }
  try {
    if (loadPaymentMode(env) === "live") loadPortOneConfig(env);
  } catch {
    context.addIssue({ code: "custom", path: ["PORTONE_PAYMENT_MODE"], message: "PortOne live configuration is incomplete" });
  }
});
