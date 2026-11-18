import type { PayloadRequest } from "payload";
import { MEMBER_WALLETS_SLUG } from "@/payload/collections/member-wallets";
import type { MemberPrincipal } from "../contracts";

export type MemberWelcomeView =
  | { state: "signed-out" | "unavailable" | "restricted" | "unverified" }
  | {
      state: "verified";
      passkeyAvailable: boolean;
      wallet: "recorded" | "not-recorded" | "unavailable";
      signet: "unavailable";
      eventTicket: { issuance: "unavailable"; qr: "unavailable"; checkIn: "unavailable" };
    };

export async function readMemberWelcome(
  req: PayloadRequest, principal: MemberPrincipal, passkeyAvailable: boolean
): Promise<MemberWelcomeView> {
  const member = await req.payload.findByID({
    collection: "users", id: principal.userId, overrideAccess: true, disableErrors: true,
    depth: 0, select: { membershipStatus: true, emailVerified: true }, req
  });
  if (!member) return { state: "unavailable" };
  if (member.membershipStatus === "suspended") return { state: "restricted" };
  if (!principal.emailVerified || member.emailVerified !== true) return { state: "unverified" };

  let wallet: "recorded" | "not-recorded" | "unavailable" = "unavailable";
  try {
    const owned = await req.payload.count({
      // The canonical combined Payload generation owns the generated slug union.
      collection: MEMBER_WALLETS_SLUG as never,
      where: { and: [{ member: { equals: principal.userId } }, { status: { equals: "active" } }] },
      overrideAccess: true, req,
    });
    wallet = owned.totalDocs > 0 ? "recorded" : "not-recorded";
  } catch {
    console.error("Member wallet state could not be read.");
  }

  // Legacy intents are one row per legacy admission, with no Signet/Ticket
  // discriminator. Neither they nor the account status prove a QR or check-in.
  return {
    state: "verified",
    passkeyAvailable,
    wallet,
    signet: "unavailable",
    eventTicket: { issuance: "unavailable", qr: "unavailable", checkIn: "unavailable" },
  };
}
