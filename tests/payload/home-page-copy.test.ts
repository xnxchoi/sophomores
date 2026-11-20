import assert from "node:assert/strict";
import { test } from "node:test";
import type { Payload, TypedUser } from "payload";
import { homePageDraftViewer, homePageLocale, homePagePreviewLocation, resolveHomePageCopy } from "@/lib/teaser/home-page-copy";

type Doc = { id: string; _status: "draft" | "published"; isFallback?: boolean; updatedAt: string };

/** The Local API reads the resolver makes, over in-memory copies. */
function fakePayload(docs: Doc[]) {
  const writes: string[] = [];
  const reads: Array<{ overrideAccess?: boolean; user?: unknown; draft?: boolean }> = [];
  const payload = {
    findByID: async ({ id, ...options }: { id: string; overrideAccess?: boolean; user?: unknown; draft?: boolean }) => {
      reads.push(options);
      const doc = docs.find((item) => item.id === id);
      if (!doc) throw new Error("Not Found");
      return doc;
    },
    find: async ({ where, draft, ...options }: { where?: Record<string, unknown>; draft?: boolean; overrideAccess?: boolean; user?: unknown }) => {
      reads.push({ draft, ...options });
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
  return { payload: payload as unknown as Payload, writes, reads };
}

const FALLBACK = "00000000-0000-4000-8000-000000000001";
const DRAFT = "00000000-0000-4000-8000-000000000003";
const fallback: Doc = { id: FALLBACK, _status: "draft", isFallback: true, updatedAt: "2026-11-01" };
const published: Doc = { id: "published", _status: "published", updatedAt: "2026-11-02" };
const draft: Doc = { id: DRAFT, _status: "draft", updatedAt: "2026-11-03" };

const staff = { collection: "admins", _strategy: "staff-better-auth", role: "staff", id: "staff-1" } as unknown as TypedUser;

test("visitors get the published copy, then the fallback draft, then nothing (built defaults)", async () => {
  const request = { locale: "en" as const, staff: null };
  assert.equal((await resolveHomePageCopy(fakePayload([fallback, published, draft]).payload, request))?.id, "published");
  assert.equal((await resolveHomePageCopy(fakePayload([fallback, draft]).payload, request))?.id, FALLBACK);
  const none = fakePayload([]);
  assert.equal(await resolveHomePageCopy(none.payload, request), null);
  assert.deepEqual(none.writes, []);
});

test("without verified staff a ?draftId never reads a draft", async () => {
  const { payload } = fakePayload([fallback, published, draft]);
  assert.equal((await resolveHomePageCopy(payload, { locale: "en", staff: null, draftId: DRAFT }))?.id, "published");
  const noPublished = fakePayload([fallback, draft]).payload;
  assert.equal((await resolveHomePageCopy(noPublished, { locale: "en", staff: null, draftId: DRAFT }))?.id, FALLBACK);
});

test("verified staff read the newest or requested draft as themselves, with collection access applied", async () => {
  const { payload, reads } = fakePayload([fallback, published, draft]);
  assert.equal((await resolveHomePageCopy(payload, { locale: "en", staff }))?.id, DRAFT);
  assert.equal((await resolveHomePageCopy(payload, { locale: "en", staff, draftId: FALLBACK }))?.id, FALLBACK);
  assert.equal((await resolveHomePageCopy(payload, { locale: "en", staff, draftId: "not-a-uuid" }))?.id, DRAFT);
  for (const read of reads.filter((entry) => entry.draft && entry.user)) {
    assert.equal(read.overrideAccess, false);
    assert.equal(read.user, staff);
  }
  assert.equal(reads.some((entry) => entry.user === staff), true);
});

test("a draft-mode cookie needs a staff session verified now: logout, expiry or revocation gets the public copy", async () => {
  const headers = new Headers({ cookie: "__prerender_bypass=valid" });
  const auth = (user: unknown) => ({ auth: async () => ({ user }) }) as unknown as Pick<Payload, "auth">;
  let called = 0;
  const counting = { auth: async () => { called += 1; return { user: staff }; } } as unknown as Pick<Payload, "auth">;
  assert.equal(await homePageDraftViewer(counting, { draftMode: false, headers }), null);
  assert.equal(called, 0, "draft mode off: no auth call");
  assert.equal(await homePageDraftViewer(auth(staff), { draftMode: true, headers }), staff);
  assert.equal(await homePageDraftViewer(auth(null), { draftMode: true, headers }), null, "logged out or expired");
  assert.equal(await homePageDraftViewer(auth({ ...staff, role: "customer" }), { draftMode: true, headers }), null, "staff role revoked");
  assert.equal(await homePageDraftViewer(auth({ collection: "users", id: "m1" }), { draftMode: true, headers }), null, "a member");
  const failing = { auth: async () => { throw new Error("session store down"); } } as unknown as Pick<Payload, "auth">;
  assert.equal(await homePageDraftViewer(failing, { draftMode: true, headers }), null);
  // And with no staff, the resolver serves the public order even in draft mode.
  const { payload } = fakePayload([fallback, published, draft]);
  assert.equal((await resolveHomePageCopy(payload, { locale: "en", staff: null, draftId: DRAFT }))?.id, "published");
});

test("the preview entry always lands on the local Home page with an approved query", () => {
  const at = (query: string) => homePagePreviewLocation(new URLSearchParams(query));
  assert.equal(at(`locale=ko&draftId=${DRAFT}`), `/?locale=ko&draftId=${DRAFT}`);
  for (const query of ["url=//evil.example", "url=https://evil.example/x", "url=/%2F%2Fevil.example", "locale=fr&draftId=../x", "draftId=//evil.example"]) {
    const location = at(query);
    assert.match(location, /^\/\?locale=(en|ko)(&draftId=[0-9a-f-]{36})?$/, query);
  }
});

test("only ko selects Korean copy", () => {
  assert.deepEqual(["ko", "en", "fr", null, "[object Object]"].map(homePageLocale), ["ko", "en", "en", "en", "en"]);
});
