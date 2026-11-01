import { z } from "zod";
import { SESSION_COOKIE } from "../phone-verification/server/http";
import { MemberError, type MemberCapabilities, type MemberPrincipal } from "./contracts";
import type { MemberBindingService } from "./service";
import { hasLocalRequestAuthority } from "../phone-verification/server/local-request";

type Dependencies = {
  origin: string;
  service: Pick<MemberBindingService, "bind" | "status">;
  capabilities: MemberCapabilities;
  resolvePrincipal: (request: Request) => Promise<MemberPrincipal | null>;
  bodyTimeoutMs?: number;
};
class HttpError extends Error { constructor(readonly status: number, readonly code: string) { super(code); } }
export function memberJson(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" } });
}
export function memberUnavailable(): Response {
  return memberJson(503, { success: false, error: { code: "UNAVAILABLE", message: "Member authentication is unavailable." } });
}
function failure(error: unknown): Response {
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
  if (!hasLocalRequestAuthority(request, origin) || url.search || request.headers.has("rsc") || request.headers.get("sec-fetch-site") === "cross-site" || (method === "POST" && request.headers.get("origin") !== origin)) throw new HttpError(403, "INVALID_ORIGIN");
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
async function readBody(request: Request, timeoutMs: number): Promise<unknown> {
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
  if (origin.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname) || origin.origin !== deps.origin || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 5000) throw new Error("Local member origin required");
  return {
    async bind(request: Request): Promise<Response> {
      try {
        accept(request, deps.origin, "POST");
        const principal = await deps.resolvePrincipal(request);
        if (!principal) throw new MemberError("UNAUTHENTICATED");
        const token = verificationCookie(request);
        const input = bindingSchema.safeParse(await readBody(request, timeoutMs));
        if (!input.success) throw new HttpError(400, "INVALID_BODY");
        const data = await deps.service.bind({ principal, ...input.data, verificationSessionToken: token });
        return memberJson(200, { success: true, data });
      } catch (error) { return failure(error); }
    },
    async status(request: Request): Promise<Response> {
      try {
        accept(request, deps.origin, "GET");
        const state = await deps.service.status(await deps.resolvePrincipal(request));
        return memberJson(200, { success: true, data: { ...state, capabilities: deps.capabilities } });
      } catch (error) { return failure(error); }
    }
  };
}
