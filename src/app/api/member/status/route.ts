import { resolveMemberCapabilities } from "@/lib/member-auth/payload-config";
import { createMemberHandlers, memberUnavailable } from "@/lib/member-auth/http";
import { getPayloadMemberRuntime } from "@/lib/member-auth/payload-runtime";
import { configurationVariables } from "@/lib/phone-verification/server/config";

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
  } catch (error) {
    // Setting names only, never values, so the preview owner knows what to set.
    const variables = configurationVariables(error);
    console.error(variables.length ? `Member status runtime setup failed: check ${variables.join(", ")}.`
      : "Member status runtime setup failed.");
    return memberUnavailable();
  }
}
