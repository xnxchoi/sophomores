import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Payload } from "payload";
import { HOME_PAGE_SEED_IDS, seedInitialHomePage } from "@/payload/seed/home-page";

type Doc = { id: string; [key: string]: unknown };

/**
 * An in-memory stand-in for the Local API over one database shared by "processes". Writes are staged per
 * transaction and become visible on commit; a create holds its id until commit or rollback, and a second
 * create of a held id waits, then clashes, as a primary key does in PostgreSQL.
 */
function store() {
  return { docs: new Map<string, Doc>(), locks: new Map<string, Promise<void>>() };
}

function fakePayload(shared = store(), options: { readOnly?: boolean; failOnCreate?: number } = {}) {
  const events: string[] = [];
  const logs = { warn: 0, error: 0 };
  const pending = new Map<string, Doc>();
  let release = () => {};
  let held: Promise<void> | null = null;
  let creates = 0;
  const end = (keep: boolean) => {
    if (keep) for (const [id, doc] of pending) shared.docs.set(id, doc);
    for (const id of pending.keys()) shared.locks.delete(id);
    pending.clear();
    release();
    held = null;
  };
  const payload = {
    config: { i18n: { fallbackLanguage: "en", supportedLanguages: { en: { dateFNSKey: "en-US", translations: {} } }, translations: {} }, admin: { user: "admins" } },
    logger: { warn: () => { logs.warn++; }, error: () => { logs.error++; }, info: () => {} },
    db: {
      beginTransaction: async () => { events.push("begin"); return "tx"; },
      commitTransaction: async () => { events.push("commit"); end(true); },
      rollbackTransaction: async () => { events.push("rollback"); end(false); },
    },
    find: async () => {
      events.push("find");
      return { totalDocs: shared.docs.size, docs: [...shared.docs.values()] };
    },
    findByID: async ({ id }: { id: string }) => shared.docs.get(id) ?? null,
    create: async ({ data, locale, context }: { data: Doc; locale: string; context: Record<string, unknown> }) => {
      events.push(`create:${locale}`);
      // Yield first, so concurrent seeds interleave as two processes would.
      await new Promise((resolve) => setImmediate(resolve));
      if (options.readOnly) throw Object.assign(new Error("query failed"), { cause: { code: "25006" } });
      if (++creates === options.failOnCreate) throw new Error("synthetic failure");
      assert.equal(context.serverChosenID, data.id, "the fixed id must be opted in as server-chosen");
      const other = shared.locks.get(data.id);
      if (other && other !== held) await other;
      // The adapter turns a primary-key clash into a ValidationError with no driver cause.
      if (shared.docs.has(data.id)) throw Object.assign(new Error("The following field is invalid: id"), { name: "ValidationError" });
      held ??= new Promise<void>((resolve) => { release = resolve; });
      shared.locks.set(data.id, held);
      const doc = { ...data, stories: [{ id: `${data.id}-s` }], messages: [{ id: `${data.id}-m` }] };
      pending.set(data.id, doc);
      return doc;
    },
    update: async ({ id, locale }: { id: string; locale: string }) => {
      events.push(`update:${locale}`);
      return pending.get(id) ?? shared.docs.get(id);
    },
  };
  return { payload: payload as unknown as Payload, events, logs, shared };
}

test("the first seed writes the fallback and published copies once, in one transaction", async () => {
  const { payload, events, shared, logs } = fakePayload();
  assert.equal(await seedInitialHomePage(payload), "seeded");
  assert.deepEqual([...shared.docs.keys()], [HOME_PAGE_SEED_IDS.fallback, HOME_PAGE_SEED_IDS.published]);
  assert.equal(shared.docs.get(HOME_PAGE_SEED_IDS.fallback)?.isFallback, true);
  assert.equal(shared.docs.get(HOME_PAGE_SEED_IDS.fallback)?._status, "draft");
  assert.equal(shared.docs.get(HOME_PAGE_SEED_IDS.published)?._status, "published");
  assert.deepEqual(events, ["find", "begin", "create:en", "update:ko", "create:en", "update:ko", "commit"]);
  assert.deepEqual(logs, { warn: 0, error: 0 });
});

test("a second seed is a no-op", async () => {
  const shared = store();
  await seedInitialHomePage(fakePayload(shared).payload);
  const second = fakePayload(shared);
  assert.equal(await seedInitialHomePage(second.payload), "present");
  assert.deepEqual(second.events, ["find"]);
  assert.equal(shared.docs.size, 2);
});

test("two seeds at once write no duplicates", async () => {
  const shared = store();
  const a = fakePayload(shared);
  const b = fakePayload(shared);
  const results = await Promise.all([seedInitialHomePage(a.payload), seedInitialHomePage(b.payload)]);
  assert.equal(shared.docs.size, 2);
  assert.ok(results.every((result) => result === "seeded" || result === "present"), String(results));
  assert.ok([...a.events, ...b.events].includes("rollback"), "the losing seed must roll back");
  assert.ok(results.includes("seeded") && results.includes("present"), String(results));
  assert.deepEqual({ a: a.logs.error, b: b.logs.error }, { a: 0, b: 0 });
});

test("a failed seed writes nothing, logs once and can simply be rerun", async () => {
  const shared = store();
  const failed = fakePayload(shared, { failOnCreate: 2 });
  assert.equal(await seedInitialHomePage(failed.payload), "failed");
  assert.equal(shared.docs.size, 0, "the committed-nothing case: no fallback without the published copy");
  assert.equal(failed.events.at(-1), "rollback");
  assert.deepEqual(failed.logs, { warn: 0, error: 1 });
  assert.equal(await seedInitialHomePage(fakePayload(shared).payload), "seeded");
  assert.equal(shared.docs.size, 2);
});

test("a read-only database skips the seed with one warning and no crash", async () => {
  const { payload, shared, logs, events } = fakePayload(store(), { readOnly: true });
  assert.equal(await seedInitialHomePage(payload), "read-only");
  assert.equal(shared.docs.size, 0);
  assert.deepEqual(logs, { warn: 1, error: 0 });
  assert.deepEqual(events, ["find", "begin", "create:en", "rollback"]);
});

// Static source checks: the seed is explicit, as in The Hideaway, never at startup.
test("nothing seeds at startup; the operator script is the entry", () => {
  const config = readFileSync(new URL("../../src/payload.config.ts", import.meta.url), "utf8");
  assert.equal(/seed/i.test(config), false, "payload.config.ts must not seed (onInit or plugin)");
  const script = readFileSync(new URL("../../scripts/seed-homepage-copies.ts", import.meta.url), "utf8");
  assert.match(script, /seedInitialHomePage\(payload\)/);
});

// Static source check: the route itself, not a render of it.
test("GET /api/globals/home-page never writes", () => {
  const source = readFileSync(new URL("../../src/app/api/globals/home-page/route.ts", import.meta.url), "utf8");
  assert.equal(/\.(create|update|delete|updateGlobal)\s*\(/.test(source), false);
  assert.equal(/seed/i.test(source.replace(/\/\/.*$/gm, "")), false);
  assert.match(source, /homePageDefaultsResponse\(locale\)/);
});
