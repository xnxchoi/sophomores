import { z } from "zod";
import { IDENTIFIER_COOKIE, IdentifierError, identifierCookieToken, type PgPhoneIdentifier } from "./identifier";
import { hasConfiguredRequestAuthority } from "../phone-verification/server/local-request";

type Dependencies = { origin: string; identifier: Pick<PgPhoneIdentifier, "start" | "clear"> };
class HttpError extends Error { constructor(readonly status: number) { super("Invalid identifier request"); } }
const bodySchema = z.object({ phone: z.string().min(1).max(32) }).strict();

function json(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: {
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer"
  } });
}
function failure(error: unknown): Response {
  const code = error instanceof IdentifierError ? error.code : "UNAVAILABLE";
  const status = error instanceof HttpError ? error.status
    : { INVALID_INPUT: 400, IDENTIFIER_MISMATCH: 400, RATE_LIMITED: 429, UNAVAILABLE: 503 }[code];
  const response = json(status, { success: false, error: { code: status === 503 ? "UNAVAILABLE" : "INVALID_REQUEST", message: "The account identifier request could not be completed." } });
  if (status === 429) response.headers.set("Retry-After", "60");
  return response;
}
export const identifierUnavailable = () => failure(new IdentifierError("UNAVAILABLE"));

function accept(request: Request, origin: string, method: string): void {
  if (request.method !== method) throw new HttpError(405);
  const url = new URL(request.url);
  if (!hasConfiguredRequestAuthority(request, origin) || url.search || request.headers.get("origin") !== origin
    || request.headers.has("rsc") || request.headers.get("sec-fetch-site") === "cross-site") throw new HttpError(403);
}
async function body(request: Request): Promise<z.infer<typeof bodySchema>> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new HttpError(415);
  if (Number(request.headers.get("content-length")) > 512) throw new HttpError(413);
  if (!request.body) throw new HttpError(400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0, timedOut = false;
  const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => undefined); }, 5000);
  try {
    while (true) {
      const part = await reader.read();
      if (timedOut) throw new HttpError(408);
      if (part.done) break;
      length += part.value.byteLength;
      if (length > 512) throw new HttpError(413);
      chunks.push(part.value);
    }
    const parsed = bodySchema.safeParse(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))));
    if (!parsed.success) throw new HttpError(400);
    return parsed.data;
  } catch (error) { throw error instanceof HttpError ? error : new HttpError(400); }
  finally { clearTimeout(timer); await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}
function cookie(token: string, age: number, origin: string): string {
  // Account selection must survive top-level Google/email-link GET callbacks.
  // This grants no session; writes still require an exact same-origin request.
  return `${IDENTIFIER_COOKIE}=${token}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${age}${origin.startsWith("https:") ? "; Secure" : ""}`;
}

async function assertEmptyBody(request: Request): Promise<void> {
  const length = request.headers.get("content-length");
  if (length !== null && (!/^0+$/.test(length) || Number(length) !== 0)) throw new HttpError(400);
  if (!request.body) return;
  const reader = request.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new HttpError(408));
      void reader.cancel().catch(() => undefined);
    }, 5000);
  });
  try {
    for (let emptyChunks = 0; ; emptyChunks++) {
      const part = await Promise.race([reader.read(), deadline]);
      if (part.done) return;
      if (part.value.byteLength !== 0 || emptyChunks >= 4) throw new HttpError(400);
    }
  } catch (error) { throw error instanceof HttpError ? error : new HttpError(400); }
  finally {
    clearTimeout(timer);
    // A hostile stream can hang cancellation too; initiate it without waiting.
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export function createPhoneIdentifierHandlers(deps: Dependencies) {
  return {
    async start(request: Request): Promise<Response> {
      try {
        accept(request, deps.origin, "POST");
        const input = await body(request);
        const result = await deps.identifier.start(input.phone, "loopback");
        const response = json(200, { success: true, data: { identified: true } });
        response.headers.set("Set-Cookie", cookie(result.token, 300, deps.origin));
        return response;
      } catch (error) { return failure(error); }
    },
    async clear(request: Request): Promise<Response> {
      try {
        accept(request, deps.origin, "DELETE");
        await assertEmptyBody(request);
        let token: string | null = null;
        try { token = identifierCookieToken(request.headers); }
        catch (error) { if (!(error instanceof IdentifierError)) throw error; }
        if (token) await deps.identifier.clear(token);
        const response = json(200, { success: true, data: { identified: false } });
        response.headers.set("Set-Cookie", cookie("", 0, deps.origin));
        return response;
      } catch (error) { return failure(error); }
    }
  };
}
