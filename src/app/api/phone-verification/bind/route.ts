import { createMemberHandlers, memberUnavailable } from "@/lib/member-auth/http";
import { getPayloadMemberRuntime } from "@/lib/member-auth/payload-runtime";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const active = getPayloadMemberRuntime();
    if (!active) return memberUnavailable();
    return await createMemberHandlers({
      origin: active.config.origin,
      production: active.config.origin.startsWith("https:"),
      service: active.service,
      capabilities: active.capabilities,
      resolvePrincipal: active.toMemberPrincipal
    }).bind(request);
  } catch { return memberUnavailable(); }
}
