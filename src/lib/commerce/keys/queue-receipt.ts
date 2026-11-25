import type { Payload, PayloadRequest } from "payload";
import { parseKeyGrantTarget, signerAccountID } from "./contracts";
import { polygonLockPinned, POLYGON_CHAIN_ID, type PolygonPins } from "./unlock/polygon";

/*
 * The read-only queue receipt (VPS plan v4 H1): what a key-grant tick would work on, taken before every supervised
 * run so the first-run allowlist can be set to exactly the owner-approved intents.
 * - Every admitted chain-137 intent the worker can still act on, by intent UUID (one per admission, not per order):
 *   awaiting_wallet, pending, submitted, failed_retryable and ambiguous, plus granted keys with a refund cancel
 *   requested. An intent whose target can't be read is listed too (target_unknown / target_unset): it can't be shown
 *   not to be chain 137.
 * - Every submitted or ambiguous intent of the given signer address (stored as its CAIP-10 account on chain 137),
 *   whatever its target.
 * - Per intent: state, attempts, nonce, whether a hash is recorded, how many sends, and a target check (chain 137, a
 *   pinned lock, and the recipient equal to the member's active Safe record).
 * It is complete or it fails: a read error, a page past the cap, or a count that moved between pages throws
 * ReceiptIncomplete. Zero rows is reported only after a complete read. No address, name, email or order is printed.
 * Every read goes through `req`: the script passes one REPEATABLE READ, READ ONLY transaction, so all pages and the
 * wallet checks see one snapshot; pages are ordered by id (unique), so the order is deterministic (Review-A, 26 Nov).
 */
export class ReceiptIncomplete extends Error { constructor() { super("receipt_incomplete"); } }

const WORK_STATES = ["awaiting_wallet", "pending", "submitted", "failed_retryable", "ambiguous"] as const;
const PAGE = 100;
const MAX_ROWS = 5_000;

type Row = Record<string, unknown> & { id: string };
export type ReceiptTarget = "ok" | "target_unset" | "target_unknown" | "chain_other" | "lock_unpinned" |
  "guest_recipient" | "recipient_mismatch";
export type ReceiptLine = Readonly<{
  intent: string; state: string; attempts: number; nonce: number | null; hasTxHash: boolean; sends: number;
  cancelRequested: boolean; target: ReceiptTarget; signerInFlight: boolean;
}>;
export type QueueReceipt = Readonly<{ lines: readonly ReceiptLine[]; summary: Readonly<{ receipt: "complete"; intents: number; byState: Readonly<Record<string, number>> }> }>;

/** Every row matching `where`, or ReceiptIncomplete: the total must hold on every page and match what was read. */
async function readAll(payload: Payload, where: Record<string, unknown>, req?: Partial<PayloadRequest>): Promise<Row[]> {
  const rows: Row[] = [];
  let total: number | undefined;
  for (let page = 1; ; page++) {
    const found = await payload.find({ collection: "commerce-key-grant-intents" as never, where: where as never, sort: "id",
      limit: PAGE, page, depth: 0, overrideAccess: true, ...(req ? { req } : {}) });
    total ??= found.totalDocs;
    if (found.totalDocs !== total || total > MAX_ROWS) throw new ReceiptIncomplete();
    rows.push(...(found.docs as unknown as Row[]));
    if (!found.hasNextPage) break;
  }
  if (rows.length !== total || new Set(rows.map((row) => row.id)).size !== rows.length) throw new ReceiptIncomplete();
  return rows;
}

async function targetCheck(payload: Payload, row: Row, pins: PolygonPins, req?: Partial<PayloadRequest>): Promise<ReceiptTarget> {
  if (row.target == null) return "target_unset";
  let target: ReturnType<typeof parseKeyGrantTarget>;
  try { target = parseKeyGrantTarget(row.target); } catch { return "target_unknown"; }
  if (target.chainID !== POLYGON_CHAIN_ID) return "chain_other";
  if (!polygonLockPinned(target.lock, pins)) return "lock_unpinned";
  if (row.recipientMode !== "member_safe") return "guest_recipient";
  const member = typeof row.beneficiaryUser === "object" && row.beneficiaryUser ? (row.beneficiaryUser as { id?: unknown }).id : row.beneficiaryUser;
  if (member == null) return "recipient_mismatch";
  const wallets = await payload.find({ collection: "member-wallets" as never, where: { activeSlot: { equals: String(member) } } as never,
    limit: 2, depth: 0, overrideAccess: true, ...(req ? { req } : {}) });
  const [wallet] = wallets.docs as unknown as Record<string, unknown>[];
  return wallets.totalDocs === 1 && wallet && wallet.status === "active" &&
    String(wallet.safeAddress).toLowerCase() === target.recipient.toLowerCase() &&
    wallet.walletKey === `${POLYGON_CHAIN_ID}:${String(wallet.safeAddress)}` ? "ok" : "recipient_mismatch";
}

const chainOf = (row: Row): number | "unknown" => {
  try { return parseKeyGrantTarget(row.target).chainID; } catch { return "unknown"; }
};

export async function readKeyGrantQueue({ payload, signer, pins, req }: { payload: Payload; signer: string; pins: PolygonPins; req?: Partial<PayloadRequest> }): Promise<QueueReceipt> {
  if (!/^0x[0-9a-fA-F]{40}$/.test(signer)) throw new ReceiptIncomplete();
  const work = await readAll(payload, { or: [{ state: { in: [...WORK_STATES] } },
    { and: [{ state: { equals: "granted" } }, { cancelRequested: { equals: true } }] }] }, req);
  const mine = await readAll(payload, { and: [{ signer: { equals: signerAccountID(POLYGON_CHAIN_ID, signer) } }, { state: { in: ["submitted", "ambiguous"] } }] }, req);
  const byID = new Map<string, Row>();
  for (const row of work) if (chainOf(row) === POLYGON_CHAIN_ID || chainOf(row) === "unknown") byID.set(row.id, row);
  const signerIDs = new Set(mine.map((row) => row.id));
  for (const row of mine) byID.set(row.id, row);
  const lines: ReceiptLine[] = [];
  const byState: Record<string, number> = {};
  for (const row of byID.values()) {
    const state = String(row.state);
    byState[state] = (byState[state] ?? 0) + 1;
    lines.push({
      intent: row.id, state, attempts: Number(row.attempts) || 0,
      nonce: row.nonce == null ? null : Number(row.nonce), hasTxHash: typeof row.txHash === "string" && row.txHash.length > 0,
      sends: Array.isArray(row.sends) ? row.sends.length : 0, cancelRequested: row.cancelRequested === true,
      target: await targetCheck(payload, row, pins, req), signerInFlight: signerIDs.has(row.id),
    });
  }
  return { lines, summary: { receipt: "complete", intents: lines.length, byState } };
}
