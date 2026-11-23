import { z } from "zod";
import { keyGrantChains } from "./keys/contracts";
import type { CommerceDocument } from "./_shared/transaction";

const lock = z.string().regex(/^0x[0-9a-f]{40}$/i).transform((value) => value.toLowerCase()).refine((value) => BigInt(value) > 1n);
export const unlockEventTicketConfiguration = z.strictObject({
  chainID: z.literal(keyGrantChains),
  memberLock: lock,
  guestLock: lock,
  guestProductID: z.string().trim().min(1).max(128).optional(),
}).refine((value) => value.memberLock !== value.guestLock);

export const guestTicketTarget = z.strictObject({ chainID: z.literal(keyGrantChains), lock });

export const usesUnlockEvents = (event: CommerceDocument) => event.checkInAuthority != null || event.unlockTicketConfiguration != null;

export function sameTicketTarget(left: unknown, right: { chainID: number; lock: string }) {
  const parsed = guestTicketTarget.safeParse(left);
  return parsed.success && parsed.data.chainID === right.chainID && parsed.data.lock === right.lock;
}

export function resolveEventTicketTarget(event: CommerceDocument, tier: "member" | "guest", productID?: string) {
  const config = unlockEventTicketConfiguration.safeParse(event.unlockTicketConfiguration);
  if (event.checkInAuthority !== "unlock-events" || !config.success ||
    (tier === "guest" && (!productID || config.data.guestProductID !== productID))) {
    throw new Error("Event ticket lock and offer configuration unavailable");
  }
  return { chainID: config.data.chainID, lock: tier === "guest" ? config.data.guestLock : config.data.memberLock };
}
