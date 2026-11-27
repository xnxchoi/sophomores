import assert from "node:assert/strict";
import test from "node:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { betterAuthOptions, createBetterAuthPlugins } from "@/lib/auth/options";
import { withEmailCodeDelivery } from "@/lib/member-auth/email-code-delivery.server";
import { normalizeMemberEmailEntryRequest } from "@/lib/member-auth/email-entry";
import { createPayloadAuthBefore } from "@/lib/member-auth/payload-policy";

test("the installed OTP route only acknowledges a sign-in code accepted by the mailer", async () => {
  const origin = "http://localhost:3456";
  const endpoint = "/email-otp/send-verification-otp";
  const path = "/api/auth" + endpoint;
  const delivered: string[] = [];
  const plugins = createBetterAuthPlugins({ appURL: origin, mailer: async ({ email }) => {
    delivered.push(email);
    if (email.startsWith("failed")) throw new Error("synthetic delivery refusal");
  } });
  const auth = betterAuth({
    baseURL: origin,
    secret: crypto.randomUUID(),
    database: memoryAdapter({ user: [], verification: [], rateLimit: [] }),
    plugins: plugins.filter(({ id }) => id === "email-otp"),
    hooks: { before: createPayloadAuthBefore(origin) },
    rateLimit: betterAuthOptions.rateLimit,
    logger: { disabled: true },
    telemetry: { enabled: false },
  });
  const ctx = await auth.$context;
  for (const email of ["accepted@example.net", "failed@example.net"]) {
    await ctx.internalAdapter.createUser({ email, name: "Fixture", emailVerified: true }, { method: "email-otp" });
  }
  const send = async (email: string, forwarded = "192.0.2.1", requestOrigin = origin) => {
    const request = new Request(origin + path, {
      method: "POST", headers: { origin: requestOrigin, "Content-Type": "application/json", "X-Forwarded-For": forwarded },
      body: JSON.stringify({ email, type: "sign-in" }),
    });
    const normalized = await normalizeMemberEmailEntryRequest(request, 5000, origin, endpoint);
    if (normalized instanceof Response) return normalized;
    assert.equal(normalized.headers.get("X-Forwarded-For"), "0.0.0.0");
    return withEmailCodeDelivery(() => auth.handler(normalized));
  };
  assert.equal((await send("unknown@example.net", undefined, "https://elsewhere.example")).status, 403);
  const [accepted, failed, unknown] = await Promise.all([
    send("accepted@example.net"), send("failed@example.net"), send("unknown@example.net"),
  ]);
  assert.equal(accepted.status, 200);
  assert.deepEqual(await accepted.json(), { success: true });
  assert.equal(failed.status, 502);
  assert.equal((await failed.json()).code, "EMAIL_CODE_DELIVERY_FAILED");
  assert.equal(unknown.status, 409);
  assert.equal((await unknown.json()).code, "EMAIL_CODE_NOT_SENT");
  assert.equal(failed.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(delivered.sort(), ["accepted@example.net", "failed@example.net"]);
});

test("verified proxy clients have independent three-send limits; unverified traffic has one bounded pool", async () => {
  const origin = "https://sophomores.co";
  const listener = "https://0.0.0.0:3000";
  const env = { TRUSTED_PROXY_LISTENER_ORIGIN: listener };
  const endpoint = "/email-otp/send-verification-otp";
  const path = "/api/auth" + endpoint;
  const auth = betterAuth({
    baseURL: origin, secret: crypto.randomUUID(), rateLimit: betterAuthOptions.rateLimit,
    database: memoryAdapter({ user: [], verification: [], rateLimit: [] }),
    hooks: { before: createPayloadAuthBefore(origin) }, telemetry: { enabled: false },
    plugins: createBetterAuthPlugins({ appURL: origin, mailer: async () => {} }).filter(({ id }) => id === "email-otp"),
    logger: { disabled: true },
  });
  const request = (url: string, realIP: string, forwarded: string) => new Request(url + path, {
    method: "POST", headers: { origin, host: new URL(origin).host, "Content-Type": "application/json",
      "X-Real-IP": realIP, "X-Forwarded-For": forwarded },
    body: JSON.stringify({ email: "unregistered@example.net", type: "sign-in" }),
  });
  const send = async (realIP: string, forwarded: string, verified = true) => {
    const normalized = await normalizeMemberEmailEntryRequest(
      request(verified ? listener : origin, realIP, forwarded), 5000, origin, endpoint, env,
    );
    assert.ok(normalized instanceof Request);
    assert.equal(normalized.headers.get("X-Forwarded-For"), verified ? realIP : "0.0.0.0");
    assert.equal(normalized.headers.has("X-Real-IP"), false);
    return (await withEmailCodeDelivery(() => auth.handler(normalized))).status;
  };
  for (let i = 0; i < 3; i++) assert.equal(await send("192.0.2.10", `198.51.100.${i + 1}`), 409);
  assert.equal(await send("192.0.2.10", "198.51.100.100"), 429);
  assert.equal(await send("192.0.2.11", "198.51.100.100"), 409);
  for (let i = 0; i < 30; i++) assert.equal(await send(`192.0.2.${i + 20}`, "198.51.100.100", false), 409);
  assert.equal(await send("192.0.2.254", "203.0.113.254", false), 429);
  assert.equal(await send("192.0.2.11", "198.51.100.100"), 409);
  const notOptedIn = await normalizeMemberEmailEntryRequest(request(listener, "192.0.2.12", "198.51.100.100"), 5000, origin, endpoint, {});
  assert.ok(notOptedIn instanceof Response);
  assert.equal(notOptedIn.status, 403);
});
