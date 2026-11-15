import { createHash } from "node:crypto";
import { APIError, type PayloadRequest } from "payload";
import { z } from "zod";
import { isPayloadActiveMember } from "@/lib/member-auth/payload-runtime";
import { withCommerceWrite } from "./access";
import { loadCommerceCatalogue, type CommerceOffer } from "./catalogue";
import {
  counter,
  createCommerce,
  findCommerce,
  lockCommerce,
  readCommerce,
  relationshipID,
  updateCommerce,
  type CommerceDocument
} from "./_shared/transaction";

/**
 * Paid guest invite, "the member pays" (owner decisions 2026-11-14/15; ADR-0002).
 * An invite names the guest, holds one event place for 48 hours while unpaid,
 * and never grants membership. The payer field already admits "guest" so the
 * later invitee-pays slice needs no row migration; this slice only creates
 * member-paid invites.
 */
export const GUEST_INVITE_HOLD_MS = 48 * 60 * 60 * 1000;
export const guestInviteStates = [
  "pending_payment",
  "paid",
  "lapsed",
  "used",
  "refunded"
] as const;
export const guestInvitePayers = ["member", "guest"] as const;
export type GuestInviteState = (typeof guestInviteStates)[number];

/** Allowed state moves. Lapsed and refunded invites are history; a new invite is a new row. */
export const guestInviteTransitions: Readonly<
  Record<GuestInviteState, readonly GuestInviteState[]>
> = {
  pending_payment: ["paid", "lapsed"],
  paid: ["used", "refunded"],
  used: [],
  lapsed: [],
  refunded: []
};

/** One open (pending, paid or used) invite per member per guest-invite product. */
export function guestInviteActiveKey(
  inviterID: string,
  productID: string
): string {
  return createHash("sha256")
    .update(JSON.stringify(["guest-invite", inviterID, productID]))
    .digest("hex");
}
export const guestInviteLock = (inviteID: string) => `guest-invite:${inviteID}`;

const guestNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine((value) => !/[\u0000-\u001f]/.test(value));
// Normalized once, here; the later Unlock email grant reads this stored value.
const guestEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(254));

type InviteDependencies = {
  activeMember?: (customerID: string) => Promise<boolean>;
  loadOffer?: (
    req: PayloadRequest,
    productID: string
  ) => Promise<CommerceOffer | null>;
};

/** Runs inside the caller's commerce transaction; the hold and the row commit together. */
export async function createGuestInvite(
  {
    req,
    productID,
    guestName,
    guestEmail,
    now = Date.now()
  }: {
    req: PayloadRequest;
    productID: string;
    guestName: string;
    guestEmail: string;
    now?: number;
  },
  {
    activeMember = isPayloadActiveMember,
    loadOffer = (owner, id) =>
      loadCommerceCatalogue({ req: owner, productID: id })
  }: InviteDependencies = {}
): Promise<CommerceDocument> {
  if (req.user?.collection !== "users")
    throw new APIError("A member account is required", 403);
  const inviterID = String(req.user.id);
  const name = guestNameSchema.safeParse(guestName);
  if (!name.success) throw new APIError("A valid guest name is required", 400);
  const email = guestEmailSchema.safeParse(guestEmail);
  if (!email.success)
    throw new APIError("A valid guest email is required", 400);
  if (!(await activeMember(inviterID)))
    throw new APIError("Only a member can send a guest invite", 403);
  const offer = await loadOffer(req, productID);
  if (!offer || offer.kind !== "guest_invite")
    throw new APIError("Guest invites are not on sale", 409);
  // Stock only: the event place is checked under the event lock below.
  if (offer.availableQuantity < 1)
    throw new APIError("Guest invites are sold out", 409);
  const eventID = offer.event.id;
  const activeKey = guestInviteActiveKey(inviterID, offer.productID);
  await lockCommerce(req, [
    `event:${eventID}`,
    `guest-invite-active:${activeKey}`
  ]);
  if (await findCommerce(req, "commerce-guest-invites", "activeKey", activeKey))
    throw new APIError("This member already has an open guest invite", 409);
  const event = await readCommerce(req, "commerce-events", eventID);
  if (
    event.publicationApproved !== true ||
    counter(event.capacity) -
      counter(event.committedQuantity) -
      counter(event.reservedQuantity) <
      1
  ) {
    throw new APIError("The event has no capacity left", 409);
  }
  await req.payload.db.updateOne({
    collection: "commerce-events" as never,
    id: eventID,
    data: { reservedQuantity: { $inc: 1 } },
    req
  });
  return withCommerceWrite(req, () =>
    createCommerce(req, "commerce-guest-invites", {
      inviter: inviterID,
      event: eventID,
      product: offer.productID,
      payer: "member",
      guestName: name.data,
      guestEmail: email.data,
      state: "pending_payment",
      activeKey,
      holdExpiresAt: new Date(now + GUEST_INVITE_HOLD_MS).toISOString()
    })
  );
}

/** The member's open invite for this product, if any. Read-only; callers lock before acting. */
export async function findOpenGuestInvite(
  req: PayloadRequest,
  inviterID: string,
  productID: string
): Promise<CommerceDocument | undefined> {
  return findCommerce(
    req,
    "commerce-guest-invites",
    "activeKey",
    guestInviteActiveKey(inviterID, productID)
  );
}

/** A new checkout attempt may start only while the member's invite still holds its place. */
export function assertGuestInviteCheckout(
  invite: CommerceDocument,
  {
    customerID,
    productID,
    eventID,
    now
  }: { customerID: string; productID: string; eventID: string; now: number }
): void {
  if (
    invite.payer !== "member" ||
    relationshipID(invite.inviter) !== customerID ||
    relationshipID(invite.product) !== productID ||
    relationshipID(invite.event) !== eventID
  ) {
    throw new Error("Guest invite does not belong to this checkout");
  }
  if (invite.state !== "pending_payment" || invite.holdReleasedAt)
    throw new Error("Guest invite is not awaiting payment");
  if (!(Date.parse(String(invite.holdExpiresAt)) > now))
    throw new Error("Guest invite hold has expired");
}

/**
 * Settlement, after the admission exists. The caller already holds the invite
 * lock through the reservation context. Replay of the same order is a no-op;
 * any other binding is corruption and rolls the settlement back.
 */
export async function markGuestInvitePaid({
  req,
  inviteID,
  orderID,
  transactionID,
  admissions
}: {
  req: PayloadRequest;
  inviteID: string;
  orderID: string;
  transactionID: string;
  admissions: CommerceDocument[];
}): Promise<CommerceDocument> {
  await lockCommerce(req, [guestInviteLock(inviteID)]);
  const invite = await readCommerce(req, "commerce-guest-invites", inviteID);
  if (
    admissions.length !== 1 ||
    relationshipID(admissions[0].guestInvite) !== inviteID
  )
    throw new Error("A guest invite settles exactly one admission");
  const admissionID = admissions[0].id;
  if (invite.order != null) {
    if (
      relationshipID(invite.order) !== orderID ||
      relationshipID(invite.transaction) !== transactionID ||
      relationshipID(invite.admission) !== admissionID
    )
      throw new Error("Guest invite settlement identity mismatch");
    return invite;
  }
  if (invite.state !== "pending_payment" || invite.holdReleasedAt)
    throw new Error("Guest invite is not awaiting payment");
  return withCommerceWrite(req, () =>
    updateCommerce(req, "commerce-guest-invites", inviteID, {
      state: "paid",
      order: orderID,
      transaction: transactionID,
      admission: admissionID,
      paidAt: new Date().toISOString()
    })
  );
}

/**
 * Door check-in of a paid invite's admission. The caller holds that admission's
 * lock, which also serializes the refund path's decision; taking the invite lock
 * here would invert the release path's order.
 */
export async function markGuestInviteUsed(
  req: PayloadRequest,
  inviteID: string
): Promise<void> {
  const invite = await readCommerce(req, "commerce-guest-invites", inviteID);
  if (invite.state === "used") return;
  if (invite.state !== "paid")
    throw new Error("Only a paid guest invite can be used");
  await withCommerceWrite(req, () =>
    updateCommerce(req, "commerce-guest-invites", inviteID, {
      state: "used",
      usedAt: new Date().toISOString()
    })
  );
}

/**
 * Explicitly invoked (no scheduler yet). Lapses unpaid invites whose 48 hours
 * have passed, releases each held place once and marks the member to be told.
 * An invite with a live card attempt is deferred: that attempt started before
 * the deadline, and lapsing under it could charge for a released place. Nobody
 * is charged and no email is sent here. Runs in the caller's transaction.
 */
export async function lapseDueGuestInvites({
  req,
  now = Date.now(),
  limit = 100
}: {
  req: PayloadRequest;
  now?: number;
  limit?: number;
}): Promise<{ lapsed: string[]; deferred: string[] }> {
  const cutoff = new Date(now).toISOString();
  const due = await req.payload.find({
    collection: "commerce-guest-invites" as never,
    depth: 0,
    overrideAccess: true,
    req,
    limit,
    sort: "holdExpiresAt",
    where: {
      and: [
        { state: { equals: "pending_payment" } },
        { holdExpiresAt: { less_than_equal: cutoff } }
      ]
    }
  });
  const lapsed: string[] = [];
  const deferred: string[] = [];
  for (const candidate of due.docs as unknown as CommerceDocument[]) {
    const eventID = relationshipID(candidate.event);
    await lockCommerce(req, [
      `event:${eventID}`,
      guestInviteLock(candidate.id)
    ]);
    const invite = await readCommerce(
      req,
      "commerce-guest-invites",
      candidate.id
    );
    if (
      invite.state !== "pending_payment" ||
      invite.holdReleasedAt ||
      Date.parse(String(invite.holdExpiresAt)) > now
    )
      continue;
    const live = await req.payload.find({
      collection: "commerce-reservations" as never,
      depth: 0,
      overrideAccess: true,
      req,
      limit: 1,
      where: {
        and: [
          { guestInvite: { equals: invite.id } },
          { state: { equals: "reserved" } }
        ]
      }
    });
    if (live.docs.length) {
      deferred.push(invite.id);
      continue;
    }
    const event = await readCommerce(req, "commerce-events", eventID);
    if (counter(event.reservedQuantity) < 1)
      throw new Error("Guest invite hold counters are inconsistent");
    await req.payload.db.updateOne({
      collection: "commerce-events" as never,
      id: eventID,
      data: { reservedQuantity: { $inc: -1 } },
      req
    });
    await withCommerceWrite(req, () =>
      updateCommerce(req, "commerce-guest-invites", invite.id, {
        state: "lapsed",
        lapsedAt: cutoff,
        holdReleasedAt: cutoff,
        activeKey: null,
        memberNotice: "lapsed"
      })
    );
    lapsed.push(invite.id);
  }
  return { lapsed, deferred };
}
