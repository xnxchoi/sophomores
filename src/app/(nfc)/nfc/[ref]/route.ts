import { NextResponse, type NextRequest } from "next/server";
import { handleTapPost, isSpeculative, nfcRef, tapCookie, tapDocument, tapMethodResponse, tapOrigin, tapPrivateHeaders } from "@/lib/nfc/tap-entry";
import { beginTapHandoff, confirmTapHandoff } from "@/lib/nfc/tap-entry-runtime";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (isSpeculative(request.headers)) return tapMethodResponse(204);
  const { pathname, search, protocol } = new URL(request.url);
  if (protocol !== "https:" || request.headers.get("host") !== new URL(tapOrigin).host ||
    !pathname.startsWith("/nfc/") || !nfcRef.test(pathname.slice(5))) return tapMethodResponse(400);
  let handoff: Awaited<ReturnType<typeof beginTapHandoff>> = { state: "unavailable" };
  try {
    handoff = await beginTapHandoff(new Request(tapOrigin + pathname + search, { headers: request.headers }));
  } catch { /* Never log a URL or storage error containing request metadata. */ }
  const headers = tapPrivateHeaders();
  headers.set("Location", tapDocument + (handoff.state === "ready" ? handoff.id : handoff.state));
  const response = new NextResponse(null, { status: 303, headers });
  if (handoff.state === "ready") {
    response.cookies.set(tapCookie, handoff.browser, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 120 });
  }
  return response;
}

export async function POST(request: NextRequest) {
  const { pathname, search, protocol } = new URL(request.url);
  if (search || protocol !== "https:" || request.headers.get("host") !== new URL(tapOrigin).host) return tapMethodResponse(400);
  const binding = request.cookies.get(tapCookie)?.value;
  return handleTapPost(request, pathname, (canonical, id) => confirmTapHandoff(canonical, id, binding));
}

export const HEAD = () => tapMethodResponse(405);
export const OPTIONS = () => tapMethodResponse(204);
