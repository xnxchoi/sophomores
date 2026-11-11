import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import type { Payload, PayloadRequest } from "payload";
import type { PostgresAdapter } from "@payloadcms/db-postgres";
import { postgresAdapter, sql } from "@payloadcms/db-postgres";
import { createGuestOperationsEndpoint } from "../../../src/lib/commerce/domain";

// Resolve the already-installed transitive dependency through its actual owner.
// No pg connection, environment loading or provider transport is involved.
const payloadEntry = createRequire(createRequire(import.meta.url).resolve("@payloadcms/db-postgres")).resolve("@payloadcms/drizzle");
const packageRequire = createRequire(payloadEntry);
type FakeClient = { query: (query: string | { text: string }, values?: unknown[]) => Promise<{ rows: unknown[] }> };

export type NativeFixtureOptions = {
  rollbackError?: Error;
  startError?: Error;
  commitError?: Error;
  swallowNativeRejection?: boolean;
  inherited?: boolean;
  disabledTransactions?: boolean;
  onQuery?: (kind: string) => void | Promise<void>;
  body?: unknown;
  user?: Record<string, unknown> | null;
  originHeader?: string;
  runtime?: boolean;
  principalID?: string;
};

export async function nativeClaimFixture(action: (req: PayloadRequest) => Promise<{ admissionID: string }>, options: NativeFixtureOptions = {}) {
  const nativeModule: unknown = await import(pathToFileURL(packageRequire.resolve("drizzle-orm/node-postgres")).href);
  assert.ok(typeof nativeModule === "object" && nativeModule !== null && "drizzle" in nativeModule && typeof nativeModule.drizzle === "function");
  const nativeDrizzle = nativeModule.drizzle as (client: FakeClient) => PostgresAdapter["drizzle"];

  const events: string[] = [];
  const calls = { claim: 0, local: 0, fallback: 0 };
  const captured = new Set<PostgresAdapter["sessions"][string]>();
  const client: FakeClient = { query: async (query) => {
    const text = typeof query === "string" ? query : query.text;
    const kind = text.trim().split(/\s+/, 1)[0].toLowerCase();
    events.push(kind); await options.onQuery?.(kind);
    if (kind === "begin" && options.startError) throw options.startError;
    if (kind === "rollback" && options.rollbackError) throw options.rollbackError;
    if (kind === "commit" && options.commitError) throw options.commitError;
    return { rows: [] };
  } };
  const native = nativeDrizzle(client);
  assert.equal(typeof native.transaction, "function");
  // Construct only the installed adapter object; never connect or initialize DB.
  const adapter = postgresAdapter({ pool: {}, migrationDir: "tests/commerce/domain", transactionOptions: options.disabledTransactions ? false : undefined }).init({ payload: { logger: { error: () => {} } } as unknown as Payload });
  adapter.resolveInitializing();
  adapter.drizzle = native;
  if (options.swallowNativeRejection) {
    const original = native.transaction.bind(native);
    adapter.drizzle = Object.assign(Object.create(native), { transaction: (...args: Parameters<typeof original>) => original(...args).catch(() => undefined) });
  }
  const origin = "http://localhost:3129";
  const request = new Request(origin + "/api/commerce/guest-operations", { method: "POST", headers: { Origin: options.originHeader ?? origin, "Content-Type": "application/json" }, body: JSON.stringify(options.body ?? { action: "claim", token: "a".repeat(43) }) });
  const local = async () => {
    calls.local++;
    const id = await req.transactionID;
    const session = id ? adapter.sessions[String(id)] : undefined;
    // Faithful installed getTransaction behavior: missing session uses the pool DB.
    if (!session) calls.fallback++;
    await (session?.db ?? adapter.drizzle).execute(sql`select 1`);
    return { id: "record" };
  };
  const req: PayloadRequest = { url: request.url, headers: request.headers, body: request.body,
    user: options.user === undefined ? { collection: "users", id: "guest" } : options.user, payload: {
      db: adapter, logger: { error: () => {} },
      findByID: local, find: async () => ({ docs: [await local()] }), create: local, update: local,
    } } as unknown as PayloadRequest;
  const foreign: PostgresAdapter["sessions"][string] = { db: native as unknown as PostgresAdapter["sessions"][string]["db"], reject: async () => {}, resolve: async () => {} };
  adapter.sessions.foreign = foreign;
  if (options.inherited) req.transactionID = "foreign";
  const endpoint = createGuestOperationsEndpoint({
    getMemberRuntime: () => options.runtime === false ? null : ({ config: { origin }, toMemberPrincipal: async () => ({ userId: options.principalID ?? "guest", emailVerified: true }) }),
    claimAdmission: async ({ req: current }) => {
      calls.claim++;
      const id = await current.transactionID;
      if (id && adapter.sessions[String(id)]) captured.add(adapter.sessions[String(id)]);
      return action(current);
    },
  });
  return { req, adapter, foreign, calls, events, run: () => endpoint.handler(req),
    cleanup: async () => { for (const session of captured) await session.reject(); } };
}
