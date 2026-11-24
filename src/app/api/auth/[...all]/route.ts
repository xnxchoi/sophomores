import { betterAuthOptions } from "@/lib/auth/options";
import { normalizeMemberEmailEntryRequest } from "@/lib/member-auth/email-entry";
import { authHandlerFailed, authUnavailable, memberJson, memberSafeAuthRedirect } from "@/lib/member-auth/http";
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
      // A provider failure's redirect leaves without the provider's own error text (memberSafeAuthRedirect).
      const response = memberSafeAuthRedirect(await payload.betterAuth.handler(normalized), betterAuthOptions.baseURL ?? new URL(request.url).origin);
      if (!discovery) return response;
      const headers = new Headers(response.headers);
      for (const [name, value] of memberJson(200, {}).headers) headers.set(name, value);
      return new Response(response.body, { status: response.status, headers });
    }
  } catch (error) {
    // A fixed label and a correlation ID only: no property value of the thrown error is logged (src/lib/auth/failure-log.ts).
    return authHandlerFailed(discovery, error);
  }
  return authUnavailable(discovery);
}

export const GET = handle;
export const POST = handle;
