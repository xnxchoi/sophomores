import {
  createRecoveryHandlers,
  recoveryFailure
} from "@/lib/member-auth/recovery/http";
import { getRecoveryRuntime } from "@/lib/member-auth/recovery/runtime";
import { loadRecoveryConfig } from "@/lib/member-auth/recovery/runtime";
import { RecoveryError } from "@/lib/member-auth/recovery/contracts";
export const runtime = "nodejs";
export async function POST(request: Request): Promise<Response> {
  try {
    const config = loadRecoveryConfig();
    if (!config) return recoveryFailure();
    return createRecoveryHandlers({
      origin: config.origin,
      service: {
        submit: async (input) => {
          const active = await getRecoveryRuntime();
          if (!active) throw new RecoveryError("UNAVAILABLE");
          return active.service.submit(input);
        }
      }
    }).submit(request);
  } catch {
    return recoveryFailure();
  }
}
