import type { PayloadRequest } from "payload";
import type { Address } from "viem";
import { isCmsStaff } from "@/lib/auth/access";
import { keyGrantChains } from "../keys/contracts";
import {
  CheckInRefusal,
  checkInGuest,
  type CheckInRefusalCode
} from "../guests";
import {
  createCommerce,
  findCommerce,
  inCommerceTransaction,
  readCommerce,
  relationshipID,
  type CommerceDocument
} from "../_shared/transaction";
import { verifyUnlockQr, type QrRefusalCode } from "./qr";

/**
 * The door (ADR-0007): staff scan a guest's Unlock QR or find them by name. Both
 * paths end in `checkInGuest`, which uses the admission once. Every attempt is
 * logged to `commerce-door-attempts`. Members' card tap (after launch) is a third
 * method on the same seam: resolve its admission, then call `doorCheckIn`.
 */
export type DoorMethod = "qr" | "name";
export type DoorRefusalCode =
  | QrRefusalCode
  | CheckInRefusalCode
  | "unknown-network"
  | "unknown-lock"
  | "unknown-token"
  | "key-not-active"
  | "unknown-admission"
  | "other-event";
export type DoorGuest = {
  admissionID: string;
  name: string;
  kind: "guest" | "member";
};
export type DoorResult =
  | {
      outcome: "admitted" | "already-checked-in";
      checkedInAt: string;
      guest: DoorGuest;
    }
  | { outcome: "refused"; code: DoorRefusalCode; guest?: DoorGuest };
export type DoorRequest = {
  req: PayloadRequest;
  eventID: string;
  signers?: readonly Address[];
} & ({ method: "qr"; scan: string } | { method: "name"; admissionID: string });

function doorStaffID(req: PayloadRequest): string {
  if (!isCmsStaff(req.user)) throw new Error("Door staff access required");
  return String(req.user!.id);
}

/** A named guest keeps their name; otherwise the claimed account, or the buyer's own seat. */
function memberOf(admission: CommerceDocument): string | undefined {
  if (admission.guestName) return;
  if (admission.claimedAccount != null)
    return relationshipID(admission.claimedAccount);
  if (admission.eventAccountKey != null) return relationshipID(admission.buyer);
}

function guestOf(
  admission: CommerceDocument,
  names: Map<string, string>
): DoorGuest {
  const memberID = memberOf(admission);
  return memberID
    ? {
        admissionID: admission.id,
        name: names.get(memberID) ?? "",
        kind: "member"
      }
    : {
        admissionID: admission.id,
        name: String(admission.guestName ?? ""),
        kind: "guest"
      };
}

async function memberNames(
  req: PayloadRequest,
  admissions: CommerceDocument[]
): Promise<Map<string, string>> {
  const ids = [
    ...new Set(admissions.map(memberOf).filter((value) => value !== undefined))
  ];
  if (!ids.length) return new Map();
  const found = await req.payload.find({
    collection: "users" as never,
    where: { id: { in: ids } },
    limit: ids.length,
    depth: 0,
    overrideAccess: true,
    req
  });
  return new Map(
    (found.docs as unknown as CommerceDocument[]).map((user) => [
      String(user.id),
      String(user.name ?? "")
    ])
  );
}

/** network + lockAddress + tokenId to one admission, through the key-grant record that holds the token. Never a chain read. */
async function admissionForKey(
  req: PayloadRequest,
  key: { network: number; lockAddress: string; tokenID: string }
): Promise<{ admissionID: string } | { code: DoorRefusalCode }> {
  if (!keyGrantChains.includes(key.network as never))
    return { code: "unknown-network" };
  const found = await req.payload.find({
    collection: "commerce-key-grant-intents" as never,
    where: { tokenID: { equals: key.tokenID } },
    limit: 20,
    depth: 0,
    overrideAccess: true,
    req
  });
  const onChain = (found.docs as unknown as CommerceDocument[]).filter(
    (intent) =>
      (intent.target as { chainID?: unknown } | null)?.chainID === key.network
  );
  if (!onChain.length) return { code: "unknown-token" };
  const held = onChain.filter(
    (intent) =>
      String((intent.target as { lock?: unknown }).lock ?? "").toLowerCase() ===
      key.lockAddress
  );
  if (!held.length) return { code: "unknown-lock" };
  if (held.length !== 1)
    throw new Error("Key-grant records disagree on this token");
  if (held[0].state !== "granted") return { code: "key-not-active" };
  return { admissionID: relationshipID(held[0].entitlement) };
}

async function attempt(
  input: DoorRequest
): Promise<{ result: DoorResult; admissionID?: string; tokenID?: string }> {
  const { req, eventID } = input;
  await readCommerce(req, "commerce-events", eventID);
  let admissionID: string;
  let tokenID: string | undefined;
  if (input.method === "qr") {
    const verified = await verifyUnlockQr(input.scan, input.signers);
    if (!verified.ok)
      return { result: { outcome: "refused", code: verified.code } };
    tokenID = verified.key.tokenID;
    const mapped = await admissionForKey(req, verified.key);
    if ("code" in mapped)
      return { result: { outcome: "refused", code: mapped.code }, tokenID };
    admissionID = mapped.admissionID;
  } else admissionID = input.admissionID;
  const admission = await findCommerce(
    req,
    "commerce-admissions",
    "id",
    admissionID
  );
  if (!admission)
    return {
      result: { outcome: "refused", code: "unknown-admission" },
      tokenID
    };
  if (relationshipID(admission.event) !== eventID)
    return { result: { outcome: "refused", code: "other-event" }, tokenID };
  const guest = guestOf(admission, await memberNames(req, [admission]));
  try {
    const checked = await checkInGuest({ req, admissionID });
    return { result: { ...checked, guest }, admissionID, tokenID };
  } catch (error) {
    if (error instanceof CheckInRefusal)
      return {
        result: { outcome: "refused", code: error.code, guest },
        admissionID,
        tokenID
      };
    throw error;
  }
}

function logAttempt(
  req: PayloadRequest,
  input: DoorRequest,
  operator: string,
  entry: { result?: DoorResult; admissionID?: string; tokenID?: string }
) {
  const result = entry.result;
  return createCommerce(req, "commerce-door-attempts", {
    operator,
    event: input.eventID,
    method: input.method,
    result: result?.outcome ?? "refused",
    reason:
      result?.outcome === "refused" ? result.code : result ? null : "error",
    ...(entry.admissionID ? { admission: entry.admissionID } : {}),
    ...(entry.tokenID ? { tokenID: entry.tokenID } : {}),
    attemptedAt: new Date().toISOString()
  });
}

/** One door attempt: resolve, check in (or refuse), and log it in the same transaction. */
export async function doorCheckIn(input: DoorRequest): Promise<DoorResult> {
  const operator = doorStaffID(input.req);
  try {
    return await inCommerceTransaction(input.req, async () => {
      const entry = await attempt(input);
      await logAttempt(input.req, input, operator, entry);
      return entry.result;
    });
  } catch (error) {
    // The attempt rolled back; still record that it happened, then surface the failure.
    try {
      await inCommerceTransaction(input.req, () =>
        logAttempt(input.req, input, operator, {})
      );
    } catch (logError) {
      input.req.payload.logger.error({
        err: logError,
        msg: "Door attempt log failed"
      });
    }
    throw error;
  }
}

const listed = ["available", "claimed", "checked-in", "revoked"];

async function eventAdmissions(
  req: PayloadRequest,
  eventID: string
): Promise<CommerceDocument[]> {
  const rows: CommerceDocument[] = [];
  for (let page = 1; page <= 50; page++) {
    const found = await req.payload.find({
      collection: "commerce-admissions" as never,
      where: {
        and: [{ event: { equals: eventID } }, { status: { in: listed } }]
      },
      limit: 200,
      page,
      sort: "id",
      depth: 0,
      overrideAccess: true,
      req
    });
    rows.push(...(found.docs as unknown as CommerceDocument[]));
    if (found.docs.length < 200) break;
  }
  return rows;
}

const normalise = (value: string) =>
  value.normalize("NFC").toLocaleLowerCase().replace(/\s+/g, " ").trim();

export type DoorSearchRow = DoorGuest & {
  status: string;
  checkedInAt: string | null;
};

/** Name fallback: an event's admissions whose guest or member name contains the query. */
export async function searchDoorAdmissions({
  req,
  eventID,
  query
}: {
  req: PayloadRequest;
  eventID: string;
  query: string;
}): Promise<DoorSearchRow[]> {
  doorStaffID(req);
  const needle = normalise(String(query ?? "")).slice(0, 100);
  if (!needle) return [];
  await readCommerce(req, "commerce-events", eventID);
  const rows = await eventAdmissions(req, eventID);
  const names = await memberNames(req, rows);
  const result: DoorSearchRow[] = [];
  for (const row of rows) {
    const guest = guestOf(row, names);
    if (!guest.name || !normalise(guest.name).includes(needle)) continue;
    result.push({
      ...guest,
      status: String(row.status),
      checkedInAt: row.checkedInAt ? String(row.checkedInAt) : null
    });
    if (result.length >= 20) break;
  }
  return result;
}

/** The door's running count: checked in, out of the event's admissions that can still enter or have. */
export async function doorCount({
  req,
  eventID
}: {
  req: PayloadRequest;
  eventID: string;
}): Promise<{ checkedIn: number; total: number }> {
  doorStaffID(req);
  const count = async (status: string[]) =>
    (
      await req.payload.find({
        collection: "commerce-admissions" as never,
        where: {
          and: [{ event: { equals: eventID } }, { status: { in: status } }]
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req
      })
    ).totalDocs;
  return {
    checkedIn: await count(["checked-in"]),
    total: await count(["available", "claimed", "checked-in"])
  };
}
