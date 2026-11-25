import "server-only";
import { APPLE_CALLBACK_PATH } from "@/lib/auth/social-providers";

/**
 * Apple's first-time profile never rides in a URL (Review-A, 24 Nov). Apple form-POSTs it with the authorization
 * code; Better Auth turns that POST into a GET to the same callback with the profile in the query. On a successful
 * POST the route keeps only what Better Auth reads from it (the first and last name: the email comes from the signed
 * ID token), each length-capped, and moves that into a short-lived, HttpOnly cookie scoped to the Apple callback
 * path, sealed with AES-256-GCM under a key derived from the auth secret and bound to the OAuth state. On the
 * following GET the route opens the cookie, hands the name to Better Auth on the request it builds internally (never
 * a URL the browser sees) and clears the cookie, whatever the outcome (Review-A r7).
 * Fallback: no usable name, or a cookie over MAX_COOKIE_BYTES, stashes nothing and sign-in proceeds without the name;
 * memberSafeAuthRedirect drops the profile from the Location either way.
 */
export const APPLE_PROFILE_COOKIE = "sphmrs-apple-profile";
const MAX_AGE_SECONDS = 600;
const MAX_NAME_CHARACTERS = 64;
const MAX_COOKIE_BYTES = 1024;
const NO_STORE = "private, no-store";
const encoder = new TextEncoder();

async function profileKey(secret: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", encoder.encode(secret), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: encoder.encode("sphmrs-apple-profile"), info: encoder.encode("v1") },
    material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}

const base64url = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");

function namePart(value: unknown): string {
  return typeof value === "string" ? Array.from(value.trim()).slice(0, MAX_NAME_CHARACTERS).join("") : "";
}

/** The part of Apple's `user` JSON that Better Auth reads, `{"name":{"firstName","lastName"}}` capped, or null. */
export function appleProfileName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const name = parsed && typeof parsed === "object" ? (parsed as { name?: unknown }).name : undefined;
  if (!name || typeof name !== "object") return null;
  const firstName = namePart((name as { firstName?: unknown }).firstName);
  const lastName = namePart((name as { lastName?: unknown }).lastName);
  return firstName || lastName ? JSON.stringify({ name: { firstName, lastName } }) : null;
}

export async function sealAppleProfile(profile: string, state: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: encoder.encode(state) }, await profileKey(secret),
    encoder.encode(JSON.stringify({ profile, expires: Date.now() + MAX_AGE_SECONDS * 1000 })));
  return `${base64url(iv)}.${base64url(new Uint8Array(sealed))}`;
}

/** The name sealed for this state, or null (missing, tampered, another state's, expired or unusable). */
export async function openAppleProfile(value: string | undefined, state: string | null, secret: string): Promise<string | null> {
  if (!value || !state) return null;
  const [iv, data] = value.split(".");
  if (!iv || !data) return null;
  try {
    const opened = await crypto.subtle.decrypt({ name: "AES-GCM", iv: Buffer.from(iv, "base64url"), additionalData: encoder.encode(state) },
      await profileKey(secret), Buffer.from(data, "base64url"));
    const parsed = JSON.parse(new TextDecoder().decode(opened)) as { profile?: unknown; expires?: unknown };
    return typeof parsed.profile === "string" && typeof parsed.expires === "number" && parsed.expires > Date.now()
      ? appleProfileName(parsed.profile) : null;
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

function withHeaders(response: Response, cookies: string[], location?: string): Response {
  const headers = new Headers(response.headers);
  if (location) headers.set("location", location);
  for (const value of cookies) headers.append("set-cookie", value);
  headers.set("cache-control", NO_STORE);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/** POST: a successful hop's name moves from the Location into the sealed cookie. Any other response is returned as is. */
export async function stashAppleProfile(request: Request, response: Response, secret: string): Promise<Response> {
  if (request.method !== "POST" || new URL(request.url).pathname !== APPLE_CALLBACK_PATH) return response;
  const location = response.headers.get("location");
  if (!location || response.status < 300 || response.status > 399) return response;
  const url = new URL(location, request.url);
  const profile = appleProfileName(url.searchParams.get("user"));
  const state = url.searchParams.get("state");
  if (url.pathname !== APPLE_CALLBACK_PATH || !profile || url.searchParams.has("error") || !state) return response;
  const stash = cookie(await sealAppleProfile(profile, state, secret), MAX_AGE_SECONDS, url.protocol === "https:");
  if (encoder.encode(stash).byteLength > MAX_COOKIE_BYTES) return response;
  url.searchParams.delete("user");
  return withHeaders(response, [stash], /^[a-z][a-z0-9+.-]*:/i.test(location) ? url.href : `${url.pathname}${url.search}`);
}

/** GET: the request Better Auth sees carries the stashed name again. */
export async function restoreAppleProfile(request: Request, secret: string): Promise<Request> {
  const url = new URL(request.url);
  const value = readCookie(request);
  if (request.method !== "GET" || url.pathname !== APPLE_CALLBACK_PATH || value === undefined || url.searchParams.has("user")) return request;
  const profile = url.searchParams.has("error") ? null : await openAppleProfile(value, url.searchParams.get("state"), secret);
  if (!profile) return request;
  url.searchParams.set("user", profile);
  return new Request(url, request);
}

/**
 * Every response to a GET that brought the stash clears it and is private, no-store: success, provider error, a
 * handler or init failure, an unavailable handler, or no configured secret (Review-A r7).
 */
export function clearAppleProfile(request: Request, response: Response): Response {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname !== APPLE_CALLBACK_PATH || readCookie(request) === undefined) return response;
  return withHeaders(response, [cookie("", 0, url.protocol === "https:")]);
}
