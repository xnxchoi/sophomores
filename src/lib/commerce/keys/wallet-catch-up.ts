import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { sql, type PostgresAdapter } from "@payloadcms/db-postgres";
import type { Payload, PayloadRequest } from "payload";
import { z } from "zod";
import { withCommerceWrite } from "../access";
import { createCommerce, findCommerce, inPaymentTransaction, lockCommerce, paymentTransactionToken, requirePaymentTransaction, updateCommerce, type CommerceDocument } from "../_shared/transaction";
import { attachWalletCatchUpPage, walletGrantConfiguration } from "./wallet-attachment";

export const WALLET_CATCH_UP_LIMITS = Object.freeze({
  transactions: 1, pages: 1, rows: 20, selectedRows: 21, locks: 81, deadlineMs: 5000,
});
const WORK = "member-wallet-catch-up";
const WORK_KEY = "wallet-targets:v1";
const instant = z.iso.datetime({ offset: true });
const positionSchema = z.object({
  configuration: z.string(), horizon: instant, cursorCreatedAt: instant.nullish(),
  cursorID: z.uuid().nullish(), cycleComplete: z.boolean(),
}).refine((value) => (value.cursorCreatedAt == null) === (value.cursorID == null));
const rowPosition = z.object({ id: z.uuid(), createdAt: instant });

export type WalletCatchUpResult = {
  inspected: number; moved: number; held: number; conflicts: number; cycleComplete: boolean;
};

async function nativeSession(req: PayloadRequest) {
  await requirePaymentTransaction(req);
  const id = paymentTransactionToken(req);
  const session = id && (req.payload.db as unknown as PostgresAdapter).sessions[id]?.db;
  if (!session) throw new Error("Wallet catch-up native transaction unavailable");
  return session;
}

async function nativeClock(req: PayloadRequest): Promise<string> {
  const session = await nativeSession(req);
  await session.execute(sql`SET LOCAL statement_timeout = '1500ms'`);
  await session.execute(sql`SET LOCAL lock_timeout = '750ms'`);
  await session.execute(sql`SET LOCAL idle_in_transaction_session_timeout = '3s'`);
  const { rows } = await session.execute(sql`SELECT date_trunc('milliseconds', transaction_timestamp()) AS horizon`);
  return new Date(String(rows[0]?.horizon)).toISOString();
}

const pageRow = rowPosition.extend({
  operationKey: z.string().min(1), order: z.uuid(), entitlement: z.uuid(), payment: z.uuid(),
  beneficiaryUser: z.uuid().nullable(),
});

/** Payload's OR filter cannot express an indexable tuple comparison. Read only the private work projection. */
export function walletCatchUpPageQuery(horizon: string, after?: { createdAt: string; id: string }) {
  return sql`SELECT id, created_at AS "createdAt", operation_key AS "operationKey",
    order_id AS "order", entitlement_id AS entitlement, payment_id AS payment, beneficiary_user_id AS "beneficiaryUser"
    FROM commerce_key_grant_intents
    WHERE state = 'awaiting_wallet' AND recipient_mode = 'member_safe'
      AND created_at <= ${horizon}::timestamptz
      ${after ? sql`AND (created_at, id) > (${after.createdAt}::timestamptz, ${after.id}::uuid)` : sql``}
    ORDER BY created_at, id
    LIMIT ${WALLET_CATCH_UP_LIMITS.selectedRows}`;
}

function assertPageOrder(rows: readonly CommerceDocument[], previous?: { createdAt: string; id: string }) {
  let cursor = previous;
  for (const entry of rows) {
    const row = rowPosition.parse(entry);
    const createdAt = new Date(row.createdAt).toISOString();
    if (cursor && (createdAt < cursor.createdAt || (createdAt === cursor.createdAt && row.id <= cursor.id))) {
      throw new Error("Wallet catch-up keyset order invalid");
    }
    cursor = { createdAt, id: row.id };
  }
  return cursor;
}

/** One bounded page and one owned transaction; attachment and checkpoint commit together. */
export async function catchUpKeyGrantTargets(payload: Payload): Promise<WalletCatchUpResult> {
  const configuration = walletGrantConfiguration(process.env);
  const empty = { inspected: 0, moved: 0, held: 0, conflicts: 0, cycleComplete: true };
  if (!configuration) return empty;
  const env = Object.freeze({
    MEMBER_WALLET_CHAIN_ID: String(configuration.wallet.chainID),
    MEMBER_WALLET_OWNER_ADDRESS: configuration.wallet.ownerAddress,
    MEMBER_WALLET_LOCK_ADDRESS: configuration.lock,
    UNLOCK_SHARED_TICKET_EVENT_ID: process.env.UNLOCK_SHARED_TICKET_EVENT_ID,
    KEY_GRANT_POLYGON_EVENT_LOCKS: process.env.KEY_GRANT_POLYGON_EVENT_LOCKS,
  });
  const fingerprint = createHash("sha256").update(JSON.stringify(env)).digest("hex");
  const req = { payload, context: {} } as PayloadRequest;
  const expires = performance.now() + WALLET_CATCH_UP_LIMITS.deadlineMs;
  const deadline = () => { if (performance.now() >= expires) throw new Error("Wallet catch-up deadline exceeded"); };
  return inPaymentTransaction(req, async () => {
    const now = await nativeClock(req);
    await lockCommerce(req, [WORK_KEY]);
    const state = await findCommerce(req, WORK, "workKey", WORK_KEY);
    const saved = state ? positionSchema.parse(state) : null;
    const active = saved && saved.configuration === fingerprint && !saved.cycleComplete ? saved : null;
    const horizon = active?.horizon ?? now;
    const after = active?.cursorCreatedAt && active.cursorID ? { createdAt: active.cursorCreatedAt, id: active.cursorID } : undefined;
    deadline();
    const found = await (await nativeSession(req)).execute(walletCatchUpPageQuery(horizon, after));
    await requirePaymentTransaction(req);
    if (found.rows.length > WALLET_CATCH_UP_LIMITS.selectedRows) throw new Error("Wallet catch-up page exceeded its limit");
    const page = found.rows.slice(0, WALLET_CATCH_UP_LIMITS.rows).map((row) =>
      pageRow.parse({ ...row, createdAt: new Date(String(row.createdAt)).toISOString() }));
    const cursor = assertPageOrder(page, after);
    const attachable = page.filter((row) => row.beneficiaryUser !== null);
    const outcomes = await attachWalletCatchUpPage(req, attachable, env, deadline);
    const result: WalletCatchUpResult = {
      inspected: page.length, moved: outcomes.filter((value) => value === "attached").length,
      conflicts: page.length - attachable.length + outcomes.filter((value) => value === "conflict").length,
      held: outcomes.filter((value) => value === "held" || value === "wallet-missing").length,
      cycleComplete: found.rows.length <= WALLET_CATCH_UP_LIMITS.rows,
    };
    const data = {
      configuration: fingerprint, horizon,
      cursorCreatedAt: result.cycleComplete ? null : cursor?.createdAt,
      cursorID: result.cycleComplete ? null : cursor?.id, cycleComplete: result.cycleComplete,
      lastInspected: result.inspected, lastMoved: result.moved, lastConflicts: result.conflicts,
      ...(result.cycleComplete ? { lastCompletedAt: now } : {}),
    };
    deadline();
    await withCommerceWrite(req, () => state
      ? updateCommerce(req, WORK, state.id, data)
      : createCommerce(req, WORK, { ...data, workKey: WORK_KEY }));
    deadline();
    return result;
  });
}
