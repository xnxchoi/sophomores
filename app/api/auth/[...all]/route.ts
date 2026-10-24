import { getMemberAuthRuntime } from "../../../../lib/member-auth/runtime";
import { handleMemberAuthRequest } from "../../../../lib/member-auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request): Promise<Response> {
  try {
    const active = getMemberAuthRuntime();
    if (active) return await handleMemberAuthRequest(active.auth, active.config, request);
  } catch { /* Fixed response never exposes private configuration or provider errors. */ }
  return Response.json({ success: false, error: { code: "UNAVAILABLE", message: "Member authentication is unavailable." } },
    { status: 503, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}

export const GET = handle;
export const POST = handle;
