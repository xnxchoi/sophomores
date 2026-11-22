import { randomUUID } from "node:crypto";
import { sql, type PostgresAdapter } from "@payloadcms/db-postgres";
import type { PayloadRequest } from "payload";

type Transaction = PostgresAdapter["sessions"][string]["db"];
const inFlight = new WeakSet<PayloadRequest>();

export async function inNfcTransaction<T>(req: PayloadRequest, work: (tx: Transaction) => Promise<T>): Promise<T> {
  const adapter = req.payload.db as unknown as PostgresAdapter;
  if (req.transactionID || inFlight.has(req) || adapter.name !== "postgres" || !adapter.sessions
    || adapter.transactionOptions === false) throw new Error("NFC requires an owned PostgreSQL transaction");
  inFlight.add(req);
  const id = randomUUID();
  try {
    await adapter.initializing;
    return await adapter.drizzle.transaction(async (tx) => {
      let ended = false;
      const markEnded = async () => { ended = true; };
      // Payload's convenience commit can hide a driver rejection. Let native
      // Drizzle acknowledge commit and attach the same tx to the Local API req.
      const session = { db: tx, resolve: markEnded, reject: markEnded };
      adapter.sessions[id] = session;
      req.transactionID = id;
      try {
        const result = await work(tx);
        if (ended || req.transactionID !== id || adapter.sessions[id] !== session) {
          throw new Error("NFC transaction ownership lost");
        }
        return result;
      } finally {
        if (adapter.sessions[id] === session) delete adapter.sessions[id];
        if (req.transactionID === id) delete req.transactionID;
      }
    }, { isolationLevel: "read committed" });
  } finally {
    inFlight.delete(req);
  }
}

export async function lockNfcCards(tx: Transaction, refs: readonly string[]): Promise<void> {
  for (const ref of [...new Set(refs)].sort()) {
    await tx.execute(sql`SELECT id FROM nfc_cards WHERE ref = ${ref} FOR UPDATE`);
  }
}

export async function lockNfcMember(tx: Transaction, id: string): Promise<boolean> {
  const result = await tx.execute(sql`SELECT id FROM users WHERE id = ${id}::uuid FOR UPDATE`);
  return result.rows.length === 1;
}
