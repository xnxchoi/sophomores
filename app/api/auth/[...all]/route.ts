import { getPayload } from "@/lib/payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request): Promise<Response> {
  try {
    const payload = await getPayload();
    if (payload.betterAuth?.handler) {
      return await payload.betterAuth.handler(request);
    }
  } catch (error) {
    console.error("Auth handler error:", error);
  }
  return Response.json(
    { success: false, error: { code: "UNAVAILABLE", message: "Authentication service is unavailable." } },
    { status: 503, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } }
  );
}

export const GET = handle;
export const POST = handle;
