import type { PayloadRequest } from "payload";

type Doc = Record<string, unknown> & { id: string };

/** Provider-free serialized transaction model, NOT PostgreSQL acceptance evidence. */
export function commerceStorageFake(seed: Record<string, Doc[]>) {
  const rows = structuredClone(seed);
  let sequence = 0;
  let tail: Promise<void> = Promise.resolve();
  const sessions: Record<string, { db: { execute: () => Promise<void> } }> = {};
  const matches = (doc: Doc, where: Record<string, unknown>): boolean => {
    if (Array.isArray(where.and)) return where.and.every((part) => matches(doc, part as Record<string, unknown>));
    return Object.entries(where).every(([field, condition]) => {
      const filter = condition as { equals?: unknown; in?: unknown[] };
      return filter.in ? filter.in.includes(doc[field]) : doc[field] === filter.equals;
    });
  };
  async function transaction<T>(user: Record<string, unknown>, work: (req: PayloadRequest) => Promise<T>): Promise<T> {
    const transactionID = `tx-${++sequence}`;
    let unlock: (() => void) | undefined;
    let waiting: Promise<void> | undefined;
    sessions[transactionID] = { db: { execute: async () => {
      if (!waiting) {
        const previous = tail;
        tail = new Promise<void>((resolve) => { unlock = resolve; });
        waiting = previous;
      }
      await waiting;
    } } };
    const verify = (args: { req?: PayloadRequest }) => {
      if (args.req?.transactionID !== transactionID) throw new Error("Lost fake transaction request");
    };
    const payload = {
      db: { name: "postgres", sessions,
      findOne: async (args: { collection: string; where: Record<string, unknown>; req: PayloadRequest }) => {
        verify(args);
        const doc = rows[args.collection]?.find((entry) => matches(entry, args.where));
        return doc ? structuredClone(doc) : null;
      }, updateOne: async (args: { collection: string; id: string; data: Record<string, { $inc: number }>; req: PayloadRequest }) => {
        verify(args);
        let updated: Doc | undefined;
        rows[args.collection] = rows[args.collection].map((doc) => {
          if (doc.id !== args.id) return doc;
          updated = Object.fromEntries(Object.entries(args.data).map(([field, operation]) => [field, Number(doc[field]) + operation.$inc])) as Doc;
          updated = { ...doc, ...updated };
          return updated;
        });
        return updated ? structuredClone(updated) : undefined;
      } },
      findByID: async (args: { collection: string; id: string; req: PayloadRequest }) => {
        verify(args);
        const row = rows[args.collection]?.find((doc) => doc.id === args.id);
        if (!row) throw new Error("Fake document missing");
        return structuredClone(row);
      },
      find: async (args: { collection: string; where: Record<string, unknown>; limit: number; req: PayloadRequest }) => {
        verify(args);
        const docs = (rows[args.collection] ?? []).filter((doc) => matches(doc, args.where));
        return { docs: structuredClone(docs.slice(0, args.limit)), totalDocs: docs.length };
      },
      create: async (args: { collection: string; data: Record<string, unknown>; req: PayloadRequest }) => {
        verify(args);
        const doc = { ...structuredClone(args.data), id: `doc-${++sequence}` };
        rows[args.collection] = [...(rows[args.collection] ?? []), doc];
        return structuredClone(doc);
      },
      update: async (args: { collection: string; id: string; data: Record<string, unknown>; req: PayloadRequest }) => {
        verify(args);
        let updated: Doc | undefined;
        rows[args.collection] = rows[args.collection].map((doc) => {
          if (doc.id !== args.id) return doc;
          const version = args.collection === "products" ? seed.products?.find((entry) => entry.id === args.id) : undefined;
          // Models Payload's latest-version fallback, so a Local API counter
          // write after a raw plugin decrement would restore stale inventory.
          updated = { ...doc, ...structuredClone(args.data), ...(version ? { inventory: version.inventory } : {}) };
          return updated;
        });
        if (!updated) throw new Error("Fake document missing");
        return structuredClone(updated);
      },
    };
    const req = { transactionID, payload, user } as unknown as PayloadRequest;
    try { return await work(req); }
    finally { unlock?.(); delete sessions[transactionID]; }
  }
  return { transaction, rows };
}

export function saleSeed(inventory = 10, capacity = 10) {
  return {
    orders: [{ id: "order", commerceVersion: "commerce-v1", commerceAttemptID: "attempt", transactions: ["transaction"] }],
    transactions: [{ id: "transaction", status: "succeeded", order: "order" }],
    products: [{ id: "p", inventory, reservedQuantity: 0, event: "e", publicationApproved: true, _status: "published", saleStartsAt: new Date(Date.now() - 60_000).toISOString(), saleEndsAt: new Date(Date.now() + 600_000).toISOString() }],
    "commerce-events": [{ id: "e", capacity, reservedQuantity: 0, committedQuantity: 0, publicationApproved: true, transportCapacity: capacity, partIStartsAt: new Date(Date.now() - 1000).toISOString(), partIEndsAt: new Date(Date.now() + 600_000).toISOString(), claimCutoffAt: new Date(Date.now() + 60_000).toISOString() }],
  };
}
