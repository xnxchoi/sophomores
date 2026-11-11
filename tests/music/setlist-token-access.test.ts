import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { before, test } from "node:test";
import { pathToFileURL } from "node:url";
import type { CollectionConfig } from "payload";
import { Setlists } from "@/lib/payload/collections/setlists";
import { Tracks } from "@/lib/payload/collections/tracks";
import { getUserSetlistSlots } from "@/lib/music/eligibility";

// Exercise the installed field traversal, not a test-owned access/projection
// implementation. This intentionally stops before database/HTTP/GraphQL engines.
type ProjectionArgs = {
  collection: CollectionConfig;
  context: Record<string, unknown>;
  depth: number;
  doc: Record<string, unknown>;
  draft: boolean;
  fallbackLocale: null;
  global: null;
  locale: string;
  overrideAccess: boolean;
  req: Record<string, unknown>;
  select?: Record<string, unknown>;
  showHiddenFields: boolean;
};
let afterRead: (args: ProjectionArgs) => Promise<Record<string, unknown>>;
const syntheticToken = "synthetic-owner-credential-never-a-real-token";
const actors = [
  { name: "anonymous", user: null },
  { name: "customer", user: { id: "customer-1", collection: "users", role: "user" } },
  { name: "staff", user: { id: "staff-1", collection: "admins", role: "staff", _strategy: "staff-better-auth" } },
  { name: "curator", user: { id: "curator-1", collection: "users", email: "fixture@sophomores.co" } }
] as const;
const selections = [
  { name: "full", select: undefined, hasUrl: true },
  { name: "group inclusion", select: { appleMusic: true }, hasUrl: true },
  { name: "nested credential inclusion", select: { appleMusic: { ownerUserToken: true, playlistId: true } }, hasUrl: false },
  { name: "unrelated exclusion", select: { description: false }, hasUrl: true }
] as const;

before(async () => {
  const entry = pathToFileURL(createRequire(import.meta.url).resolve("payload"));
  ({ afterRead } = await import(new URL("./fields/hooks/afterRead/index.js", entry).href));
});

async function project(
  user: unknown,
  payloadAPI: "REST" | "GraphQL",
  select?: Record<string, unknown>,
  overrideAccess = false,
  showHiddenFields = false
) {
  return afterRead({
    collection: Setlists,
    context: {},
    depth: 0,
    doc: {
      id: "setlist-1",
      title: "Synthetic setlist",
      description: "Public description",
      appleMusic: { playlistId: "p.synthetic", playlistUrl: "https://example.test/playlist", ownerUserToken: syntheticToken },
      tracks: []
    },
    draft: false,
    fallbackLocale: null,
    global: null,
    locale: "en",
    overrideAccess,
    req: { user, payloadAPI, context: {}, payload: { config: { defaultDepth: 0, maxDepth: 10, localization: false }, collections: {} } },
    select,
    showHiddenFields
  });
}

for (const payloadAPI of ["REST", "GraphQL"] as const) {
  for (const actor of actors) {
    for (const selection of selections) {
      test(`${payloadAPI} ${actor.name} ${selection.name} cannot project nested owner credential`, async () => {
        const result = await project(actor.user, payloadAPI, selection.select);
        const appleMusic = result.appleMusic as Record<string, unknown>;
        assert.equal(Object.hasOwn(appleMusic, "ownerUserToken"), false);
        assert.equal(JSON.stringify(result).includes(syntheticToken), false);
        assert.equal(appleMusic.playlistId, "p.synthetic");
        assert.equal(Object.hasOwn(appleMusic, "playlistUrl"), selection.hasUrl);
      });
    }

    test(`${payloadAPI} ${actor.name} showHiddenFields does not bypass field read denial`, async () => {
      const result = await project(actor.user, payloadAPI, undefined, false, true);
      assert.equal(Object.hasOwn(result.appleMusic as object, "ownerUserToken"), false);
    });
  }

  test(`${payloadAPI} trusted server override retains owner credential and public siblings`, async () => {
    const result = await project(null, payloadAPI, undefined, true);
    const appleMusic = result.appleMusic as Record<string, unknown>;
    // Boolean comparisons keep the synthetic credential out of failure output.
    assert.equal(appleMusic.ownerUserToken === syntheticToken, true);
    assert.equal(appleMusic.playlistId, "p.synthetic");
    assert.equal(appleMusic.playlistUrl, "https://example.test/playlist");
  });
}

test("credential field protection does not ban public collection reads", async () => {
  const read = Setlists.access!.read!;
  for (const actor of actors) {
    assert.equal(await read({ req: { user: actor.user } } as Parameters<typeof read>[0]), true);
  }
});

test("browser-bound slot documents do not populate the private setlist credential", async () => {
  let nestedLoads = 0;
  const payload = {
    async find(options: { depth?: number }) {
      const doc = await afterRead({
        collection: Tracks,
        context: {},
        depth: options.depth ?? 2,
        doc: {
          id: "track-1", title: "Synthetic track", artist: "Synthetic artist",
          duration: 180000, note: "Synthetic note", syncStatus: "pending", slotIndex: 1,
          setlist: "setlist-1", submittedBy: "customer-1", album: "album-1", tags: ["tag-1"],
          appleMusic: { id: "song-1", url: "https://example.test/song" }
        },
        draft: false,
        fallbackLocale: null,
        global: null,
        locale: "en",
        overrideAccess: true,
        req: {
          user: null,
          payloadAPI: "local",
          context: {},
          payload: {
            config: { defaultDepth: 2, maxDepth: 10, localization: false },
            collections: { setlists: { config: Setlists } }
          },
          payloadDataLoader: {
            // Synthetic related-document adapter; both projections use installed traversal.
            load: async () => {
              nestedLoads++;
              return project(null, "REST", undefined, true);
            }
          }
        },
        showHiddenFields: false
      });
      return { docs: [doc] };
    }
  };
  const slots = await getUserSetlistSlots(
    payload as unknown as Parameters<typeof getUserSetlistSlots>[0], "customer-1", "setlist-1"
  );
  assert.equal(JSON.stringify(slots).includes(syntheticToken), false);
  assert.equal(nestedLoads, 0, "browser-bound helper must not invoke relationship population");
  assert.equal(slots.slot1?.title, "Synthetic track");
  assert.equal(slots.slot1?.artist, "Synthetic artist");
  assert.equal(slots.slot1?.duration, 180000);
  assert.equal(slots.slot1?.note, "Synthetic note");
  assert.equal(slots.slot1?.syncStatus, "pending");
  assert.equal(slots.slot1?.appleMusic?.id, "song-1");
  assert.equal(slots.slot1?.setlist, "setlist-1");
  assert.equal(slots.slot1?.submittedBy, "customer-1");
  assert.equal(slots.slot1?.album, "album-1");
  assert.deepEqual(slots.slot1?.tags, ["tag-1"]);
  assert.equal(slots.slot2, null);
  assert.equal(slots.totalFilled, 1);
});
