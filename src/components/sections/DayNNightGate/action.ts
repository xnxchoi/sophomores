"use server";

import configPromise from "@payload-config";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getPayload } from "payload";

import { safeEqual } from "@/lib/api/safeEqual";
import { enforceServerActionRateLimit } from "@/lib/api/serverActionRateLimit";
import {
  EVENT_GATE_TTL_MS,
  eventGateCookieName,
  issueEventGateCookieValue
} from "@/lib/event-gate";

const EVENT_SLUG = "day-n-night";

export type GateActionState = {
  ok: boolean;
  error?: "invalid" | "missing" | "no-event" | "throttled";
};

/**
 * Validate the user-entered gate password against `events.gate_password`
 * and, on match, set an HttpOnly HMAC-signed cookie for this event. The
 * landing layout and ticket route both verify the signed event id so one
 * successful unlock opens the story first, then permits purchase.
 *
 * Throttling: we lean on the Payload-side rate limit applied to
 * /api/tickets/validate-gate today; that route still exists for the
 * separate ticketing surface. Here we add lightweight protection by
 * matching only against the persisted password and otherwise rejecting
 * — Payload's find is read-only and inexpensive.
 */
export async function submitEventGate(
  _prev: GateActionState | undefined,
  formData: FormData
): Promise<GateActionState> {
  const raw = formData.get("password");
  const password = typeof raw === "string" ? raw.trim() : "";
  if (!password) return { ok: false, error: "missing" };
  if (password.length > 200) return { ok: false, error: "invalid" };

  // H1: rate-limit. The 30-day cookie this action issues means one
  // successful crack is persistent access; the previous unlimited
  // endpoint made the shared password crackable in minutes. 10 attempts
  // per 60s, IP-keyed (no user binding on the gate — visitors are
  // anonymous at this point).
  const rl = await enforceServerActionRateLimit("auth", null);
  if (!rl.ok) return { ok: false, error: "throttled" };

  const payload = await getPayload({ config: configPromise });
  const found = await payload
    .find({
      collection: "events",
      where: { slug: { equals: EVENT_SLUG } },
      limit: 1,
      depth: 0,
      overrideAccess: true
    })
    .catch(() => null);

  const event = found?.docs?.[0] as
    | { id: string; gate_password?: string | null }
    | undefined;

  if (!event) {
    // Constant-time compare against a placeholder so the response time
    // doesn't leak whether the event row exists.
    safeEqual(password, "__no_event_password_placeholder__");
    return { ok: false, error: "no-event" };
  }

  const stored = event.gate_password ?? "";
  if (!stored || !safeEqual(password, stored)) {
    return { ok: false, error: "invalid" };
  }

  const { value, expiresAt } = issueEventGateCookieValue(
    event.id,
    EVENT_GATE_TTL_MS
  );
  const jar = await cookies();
  jar.set(eventGateCookieName(EVENT_SLUG), value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt
  });

  // Revalidate the protected surface so the next render reads the cookie.
  revalidatePath("/day-n-night", "layout");
  return { ok: true };
}
