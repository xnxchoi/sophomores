import { getPreviewHandlers } from "@/lib/preview-auth/runtime";

type HandlerName = "login" | "logout" | "verify";

export async function previewResponse(name: HandlerName, request: Request): Promise<Response> {
  try {
    return await getPreviewHandlers()[name](request);
  } catch {
    return new Response(request.method === "HEAD" ? null : "Preview authentication is unavailable.", {
      status: 503,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
