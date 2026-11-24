import "server-only";
import { APPLE_CALLBACK_PATH } from "@/lib/auth/social-providers";

/**
 * Apple's first-time profile (name, and an email on first consent) never rides in a URL (Review-A, 24 Nov). Apple
 * form-POSTs it with the authorization code; Better Auth turns that POST into a GET to the same callback with the
 * profile in the query. On a successful POST the route moves the profile into a short-lived, HttpOnly cookie
 * scoped to the Apple callback path, sealed with AES-256-GCM under a key derived from the auth secret and bound to
 * the OAuth state, and takes it out of the Location. On the following GET the route opens the cookie, hands the
 * profile to Better Auth on the request it builds internally (never a URL the browser sees) and clears the cookie.
 * On an error there is nothing to stash: memberSafeAuthRedirect drops the profile from the Location.
 */
export const APPLE_PROFILE_COOKIE = "sphmrs-apple-profile";
const MAX_AGE_SECONDS = 600;
const encoder = new TextEncoder();

async function profileKey(secret: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", encoder.encode(secret), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: encoder.encode("sphmrs-apple-profile"), info: encoder.encode("v1") },
    material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}

const base64url = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");

export async function sealAppleProfile(profile: string, state: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: encoder.encode(state) }, await profileKey(secret),
    encoder.encode(JSON.stringify({ profile, expires: Date.now() + MAX_AGE_SECONDS * 1000 })));
  return `${base64url(iv)}.${base64url(new Uint8Array(sealed))}`;
}

/** The profile sealed for this state, or null (missing, tampered, another state's, or expired). */
export async function openAppleProfile(value: string | undefined, state: string | null, secret: string): Promise<string | null> {
  if (!value || !state) return null;
  const [iv, data] = value.split(".");
  if (!iv || !data) return null;
  try {
    const opened = await crypto.subtle.decrypt({ name: "AES-GCM", iv: Buffer.from(iv, "base64url"), additionalData: encoder.encode(state) },
      await profileKey(secret), Buffer.from(data, "base64url"));
    const parsed = JSON.parse(new TextDecoder().decode(opened)) as { profile?: unknown; expires?: unknown };
    return typeof parsed.profile === "string" && typeof parsed.expires === "number" && parsed.expires > Date.now() ? parsed.profile : null;
  } catch {
    return null;
  }
}

function cookie(value: string, maxAge: number, secure: boolean): string {
  return `${APPLE_PROFILE_COOKIE}=${value}; Path=${APPLE_CALLBACK_PATH}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

function readCookie(request: Request): string | undefined {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === APPLE_PROFILE_COOKIE) return rest.join("=");
  }
  return undefined;
}

/** POST: a successful hop's profile moves from the Location into the sealed cookie. Any other response is returned as is. */
export async function stashAppleProfile(request: Request, response: Response, secret: string): Promise<Response> {
  if (request.method !== "POST" || new URL(request.url).pathname !== APPLE_CALLBACK_PATH) return response;
  const location = response.headers.get("location");
  if (!location || response.status < 300 || response.status > 399) return response;
  const url = new URL(location, request.url);
  const profile = url.searchParams.get("user");
  const state = url.searchParams.get("state");
  if (url.pathname !== APPLE_CALLBACK_PATH || !profile || url.searchParams.has("error") || !state) return response;
  url.searchParams.delete("user");
  const headers = new Headers(response.headers);
  headers.set("location", /^[a-z][a-z0-9+.-]*:/i.test(location) ? url.href : `${url.pathname}${url.search}`);
  headers.append("set-cookie", cookie(await sealAppleProfile(profile, state, secret), MAX_AGE_SECONDS, url.protocol === "https:"));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/** GET: the request Better Auth sees carries the stashed profile again; the cookie is cleared on the way out. */
export async function restoreAppleProfile(request: Request, secret: string): Promise<{ request: Request; clear: string | null }> {
  const url = new URL(request.url);
  const value = readCookie(request);
  if (request.method !== "GET" || url.pathname !== APPLE_CALLBACK_PATH || value === undefined) return { request, clear: null };
  const clear = cookie("", 0, url.protocol === "https:");
  const profile = url.searchParams.has("error") ? null : await openAppleProfile(value, url.searchParams.get("state"), secret);
  if (!profile || url.searchParams.has("user")) return { request, clear };
  url.searchParams.set("user", profile);
  return { request: new Request(url, request), clear };
}
