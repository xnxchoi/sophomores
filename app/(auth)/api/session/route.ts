import { previewResponse } from "../../_shared/route-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request): Promise<Response> {
  return previewResponse("login", request);
}
