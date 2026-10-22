import { NextResponse, type NextRequest } from "next/server";
import { authMode, getPreviewConfig } from "./lib/preview-auth/runtime";
import { cookieToken, verifySession } from "./lib/preview-auth/session";

const previewHost = "preview.sophomores.co";
const authPageCsp = "default-src 'none'; style-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";

function privateResponse(response: NextResponse, authPage = false): NextResponse {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("X-Content-Type-Options", "nosniff");
  // Native form submissions need their same-origin Origin header for strict
  // CSRF validation; no-referrer can turn it into an opaque "null" origin.
  response.headers.set("Referrer-Policy", authPage ? "same-origin" : "no-referrer");
  if (authPage) response.headers.set("Content-Security-Policy", authPageCsp);
  return response;
}

function isRsc(request: NextRequest): boolean {
  return request.headers.has("rsc") || request.nextUrl.searchParams.has("_rsc")
    || (request.headers.get("accept") ?? "").includes("text/x-component");
}

function isAuthEndpoint(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  if (isRsc(request)) return false;
  if (request.method === "GET" || request.method === "HEAD") {
    return ["/login", "/logout", "/api/session/verify"].includes(pathname);
  }
  return request.method === "POST" && ["/api/session", "/api/session/logout"].includes(pathname);
}

function isCompiledStylesheet(request: NextRequest): boolean {
  return ["GET", "HEAD"].includes(request.method) && !isRsc(request)
    && /^\/_next\/static\/(?:chunks|css)\/[A-Za-z0-9_-]+\.css$/.test(request.nextUrl.pathname);
}

function isDocument(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  return ["GET", "HEAD"].includes(request.method) && !isRsc(request)
    && !/^\/(?:_next|api)(?:\/|$)/.test(pathname)
    && !/\.[^/]+$/.test(pathname)
    && (request.headers.get("accept") ?? "").includes("text/html");
}

// No matcher exclusion: configuration is validated before the narrow compiled
// CSS exception. JS/fonts/images and arbitrary public files remain private.
export function proxy(request: NextRequest): NextResponse {
  try {
    const mode = authMode();
    const host = request.headers.get("host")?.split(":")[0].toLowerCase().replace(/\.$/, "");
    const urlHost = request.nextUrl.hostname.toLowerCase().replace(/\.$/, "");
    if (mode === "public" && host !== previewHost && urlHost !== previewHost) return NextResponse.next();
    const config = getPreviewConfig();
    if (isAuthEndpoint(request)) {
      return privateResponse(NextResponse.next(), ["/login", "/logout"].includes(request.nextUrl.pathname));
    }
    if (isCompiledStylesheet(request)) return privateResponse(NextResponse.next());
    if (verifySession(config, cookieToken(request.headers.get("cookie")), Math.floor(Date.now() / 1000))) {
      return privateResponse(NextResponse.next());
    }
    if (isDocument(request)) {
      // Next's proxy adapter requires an absolute Location. Only the validated
      // configured origin may supply it, never a client-controlled Host header.
      return privateResponse(NextResponse.redirect(new URL("/login", config.origin), 303));
    }
    return privateResponse(new NextResponse(request.method === "HEAD" ? null : "Authentication required.", { status: 401 }));
  } catch {
    return privateResponse(new NextResponse(request.method === "HEAD" ? null : "Preview authentication is unavailable.", { status: 503 }));
  }
}
