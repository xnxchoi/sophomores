import type { Payload } from "payload";

export type Row = Record<string, unknown> & { id: string };

/** Provider-free payload model for the worker; not PostgreSQL evidence. */
export function fakePayload(intents: Row[], admissions: Row[] = [{ id: "adm", status: "available" }]) {
  const rows: Record<string, Row[]> = { "commerce-key-grant-intents": intents, "commerce-admissions": admissions };
  const sessions: Record<string, { db: { execute: () => Promise<void> } }> = {};
  let sequence = 0;
  const matches = (doc: Row, where: Record<string, unknown>): boolean => Array.isArray(where.and)
    ? where.and.every((part) => matches(doc, part as Record<string, unknown>))
    : Object.entries(where).every(([field, condition]) => {
      if (field === "or") return (condition as Record<string, unknown>[]).some((part) => matches(doc, part));
      const filter = condition as { equals?: unknown; in?: unknown[]; not_in?: unknown[]; exists?: boolean; less_than_equal?: string };
      if (filter.exists !== undefined) return (doc[field] != null) === filter.exists;
      // SQL semantics: NULL is never NOT IN a list.
      if (filter.not_in) return doc[field] != null && !filter.not_in.includes(doc[field]);
      if (filter.less_than_equal !== undefined) return doc[field] != null && String(doc[field]) <= filter.less_than_equal;
      return filter.in ? filter.in.includes(doc[field]) : doc[field] === filter.equals;
    });
  const payload = {
    db: { name: "postgres", sessions,
      beginTransaction: async () => { const id = `tx-${++sequence}`; sessions[id] = { db: { execute: async () => undefined } }; return id; },
      commitTransaction: async (id: string) => { delete sessions[id]; },
      rollbackTransaction: async (id: string) => { delete sessions[id]; } },
    find: async ({ collection, where, limit, page = 1, sort }: { collection: string; where: Record<string, unknown>; limit: number; page?: number; sort?: string }) => {
      const all = rows[collection].filter((doc) => matches(doc, where));
      if (sort) all.sort((x, y) => String(x[sort] ?? "").localeCompare(String(y[sort] ?? "")));
      const docs = all.slice((page - 1) * limit, page * limit);
      return { docs: structuredClone(docs), totalDocs: all.length, hasNextPage: page * limit < all.length };
    },
    findByID: async ({ collection, id }: { collection: string; id: string }) => structuredClone(rows[collection].find((doc) => doc.id === id)!),
    update: async ({ collection, id, data }: { collection: string; id: string; data: Row }) => {
      const doc = rows[collection].find((entry) => entry.id === id)!;
      Object.assign(doc, data);
      return structuredClone(doc);
    },
  } as unknown as Payload;
  return { payload, rows };
}
