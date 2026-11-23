export const tapOrigin = "https://sophomores.co";
export const nfcRef = /^[A-Za-z0-9_-]{21}[AQgw]$/;
export const tapCookie = "__Host-nfc-handoff";
export const tapDocument = "/nfc/confirm/";
const unavailable = tapDocument + "stale";
const destinations = { welcome: "/welcome", membership: "/me/settings/account" } as const;

export type TapSignetState = "issued" | "pending" | "inactive" | "not-recorded" | "unavailable";
export type TapPageState =
  | { state: "signed-out" | "unavailable" | "stale" }
  | { state: "ready" | "already-linked"; signet: TapSignetState; formRef: string; confirmation: string };
type Confirm = (request: Request, token: string) => Promise<keyof typeof destinations | null>;

export function tapPrivateHeaders(): Headers {
  return new Headers({
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  });
}

export function tapMethodResponse(status: 204 | 400 | 404 | 405): Response {
  const headers = tapPrivateHeaders();
  headers.set("Allow", "GET, POST, OPTIONS");
  return new Response(null, { status, headers });
}

export function isSpeculative(headers: Headers): boolean {
  return ["purpose", "sec-purpose", "x-purpose", "x-moz"].some((name) =>
    /\b(?:prefetch|prerender|preview)\b/i.test(headers.get(name) ?? ""),
  ) || ["next-router-prefetch", "next-router-segment-prefetch", "next-router-state-tree", "rsc"].some((name) =>
    headers.has(name),
  ) || /text\/x-component/i.test(headers.get("accept") ?? "");
}

async function confirmationBody(request: Request): Promise<string | null> {
  if (request.headers.get("content-type") !== "application/x-www-form-urlencoded") return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  // Exactly "confirmation=" plus a 128-bit base64url reference.
  const bytes = Buffer.alloc(35);
  let offset = 0;
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      if (offset + result.value.length > bytes.length) { await reader.cancel(); return null; }
      bytes.set(result.value, offset);
      offset += result.value.length;
    }
  } finally {
    reader.releaseLock();
  }
  const body = bytes.toString("ascii");
  if (offset !== bytes.length || !bytes.equals(Buffer.from(body, "ascii")) || !body.startsWith("confirmation=")) return null;
  const id = body.slice(13);
  return nfcRef.test(id) ? id : null;
}

export async function handleTapPost(request: Request, publicPath: string | null, confirm: Confirm): Promise<Response> {
  if (request.method !== "POST") return tapMethodResponse(405);
  const headers = tapPrivateHeaders();
  if (isSpeculative(request.headers)) return new Response(null, { status: 204, headers });
  let location: string = unavailable;
  try {
    if (publicPath?.startsWith("/nfc/") && nfcRef.test(publicPath.slice(5)) && request.headers.get("origin") === tapOrigin) {
      const token = await confirmationBody(request);
      const result = token && await confirm(new Request(tapOrigin + publicPath, { headers: request.headers }), token);
      if (result) location = destinations[result];
    }
  } catch { /* No proof or adapter error in responses or application logs. */ }
  headers.set("Location", location);
  return new Response(null, { status: 303, headers });
}
