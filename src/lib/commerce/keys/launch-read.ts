import { z } from "zod";

const id = z.string().min(1).max(128);
const issuanceState = z.enum(["pending", "issued", "inactive"]);
const signetRecord = z.strictObject({
  kind: z.literal("signet"), id, memberID: id, state: issuanceState,
});
const freeTicketRecord = z.strictObject({
  kind: z.literal("free-launch-ticket"), id, signetID: id, memberID: id,
  eventID: id, state: issuanceState,
});
const qrDeliveryRecord = z.strictObject({
  kind: z.literal("ticket-qr-delivery"), ticketID: id, recipientMemberID: id,
  eventID: id, state: z.enum(["pending", "ready", "withdrawn"]),
});

type Signet = z.infer<typeof signetRecord>;
type FreeTicket = z.infer<typeof freeTicketRecord>;
type Issuance = z.infer<typeof issuanceState> | "not-recorded" | "unavailable";
type Qr = "ready" | "not-ready" | "withdrawn" | "not-applicable" | "unavailable";

export type MemberLaunchEntitlements = Readonly<{
  signet: Issuance;
  eventTicket: Readonly<{ issuance: Issuance; qr: Qr; checkIn: "unavailable" }>;
}>;

/** Server read-adapter input only, never request data. Null is verified absence; omit failed or unsupported reads. */
type Evidence = Readonly<{ signet?: unknown; freeTicket?: unknown; qr?: unknown }>;

function ownSignet(raw: unknown, memberID: string): Signet | null | undefined {
  if (raw === null) return null;
  const parsed = signetRecord.safeParse(raw);
  return parsed.success && parsed.data.memberID === memberID ? parsed.data : undefined;
}

function ownFreeTicket(raw: unknown, eventID: string, signet: Signet | null | undefined): FreeTicket | null | undefined {
  if (raw === null) return null;
  if (signet?.state !== "issued") return undefined;
  const parsed = freeTicketRecord.safeParse(raw);
  if (!parsed.success) return undefined;
  const ticket = parsed.data;
  return ticket.memberID === signet.memberID && ticket.signetID === signet.id && ticket.eventID === eventID
    ? ticket : undefined;
}

function ownQr(raw: unknown, ticket: FreeTicket | null | undefined): Qr {
  if (ticket === undefined) return "unavailable";
  if (ticket?.state !== "issued") return raw == null ? "not-applicable" : "unavailable";
  if (raw === null) return "not-ready";
  const parsed = qrDeliveryRecord.safeParse(raw);
  if (!parsed.success) return "unavailable";
  const receipt = parsed.data;
  if (receipt.recipientMemberID !== ticket.memberID || receipt.eventID !== ticket.eventID ||
      receipt.ticketID !== ticket.id) return "unavailable";
  return receipt.state === "pending" ? "not-ready" : receipt.state;
}

/**
 * Project a single consistent snapshot. Caller must already resolve the
 * verified principal and the configured launch event server-side; an ID match
 * here is a consistency check, not authentication or proof of provenance.
 */
export function projectMemberLaunchEntitlements(
  memberID: string, launchEventID: string | null, evidence: Evidence,
): MemberLaunchEntitlements {
  const validMember = id.safeParse(memberID).success;
  const signet = validMember ? ownSignet(evidence.signet, memberID) : undefined;
  const foundTicket = validMember && launchEventID !== null && id.safeParse(launchEventID).success
    ? ownFreeTicket(evidence.freeTicket, launchEventID, signet) : undefined;
  // A receipt in the same scoped snapshot contradicts a definitive absent Ticket.
  const ticket = foundTicket === null && evidence.qr != null ? undefined : foundTicket;
  return {
    signet: signet === null ? "not-recorded" : signet?.state ?? "unavailable",
    eventTicket: {
      issuance: ticket === null ? "not-recorded" : ticket?.state ?? "unavailable",
      qr: ownQr(evidence.qr, ticket),
      checkIn: "unavailable",
    },
  };
}
