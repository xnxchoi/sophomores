import { previewResponse } from "../../../route-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return previewResponse("verify", request);
}

export function HEAD(request: Request): Promise<Response> {
  return previewResponse("verify", request);
}
