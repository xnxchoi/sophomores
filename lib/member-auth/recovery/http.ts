import { hasLocalRequestAuthority } from "../../phone-verification/server/local-request";
import {
  RecoveryError,
  recoveryRequestSchema,
  recoveryReviewSchema
} from "./contracts";

class HttpError extends Error {
  constructor(readonly status: number) {
    super("Invalid recovery request");
  }
}
export function recoveryJson(status: number, body: unknown): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Referrer-Policy": "no-referrer"
    }
  });
}
export function recoveryFailure(error?: unknown): Response {
  const status =
    error instanceof HttpError
      ? error.status
      : error instanceof RecoveryError
        ? {
            INVALID_INPUT: 400,
            RATE_LIMITED: 429,
            UNAVAILABLE: 503,
            CONFLICT: 409,
            FORBIDDEN: 403
          }[error.code]
        : 503;
  const response = recoveryJson(status, {
    success: false,
    error: {
      code: status === 503 ? "UNAVAILABLE" : "INVALID_REQUEST",
      message: "The recovery request could not be accepted."
    }
  });
  if (status === 429) response.headers.set("Retry-After", "3600");
  return response;
}
type Dependencies = {
  origin: string;
  bodyTimeoutMs?: number;
  service: {
    submit: (input: unknown) => Promise<void>;
    review?: (
      id: string,
      input: unknown,
      principal: unknown
    ) => Promise<number>;
  };
  resolveStaff?: (request: Request) => Promise<unknown>;
};

// Feature-owned framing policy: existing member readers await cancellation and do
// not impose a real read deadline. Native stream races provide the needed boundary.
async function body(request: Request, timeoutMs: number): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new HttpError(415);
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > 4096))
    throw new HttpError(413);
  if (!request.body) throw new HttpError(400);
  const reader = request.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new HttpError(408)), timeoutMs);
  });
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (let count = 0; ; count++) {
      const part = await Promise.race([reader.read(), deadline]);
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 4096 || count >= 128) throw new HttpError(413);
      chunks.push(part.value);
    }
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))
    );
  } catch (error) {
    throw error instanceof HttpError ? error : new HttpError(400);
  } finally {
    clearTimeout(timer);
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
export function createRecoveryHandlers(deps: Dependencies) {
  const origin = new URL(deps.origin);
  const timeout = deps.bodyTimeoutMs ?? 5000;
  if (
    origin.origin !== deps.origin ||
    origin.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname) ||
    !origin.port ||
    origin.username ||
    origin.password ||
    !Number.isInteger(timeout) ||
    timeout < 1 ||
    timeout > 5000
  )
    throw new Error("Exact local recovery origin required");
  function accept(request: Request) {
    if (request.method !== "POST") throw new HttpError(405);
    if (
      !hasLocalRequestAuthority(request, deps.origin) ||
      new URL(request.url).search ||
      request.headers.get("origin") !== deps.origin ||
      request.headers.has("rsc") ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      throw new HttpError(403);
  }
  return {
    async submit(request: Request): Promise<Response> {
      try {
        accept(request);
        const parsed = recoveryRequestSchema.safeParse(
          await body(request, timeout)
        );
        if (!parsed.success) throw new HttpError(400);
        await deps.service.submit(parsed.data);
        return recoveryJson(202, {
          success: true,
          data: { status: "pending_staff_review" }
        });
      } catch (error) {
        return recoveryFailure(error);
      }
    },
    async review(request: Request, id: string): Promise<Response> {
      try {
        accept(request);
        if (!deps.resolveStaff || !deps.service.review)
          throw new HttpError(503);
        const principal = await deps.resolveStaff(request);
        // Authorize before reading user-controlled notes.
        const { isCmsSuperAdmin } = await import("../../auth/access");
        if (!isCmsSuperAdmin(principal)) throw new HttpError(403);
        const parsed = recoveryReviewSchema.safeParse(
          await body(request, timeout)
        );
        if (!parsed.success) throw new HttpError(400);
        const revision = await deps.service.review(id, parsed.data, principal);
        return recoveryJson(200, { success: true, data: { revision } });
      } catch (error) {
        return recoveryFailure(error);
      }
    }
  };
}
