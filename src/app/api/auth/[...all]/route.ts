import { betterAuthOptions } from "@/lib/auth/options";
import { normalizeMemberEmailEntryRequest } from "@/lib/member-auth/email-entry";
import { logMemberFailure, memberJson } from "@/lib/member-auth/http";
import { getPayload } from "@/payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request): Promise<Response> {
  const normalized = await normalizeMemberEmailEntryRequest(request, 5000, betterAuthOptions.baseURL);
  if (normalized instanceof Response) return normalized;
  const discovery = normalized !== request;
  let correlationId: string | undefined;
  try {
    const payload = await getPayload();
    if (payload.betterAuth?.handler) {
      const response = await payload.betterAuth.handler(normalized);
      if (!discovery) return response;
      const headers = new Headers(response.headers);
      for (const [name, value] of memberJson(200, {}).headers) headers.set(name, value);
      return new Response(response.body, { status: response.status, headers });
    }
  } catch (error) {
    // Class and correlation ID only: the error's message and stack can carry user or database data.
    correlationId = logMemberFailure("Auth handler error.", error);
  }
  const unavailable = discovery
    ? memberJson(503, { success: false, error: { code: "UNAVAILABLE", message: "Authentication service is unavailable." } })
    : Response.json(
        { success: false, error: { code: "UNAVAILABLE", message: "Authentication service is unavailable." } },
        { status: 503, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } }
      );
  if (correlationId) unavailable.headers.set("X-Correlation-Id", correlationId);
  return unavailable;
}

export const GET = handle;
export const POST = handle;
