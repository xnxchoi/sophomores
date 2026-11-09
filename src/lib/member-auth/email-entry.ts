import { APIError, createAuthEndpoint } from "better-auth/api";
import type { BetterAuthPlugin } from "better-auth";
import { z } from "zod";
import { hasLocalRequestAuthority } from "../phone-verification/server/local-request";
import { normalizeLoginEmail } from "../passwordless-login";
import { memberJson, memberRequestFailure, readMemberBody } from "./http";
import { MEMBER_EMAIL_ENTRY_PATH } from "./paths";

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
 * Discovery-only ingress boundary: run BEFORE the SDK limiter (plugin onRequest is too late).
 * Until a separately verified trusted ingress exists, all clients share ten requests/minute.
 * No distributed/production limiter assurance is implied by this conservative local bucket.
 */
export async function normalizeMemberEmailEntryRequest(request: Request, bodyTimeoutMs = 5000, origin = new URL(request.url).origin): Promise<Request | Response> {
  const path = new URL(request.url).pathname;
  const canonical = `/api/auth${MEMBER_EMAIL_ENTRY_PATH}`;
  let decoded: string;
  try { decoded = decodeURIComponent(path); } catch { return request; }
  if (decoded.replace(/\/+$/, "") !== canonical) return request;
  if (path !== canonical) return memberJson(404, { success: false, error: { code: "UNAVAILABLE", message: "This authentication request is unavailable." } });
  const expected = new URL(origin);
  const actual = new URL(request.url);
  const authority = hasLocalRequestAuthority(request, origin)
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
  for (const name of ["forwarded", "x-real-ip", "cf-connecting-ip", "true-client-ip"]) headers.delete(name);
  headers.set("x-forwarded-for", "127.0.0.1");
  headers.set("x-member-local-ip", "127.0.0.1");
  return new Request(request.url, { method: request.method, headers, body: JSON.stringify(body), signal: request.signal });
}
