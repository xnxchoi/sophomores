import { z } from "zod";

// Configuration belongs to Payload; use installed Zod validation directly, not
// a parallel environment parser or a shared utility with unrelated consumers.
export const payloadEnvironmentSchema = z.object({
  DATABASE_URI: z.url({ protocol: /^postgres(?:ql)?$/ }),
  PAYLOAD_SECRET: z.string().min(32),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
});
