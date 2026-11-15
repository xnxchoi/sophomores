import { memberUnavailable } from "@/lib/member-auth/http";
import { walletHandlers } from "@/lib/member-auth/wallet/runtime.server";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const handlers = await walletHandlers();
    return handlers ? await handlers.status(request) : memberUnavailable();
  } catch { return memberUnavailable(); }
}
