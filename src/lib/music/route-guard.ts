import { getIP } from "@better-auth/core/utils/ip";
import { NextResponse } from "next/server";
import type { TypedUser } from "payload";
import { getPayload } from "@/payload";
import type { User } from "@/payload-types";
import { isAuthorizedCurator } from "./curator";
import { isAccountActivated } from "./eligibility";
import { hitWindow, windowTable, type FixedWindow } from "@/utils/server/fixed-window";

// Apple Music routes spend one shared Apple quota. Each caller needs a Payload-
// verified principal (curator: CMS staff; member: activated member account),
// and each account is limited per route. An address is counted only when its
// requests are refused (no session or wrong role), so a venue full of signed-in
// attendees on one address is never locked out by someone else's failures.
// The three Apple routes also count admitted requests per address, in a window
// of their own: many valid accounts behind one address cannot multiply the Apple
// spend without bound, and the ceiling still fits a venue sharing one address.
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
  setlistAppleToken: { account: 20, refusedPerAddress: 30 },
  // Curator-triggered Apple Music sync; the cron uses the shared secret instead.
  setlistSync: { account: 10, refusedPerAddress: 30 },
  // Member setlist entry writes (create, edit, delete).
  setlistEntries: { account: 20, refusedPerAddress: 60 }
} as const;
export type MusicRouteScope = keyof typeof limits;

// Admitted requests per address per window, for the routes that spend Apple quota
// directly. Search is the attendee route, so its ceiling allows a venue on one shared
// address (about 20 attendees each searching at their full account rate, or many
// more searching normally); the curator routes serve a handful of staff.
const admittedPerAddress: Partial<Record<MusicRouteScope, number>> = {
  search: 600,
  playlist: 60,
  developerToken: 30
};

// One table per scope and kind (src/utils/server/fixed-window.ts), so saturating one route or one kind never
// touches another.
const table = windowTable;
const hit = (windows: Map<string, FixedWindow>, key: string, max: number, now: number) =>
  hitWindow(windows, key, { max, windowMs: WINDOW_MS, maxKeys: MAX_KEYS_PER_TABLE, now });

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
 * refusals gets 429. Admitted callers then meet their per-account limit and, on
 * the Apple routes, their address's admitted ceiling.
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
    const wait = hit(table(`${scope}|refused-address`), clientAddress(request), limit.refusedPerAddress, now);
    if (wait !== null) return { response: tooMany(wait) };
    return user
      ? { response: privateJson({ error: need === "curator" ? "Curator access required." : "Active member account required." }, { status: 403 }) }
      : { response: privateJson({ error: "Sign in to continue." }, { status: 401 }) };
  }

  const wait = hit(table(`${scope}|account`), `${user.collection}:${user.id}`, limit.account, now);
  if (wait !== null) return { response: tooMany(wait) };
  const ceiling = admittedPerAddress[scope];
  if (ceiling !== undefined) {
    // Separate from the refusal window: refusals never use up admitted capacity, nor the reverse.
    const addressWait = hit(table(`${scope}|admitted-address`), clientAddress(request), ceiling, now);
    if (addressWait !== null) return { response: tooMany(addressWait) };
  }
  return { user };
}

// A request without a trustworthy address shares one bucket; it is not exempt.
function clientAddress(request: Request): string {
  return getIP(request, {}) ?? "unknown";
}
