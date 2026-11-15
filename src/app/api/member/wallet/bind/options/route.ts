import { memberUnavailable } from "@/lib/member-auth/http";
import { walletHandlers } from "@/lib/member-auth/wallet/runtime.server";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const handlers = await walletHandlers();
    return handlers ? await handlers.bindOptions(request) : memberUnavailable();
  } catch { return memberUnavailable(); }
}
