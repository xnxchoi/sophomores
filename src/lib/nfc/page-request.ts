import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isSpeculative, nfcRef, tapMethodResponse, tapOrigin } from "./tap-entry";

const privateHeaders = ["x-sophomores-nfc-nonce", "x-nonce", "x-sophomores-nfc-proof", "x-sophomores-nfc-post", "x-sophomores-nfc-ingress"];
const documentPath = /^\/nfc\/confirm\/(?:[A-Za-z0-9_-]{21}[AQgw]|signed-out|stale|unavailable)$/;

export function nfcProxy(request: NextRequest): NextResponse | Response | undefined {
  const { pathname, search } = request.nextUrl;
  const headers = new Headers(request.headers);
  const hadPrivate = privateHeaders.some(name => headers.has(name));
  for (const name of privateHeaders) headers.delete(name);
  if (pathname === "/api/nfc/confirm" || pathname.startsWith("/api/nfc/confirm/")) return tapMethodResponse(404);
  if (!/^\/nfc(?:\/|$)/i.test(pathname)) {
    return hadPrivate ? NextResponse.next({ request: { headers } }) : undefined;
  }

  const document = documentPath.test(pathname);
  const tap = pathname.startsWith("/nfc/") && nfcRef.test(pathname.slice(5));
  // Anything carrying search data must stop here or reach the bodyless Route Handler only.
  // The only document exception is Next's non-secret Flight cache discriminator.
  const flightKey = headers.get("rsc") === "1" && /^\?_rsc(?:=(?:[a-z0-9]{5}|[A-Za-z0-9_-]{16})?)?$/.test(search);
  if (search && !tap && !(document && flightKey)) return tapMethodResponse(400);
  if (!document && !tap) return tapMethodResponse(404);
  if (request.method === "OPTIONS") return tapMethodResponse(204);
  if (!["GET", "POST"].includes(request.method) || (document && request.method === "POST")) return tapMethodResponse(405);

  if (tap) {
    if (isSpeculative(headers)) return tapMethodResponse(204);
    if (request.nextUrl.protocol !== "https:" || headers.get("host") !== new URL(tapOrigin).host ||
      (request.method === "POST" && search)) return tapMethodResponse(400);
    return NextResponse.next({ request: { headers } });
  }

  const nonce = randomBytes(18).toString("base64");
  const policy = [
    "default-src 'none'", `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}'`, "img-src 'self' data:", "font-src 'self'",
    "connect-src 'self'", "form-action 'self'", "frame-ancestors 'none'", "base-uri 'none'",
  ].join("; ");
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Referrer-Policy", "origin");
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
