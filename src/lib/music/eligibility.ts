import type { Payload } from "payload";
import type { User } from "@/lib/payload/payload-types";
import type { UserEligibility } from "./types";

/**
 * Checks whether an attendee is authenticated, eligible, and whether the setlist
 * submission window remains open.
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

  // 2. Check Eligibility Flag
  // =========================================================================
  // PLUG POINT FOR COMMERCE / PHONE PRODUCT ACTIVATION:
  // In the future, this flag will be updated when a ticket/product is purchased
  // and activated for an account bound to their phone number.
  // =========================================================================
  const isEligible = Boolean(user.isPlaylistEligible);

  if (!isEligible) {
    return {
      isEligible: false,
      reason: "ineligible_product",
      maxSlots,
      usedSlots,
      canEdit: false
    };
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
