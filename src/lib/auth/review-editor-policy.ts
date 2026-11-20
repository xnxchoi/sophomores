import { APIError } from "better-auth/api";
import { isMemberMailAddress } from "@/lib/member-auth/mail-config";
import { hasConfiguredRequestAuthority } from "@/lib/phone-verification/server/local-request";
import { cmsAdminCallbackPath } from "./cms-login";
import { isStaffEmail } from "./staff-email";

export const reviewEditorOrigin = "https://preview.sophomores.co";

type Env = Readonly<Record<string, string | undefined>>;

export function staffAuthOrigin(env: Env = process.env): string {
  return (env.NEXT_PUBLIC_SERVER_URL || env.BETTER_AUTH_URL || env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    "http://localhost:3000").replace(/\/+$/, "");
}

/** The known review host cannot accidentally fall back to domain-only staff access. */
export function isReviewEditorProfile(origin: string, env: Env = process.env): boolean {
  return origin === reviewEditorOrigin || env.REVIEW_OWNER_EMAIL !== undefined;
}

/** Review is a runtime authority boundary, not a property of the viewer cookie. */
export function isReviewCopyRequest(request?: Request): boolean {
  return isReviewEditorProfile(staffAuthOrigin()) ||
    (request !== undefined && new URL(request.url).hostname === new URL(reviewEditorOrigin).hostname);
}

export function denyReviewCustomerOperation(request?: Request): Response | undefined {
  if (!isReviewCopyRequest(request)) return;
  return Response.json({ error: "Unavailable on the review copy." }, {
    status: 403, headers: { "Cache-Control": "private, no-store" },
  });
}

function reviewOwner(origin: string, env: Env): string | null {
  if (origin !== reviewEditorOrigin) return null;
  const email = env.REVIEW_OWNER_EMAIL?.trim().toLowerCase();
  return isMemberMailAddress(email) && isStaffEmail(email) ? email : null;
}

export function hasReviewOwner(origin: string, env: Env = process.env): boolean {
  return reviewOwner(origin, env) !== null;
}

export function isConfiguredStaffEmail(origin: string, email?: string | null, env: Env = process.env): boolean {
  if (!isReviewEditorProfile(origin, env)) return isStaffEmail(email);
  return typeof email === "string" && email.trim().toLowerCase() === reviewOwner(origin, env);
}

export function assertReviewEditorRecipient(origin: string, email: unknown): void {
  if (typeof email !== "string" || !isConfiguredStaffEmail(origin, email)) throw forbidden();
}

const endpointMethods: Readonly<Record<string, string>> = Object.freeze({
  "/email-otp/send-verification-otp": "POST",
  "/sign-in/email-otp": "POST",
  "/sign-in/magic-link": "POST",
  "/magic-link/verify": "GET",
  "/get-session": "GET",
  "/sign-out": "POST",
});
const callbackKeys = ["callbackURL", "errorCallbackURL", "newUserCallbackURL"] as const;
const forbidden = () => new APIError("FORBIDDEN", { message: "This authentication request is unavailable." });

/** Runs before Better Auth persists a challenge or invokes the mail callback. */
export function assertReviewEditorRequest(origin: string, path: string, body: Record<string, unknown> | undefined,
  query: URLSearchParams, request?: Request): void {
  if (origin !== reviewEditorOrigin || !Object.hasOwn(endpointMethods, path)) throw forbidden();
  if (path !== "/get-session" && path !== "/sign-out" && !hasReviewOwner(origin)) throw forbidden();
  if (request) {
    const url = new URL(request.url);
    if (!hasConfiguredRequestAuthority(request, origin) || url.pathname !== "/api/auth" + path ||
        request.method !== endpointMethods[path] || request.headers.has("rsc") ||
        (request.method === "POST" && (request.headers.get("origin") !== origin || url.search)) ||
        (path !== "/magic-link/verify" && request.headers.get("sec-fetch-site") === "cross-site")) throw forbidden();
  }
  if (path === "/email-otp/send-verification-otp" || path === "/sign-in/email-otp" || path === "/sign-in/magic-link") {
    assertReviewEditorRecipient(origin, body?.email);
  }
  if (path !== "/sign-in/magic-link" && path !== "/magic-link/verify") return;
  if (path === "/magic-link/verify" && (!/^[A-Za-z0-9_-]{20,512}$/.test(query.get("token") ?? "") ||
      (request && new URL(request.url).searchParams.getAll("token").length !== 1))) throw forbidden();
  const callback = path === "/sign-in/magic-link" ? body?.callbackURL : query.get("callbackURL");
  const accepted = (value: unknown) => value === cmsAdminCallbackPath || value === origin + cmsAdminCallbackPath;
  if (!accepted(callback)) throw forbidden();
  for (const key of callbackKeys) {
    if ([body?.[key], query.get(key) ?? undefined].some(value => value !== undefined && !accepted(value))) throw forbidden();
  }
}
