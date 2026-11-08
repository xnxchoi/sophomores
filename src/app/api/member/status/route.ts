import { createMemberHandlers, memberUnavailable } from "@/lib/member-auth/http";
import { getPayloadMemberRuntime } from "@/lib/member-auth/payload-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const active = getPayloadMemberRuntime();
    if (!active) return memberUnavailable();
    return await createMemberHandlers({
      origin: active.config.origin,
      service: active.service,
      capabilities: active.capabilities,
      resolvePrincipal: active.toMemberPrincipal
    }).status(request);
  } catch { return memberUnavailable(); }
}
