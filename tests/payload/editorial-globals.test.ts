import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { commitTransaction, initTransaction, killTransaction, type Payload, type PayloadRequest } from "payload";
import { HelpContent, parseHelpCopy } from "@/payload/globals/help-content";
import { FEATURABLE_SETLIST, hideStaleFeaturedSetlist, loadSiteEditorial, parseSiteEditorial, SiteEditorial } from "@/payload/globals/site-editorial";
import { lockGlobal, lockGlobalBeforeUpdate } from "@/payload/globals/singleton-lock";
import { editorialEnsurePlugin, editorialSeeds, nonEmpty, seedEditorialGlobals } from "@/payload/seed/editorial";

type Global = Record<string, unknown>;
type Row = { id: string; en: Global; ko?: Global };
type Options = {
  readOnly?: boolean;
  noTransaction?: boolean;
  /** Runs once a writer holds a global's lock, before it reads whether the global exists. */
  onLock?: (slug: string, transactionID: string) => Promise<void> | void;
  failWrite?: (slug: string, transactionID: string) => boolean;
};

const GLOBALS: Record<string, typeof HelpContent> = { "help-content": HelpContent, "site-editorial": SiteEditorial };

/**
 * A PostgreSQL stand-in for the paths that matter here: transactions whose writes appear on commit,
 * transaction-scoped advisory locks (re-entrant, released on commit or rollback), and Payload's update
 * order for a global: open a transaction, run `beforeOperation`, read whether the global exists, then
 * update its row or insert one.
 */
function fakePayload(saved: Record<string, Global> = {}, options: Options = {}) {
  const store: Record<string, Row[]> = {};
  for (const [slug, doc] of Object.entries(saved)) store[slug] = [{ id: `${slug}-saved`, en: doc }];
  const pending = new Map<string, Array<() => void>>();
  const holders = new Map<string, string>();
  const waiting = new Map<string, Array<{ transactionID: string; grant: () => void }>>();
  const writes: string[] = [];
  const locks: string[] = [];
  const logs = { warn: 0, error: 0 };
  let next = 0;

  const acquire = (key: string, transactionID: string) => new Promise<void>((grant) => {
    const holder = holders.get(key);
    if (!holder || holder === transactionID) {
      holders.set(key, transactionID);
      grant();
    } else waiting.set(key, [...(waiting.get(key) ?? []), { transactionID, grant }]);
  });
  const release = (transactionID: string) => {
    for (const [key, holder] of [...holders]) {
      if (holder !== transactionID) continue;
      const [first, ...rest] = waiting.get(key) ?? [];
      waiting.set(key, rest);
      if (first) {
        holders.set(key, first.transactionID);
        first.grant();
      } else holders.delete(key);
    }
  };
  const session = (transactionID: string) => ({
    db: {
      execute: async (query: { queryChunks?: unknown[] }) => {
        const chunks = query.queryChunks ?? [];
        const statement = chunks.map((chunk) => (typeof chunk === "string" ? "$1" : ((chunk as { value?: string[] }).value ?? []).join(""))).join("");
        const key = chunks.find((chunk): chunk is string => typeof chunk === "string") ?? "";
        locks.push(`${statement} ${key}`);
        await acquire(key, transactionID);
        await options.onLock?.(key.replace(/^global:/, ""), transactionID);
      }
    }
  });
  const sessions: Record<string, ReturnType<typeof session>> = {};

  const payload = {
    config: { i18n: { fallbackLanguage: "en", supportedLanguages: { en: { dateFNSKey: "en-US", translations: {} } }, translations: {} }, admin: { user: "admins" } },
    logger: { warn: () => { logs.warn++; }, error: () => { logs.error++; }, info: () => {} },
    db: {
      sessions,
      beginTransaction: async () => {
        if (options.noTransaction) return null;
        const transactionID = `tx${++next}`;
        sessions[transactionID] = session(transactionID);
        pending.set(transactionID, []);
        return transactionID;
      },
      commitTransaction: async (transactionID: string) => {
        for (const apply of pending.get(transactionID) ?? []) apply();
        pending.delete(transactionID);
        release(transactionID);
      },
      rollbackTransaction: async (transactionID: string) => {
        pending.delete(transactionID);
        release(transactionID);
      }
    },
    findGlobal: async ({ slug }: { slug: string }) => {
      const row = store[slug]?.[0];
      return row ? { ...row.en, updatedAt: "2026-11-20T00:00:00.000Z" } : {};
    },
    updateGlobal: async ({ slug, locale = "en", data, context = {}, req: given }: { slug: string; locale?: string; data: Global; context?: Global; req?: PayloadRequest }) => {
      if (options.readOnly) throw Object.assign(new Error("query failed"), { cause: { code: "25006" } });
      const req = given ?? ({ payload } as unknown as PayloadRequest);
      const owns = await initTransaction(req);
      try {
        for (const hook of GLOBALS[slug].hooks?.beforeOperation ?? []) await hook({ args: {}, context: {}, global: GLOBALS[slug] as never, operation: "update", req });
        const transactionID = String(await req.transactionID);
        if (options.failWrite?.(slug, transactionID)) throw new Error("write failed");
        const exists = (store[slug]?.length ?? 0) > 0;
        writes.push(`${slug}:${locale}`);
        pending.get(transactionID)?.push(() => {
          const rows = (store[slug] ??= []);
          if (exists && rows[0]) rows[0][locale as "en"] = { ...(rows[0][locale as "en"] ?? {}), ...data };
          else rows.push({ id: `${slug}-${transactionID}`, [locale]: { ...data } } as Row);
        });
        if (owns) await commitTransaction(req);
      } catch (error) {
        if (owns) await killTransaction(req);
        throw error;
      }
      if (!given) assert.equal(context.disableRevalidate, undefined);
      else assert.equal(context.disableRevalidate, true, "the seed must not revalidate outside a request");
      return data;
    }
  };
  return { payload: payload as unknown as Payload, store, writes, locks, logs, holders };
}

const lockStatement = (slug: string) => `SELECT pg_advisory_xact_lock(hashtextextended($1, 0)) global:${slug}`;
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test("a first start locks, then writes today's copy once; a second start is a no-op", async () => {
  const first = fakePayload();
  assert.equal(await seedEditorialGlobals(first.payload), "seeded");
  assert.equal(first.store["help-content"]?.[0]?.en?.introduction, "Shipping, returns, your account and our policies.");
  assert.equal(first.store["site-editorial"]?.[0]?.en?.siteTitle, "sophomores — experienced. not finished.");
  assert.deepEqual([first.store["help-content"].length, first.store["site-editorial"].length], [1, 1]);
  assert.ok(first.locks.includes(lockStatement("help-content")) && first.locks.includes(lockStatement("site-editorial")));
  assert.equal(first.holders.size, 0, "commit releases the locks");
  const again = fakePayload({ "help-content": first.store["help-content"][0].en, "site-editorial": first.store["site-editorial"][0].en });
  assert.equal(await seedEditorialGlobals(again.payload), "present");
  assert.deepEqual([again.writes, again.locks], [[], []]);
});

test("seed first: an Admin first save that starts meanwhile waits, then updates the seed's row", async () => {
  let admin: Promise<unknown> | undefined;
  const fake = fakePayload({}, {
    onLock: (slug, transactionID) => {
      if (slug === "help-content" && transactionID === "tx1" && !admin) admin = fake.payload.updateGlobal({ slug: "help-content", data: { introduction: "Saved by staff" } } as never);
    }
  });
  assert.equal(await seedEditorialGlobals(fake.payload), "seeded");
  await admin;
  assert.equal(fake.store["help-content"].length, 1, "one row, not a second insert");
  assert.equal(fake.store["help-content"][0].en.introduction, "Saved by staff");
  assert.equal(fake.store["help-content"][0].en.topics !== undefined, true, "the seed's other fields stay");
});

test("Admin first: the seed waits for an Admin first save, then leaves that global alone", async () => {
  let resume!: () => void;
  const paused = new Promise<void>((resolve) => { resume = resolve; });
  const fake = fakePayload({}, {
    onLock: async (slug, transactionID) => { if (slug === "help-content" && transactionID === "tx1") await paused; }
  });
  const admin = fake.payload.updateGlobal({ slug: "help-content", data: { introduction: "Saved by staff" } } as never);
  await settle();
  const seed = seedEditorialGlobals(fake.payload);
  await settle();
  assert.equal("help-content" in fake.store, false, "the seed has not written while the Admin save holds the lock");
  resume();
  await admin;
  assert.equal(await seed, "seeded");
  assert.equal(fake.store["help-content"].length, 1);
  assert.equal(fake.store["help-content"][0].en.introduction, "Saved by staff");
  assert.deepEqual(fake.writes, ["help-content:en", "site-editorial:en"]);
});

test("a rolled-back seed releases the lock, so the next save goes through", async () => {
  const fake = fakePayload({}, { failWrite: (slug, transactionID) => slug === "help-content" && transactionID === "tx1" });
  assert.equal(await seedEditorialGlobals(fake.payload), "failed");
  assert.deepEqual([fake.store, fake.holders.size], [{}, 0]);
  await fake.payload.updateGlobal({ slug: "help-content", data: { introduction: "Saved by staff" } } as never);
  assert.equal(fake.store["help-content"][0].en.introduction, "Saved by staff");
});

test("a save without a transaction is refused rather than unfenced", async () => {
  const req = { payload: { db: { sessions: {} } } } as unknown as PayloadRequest;
  await assert.rejects(lockGlobal(req, "help-content"), /needs a PostgreSQL transaction/);
  for (const global of [HelpContent, SiteEditorial]) assert.ok(global.hooks?.beforeOperation?.includes(lockGlobalBeforeUpdate));
});

test("a saved global is never overwritten", async () => {
  const edited = { introduction: "Edited by staff", updatedAt: "2026-11-19T00:00:00.000Z" };
  const { payload, store, writes } = fakePayload({ "help-content": edited });
  assert.equal(await seedEditorialGlobals(payload), "seeded");
  assert.equal(store["help-content"][0].en.introduction, "Edited by staff");
  assert.deepEqual(writes.filter((write) => write.startsWith("help-content")), []);
});

test("without a transaction of its own, the seed writes nothing", async () => {
  const { payload, store, writes, logs } = fakePayload({}, { noTransaction: true });
  assert.equal(await seedEditorialGlobals(payload), "failed");
  assert.deepEqual([store, writes, logs.error], [{}, [], 1]);
});

test("a read-only database skips the seed with one warning", async () => {
  const { payload, store, logs } = fakePayload({}, { readOnly: true });
  assert.equal(await seedEditorialGlobals(payload), "read-only");
  assert.deepEqual(store, {});
  assert.deepEqual(logs, { warn: 1, error: 0 });
});

test("Korean is seeded verbatim from ko.json, and only where it isn't empty", () => {
  const ko = JSON.parse(
    readFileSync(new URL("../../messages/ko.json", import.meta.url), "utf8")
  );
  const help = ko.Customer.app_site_help_page;
  const expected = nonEmpty({
    introduction: help.introduction,
    topics: {
      shipping: help.shipping.description,
      account: help.account.description,
      shop: help.shop.description
    },
    shipping: {
      introduction: ko.Customer.app_site_help_shipping_page.introduction
    }
  });
  assert.deepEqual(
    editorialSeeds().find((seed) => seed.slug === "help-content")?.ko,
    expected
  );
  assert.deepEqual(nonEmpty({ a: "", b: "값", c: { d: "" } }), { b: "값" });
});

test("empty fields read as empty, so their sections render nothing", () => {
  assert.deepEqual(parseHelpCopy({}), {
    introduction: "",
    topics: { shipping: "", account: "", shop: "" },
    shippingIntroduction: ""
  });
  assert.deepEqual(
    parseSiteEditorial({ featuredSetlist: "an-unpopulated-id" }),
    { title: "", description: "", featuredSetlistSlug: "" }
  );
});

test("only a public setlist past setup can be featured; anything else falls back", async () => {
  const featured = (setlist: unknown) =>
    parseSiteEditorial({ featuredSetlist: setlist }).featuredSetlistSlug;
  assert.equal(
    featured({ slug: "summer", isPublic: true, status: "active" }),
    "summer"
  );
  assert.equal(
    featured({ slug: "summer", isPublic: false, status: "active" }),
    ""
  );
  assert.equal(
    featured({ slug: "summer", isPublic: true, status: "draft" }),
    ""
  );
  const field = SiteEditorial.fields.find(
    (entry) => "name" in entry && entry.name === "featuredSetlist"
  ) as { filterOptions?: () => unknown };
  assert.deepEqual(field.filterOptions?.(), FEATURABLE_SETLIST);
  // The loader populates as a visitor, so a private setlist stays an unpopulated id.
  let args: Record<string, unknown> = {};
  await loadSiteEditorial(
    {
      findGlobal: async (call: Record<string, unknown>) => {
        args = call;
        return {};
      }
    } as unknown as Payload,
    "en"
  );
  assert.equal(args.overrideAccess, false);
  // A setlist that went back to draft after it was chosen is not returned populated, by the public API either.
  const lookups: Array<Record<string, unknown>> = [];
  const stored: Record<string, unknown> = { eligible: { id: "eligible", isPublic: true, status: "active" }, stale: { id: "stale", isPublic: true, status: "draft" } };
  const req = { payload: { findByID: async (call: Record<string, unknown>) => { lookups.push(call); return stored[String(call.id)] ?? null; } } };
  const read = async (setlist: unknown) => ((await hideStaleFeaturedSetlist({ doc: { featuredSetlist: setlist }, req } as never)) as Global).featuredSetlist;
  assert.equal(await read({ id: "stale", slug: "summer", isPublic: true, status: "draft" }), null);
  assert.deepEqual(await read({ id: "eligible", slug: "summer", isPublic: true, status: "active" }), { id: "eligible", slug: "summer", isPublic: true, status: "active" });
  assert.equal(await read("an-unpopulated-id"), "an-unpopulated-id");
  assert.equal(lookups.length, 0, "a fully populated setlist needs no lookup");
  // A partial projection that leaves out isPublic and status: the stored values decide, both ways.
  assert.deepEqual(await read({ id: "eligible", slug: "summer" }), { id: "eligible", slug: "summer" });
  assert.equal(await read({ id: "stale", slug: "summer" }), null);
  assert.equal(await read({ id: "gone", slug: "summer" }), null);
  assert.deepEqual(lookups[0], { collection: "setlists", id: "eligible", select: { isPublic: true, status: true }, depth: 0, overrideAccess: true, disableErrors: true, req });
});

test("startup schedules the ensure after the existing onInit, without awaiting it", async () => {
  const order: string[] = [];
  const { payload, writes } = fakePayload();
  const config = await editorialEnsurePlugin({
    onInit: async () => {
      order.push("existing");
    }
  } as never);
  await config.onInit?.(payload);
  assert.deepEqual([order, writes], [["existing"], []]);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(
    writes.includes("help-content:en") && writes.includes("site-editorial:en")
  );
});
