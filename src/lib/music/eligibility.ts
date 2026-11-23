import type { Payload } from "payload";
import type { User } from "@/payload-types";
import { inRunningOrder, runningOrder } from "./running-order";
import type { UserEligibility } from "./types";
import { eventAccountKey } from "@/lib/commerce/event-account";

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
 * Hardening C: a read-only, event-scoped projection decided on every read. The account
 * occupies a live admission for this setlist's event: the occupancy key for (event, account),
 * not revoked and not held for benefit review (refunds and provider risk set that hold).
 * A setlist without an event admits no one (owner, 23 Nov: "Nobody until set").
 * SYSTEM projection: commerce-admissions stays server-only; this read is bound to the
 * account and event and returns only a yes or no.
 */
export async function hasEventAdmission(payload: Payload, userId: string, eventID: string | null): Promise<boolean> {
  if (!eventID || !userId) return false;
  try {
    const found = await payload.count({
      collection: "commerce-admissions" as never,
      where: {
        and: [
          { event: { equals: eventID } },
          { eventAccountKey: { equals: eventAccountKey(eventID, userId) } },
          { status: { not_equals: "revoked" } },
          { or: [{ benefitReview: { equals: false } }, { benefitReview: { exists: false } }] }
        ]
      },
      overrideAccess: true
    });
    return found.totalDocs > 0;
  } catch {
    // Fail closed: an unreadable admission never grants a playlist.
    console.error("Playlist eligibility could not be read.");
    return false;
  }
}

/** The setlist's event id, whether the relationship is populated or not. */
export function setlistEventID(event: string | { id: string } | null | undefined): string | null {
  if (!event) return null;
  return typeof event === "string" ? event : event.id ?? null;
}

/**
 * Checks whether an attendee is authenticated, eligible, and whether the setlist
 * submission window remains open.
 *
 * Gated on:
 * 1. Ticket bound to the account.
 * 2. The bound account being activated.
 */
/** Entries a member may hold in this setlist: 1 or 2 (owner, 22 Nov: "You are afforded 2 entries"). */
export function entryCap(setlist: { maxSlotsPerUser?: number | null }): number {
  const value = setlist.maxSlotsPerUser;
  return value === 1 ? 1 : 2;
}

export async function evaluateUserEligibility(
  payload: Payload,
  user: User | null,
  setlist: {
    id: string;
    deadline: string | Date;
    status: string;
    maxSlotsPerUser?: number | null;
    event?: string | { id: string } | null;
  }
): Promise<UserEligibility> {
  const maxSlots = entryCap(setlist);

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
    depth: 0,
    overrideAccess: false,
    user,
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
  const ticketBound = await hasEventAdmission(payload, String(user.id), setlistEventID(setlist.event));
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

  // Both gates passed. Nothing is cached: the next read decides again.
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
  setlistId: string,
  user?: User
) {
  const [userTracks, order] = await Promise.all([
    payload.find({
      collection: "tracks",
      depth: 0,
      overrideAccess: false,
      user,
      where: {
        and: [
          { setlist: { equals: setlistId } },
          { submittedBy: { equals: userId } }
        ]
      },
      sort: "createdAt",
      pagination: false
    }),
    runningOrder(payload, setlistId)
  ]);
  const entries = inRunningOrder(userTracks.docs, order);
  return { entries, totalFilled: entries.length };
}
