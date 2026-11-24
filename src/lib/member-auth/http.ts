import { z } from "zod";
import { SESSION_COOKIE } from "../phone-verification/server/http";
import { MemberError, type MemberCapabilities, type MemberPrincipal } from "./contracts";
import type { MemberBindingService } from "./service";
import { productionOrigin } from "../phone-verification/server/config";
import { hasConfiguredRequestAuthority } from "../phone-verification/server/local-request";
import { logAuthFailure } from "../auth/failure-log";
import { MEMBER_ACCOUNT_CONTINUATION_PATH, MEMBER_ACCOUNT_PATH, MEMBER_PURCHASE_RETURN_PATHS, MEMBER_SIGN_IN_PATH, memberCleanCallbackQuery, memberProviderErrorCode } from "./paths";

type Dependencies = {
  origin: string;
  /** Explicit opt-in to the https production origin; the default accepts only a loopback http origin. */
  production?: boolean;
  service: Pick<MemberBindingService, "bind" | "status">;
  capabilities: MemberCapabilities;
  resolvePrincipal: (request: Request) => Promise<MemberPrincipal | null>;
  bodyTimeoutMs?: number;
};
class HttpError extends Error { constructor(readonly status: number, readonly code: string) { super(code); } }
/** The pinned callback pages a sign-in returns to, and whether each one takes a next. */
const callbackPages: Readonly<Record<string, boolean>> = {
  [MEMBER_SIGN_IN_PATH]: true,
  [MEMBER_ACCOUNT_PATH]: true,
  [MEMBER_ACCOUNT_CONTINUATION_PATH]: false,
  ...Object.fromEntries(MEMBER_PURCHASE_RETURN_PATHS.map((path) => [path, false]))
};
/**
 * Better Auth's own redirect, made safe before it leaves the server (Review-A, 24 Nov). Its OAuth failure redirect
 * appends the provider's `error` and `error_description` verbatim to the pinned callback URL, so the diagnostic would
 * sit in the first Location header and be requested by the browser. A same-origin redirect to a pinned callback page
 * gets the clean query instead (a listed next where the page takes one, a recognised error code, nothing else, no
 * fragment). A redirect to our own provider callback (Apple's form_post hop) keeps only the fields Better Auth reads,
 * with the error as a recognised code. The status and every other header, Set-Cookie included, are kept; any other
 * redirect is untouched.
 */
export function memberSafeAuthRedirect(response: Response, origin: string): Response {
  const location = response.headers.get("location");
  if (!location || response.status < 300 || response.status > 399) return response;
  let url: URL;
  try { url = new URL(location, origin); } catch { return response; }
  if (url.origin !== new URL(origin).origin) return response;
  // Apple's form_post: Better Auth turns the POST into a GET to our own callback, copying every field into the query.
  if (/^\/api\/auth\/callback\/[a-z0-9-]+$/.test(url.pathname)) return safeProviderCallback(response, location, url);
  const takesNext = callbackPages[url.pathname];
  if (takesNext === undefined) return response;
  // Null prototype: a "__proto__" or "constructor" key is an ordinary key here, so it cannot evade the cleanup.
  const query: Record<string, string | string[]> = Object.create(null);
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key);
    query[key] = values.length > 1 ? values : values[0];
  }
  const cleaned = memberCleanCallbackQuery(url.pathname, query, takesNext);
  if (cleaned === null && !url.hash) return response;
  const target = cleaned ?? `${url.pathname}${url.search}`;
  const headers = new Headers(response.headers);
  headers.set("location", /^[a-z][a-z0-9+.-]*:/i.test(location) ? `${url.origin}${target}` : target);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
/**
 * What Better Auth's provider callback reads (callback.mjs schema), less Apple's `user` profile: a name and an email
 * never ride in a URL (Review-A, 24 Nov). On success the Payload route has already moved it into a sealed cookie
 * (apple-profile.server.ts); on an error it is simply dropped. The error is kept only as a recognised code.
 */
const providerCallbackKeys = new Set(["code", "state", "iss", "device_id"]);
function safeProviderCallback(response: Response, location: string, url: URL): Response {
  const params = new URLSearchParams();
  let changed = url.hash !== "";
  for (const [key, value] of url.searchParams) {
    if (providerCallbackKeys.has(key)) params.append(key, value);
    else if (key === "error") {
      const code = memberProviderErrorCode(value) ?? "unknown";
      params.append("error", code);
      if (code !== value) changed = true;
    } else changed = true;
  }
  if (!changed) return response;
  const target = `${url.pathname}${params.size ? `?${params}` : ""}`;
  const headers = new Headers(response.headers);
  headers.set("location", /^[a-z][a-z0-9+.-]*:/i.test(location) ? `${url.origin}${target}` : target);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
export function memberJson(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" } });
}
export function memberUnavailable(): Response {
  return memberJson(503, { success: false, error: { code: "UNAVAILABLE", message: "Member authentication is unavailable." } });
}
/**
 * The auth route's answer when its handler throws: the failure is logged by a fixed label and a correlation ID
 * (no property value of the thrown error), and the 503 carries that ID so a report can be matched to its log line.
 */
export function authHandlerFailed(discovery: boolean, error: unknown, log?: (...values: unknown[]) => void): Response {
  return authUnavailable(discovery, logAuthFailure("Auth handler error.", error, log));
}
export function authUnavailable(discovery: boolean, correlationId?: string): Response {
  const body = { success: false, error: { code: "UNAVAILABLE", message: "Authentication service is unavailable." } };
  const response = discovery
    ? memberJson(503, body)
    : Response.json(body, { status: 503, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  if (correlationId) response.headers.set("X-Correlation-Id", correlationId);
  return response;
}
export function memberRequestFailure(error: unknown): Response {
  if (error instanceof HttpError) return memberJson(error.status, { success: false, error: { code: error.code, message: "The member request could not be accepted." } });
  if (!(error instanceof MemberError)) return memberUnavailable();
  const status = { INVALID_INPUT: 400, UNAUTHENTICATED: 401, EMAIL_REQUIRED: 403, FRESH_AUTH_REQUIRED: 401, INVALID_PHONE_PROOF: 400, PHONE_CONFLICT: 409, RATE_LIMITED: 429, UNAVAILABLE: 503 }[error.code];
  const response = memberJson(status, { success: false, error: { code: error.code, message: "The member request could not be completed." } });
  if (status === 429) response.headers.set("Retry-After", "60");
  return response;
}
function accept(request: Request, origin: string, method: string): void {
  if (request.method !== method) throw new HttpError(405, "METHOD_NOT_ALLOWED");
  const url = new URL(request.url);
  if (!hasConfiguredRequestAuthority(request, origin) || url.search || request.headers.has("rsc") || request.headers.get("sec-fetch-site") === "cross-site" || (method === "POST" && request.headers.get("origin") !== origin)) throw new HttpError(403, "INVALID_ORIGIN");
}
function verificationCookie(request: Request): string {
  const header = request.headers.get("cookie") ?? "";
  if (header.length > 8192) throw new HttpError(400, "INVALID_SESSION");
  const matches = header.split(";").map((part) => part.trim()).filter((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (matches.length !== 1) throw new HttpError(400, "INVALID_SESSION");
  const token = matches[0].slice(SESSION_COOKIE.length + 1);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new HttpError(400, "INVALID_SESSION");
  return token;
}
export async function readMemberBody(request: Request, timeoutMs: number): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new HttpError(415, "INVALID_CONTENT_TYPE");
  if (Number(request.headers.get("content-length")) > 2048) throw new HttpError(413, "BODY_TOO_LARGE");
  if (!request.body) throw new HttpError(400, "INVALID_BODY");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => undefined); }, timeoutMs);
  try {
    while (true) {
      const result = await reader.read();
      if (timedOut) throw new HttpError(408, "BODY_TIMEOUT");
      if (result.done) break;
      if ((length += result.value.byteLength) > 2048) throw new HttpError(413, "BODY_TOO_LARGE");
      chunks.push(result.value);
    }
    if (!length) throw new HttpError(400, "INVALID_BODY");
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))); }
    catch { throw new HttpError(400, "INVALID_BODY"); }
  } finally { clearTimeout(timer); await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}
const bindingSchema = z.object({ challengeId: z.uuid(), phone: z.string().min(1).max(32) }).strict();

export function createMemberHandlers(deps: Dependencies) {
  const origin = new URL(deps.origin);
  const timeoutMs = deps.bodyTimeoutMs ?? 5000;
  if (!(deps.production ? productionOrigin(deps.origin) === deps.origin : origin.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)) || origin.origin !== deps.origin || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 5000) throw new Error("Local member origin required");
  return {
    async bind(request: Request): Promise<Response> {
      try {
        accept(request, deps.origin, "POST");
        const principal = await deps.resolvePrincipal(request);
        if (!principal) throw new MemberError("UNAUTHENTICATED");
        const token = verificationCookie(request);
        const input = bindingSchema.safeParse(await readMemberBody(request, timeoutMs));
        if (!input.success) throw new HttpError(400, "INVALID_BODY");
        const data = await deps.service.bind({ principal, ...input.data, verificationSessionToken: token });
        return memberJson(200, { success: true, data });
      } catch (error) { return memberRequestFailure(error); }
    },
    async status(request: Request): Promise<Response> {
      try {
        accept(request, deps.origin, "GET");
        const state = await deps.service.status(await deps.resolvePrincipal(request));
        return memberJson(200, { success: true, data: { ...state, capabilities: deps.capabilities } });
      } catch (error) { return memberRequestFailure(error); }
    }
  };
}
