import { betterAuthOptions } from "@/lib/auth/options";
import { normalizeMemberEmailEntryRequest } from "@/lib/member-auth/email-entry";
import { authHandlerFailed, authUnavailable, memberJson, memberSafeAuthRedirect } from "@/lib/member-auth/http";
import { getPayload } from "@/payload";
import { restoreAppleProfile, stashAppleProfile } from "@/lib/member-auth/apple-profile.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request): Promise<Response> {
  const normalized = await normalizeMemberEmailEntryRequest(request, 5000, betterAuthOptions.baseURL);
  if (normalized instanceof Response) return normalized;
  const discovery = normalized !== request;
  try {
    const payload = await getPayload();
    if (payload.betterAuth?.handler) {
      // Apple's first-time profile travels in a sealed cookie, never a URL: restored for Better Auth on the GET, stashed
      // from the POST hop (apple-profile.server.ts). Then a provider failure's redirect leaves without the provider's
      // own text (memberSafeAuthRedirect).
      // Without a configured secret nothing is stashed, so the profile is simply dropped.
      const secret = betterAuthOptions.secret;
      const restored = secret ? await restoreAppleProfile(normalized, secret) : { request: normalized, clear: null };
      const answered = await payload.betterAuth.handler(restored.request);
      const handled = secret ? await stashAppleProfile(normalized, answered, secret) : answered;
      const safe = memberSafeAuthRedirect(handled, betterAuthOptions.baseURL ?? new URL(request.url).origin);
      let response = safe;
      if (restored.clear) {
        const headers = new Headers(safe.headers);
        headers.append("set-cookie", restored.clear);
        response = new Response(safe.body, { status: safe.status, statusText: safe.statusText, headers });
      }
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
