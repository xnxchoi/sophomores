import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import type { MemberMailNotification } from "@/lib/member-auth/mail";

// Customer sign-in on the preview host through the registered Better Auth hooks: open in the
// sandbox runtime, refused on the review copy. src/lib/auth/options.ts reads its origin when first
// imported, so the preview origin is set before the dynamic import; the runtime itself is read per request.
const origin = "https://preview.sophomores.co";
const member = "member-fixture@example.org";
const sandbox = {
  NEXT_PUBLIC_SERVER_URL: origin, PREVIEW_RUNTIME: "sandbox", MEMBER_AUTH_MODE: "disabled",
  PORTONE_PAYMENT_MODE: "test", PORTONE_ORIGIN: origin, PORTONE_STORE_ID: "store-sandbox-fixture",
  PORTONE_CHANNEL_KEY: "channel-sandbox-fixture", PORTONE_API_SECRET: "api-secret-fixture-value",
  PORTONE_WEBHOOK_SECRET: "whsec_" + randomBytes(32).toString("base64"),
  PORTONE_SANDBOX_TEST_STORE_ID: "store-sandbox-fixture", PORTONE_SANDBOX_TEST_CHANNEL_KEY: "channel-sandbox-fixture",
};
const keys = [...Object.keys(sandbox), "REVIEW_OWNER_EMAIL", "BETTER_AUTH_URL", "NEXT_PUBLIC_BETTER_AUTH_URL"];
const savedEnv = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
for (const key of keys) delete process.env[key];
Object.assign(process.env, sandbox);

const deliveries: MemberMailNotification[] = [];
const now = new Date();
const database: Record<string, Record<string, unknown>[]> = {
  user: [{ id: "member-1", email: member, emailVerified: true, name: "Member", createdAt: now, updatedAt: now }],
  session: [], account: [], verification: [], rateLimit: [], passkey: [],
};
let auth: { handler: (request: Request) => Promise<Response> };
before(async () => {
  const { createBetterAuthPlugins, betterAuthOptions } = await import("@/lib/auth/options");
  auth = betterAuth({
    ...betterAuthOptions, secret: randomBytes(32).toString("hex"),
    database: memoryAdapter(database),
    databaseHooks: { session: betterAuthOptions.databaseHooks.session },
    rateLimit: { enabled: false },
    plugins: createBetterAuthPlugins({ appURL: origin, mailer: async (notification) => { deliveries.push(notification); } }),
  });
});
after(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
const post = (path: string, body: object) => auth.handler(new Request(origin + "/api/auth" + path, {
  method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify(body),
}));
const otp = () => post("/email-otp/send-verification-otp", { email: member, type: "sign-in" });

test("a member gets a sign-in code on the sandbox runtime and signs in; the review copy refuses the same request", async () => {
  assert.equal((await otp()).status, 200);
  const note = deliveries.at(-1);
  assert.ok(note?.type === "email-otp" && note.email === member);
  const signed = await post("/sign-in/email-otp", { email: member, otp: note.otp });
  assert.equal(signed.status, 200);
  assert.match(signed.headers.getSetCookie().join(";"), /HttpOnly/i);

  // The same host without the flag is the review copy again: customer mail and sign-in are refused.
  delete process.env.PREVIEW_RUNTIME;
  const sent = deliveries.length;
  assert.equal((await otp()).status, 403);
  assert.equal((await post("/sign-in/email-otp", { email: member, otp: "ABC123" })).status, 403);
  assert.equal(deliveries.length, sent);
  process.env.PREVIEW_RUNTIME = "sandbox";
});
