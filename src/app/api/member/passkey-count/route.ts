import type { PayloadRequest } from "payload";
import {
  acceptMemberRequest,
  memberJson,
  memberRequestFailure,
  memberUnavailable
} from "@/lib/member-auth/http";
import { getPayloadMemberRuntime } from "@/lib/member-auth/payload-runtime";
import { countPasskeys } from "@/lib/member-auth/welcome/read";

export const runtime = "nodejs";

/**
 * The signed-in account's total number of sign-in passkeys. The welcome page
 * and the account tray use it to settle an add-passkey whose response was
 * lost. A count only: no passkey, credential ID or key leaves the server.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const active = getPayloadMemberRuntime();
    if (!active) return memberUnavailable();
    acceptMemberRequest(request, active.config.origin, "GET");
    const principal = await active.toMemberPrincipal(request);
    if (!principal)
      return memberJson(401, {
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "The member request could not be accepted."
        }
      });
    const { getPayload } = await import("@/payload");
    const payload = await getPayload();
    const count = await countPasskeys(
      { payload, context: {} } as unknown as PayloadRequest,
      principal.userId
    );
    return memberJson(200, { success: true, data: { count } });
  } catch (error) {
    return memberRequestFailure(error);
  }
}
