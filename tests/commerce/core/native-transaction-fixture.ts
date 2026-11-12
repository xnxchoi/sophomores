import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { postgresAdapter, type PostgresAdapter } from "@payloadcms/db-postgres";
import type { Payload, PayloadRequest } from "payload";

const adapterRequire = createRequire(createRequire(import.meta.url).resolve("@payloadcms/db-postgres"));
const drizzleRequire = createRequire(adapterRequire.resolve("@payloadcms/drizzle"));

export type NativeFaults = {
  commitError?: Error;
  rollbackError?: Error;
  disabled?: boolean;
  onQuery?: (kind: string) => void | Promise<void>;
};

/** Installed native SQL control flow with an inert query client, NOT a database. */
export async function nativeTransactionFixture(faults: NativeFaults = {}) {
  const nativeModule: unknown = await import(pathToFileURL(drizzleRequire.resolve("drizzle-orm/node-postgres")).href);
  assert.ok(nativeModule && typeof nativeModule === "object" && "drizzle" in nativeModule && typeof nativeModule.drizzle === "function");
  const events: string[] = [];
  const client = { query: async (query: string | { text: string }) => {
    const text = typeof query === "string" ? query : query.text;
    const kind = text.trim().split(/\s+/, 1)[0].toLowerCase();
    events.push(kind);
    await faults.onQuery?.(kind);
    if (kind === "commit" && faults.commitError) throw faults.commitError;
    if (kind === "rollback" && faults.rollbackError) throw faults.rollbackError;
    return { rows: [] };
  } };
  const native = nativeModule.drizzle(client) as PostgresAdapter["drizzle"];
  // Factory construction only: no init/connect, pool, .env or provider transport.
  const adapter = postgresAdapter({ pool: {}, migrationDir: "tests/commerce/core", transactionOptions: faults.disabled ? false : undefined })
    .init({ payload: { logger: { error: () => {} } } as unknown as Payload });
  adapter.resolveInitializing();
  adapter.drizzle = native;
  const req = { payload: { db: adapter, logger: { error: () => {} } } } as unknown as PayloadRequest;
  const captured = new Set<PostgresAdapter["sessions"][string]>();
  const capture = async () => {
    const id = await req.transactionID;
    if (id && adapter.sessions[String(id)]) captured.add(adapter.sessions[String(id)]);
  };
  return { req, adapter, events, capture,
    cleanup: async () => { for (const session of captured) await session.reject(); },
  };
}
