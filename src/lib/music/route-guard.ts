import { getIP } from "@better-auth/core/utils/ip";
import { NextResponse } from "next/server";
import type { TypedUser } from "payload";
import { getPayload } from "@/payload";
import type { User } from "@/payload-types";
import { isAuthorizedCurator } from "./curator";
import { isAccountActivated } from "./eligibility";

// Apple Music routes spend one shared Apple quota. Each caller needs a Payload-
// verified principal (curator: CMS staff; member: activated member account),
// and each account is limited per route. An address is counted only when its
// requests are refused (no session or wrong role), so a venue full of signed-in
// attendees on one address is never locked out by someone else's failures.
//
// Library-first check (22 Nov): no installed limiter covers app routes.
// - better-auth's rateLimit (src/lib/auth/options.ts) runs only inside its own
//   handler; its consume/storage functions are not exported.
// - src/lib/commerce/access.ts, src/lib/preview-auth/auth.ts and
//   src/lib/member-auth/identifier.ts keep private, mechanism-owned limiters.
// - nginx limit_req (deployment/ops) is per address only.
// The address comes from better-auth's installed getIP, which trusts a single
// X-Forwarded-For value; the ingress overwrites that header.
//
// Best effort: windows live in this Node process only. They reset on restart and
// are not shared between instances, and they rely on the ingress for the address.
const WINDOW_MS = 60_000;
const MAX_KEYS_PER_TABLE = 2048;

const limits = {
  search: { account: 30, refusedPerAddress: 60 },
  playlist: { account: 20, refusedPerAddress: 30 },
  developerToken: { account: 10, refusedPerAddress: 30 },
  setlistAppleToken: { account: 20, refusedPerAddress: 30 }
} as const;
export type MusicRouteScope = keyof typeof limits;

type Window = { count: number; resetAt: number };
// One table per scope and kind, so saturating one route or one kind never
// touches another.
const tables = new Map<string, Map<string, Window>>();
function table(name: string): Map<string, Window> {
  let found = tables.get(name);
  if (!found) tables.set(name, (found = new Map()));
  return found;
}

/** Counts one request against key; returns seconds to wait once over max, else null. */
function hit(windows: Map<string, Window>, key: string, max: number, now: number): number | null {
  for (const [entry, window] of windows) if (window.resetAt <= now) windows.delete(entry);
  let current = windows.get(key);
  if (!current) {
    // A full table drops its oldest window instead of refusing newcomers.
    if (windows.size >= MAX_KEYS_PER_TABLE) windows.delete(windows.keys().next().value!);
    current = { count: 0, resetAt: now + WINDOW_MS };
    windows.set(key, current);
  }
  current.count++;
  return current.count > max ? Math.max(1, Math.ceil((current.resetAt - now) / 1000)) : null;
}

const privateHeaders = { "cache-control": "private, no-store" } as const;

export function privateJson(body: unknown, init: { status?: number } = {}): NextResponse {
  return NextResponse.json(body, { status: init.status ?? 200, headers: privateHeaders });
}

function tooMany(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again shortly." },
    { status: 429, headers: { ...privateHeaders, "retry-after": String(retryAfter) } }
  );
}

/** A signed-in member account that has verified contact and is not suspended. */
function isActiveMember(principal: unknown): principal is User & { collection: "users" } {
  return Boolean(principal && typeof principal === "object"
    && (principal as { collection?: unknown }).collection === "users"
    && isAccountActivated(principal as User));
}

/**
 * Admits a Payload-verified caller with the authority a music route needs.
 * Refusals: no session 401, wrong authority 403; an address with too many
 * refusals gets 429. Admitted callers then meet their per-account limit.
 */
export async function guardMusicRoute(
  request: Request,
  scope: MusicRouteScope,
  need: "member" | "curator"
): Promise<{ user: TypedUser; response?: never } | { user?: never; response: NextResponse }> {
  const limit = limits[scope];
  const now = Date.now();
  const payload = await getPayload();
  const { user } = await payload.auth({ headers: request.headers });
  const allowed = need === "curator" ? isAuthorizedCurator(user) : isActiveMember(user);

  if (!user || !allowed) {
    // A request without a trustworthy address shares one bucket; it is not exempt.
    const address = getIP(request, {}) ?? "unknown";
    const wait = hit(table(`${scope}|refused-address`), address, limit.refusedPerAddress, now);
    if (wait !== null) return { response: tooMany(wait) };
    return user
      ? { response: privateJson({ error: need === "curator" ? "Curator access required." : "Active member account required." }, { status: 403 }) }
      : { response: privateJson({ error: "Sign in to continue." }, { status: 401 }) };
  }

  const wait = hit(table(`${scope}|account`), `${user.collection}:${user.id}`, limit.account, now);
  if (wait !== null) return { response: tooMany(wait) };
  return { user };
}
