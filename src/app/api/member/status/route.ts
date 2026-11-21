import { resolveMemberCapabilities } from "@/lib/member-auth/payload-config";
import { createMemberHandlers, memberUnavailable } from "@/lib/member-auth/http";
import { getPayloadMemberRuntime } from "@/lib/member-auth/payload-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const active = getPayloadMemberRuntime();
    if (!active) {
      console.warn("Member status runtime is not configured or is disabled.");
      return memberUnavailable();
    }
    const response = await createMemberHandlers({
      origin: active.config.origin,
      production: active.config.origin.startsWith("https:"),
      service: active.service,
      capabilities: await resolveMemberCapabilities(active.config),
      resolvePrincipal: active.toMemberPrincipal
    }).status(request);
    if (response.status === 503) console.error("Member status read failed.");
    return response;
  } catch {
    console.error("Member status runtime setup failed.");
    return memberUnavailable();
  }
}
