import { z } from "zod";
import { keyGrantChains } from "./keys/contracts";
import type { CommerceDocument } from "./_shared/transaction";

const lock = z.string().regex(/^0x[0-9a-f]{40}$/i).transform((value) => value.toLowerCase()).refine((value) => BigInt(value) > 1n);
const legacyTicketConfiguration = z.strictObject({
  chainID: z.literal(keyGrantChains),
  memberLock: lock,
  guestLock: lock,
  guestProductID: z.string().trim().min(1).max(128).optional(),
}).refine((value) => value.memberLock !== value.guestLock);

export const sharedTicketConfiguration = z.strictObject({
  version: z.literal(1),
  mode: z.literal("shared"),
  chainID: z.literal(keyGrantChains),
  eventLock: lock,
  guestProductID: z.string().trim().min(1).max(128).optional(),
});
export const unlockEventTicketConfiguration = z.union([legacyTicketConfiguration, sharedTicketConfiguration]);
export const sharedTicketTarget = z.strictObject({ chainID: z.literal(keyGrantChains), lock, mode: z.literal("shared") });
export const guestTicketTarget = z.union([sharedTicketTarget, z.strictObject({ chainID: z.literal(keyGrantChains), lock })]);
export type EventTicketTarget = z.infer<typeof guestTicketTarget>;
export const SHARED_GUEST_LIMIT = 2;

export function sharedTicketMode(target: EventTicketTarget | undefined) {
  return target && "mode" in target ? target.mode : undefined;
}

/** An exact event opt-in; absent by default. Refuse the configured Signet lock. */
export function sharedEventTicketsEnabled(eventID: string, target: EventTicketTarget, env: Readonly<Record<string, string | undefined>> = process.env) {
  const signet = lock.safeParse(env.MEMBER_WALLET_LOCK_ADDRESS);
  return env.UNLOCK_SHARED_TICKET_EVENT_ID === eventID && signet.success && target.lock !== signet.data;
}

export const usesUnlockEvents = (event: CommerceDocument) => event.checkInAuthority != null || event.unlockTicketConfiguration != null;

export function sameTicketTarget(left: unknown, right: { chainID: number; lock: string; mode?: "shared" }) {
  const parsed = guestTicketTarget.safeParse(left);
  const expected = guestTicketTarget.safeParse(right);
  return parsed.success && expected.success && parsed.data.chainID === expected.data.chainID &&
    parsed.data.lock === expected.data.lock && sharedTicketMode(parsed.data) === sharedTicketMode(expected.data);
}

export function resolveEventTicketTarget(event: CommerceDocument, tier: "member" | "guest", productID?: string) {
  const config = unlockEventTicketConfiguration.safeParse(event.unlockTicketConfiguration);
  if (event.checkInAuthority !== "unlock-events" || !config.success ||
    (tier === "guest" && (!productID || config.data.guestProductID !== productID)) ||
    (tier === "member" && productID != null && config.data.guestProductID === productID)) {
    throw new Error("Event ticket lock and offer configuration unavailable");
  }
  if ("mode" in config.data) return { chainID: config.data.chainID, lock: config.data.eventLock, mode: config.data.mode };
  return { chainID: config.data.chainID, lock: tier === "guest" ? config.data.guestLock : config.data.memberLock };
}
