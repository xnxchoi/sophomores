import { isIP } from "node:net";
import { normalizeIP } from "@better-auth/core/utils/ip";
import { APIError, createAuthEndpoint } from "better-auth/api";
import type { BetterAuthPlugin } from "better-auth";
import { z } from "zod";
import { hasConfiguredRequestAuthority, trustedProxyListener } from "../phone-verification/server/local-request";
import { normalizeLoginEmail } from "../passwordless-login";
import { memberJson, memberRequestFailure, readMemberBody } from "./http";
import { MEMBER_EMAIL_ENTRY_PATH } from "./paths";
import { hitWindow, windowTable } from "@/utils/server/fixed-window";

export const MEMBER_EMAIL_CODE_SEND_PATH = "/email-otp/send-verification-otp";
const unverifiedClient = "0.0.0.0";

// Without verified ingress, reserve bounded shared capacity rather than three
// sends for the whole site. A deploy can enable per-client limits only after
// the listener is isolated and the proxy overwrites X-Real-IP.
export const memberEmailCodeRateLimit = (request: Request) => ({
  window: 60,
  max: request.headers.get("x-forwarded-for") === unverifiedClient ? 30 : 3,
});

// Payload's SDK adapter does not atomically consume concurrent increments.
// Bound admission in this process as well; the SDK still tracks across requests.
export function limitNormalizedEmailCodeSend(request: Request): Response | null {
  const now = Date.now();
  const client = request.headers.get("x-forwarded-for") ?? unverifiedClient;
  const options = { now, windowMs: 60_000, maxKeys: 1024 };
  const capacity = client === unverifiedClient ? null :
    hitWindow(windowTable("email-code-verified-capacity"), "verified", { ...options, max: 180 });
  const retryAfter = capacity ?? hitWindow(windowTable("email-code-client"), normalizeIP(client), {
    ...options, max: memberEmailCodeRateLimit(request).max,
  });
  if (retryAfter === null) return null;
  const response = memberJson(429, { code: "RATE_LIMITED", message: "Too many requests. Try again shortly." });
  response.headers.set("Retry-After", String(retryAfter));
  return response;
}

/** Explicitly approved existence disclosure, never proof or account authority. */
export function memberEmailEntry(origin: string) {
  return {
    id: "member-email-entry",
    rateLimit: [{ pathMatcher: (path: string) => path === MEMBER_EMAIL_ENTRY_PATH, window: 60, max: 10 }],
    endpoints: {
      checkMemberEmailEntry: createAuthEndpoint(MEMBER_EMAIL_ENTRY_PATH, {
        method: "POST",
        body: z.object({ email: z.string().max(254) }).strict(),
      }, async (ctx) => {
        const email = normalizeLoginEmail(ctx.body.email);
        if (!email || !ctx.request || ctx.request.headers.get("origin") !== origin
          || new URL(ctx.request.url).search || ctx.request.headers.get("sec-fetch-site") === "cross-site") {
          throw new APIError("FORBIDDEN", { message: "This authentication request is unavailable." });
        }
        const found = await ctx.context.internalAdapter.findUserByEmail(email);
        return memberJson(200, { success: true, data: { account: found ? "existing" : "new" } });
      }),
    },
  } satisfies BetterAuthPlugin;
}

/**
 * Account discovery and code delivery both expose an account-dependent result.
 * Pin the client IP before Better Auth applies each endpoint's own rate limit.
 */
export async function normalizeMemberEmailEntryRequest(request: Request, bodyTimeoutMs = 5000, origin = new URL(request.url).origin,
  endpoint: typeof MEMBER_EMAIL_ENTRY_PATH | typeof MEMBER_EMAIL_CODE_SEND_PATH = MEMBER_EMAIL_ENTRY_PATH,
  env: Readonly<Record<string, string | undefined>> = process.env): Promise<Request | Response> {
  const path = new URL(request.url).pathname;
  const canonical = `/api/auth${endpoint}`;
  let decoded: string;
  try { decoded = decodeURIComponent(path); } catch { return request; }
  if (decoded.replace(/\/+$/, "") !== canonical) return request;
  if (path !== canonical) return memberJson(404, { success: false, error: { code: "UNAVAILABLE", message: "This authentication request is unavailable." } });
  const expected = new URL(origin);
  const actual = new URL(request.url);
  const configuredAuthority = hasConfiguredRequestAuthority(request, origin, env);
  const authority = configuredAuthority
    || (actual.origin === origin && !actual.username && !actual.password
      && (request.headers.get("host") === null || request.headers.get("host") === expected.host));
  if (expected.origin !== origin || !authority || request.method !== "POST" || request.headers.get("origin") !== origin
    || new URL(request.url).search || request.headers.has("rsc") || request.headers.get("sec-fetch-site") === "cross-site") {
    return memberJson(403, { success: false, error: { code: "UNAVAILABLE", message: "This authentication request is unavailable." } });
  }
  let body: unknown;
  try { body = await readMemberBody(request, bodyTimeoutMs); }
  catch (error) { return memberRequestFailure(error); }
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  const ingressIP = request.headers.get("x-real-ip");
  const verifiedIP = configuredAuthority && actual.origin === trustedProxyListener(env) &&
    ingressIP && !ingressIP.includes("%") && isIP(ingressIP) ? ingressIP : null;
  for (const name of ["forwarded", "x-real-ip", "cf-connecting-ip", "true-client-ip"]) headers.delete(name);
  headers.set("x-forwarded-for", endpoint === MEMBER_EMAIL_CODE_SEND_PATH ? verifiedIP ?? unverifiedClient : "127.0.0.1");
  headers.set("x-member-local-ip", "127.0.0.1");
  return new Request(request.url, { method: request.method, headers, body: JSON.stringify(body), signal: request.signal });
}
