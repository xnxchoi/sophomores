import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Payload } from "payload";
import { entryCodePattern } from "@/payload/globals/home-entry";
import { hitWindow, windowTable } from "@/utils/server/fixed-window";
import { defaultHomeHref, homeEntryMarker, warpEntryCookie } from "./home";

/** How long an entry link or an open window keeps the Warp home for a visitor. */
export const warpVisitSeconds = 6 * 60 * 60;

export type HomeEntryState = Readonly<{ warpStart: number | null; warpEnd: number | null; codes: readonly string[] }>;
type WarpPass = Readonly<{ kind: "link" | "window"; expires: number }>;

const closed: HomeEntryState = { warpStart: null, warpEnd: null, codes: [] };
const instant = (value: unknown) => {
  if (typeof value !== "string" || !value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
};

export function parseHomeEntry(value: unknown): HomeEntryState {
  const doc = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const links = Array.isArray(doc.entryLinks) ? doc.entryLinks : [];
  const codes = links
    .map((link) => (link && typeof link === "object" ? (link as { code?: unknown }).code : undefined))
    .filter((code): code is string => typeof code === "string" && entryCodePattern.test(code));
  return { warpStart: instant(doc.warpStart), warpEnd: instant(doc.warpEnd), codes };
}

type EntryStore = Pick<Payload, "findGlobal">;

/**
 * The staff-only global, read by the server. Takes the store or its loader, so a failure to start Payload is caught
 * here too: an unreadable store counts as closed, and visitors get the default home rather than an error.
 */
export async function readHomeEntry(store: EntryStore | (() => Promise<EntryStore>)): Promise<HomeEntryState> {
  try {
    const payload = typeof store === "function" ? await store() : store;
    return parseHomeEntry(await payload.findGlobal({ slug: "home-entry", depth: 0, overrideAccess: true }));
  } catch {
    console.error("Home entry is unavailable; '/' goes to the default home.");
    return closed;
  }
}

/** Open only while both ends are set and now is between them. */
export function warpWindowOpen(entry: HomeEntryState, now: number): boolean {
  return entry.warpStart !== null && entry.warpEnd !== null && entry.warpStart <= now && now < entry.warpEnd;
}

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Compares in constant time against every code, so neither a match nor its position shows in the timing. */
export function entryCodeMatches(entry: HomeEntryState, candidate: string): boolean {
  if (!entryCodePattern.test(candidate)) return false;
  const wanted = digest(candidate);
  return entry.codes.reduce((found, code) => timingSafeEqual(digest(code), wanted) || found, false);
}

function secret(): string {
  const value = process.env.PAYLOAD_SECRET;
  if (!value) throw new Error("PAYLOAD_SECRET is required to sign the Warp entry cookie");
  return value;
}
const sign = (body: string) => createHmac("sha256", secret()).update(`warp-entry:${body}`).digest("base64url");

/** `<kind>.<expires ms>.<HMAC>`: forging or extending it needs the server's secret. */
export function issueWarpPass(pass: WarpPass): string {
  const body = `${pass.kind}.${pass.expires}`;
  return `${body}.${sign(body)}`;
}

export function readWarpPass(value: string | undefined, now: number): WarpPass | null {
  if (!value) return null;
  const match = /^(link|window)\.(\d{1,16})\.([A-Za-z0-9_-]{43})$/.exec(value);
  if (!match) return null;
  const [, kind, expires, mac] = match;
  const expected = Buffer.from(sign(`${kind}.${expires}`));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const at = Number(expires);
  return at > now ? { kind: kind as WarpPass["kind"], expires: at } : null;
}

/** The cookie's flags: first-party, never readable by scripts, sent on top-level navigations only. */
export function warpCookie(value: string, maxAgeSeconds: number) {
  return {
    name: warpEntryCookie,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.max(0, Math.floor(maxAgeSeconds))
  };
}

/**
 * Whether this visit sees the Warp home. Staff previewing drafts always do, so the copy stays editable outside the
 * window. An entry link's pass holds for its 6 hours. A window pass holds only while the window is still open, so
 * closing the window early takes effect at once.
 */
export function warpHomeAllowed({ entry, pass, now, staff }: { entry: HomeEntryState; pass: WarpPass | null; now: number; staff: boolean }) {
  if (staff) return true;
  if (pass?.kind === "link") return true;
  return warpWindowOpen(entry, now);
}

/** The home page's check for this request: the stored window, the visitor's pass and a verified staff preview. */
export async function warpHomeForRequest({ payload, passCookie, staff }: {
  payload: Pick<Payload, "findGlobal"> | null;
  passCookie: string | undefined;
  staff: boolean;
}): Promise<boolean> {
  if (!payload) return staff;
  const now = Date.now();
  return warpHomeAllowed({ entry: await readHomeEntry(payload), pass: readWarpPass(passCookie, now), now, staff });
}

const noStore = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" };

/** Entry-link attempts per address: enough for a person, too few to try codes at any useful rate. */
export const entryLinkLimit = { max: 10, windowMs: 10 * 60 * 1000, maxKeys: 4096 };
const entryLinkAttempts = windowTable("warp-entry|address");

/**
 * GET /w/<code>: a valid code gets a link pass; either way the visitor lands on "/" and the code leaves the address
 * bar. An address that tries too often gets 429 without its code being checked.
 */
export function entryLinkResponse({ entry, code, now, address }: { entry: HomeEntryState; code: string; now: number; address: string }) {
  const wait = hitWindow(entryLinkAttempts, address, { ...entryLinkLimit, now });
  if (wait !== null) return new Response(null, { status: 429, headers: { ...noStore, "Retry-After": String(wait) } });
  const headers = new Headers({ ...noStore, Location: "/" });
  if (entryCodeMatches(entry, code)) {
    const cookie = warpCookie(issueWarpPass({ kind: "link", expires: now + warpVisitSeconds * 1000 }), warpVisitSeconds);
    headers.append("Set-Cookie", serializeCookie(cookie));
  }
  return new Response(null, { status: 303, headers });
}

/**
 * The gate for a cookie-less "/": outside the window, the default home. Inside it, one pass back to "/?entry", which
 * the gate never catches (next.config.ts), so a browser that refuses the cookie still lands on the Warp home, once,
 * instead of being sent round. The window pass rides along when at least a whole second of the window is left.
 */
export function homeGateResponse({ entry, now }: { entry: HomeEntryState; now: number }) {
  if (!warpWindowOpen(entry, now)) {
    return new Response(null, { status: 307, headers: { ...noStore, Location: defaultHomeHref } });
  }
  const expires = Math.min(entry.warpEnd ?? now, now + warpVisitSeconds * 1000);
  const headers = new Headers({ ...noStore, Location: `/?${homeEntryMarker}` });
  const seconds = Math.floor((expires - now) / 1000);
  if (seconds >= 1) headers.append("Set-Cookie", serializeCookie(warpCookie(issueWarpPass({ kind: "window", expires }), seconds)));
  return new Response(null, { status: 303, headers });
}

function serializeCookie(cookie: ReturnType<typeof warpCookie>): string {
  return [
    `${cookie.name}=${cookie.value}`,
    `Path=${cookie.path}`,
    `Max-Age=${cookie.maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
    ...(cookie.secure ? ["Secure"] : [])
  ].join("; ");
}
