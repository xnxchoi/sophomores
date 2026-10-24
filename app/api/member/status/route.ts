import { createMemberHandlers, memberUnavailable } from "../../../../lib/member-auth/http";
import { getMemberAuthRuntime } from "../../../../lib/member-auth/runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const active = await getMemberAuthRuntime();
    if (!active) return memberUnavailable();
    return await createMemberHandlers({
      origin: active.config.origin,
      service: active.service,
      capabilities: active.capabilities,
      resolvePrincipal: active.toMemberPrincipal
    }).status(request);
  } catch { return memberUnavailable(); }
}
