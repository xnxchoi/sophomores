import assert from "node:assert/strict";
import { test } from "node:test";
import type { Payload } from "payload";
import { homePageCopyResponse } from "@/lib/teaser/home-page-copy-response";

const DRAFT = "00000000-0000-4000-8000-000000000003";
const FALLBACK = "00000000-0000-4000-8000-000000000001";
type Doc = { id: string; _status: "draft" | "published"; isFallback?: boolean; updatedAt: string };
const docs: Doc[] = [
  { id: FALLBACK, _status: "draft", isFallback: true, updatedAt: "2026-11-01" },
  { id: "published", _status: "published", updatedAt: "2026-11-02" },
  { id: DRAFT, _status: "draft", updatedAt: "2026-11-03" }
];
const staff = { collection: "admins", _strategy: "staff-better-auth", role: "staff", id: "s1" };

/** Local API reads over in-memory copies; `user` is what payload.auth reports, or an Error it throws. */
function fake(stored: Doc[], user: unknown, failLookup = false): () => Promise<Payload> {
  const payload = {
    auth: async () => { if (user instanceof Error) throw user; return { user }; },
    findByID: async ({ id }: { id: string }) => {
      const doc = stored.find((item) => item.id === id);
      if (!doc) throw new Error("Not Found");
      return doc;
    },
    find: async ({ where, draft }: { where?: Record<string, unknown>; draft?: boolean }) => {
      if (failLookup) throw new Error("synthetic lookup failure");
      const json = JSON.stringify(where ?? {});
      let found = stored.filter((doc) => draft || doc._status === "published");
      if (json.includes('"_status":{"equals":"published"}')) found = found.filter((doc) => doc._status === "published");
      if (json.includes('"isFallback":{"equals":true}')) found = found.filter((doc) => doc.isFallback);
      found = [...found].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return { docs: found.slice(0, 1), totalDocs: found.length };
    }
  };
  return async () => payload as unknown as Payload;
}

const call = async (query: string, draftMode: boolean, load: () => Promise<Payload>) => {
  const response = await homePageCopyResponse(new Request(`http://localhost/api/globals/home-page?${query}`), { draftMode, payload: load });
  const body = (await response.json()) as { id?: string; error?: string };
  return { status: response.status, cacheControl: response.headers.get("cache-control"), id: body.id, error: body.error };
};
const NO_STORE = "private, no-store";

test("in draft mode, every response to verified staff is private and never stored: selected, newest, fallback, defaults", async () => {
  const selected = await call(`locale=en&draftId=${FALLBACK}`, true, fake(docs, staff));
  const newest = await call("locale=en", true, fake(docs, staff));
  const defaults = await call("locale=en", true, fake([], staff));
  assert.deepEqual([selected.id, newest.id, defaults.id], [FALLBACK, DRAFT, undefined]);
  for (const response of [selected, newest, defaults]) {
    assert.equal(response.status, 200);
    assert.equal(response.cacheControl, NO_STORE);
  }
});

test("in draft mode without a verified staff session, the public copy is still never stored", async () => {
  for (const user of [null, { ...staff, role: "customer" }, new Error("session store down")]) {
    const response = await call(`locale=en&draftId=${DRAFT}`, true, fake(docs, user));
    assert.equal(response.id, "published", "no draft for a rejected staff check");
    assert.equal(response.cacheControl, NO_STORE);
  }
});

test("errors are never stored, in or out of draft mode", async () => {
  const unavailable = async (): Promise<Payload> => { throw new Error("Payload unavailable"); };
  for (const draftMode of [true, false]) {
    for (const load of [unavailable, fake(docs, staff, true)]) {
      const response = await call("locale=en", draftMode, load);
      assert.equal(response.status, 500);
      assert.equal(response.cacheControl, NO_STORE);
      assert.equal(response.id, undefined, "an error carries no copy");
    }
  }
});

test("outside draft mode, the public response keeps Next's defaults and never a draft", async () => {
  const response = await call(`locale=en&draftId=${DRAFT}`, false, fake(docs, staff));
  assert.deepEqual([response.status, response.id, response.cacheControl], [200, "published", null]);
});
