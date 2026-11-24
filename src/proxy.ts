import { NextResponse, type NextRequest } from "next/server";
import { authMode, getPreviewConfig } from "@/lib/preview-auth/runtime";
import { cookieToken, verifySession } from "@/lib/preview-auth/session";
import { nfcProxy } from "@/lib/nfc/page-request";
import { APPLE_CALLBACK_PATH } from "@/lib/auth/social-providers";
import { isNoStorePagePath, privatePageCacheControl } from "@/lib/member-auth/private-pages";

const previewHost = "preview.sophomores.co";
const authPageCsp =
  "default-src 'none'; style-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";

function privateResponse(
  response: NextResponse,
  authPage = false
): NextResponse {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("X-Content-Type-Options", "nosniff");
  // Native form submissions need their same-origin Origin header for strict
  // CSRF validation; no-referrer can turn it into an opaque "null" origin.
  response.headers.set(
    "Referrer-Policy",
    authPage ? "same-origin" : "no-referrer"
  );
  if (authPage) response.headers.set("Content-Security-Policy", authPageCsp);
  return response;
}

function isRsc(request: NextRequest): boolean {
  return (
    request.headers.has("rsc") ||
    request.nextUrl.searchParams.has("_rsc") ||
    (request.headers.get("accept") ?? "").includes("text/x-component")
  );
}

function isAuthEndpoint(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  if (isRsc(request)) return false;
  if (request.method === "GET" || request.method === "HEAD") {
    return ["/login", "/logout", "/api/session/verify"].includes(pathname);
  }
  return (
    request.method === "POST" &&
    ["/api/session", "/api/session/logout"].includes(pathname)
  );
}

function isCompiledStylesheet(request: NextRequest): boolean {
  return (
    ["GET", "HEAD"].includes(request.method) &&
    !isRsc(request) &&
    /^\/_next\/static\/(?:chunks|css)\/[A-Za-z0-9_-]+\.css$/.test(
      request.nextUrl.pathname
    )
  );
}

function isDocument(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  return (
    ["GET", "HEAD"].includes(request.method) &&
    !isRsc(request) &&
    !/^\/(?:_next|api)(?:\/|$)/.test(pathname) &&
    !/\.[^/]+$/.test(pathname) &&
    (request.headers.get("accept") ?? "").includes("text/html")
  );
}

/**
 * Apple's sign-in return (`APPLE_CALLBACK_PATH`): Apple answers with a cross-site form POST, and the preview cookie is
 * SameSite=Lax, so the browser leaves it off and the gate would answer 401. Exactly this POST is let through, with no
 * query, no other method and no prefix. Better Auth's handler only turns it into a same-site GET of the same path
 * (better-auth api/routes/callback: POST merges body and query, then redirects), and that GET carries the cookie and
 * stays behind the gate; it is there that the state and Apple's id_token are checked.
 */
function isAppleCallback(request: NextRequest): boolean {
  return (
    request.method === "POST" &&
    request.nextUrl.pathname === APPLE_CALLBACK_PATH &&
    !request.nextUrl.search &&
    !isRsc(request)
  );
}

/**
 * PortOne's server-to-server webhook (the commerce plugin's endpoint `/payments/portone/webhooks` under Payload's
 * `/api`). PortOne sends no preview cookie, so behind the gate payments would never settle or refund. Exactly this
 * POST is let through, with no query, no other method and no prefix: the handler proves it came from PortOne by
 * verifying the signature over the raw body (createAdapterEndpoints, `/webhooks`) and answers 409 otherwise.
 */
function isPortOneWebhook(request: NextRequest): boolean {
  return (
    request.method === "POST" &&
    request.nextUrl.pathname === "/api/payments/portone/webhooks" &&
    !request.nextUrl.search &&
    !isRsc(request)
  );
}

// A member's own pages, and public pages that vary by session (src/lib/member-auth/private-pages.ts), are never stored by a browser or shared cache, as
// documents or as RSC payloads. Only Cache-Control: these pages keep their referrer for the payment provider.
function privatePageResponse(request: NextRequest, response: Response): Response {
  if (isNoStorePagePath(request.nextUrl.pathname)) response.headers.set("Cache-Control", privatePageCacheControl);
  return response;
}

// No matcher exclusion: configuration is validated before the narrow compiled
// CSS exception. JS/fonts/images and arbitrary public files remain private.
export function proxy(request: NextRequest): Response {
  try {
    const mode = authMode();
    const host = request.headers
      .get("host")
      ?.split(":")[0]
      .toLowerCase()
      .replace(/\.$/, "");
    const urlHost = request.nextUrl.hostname.toLowerCase().replace(/\.$/, "");
    if (mode === "public" && host !== previewHost && urlHost !== previewHost)
      return privatePageResponse(request, nfcProxy(request) ?? NextResponse.next());
    const config = getPreviewConfig();
    if (isAuthEndpoint(request)) {
      return privateResponse(
        NextResponse.next(),
        ["/login", "/logout"].includes(request.nextUrl.pathname)
      );
    }
    if (isCompiledStylesheet(request))
      return privateResponse(NextResponse.next());
    if (isPortOneWebhook(request)) return privateResponse(NextResponse.next());
    if (isAppleCallback(request)) return privateResponse(NextResponse.next());
    if (
      verifySession(
        config,
        cookieToken(request.headers.get("cookie")),
        Math.floor(Date.now() / 1000)
      )
    ) {
      return nfcProxy(request) ?? privateResponse(NextResponse.next());
    }
    if (isDocument(request)) {
      // Next's proxy adapter requires an absolute Location. Only the validated
      // configured origin may supply it, never a client-controlled Host header.
      return privateResponse(
        NextResponse.redirect(new URL("/login", config.origin), 303)
      );
    }
    return privateResponse(
      new NextResponse(
        request.method === "HEAD" ? null : "Authentication required.",
        { status: 401 }
      )
    );
  } catch {
    return privateResponse(
      new NextResponse(
        request.method === "HEAD" ? null : "Preview authentication is unavailable.",
        { status: 503 }
      )
    );
  }
}
