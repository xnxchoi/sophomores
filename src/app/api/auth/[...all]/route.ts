import { betterAuthOptions } from "@/lib/auth/options";
import { normalizeMemberEmailEntryRequest } from "@/lib/member-auth/email-entry";
import { memberJson } from "@/lib/member-auth/http";
import { getPayload } from "@/payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request): Promise<Response> {
  const normalized = await normalizeMemberEmailEntryRequest(request, 5000, betterAuthOptions.baseURL);
  if (normalized instanceof Response) return normalized;
  const discovery = normalized !== request;
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
    console.error("Auth handler error:", error);
  }
  if (discovery) return memberJson(503, { success: false, error: { code: "UNAVAILABLE", message: "Authentication service is unavailable." } });
  return Response.json(
    { success: false, error: { code: "UNAVAILABLE", message: "Authentication service is unavailable." } },
    { status: 503, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } }
  );
}

export const GET = handle;
export const POST = handle;
