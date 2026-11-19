import assert from "node:assert/strict";
import { test } from "node:test";
import type { Payload } from "payload";
import { homePageLocale, resolveHomePageCopy } from "@/lib/teaser/home-page-copy";

type Doc = { id: string; _status: "draft" | "published"; isFallback?: boolean; updatedAt: string };

/** The Local API reads the resolver makes, over in-memory copies. */
function fakePayload(docs: Doc[]) {
  const writes: string[] = [];
  const payload = {
    findByID: async ({ id }: { id: string }) => {
      const doc = docs.find((item) => item.id === id);
      if (!doc) throw new Error("Not Found");
      return doc;
    },
    find: async ({ where, draft }: { where?: Record<string, unknown>; draft?: boolean }) => {
      const json = JSON.stringify(where ?? {});
      let found = docs.filter((doc) => draft || doc._status === "published");
      if (json.includes('"_status":{"equals":"published"}')) found = found.filter((doc) => doc._status === "published");
      if (json.includes('"isFallback":{"equals":true}')) found = found.filter((doc) => doc.isFallback);
      found = [...found].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return { docs: found.slice(0, 1), totalDocs: found.length };
    },
    create: async () => { writes.push("create"); },
    update: async () => { writes.push("update"); }
  };
  return { payload: payload as unknown as Payload, writes };
}

const fallback: Doc = { id: "fallback", _status: "draft", isFallback: true, updatedAt: "2026-11-01" };
const published: Doc = { id: "published", _status: "published", updatedAt: "2026-11-02" };
const draft: Doc = { id: "draft", _status: "draft", updatedAt: "2026-11-03" };

test("visitors get the published copy, then the fallback draft, then nothing (built defaults)", async () => {
  const request = { locale: "en" as const, draft: false };
  assert.equal((await resolveHomePageCopy(fakePayload([fallback, published, draft]).payload, request))?.id, "published");
  assert.equal((await resolveHomePageCopy(fakePayload([fallback, draft]).payload, request))?.id, "fallback");
  const none = fakePayload([]);
  assert.equal(await resolveHomePageCopy(none.payload, request), null);
  assert.deepEqual(none.writes, []);
});

test("draft mode reads the newest draft, and a requested draft id wins", async () => {
  const { payload } = fakePayload([fallback, published, draft]);
  assert.equal((await resolveHomePageCopy(payload, { locale: "en", draft: true }))?.id, "draft");
  assert.equal((await resolveHomePageCopy(payload, { locale: "en", draft: false, draftId: "fallback" }))?.id, "fallback");
  assert.equal((await resolveHomePageCopy(payload, { locale: "en", draft: false, draftId: "missing" }))?.id, "published");
});

test("only ko selects Korean copy", () => {
  assert.deepEqual(["ko", "en", "fr", null, "[object Object]"].map(homePageLocale), ["ko", "en", "en", "en", "en"]);
});
