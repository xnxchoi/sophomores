import type { Payload } from "payload";
import type { User } from "@/payload-types";
import type { UserEligibility } from "./types";

/**
 * Checks whether a user account is activated (i.e. has a valid non-placeholder
 * email and verified contact, not a temporary unactivated gift account).
 */
export function isAccountActivated(user: User | null | undefined): boolean {
  if (!user) return false;

  const email = (user.email || "").trim().toLowerCase();
  // Reject unactivated placeholder accounts (e.g. gift accounts awaiting activation)
  if (
    !email ||
    email.startsWith("unactivated") ||
    email.startsWith("gift-") ||
    email.startsWith("temp-") ||
    email.includes("@unactivated.") ||
    email.includes("@placeholder.")
  ) {
    return false;
  }

  const phone = (user.phoneNumber || user.phone || "").trim().toLowerCase();
  if (phone.startsWith("unactivated") || phone.startsWith("invalid")) {
    return false;
  }

  // Must have verified contact or approved member / staff status
  const isVerified = Boolean(
    user.emailVerified ||
    user.phoneNumberVerified ||
    user.verified ||
    user.membershipStatus === "approved" ||
    user.membershipStatus === "staff"
  );

  if (!isVerified) {
    return false;
  }

  // Suspended accounts are never active
  if (user.membershipStatus === "suspended") {
    return false;
  }

  return true;
}

/**
 * Checks whether an event ticket is bound to this account via:
 * 1. An explicit playlist eligibility flag.
 * 2. An event admission in commerce-admissions (claimed or buyer).
 * 3. A completed/paid order in orders.
 */
export async function hasBoundTicket(
  payload: Payload,
  userId: string,
  user?: User | null
): Promise<boolean> {
  if (user?.isPlaylistEligible) return true;

  // Check commerce-admissions
  try {
    const admissions = await payload.find({
      collection: "commerce-admissions" as never,
      where: {
        and: [
          {
            or: [
              { claimedAccount: { equals: userId } },
              { buyer: { equals: userId } }
            ]
          },
          { status: { not_equals: "revoked" } }
        ]
      },
      limit: 1,
      depth: 0,
      overrideAccess: true
    });
    if (admissions.totalDocs > 0) return true;
  } catch {
    // fallback if admissions check fails
  }

  // Check paid orders
  try {
    const orders = await payload.find({
      collection: "orders",
      where: {
        and: [
          { user: { equals: userId } },
          { status: { equals: "paid" } }
        ]
      },
      limit: 1,
      depth: 0,
      overrideAccess: true
    });
    if (orders.totalDocs > 0) return true;
  } catch {
    // fallback if orders check fails
  }

  return false;
}

/**
 * Checks whether an attendee is authenticated, eligible, and whether the setlist
 * submission window remains open.
 *
 * Gated on:
 * 1. Ticket bound to the account.
 * 2. The bound account being activated.
 */
export async function evaluateUserEligibility(
  payload: Payload,
  user: User | null,
  setlist: {
    id: string;
    deadline: string | Date;
    status: string;
    maxSlotsPerUser?: number | null;
  }
): Promise<UserEligibility> {
  const maxSlots = setlist.maxSlotsPerUser ?? 2;

  if (!user) {
    return {
      isEligible: false,
      reason: "unauthenticated",
      maxSlots,
      usedSlots: 0,
      canEdit: false
    };
  }

  // Count existing slots used by this attendee
  const existingTracks = await payload.find({
    collection: "tracks",
    where: {
      and: [
        { setlist: { equals: setlist.id } },
        { submittedBy: { equals: user.id } }
      ]
    },
    pagination: false
  });

  const usedSlots = existingTracks.totalDocs;

  // 1. Check Setlist Status & Deadline
  const isPastDeadline = new Date() >= new Date(setlist.deadline);
  if (setlist.status === "locked" || setlist.status === "finalized") {
    return {
      isEligible: false,
      reason: "setlist_locked",
      maxSlots,
      usedSlots,
      canEdit: false
    };
  }

  if (isPastDeadline) {
    return {
      isEligible: false,
      reason: "deadline_passed",
      maxSlots,
      usedSlots,
      canEdit: false
    };
  }

  // 2. Gate 1: Check if ticket is bound to this account
  const ticketBound = await hasBoundTicket(payload, user.id, user);
  if (!ticketBound) {
    return {
      isEligible: false,
      reason: "ineligible_product",
      maxSlots,
      usedSlots,
      canEdit: false
    };
  }

  // 3. Gate 2: Check if the bound account is activated
  const activated = isAccountActivated(user);
  if (!activated) {
    return {
      isEligible: false,
      reason: "account_unactivated",
      maxSlots,
      usedSlots,
      canEdit: false
    };
  }

  // Both gates passed: user is eligible!
  if (!user.isPlaylistEligible) {
    try {
      await payload.update({
        collection: "users",
        id: user.id,
        data: { isPlaylistEligible: true },
        overrideAccess: true
      });
    } catch {
      // non-fatal cache update failure
    }
  }

  return {
    isEligible: true,
    maxSlots,
    usedSlots,
    canEdit: true
  };
}

/**
 * Retrieves the specific Slot 1 and Slot 2 track submissions for a user.
 */
export async function getUserSetlistSlots(
  payload: Payload,
  userId: string,
  setlistId: string
) {
  const userTracks = await payload.find({
    collection: "tracks",
    depth: 0,
    where: {
      and: [
        { setlist: { equals: setlistId } },
        { submittedBy: { equals: userId } }
      ]
    },
    pagination: false
  });

  const slot1 = userTracks.docs.find((t) => t.slotIndex === 1) || null;
  const slot2 = userTracks.docs.find((t) => t.slotIndex === 2) || null;

  return {
    slot1,
    slot2,
    totalFilled: (slot1 ? 1 : 0) + (slot2 ? 1 : 0)
  };
}
