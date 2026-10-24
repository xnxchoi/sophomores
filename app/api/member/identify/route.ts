import { createPhoneIdentifierHandlers, identifierUnavailable } from "../../../../lib/member-auth/identifier-http";
import { getMemberAuthRuntime } from "../../../../lib/member-auth/runtime";

export const runtime = "nodejs";

async function handle(request: Request, operation: "start" | "clear"): Promise<Response> {
  try {
    const active = await getMemberAuthRuntime();
    if (!active) return identifierUnavailable();
    return await createPhoneIdentifierHandlers({ origin: active.config.origin, identifier: active.identifier })[operation](request);
  } catch { return identifierUnavailable(); }
}
export const POST = (request: Request) => handle(request, "start");
export const DELETE = (request: Request) => handle(request, "clear");
