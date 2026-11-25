import { z } from "zod";
import { loadWalletConfig } from "@/lib/member-auth/wallet/safe";
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
  guestLock: lock.optional(),
  guestProductID: z.string().trim().min(1).max(128).optional(),
}).refine((config) => !config.guestLock || (config.chainID === 137 && config.guestLock !== config.eventLock));
export const unlockEventTicketConfiguration = z.union([legacyTicketConfiguration, sharedTicketConfiguration]);
export const sharedTicketTarget = z.strictObject({ chainID: z.literal(keyGrantChains), lock, mode: z.literal("shared") });
export const guestTicketTarget = z.union([sharedTicketTarget, z.strictObject({ chainID: z.literal(keyGrantChains), lock })]);
export type EventTicketTarget = z.infer<typeof guestTicketTarget>;
export const SHARED_GUEST_LIMIT = 2;
type Environment = Readonly<Record<string, string | undefined>>;
type TicketTier = "member" | "guest";

function separateGuestLockAllowed(eventLock: string, guestLock: string, env: Environment) {
  const signet = lock.safeParse(env.MEMBER_WALLET_LOCK_ADDRESS);
  const allowed = z.array(lock).safeParse(env.KEY_GRANT_POLYGON_EVENT_LOCKS?.split(",").map((value) => value.trim()));
  return signet.success && signet.data !== guestLock && signet.data !== eventLock && allowed.success &&
    allowed.data.includes(eventLock) && allowed.data.includes(guestLock);
}

/** Server-side sale selection. Slugs are display/operations metadata, never authority. */
export function sharedGuestSalePin(env: Readonly<Record<string, string | undefined>> = process.env) {
  const eventID = env.UNLOCK_SHARED_TICKET_EVENT_ID;
  const productID = env.UNLOCK_SHARED_TICKET_GUEST_PRODUCT_ID;
  return eventID?.trim() && productID?.trim() ? { eventID, productID } : null;
}


export function sharedTicketMode(target: EventTicketTarget | undefined) {
  return target && "mode" in target ? target.mode : undefined;
}

/** An exact event opt-in; absent by default. Refuse the configured Signet lock. */
export function sharedEventTicketsEnabled(eventID: string, target: EventTicketTarget, env: Readonly<Record<string, string | undefined>> = process.env) {
  const signet = lock.safeParse(env.MEMBER_WALLET_LOCK_ADDRESS);
  if (sharedTicketMode(target) !== "shared" || env.UNLOCK_SHARED_TICKET_EVENT_ID !== eventID ||
    !signet.success || target.lock.toLowerCase() === signet.data) return false;
  try {
    return loadWalletConfig(env)?.chainID === target.chainID;
  } catch {
    return false; // Partial or invalid wallet settings must not admit a sale.
  }
}

export const usesUnlockEvents = (event: CommerceDocument) => event.checkInAuthority != null || event.unlockTicketConfiguration != null;

export function sameTicketTarget(left: unknown, right: { chainID: number; lock: string; mode?: "shared" }) {
  const parsed = guestTicketTarget.safeParse(left);
  const expected = guestTicketTarget.safeParse(right);
  return parsed.success && expected.success && parsed.data.chainID === expected.data.chainID &&
    parsed.data.lock === expected.data.lock && sharedTicketMode(parsed.data) === sharedTicketMode(expected.data);
}

function ticketConfiguration(event: CommerceDocument, tier: TicketTier, productID?: string) {
  const config = unlockEventTicketConfiguration.safeParse(event.unlockTicketConfiguration);
  if (event.checkInAuthority !== "unlock-events" || !config.success ||
    (tier === "guest" && (!productID || config.data.guestProductID !== productID)) ||
    (tier === "member" && productID != null && config.data.guestProductID === productID)) {
    throw new Error("Event ticket lock and offer configuration unavailable");
  }
  return config.data;
}

function originalTarget(config: ReturnType<typeof ticketConfiguration>, tier: TicketTier): EventTicketTarget {
  if ("mode" in config) return { chainID: config.chainID, lock: config.eventLock, mode: config.mode };
  return { chainID: config.chainID, lock: tier === "guest" ? config.guestLock : config.memberLock };
}

/** Only new Guest sales follow the rollout switch. */
export function resolveEventTicketTarget(event: CommerceDocument, tier: TicketTier, productID?: string, env: Environment = process.env): EventTicketTarget {
  const config = ticketConfiguration(event, tier, productID);
  const rollout = env.UNLOCK_SEPARATE_GUEST_LOCK_ENABLED;
  if (tier !== "guest" || !("mode" in config) || !rollout || rollout === "0") return originalTarget(config, tier);
  const { eventLock, guestLock, chainID, mode } = config;
  if (rollout !== "1" || !guestLock || !separateGuestLockAllowed(eventLock, guestLock, env)) {
    throw new Error("Separate Guest ticket lock unavailable");
  }
  return { chainID, lock: guestLock, mode };
}

/** Paid and prepared purchases retain their original lock when the sale switch changes. */
export function matchesFrozenEventTicket(event: CommerceDocument, tier: TicketTier, productID: string, pinned: EventTicketTarget, env: Environment = process.env) {
  try {
    const config = ticketConfiguration(event, tier, productID);
    return sameTicketTarget(pinned, originalTarget(config, tier)) ||
      (tier === "guest" && "mode" in config && !!config.guestLock &&
        sameTicketTarget(pinned, { chainID: config.chainID, lock: config.guestLock, mode: config.mode }) &&
        separateGuestLockAllowed(config.eventLock, config.guestLock, env));
  } catch {
    return false;
  }
}
