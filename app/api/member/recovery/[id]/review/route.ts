import {
  createRecoveryHandlers,
  recoveryFailure
} from "../../../../../../lib/member-auth/recovery/http";
import { getRecoveryRuntime } from "../../../../../../lib/member-auth/recovery/runtime";
import { loadRecoveryConfig } from "../../../../../../lib/member-auth/recovery/runtime";
import { RecoveryError } from "../../../../../../lib/member-auth/recovery/contracts";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const config = loadRecoveryConfig();
    if (!config) return recoveryFailure();
    const { id } = await params;
    return createRecoveryHandlers({
      origin: config.origin,
      service: {
        submit: async () => {
          throw new RecoveryError("FORBIDDEN");
        },
        review: async (requestId, input, principal) => {
          const active = await getRecoveryRuntime();
          if (!active) throw new RecoveryError("UNAVAILABLE");
          return active.service.review(requestId, input, principal);
        }
      },
      resolveStaff: async (current) => {
        const { getPayload } = await import("../../../../../../lib/payload");
        const payload = await getPayload();
        const { user } = await payload.auth({ headers: current.headers });
        return user;
      }
    }).review(request, id);
  } catch {
    return recoveryFailure();
  }
}
