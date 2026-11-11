import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { createRequire, registerHooks } from "node:module";
import { after, before, beforeEach, test } from "node:test";
import { pathToFileURL } from "node:url";
import { createElement, isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SetlistData, UserSlotState } from "@/lib/music/types";
import { Setlists } from "@/lib/payload/collections/setlists";
import { Tracks } from "@/lib/payload/collections/tracks";

type Actor = { id: string; collection?: string; role?: string; email?: string; _strategy?: string } | null;
type SyntheticSetlist = Record<string, unknown> & { id: string; appleMusic?: Record<string, unknown> | null };
type Call = {
  collection: string; id?: string; data?: Record<string, unknown>; overrideAccess?: boolean;
  depth?: number; where?: { and?: Array<Record<string, { equals?: unknown }>> };
};
type SyntheticTrack = Record<string, unknown> & { id: string; slotIndex: number; setlist: string; submittedBy: string };
const syntheticToken = "synthetic-owner-credential-never-a-real-token";
const actors: Array<{ name: string; user: Actor; curator: boolean }> = [
  { name: "anonymous", user: null, curator: false },
  { name: "customer", user: { id: "customer-1", collection: "users", role: "user", email: "customer@example.test" }, curator: false },
  { name: "staff", user: { id: "staff-1", collection: "admins", role: "staff", _strategy: "staff-better-auth" }, curator: true },
  { name: "curator", user: { id: "curator-1", collection: "users", email: "fixture@sophomores.co" }, curator: true }
];
const context = () => ({ params: Promise.resolve({ slug: "synthetic-setlist" }) });
const fixture = (): SyntheticSetlist => ({
  id: "11111111-1111-4111-8111-111111111111",
  title: "Synthetic setlist",
  slug: "synthetic-setlist",
  description: "Provider-free credential boundary fixture",
  status: "active",
  deadline: "2099-01-01T00:00:00.000Z",
  isPublic: true,
  provider: "apple_music",
  appleMusic: {
    playlistId: "p.synthetic",
    playlistUrl: "https://example.test/playlist",
    ownerUserToken: syntheticToken,
    futurePrivateCredential: "synthetic-future-private-value"
  },
  tracks: []
});
const slotFixture = (slotIndex: number): SyntheticTrack => ({
  id: `track-${slotIndex}`, title: `Synthetic track ${slotIndex}`, artist: "Synthetic artist",
  slug: `synthetic-track-${slotIndex}`, albumTitle: "Synthetic album", duration: 180000,
  slotIndex, note: `Synthetic note ${slotIndex}`, syncStatus: "pending",
  setlist: fixture().id, submittedBy: "customer-1", album: "album-1", tags: ["tag-1"],
  appleMusic: { id: `song-${slotIndex}`, url: "https://example.test/song", storefront: "us" }
});
function freshState() {
  return {
    user: null as Actor,
    setlist: fixture() as SyntheticSetlist | null,
    databaseError: false,
    playlistError: false,
    pushError: false,
    nativeSlots: false,
    helperActive: false,
    helperNestedLoads: 0,
    otherNestedLoads: 0,
    helperDepths: [] as Array<number | undefined>,
    trackDocs: [slotFixture(1), slotFixture(2)],
    pending: [] as Array<{ id: string; appleMusic: { id: string } }>,
    calls: [] as Call[],
    pushes: [] as unknown[][]
  };
}
let state = freshState();
let nativeAfterRead: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
let getNativeSlots: typeof import("../../src/lib/music/eligibility").getUserSetlistSlots;
async function nativeDocument(collection: "tracks" | "setlists", doc: Record<string, unknown>, depth = 2) {
  return nativeAfterRead({
    collection: collection === "tracks" ? Tracks : Setlists,
    context: {}, depth, doc: structuredClone(doc), draft: false, fallbackLocale: null,
    global: null, locale: "en", overrideAccess: true, showHiddenFields: false,
    req: {
      user: state.user, payloadAPI: "local", context: {},
      payload: { config: { defaultDepth: 2, maxDepth: 10, localization: false }, collections: { setlists: { config: Setlists } } },
      payloadDataLoader: {
        load: async () => {
          if (state.helperActive) state.helperNestedLoads++;
          else state.otherNestedLoads++;
          // Synthetic backing store only; native Setlists traversal performs projection.
          return state.setlist ? nativeDocument("setlists", state.setlist, 0) : null;
        }
      }
    }
  });
}
const payload = {
  async find(args: Call) {
    state.calls.push(args);
    if (state.databaseError) throw new Error("Synthetic database unavailable");
    if (state.nativeSlots) {
      if (state.helperActive) state.helperDepths.push(args.depth);
      const docs = args.collection === "setlists" ? state.setlist ? [state.setlist] : [] : state.trackDocs.filter((doc) =>
        (args.where?.and ?? []).every((clause) => Object.entries(clause).every(([field, condition]) => condition.equals === undefined || doc[field] === condition.equals)));
      return { docs: await Promise.all(docs.map((doc) => nativeDocument(args.collection as "tracks" | "setlists", doc, args.depth))), totalDocs: docs.length };
    }
    return { docs: args.collection === "setlists" ? state.setlist ? [structuredClone(state.setlist)] : [] : structuredClone(state.pending) };
  },
  async findByID(args: Call) {
    state.calls.push(args);
    if (state.databaseError) throw new Error("Synthetic database unavailable");
    return state.setlist ? structuredClone(state.setlist) : null;
  },
  async update(args: Call) {
    state.calls.push(args);
    if (state.nativeSlots && args.collection === "tracks") {
      state.trackDocs = state.trackDocs.map((doc) => doc.id === args.id ? { ...doc, ...args.data } : doc);
      const doc = state.trackDocs.find((track) => track.id === args.id)!;
      return nativeDocument("tracks", doc, args.depth);
    }
    return args.data;
  },
  async create(args: Call) {
    state.calls.push(args);
    const doc = { ...args.data, id: "track-created" } as SyntheticTrack;
    state.trackDocs = [...state.trackDocs, doc];
    return nativeDocument("tracks", doc, args.depth);
  },
  async delete(args: Call) {
    state.calls.push(args);
    state.trackDocs = state.trackDocs.filter((doc) => doc.id !== args.id);
    return {};
  }
};
const harness = {
  payload,
  user: () => state.user,
  async slots(...args: Parameters<typeof getNativeSlots>) {
    if (!state.nativeSlots) return { slot1: null, slot2: null };
    state.helperActive = true;
    try { return await getNativeSlots(...args); }
    finally { state.helperActive = false; }
  },
  async playlist() {
    if (state.playlistError) throw new Error("Synthetic playlist unavailable");
    return { id: "p.synthetic", title: "Synthetic fallback", url: "https://example.test/playlist", tracks: [] };
  },
  async push(...args: unknown[]) {
    state.pushes.push(args);
    if (state.pushError) throw new Error("Synthetic provider failure");
    return { success: true, message: "Synthetic synchronization complete" };
  }
};
const key = "__sphmrsSetlistTokenBoundary";
const previous = Object.getOwnPropertyDescriptor(globalThis, key);
const originalEnvironment = process.env; // Reference only: never inspect/copy host credentials.
const previewOutput = process.env.S1_PREVIEW_OUT;
let hooks: ReturnType<typeof registerHooks>;
let publicGET: typeof import("@/app/api/setlists/[slug]/route").GET;
let tokenGET: typeof import("@/app/api/setlists/[slug]/apple-token/route").GET;
let tokenPOST: typeof import("@/app/api/setlists/[slug]/apple-token/route").POST;
let mySlotsGET: typeof import("@/app/api/setlists/[slug]/my-slots/route").GET;
let slotsPOST: typeof import("@/app/api/setlists/[slug]/slots/route").POST;
let slotsDELETE: typeof import("@/app/api/setlists/[slug]/slots/[slotIndex]/route").DELETE;
let page: typeof import("@/app/(site)/setlists/[slug]/page").default;
let sync: typeof import("@/lib/music/sync").syncSetlistToAppleMusic;
let SetlistView: typeof import("@/components/music/SetlistView").SetlistView;
const moduleUrl = (source: string) => `data:text/javascript,${encodeURIComponent(source)}`;

before(async () => {
  process.env = { NODE_ENV: "test" };
  Object.defineProperty(globalThis, key, { configurable: true, value: harness });
  const target = `globalThis.${key}`;
  hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      const parent = decodeURIComponent(context.parentURL ?? "");
      let source: string | undefined;
      if (specifier === "@/lib/payload") source = `export const getPayload=async()=>${target}.payload;`;
      if (specifier === "@/lib/auth/server") source = `export const currentUser=async()=>${target}.user();`;
      if (specifier === "@/lib/music/apple-music" || parent.endsWith("/lib/music/sync.ts") && specifier === "./apple-music") {
        source = `export const getAppleMusicPlaylist=(...args)=>${target}.playlist(...args); export const addTracksToApplePlaylist=(...args)=>${target}.push(...args);`;
      }
      if (specifier === "@/lib/music/eligibility") {
        source = `export const evaluateUserEligibility=async()=>({isEligible:true,canEdit:true,maxSlots:2}); export const getUserSetlistSlots=(...args)=>${target}.slots(...args); export const isAccountActivated=()=>true;`;
      }
      if (parent.endsWith("/app/(site)/setlists/[slug]/page.tsx")) {
        if (specifier === "next/navigation") source = "export function notFound(){throw new Error('SYNTHETIC_NOT_FOUND');}";
        if (specifier === "@/components/music/SetlistView") source = "export function SetlistView(){return null;}";
      }
      if (source !== undefined) return { url: moduleUrl(source), shortCircuit: true };
      if (specifier === "pg" || specifier.includes("payload-runtime")) throw new Error("Boundary regression must not bootstrap runtime services");
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url.startsWith("data:text/javascript,")) return {
        format: "module", source: decodeURIComponent(url.slice("data:text/javascript,".length)), shortCircuit: true
      };
      return nextLoad(url, context);
    }
  });
  ({ GET: publicGET } = await import("@/app/api/setlists/[slug]/route"));
  ({ GET: tokenGET, POST: tokenPOST } = await import("@/app/api/setlists/[slug]/apple-token/route"));
  ({ GET: mySlotsGET } = await import("@/app/api/setlists/[slug]/my-slots/route"));
  ({ POST: slotsPOST } = await import("@/app/api/setlists/[slug]/slots/route"));
  ({ DELETE: slotsDELETE } = await import("@/app/api/setlists/[slug]/slots/[slotIndex]/route"));
  ({ getUserSetlistSlots: getNativeSlots } = await import("../../src/lib/music/eligibility"));
  const entry = pathToFileURL(createRequire(import.meta.url).resolve("payload"));
  ({ afterRead: nativeAfterRead } = await import(new URL("./fields/hooks/afterRead/index.js", entry).href));
  ({ default: page } = await import("@/app/(site)/setlists/[slug]/page"));
  ({ syncSetlistToAppleMusic: sync } = await import("@/lib/music/sync"));
  ({ SetlistView } = await import("@/components/music/SetlistView"));
});
beforeEach(() => { state = freshState(); process.env = { NODE_ENV: "test" }; });
after(() => {
  hooks?.deregister();
  process.env = originalEnvironment;
  if (previous) Object.defineProperty(globalThis, key, previous);
  else Reflect.deleteProperty(globalThis, key);
});

function assertPublicGroup(appleMusic: Record<string, unknown>, configured?: boolean) {
  assert.equal(Object.hasOwn(appleMusic, "ownerUserToken"), false);
  assert.equal(Object.hasOwn(appleMusic, "futurePrivateCredential"), false);
  assert.equal(appleMusic.playlistId, "p.synthetic");
  assert.equal(appleMusic.playlistUrl, "https://example.test/playlist");
  assert.deepEqual(Object.keys(appleMusic).sort(), configured === undefined
    ? ["playlistId", "playlistUrl"] : ["isConfigured", "playlistId", "playlistUrl"]);
  if (configured !== undefined) assert.equal(appleMusic.isConfigured, configured);
}
async function pageProps(slug = "synthetic-setlist") {
  const result = await page({ params: Promise.resolve({ slug }) });
  assert.equal(isValidElement(result), true);
  return (result as ReactElement<{ initialSetlist: SetlistData; initialUserSlotState: UserSlotState | null; isCurator: boolean; isAuthenticated: boolean }>).props;
}

for (const actor of actors) {
  test(`public GET ${actor.name} preserves existing private-setlist visibility`, async () => {
    state.user = actor.user;
    state.setlist = { ...fixture(), isPublic: false };
    const response = await publicGET(new Request("https://example.test/private-setlist"), context());
    assert.equal(response.status, actor.name === "staff" ? 200 : 403);
    const body = await response.json();
    assert.equal(JSON.stringify(body).includes(syntheticToken), false);
    if (response.status === 200) assertPublicGroup(body.setlist.appleMusic);
  });
  test(`public GET ${actor.name} serializes only public Apple Music properties, never token status`, async () => {
    state.user = actor.user;
    const response = await publicGET(new Request("https://example.test/api/setlists/synthetic-setlist"), context());
    assert.equal(response.status, 200);
    const body = await response.json();
    assertPublicGroup(body.setlist.appleMusic);
    assert.equal(JSON.stringify(body).includes(syntheticToken), false);
  });

  test(`RSC ${actor.name} serializes no credentials and only authorized curator receives configuration boolean`, async () => {
    state.user = actor.user;
    const props = await pageProps();
    assertPublicGroup(props.initialSetlist.appleMusic as Record<string, unknown>, actor.curator ? true : undefined);
    assert.equal(props.isCurator, actor.curator);
    assert.equal(JSON.stringify(props).includes(syntheticToken), false);
  });

  test(`token status/write ${actor.name} retain existing authorization and never return credential`, async () => {
    state.user = actor.user;
    const status = await tokenGET(new Request("https://example.test/status"), context());
    assert.equal(status.status, actor.curator ? 200 : 401);
    assert.equal(JSON.stringify(await status.json()).includes(syntheticToken), false);
    const result = await tokenPOST(new Request("https://example.test/token", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ musicUserToken: syntheticToken })
    }), context());
    assert.equal(result.status, actor.curator ? 200 : 401);
    assert.equal(JSON.stringify(await result.json()).includes(syntheticToken), false);
    const writes = state.calls.filter((call) => call.data);
    assert.equal(writes.length, actor.curator ? 1 : 0);
    if (actor.curator) {
      const written = writes[0].data!.appleMusic as Record<string, unknown>;
      assert.equal(written.ownerUserToken === syntheticToken, true);
      assert.equal(written.playlistId, "p.synthetic");
      assert.equal(writes[0].overrideAccess === false, false, "trusted write must not acquire ordinary field-read semantics");
    }
  });
}

test("missing/null Apple Music group retains its absence at both browser boundaries", async () => {
  for (const appleMusic of [undefined, null]) {
    state.setlist = { ...fixture(), appleMusic };
    const response = await publicGET(new Request("https://example.test/setlist"), context());
    assert.equal((await response.json()).setlist.appleMusic, appleMusic);
    assert.equal((await pageProps()).initialSetlist.appleMusic, appleMusic);
  }
});

test("authorized initial configuration preserves false and environment fallback without exposing a token", async () => {
  state.user = actors[3].user;
  state.setlist = { ...fixture(), appleMusic: { playlistId: "p.synthetic", playlistUrl: "https://example.test/playlist" } };
  assertPublicGroup((await pageProps()).initialSetlist.appleMusic as Record<string, unknown>, false);
  process.env.APPLE_MUSIC_USER_TOKEN = syntheticToken;
  assertPublicGroup((await pageProps()).initialSetlist.appleMusic as Record<string, unknown>, true);
  const status = await tokenGET(new Request("https://example.test/status"), context());
  assert.equal((await status.json()).isConfigured, true);
  state.user = actors[1].user;
  assertPublicGroup((await pageProps()).initialSetlist.appleMusic as Record<string, unknown>);
});

test("unknown setlist and database failure do not serialize any credential-bearing document", async (t) => {
  t.mock.method(console, "warn", () => undefined);
  state.setlist = null;
  assert.equal((await publicGET(new Request("https://example.test/missing"), context())).status, 404);
  await assert.rejects(() => pageProps(), /SYNTHETIC_NOT_FOUND/);
  state.databaseError = true;
  await assert.rejects(() => publicGET(new Request("https://example.test/failure"), context()), /Synthetic database unavailable/);
  await assert.rejects(() => pageProps(), /SYNTHETIC_NOT_FOUND/);
});

test("provider failure and page fallback remain credential-free", async (t) => {
  t.mock.method(console, "warn", () => undefined);
  state.playlistError = true;
  const response = await publicGET(new Request("https://example.test/provider-failure"), context());
  assertPublicGroup((await response.json()).setlist.appleMusic);
  assertPublicGroup((await pageProps()).initialSetlist.appleMusic as Record<string, unknown>);
  state.playlistError = false;
  state.setlist = null;
  const props = await pageProps("seoul-2026");
  assertPublicGroup(props.initialSetlist.appleMusic as Record<string, unknown>);
  assert.equal(JSON.stringify(props).includes(syntheticToken), false);
});

test("authorized token write retains malformed/empty/missing failure paths without writing", async () => {
  state.user = actors[3].user;
  for (const body of ["{", "{}"] as const) {
    const result = await tokenPOST(new Request("https://example.test/token", { method: "POST", body }), context());
    assert.equal(result.status, 400);
  }
  state.setlist = null;
  const request = () => new Request("https://example.test/token", { method: "POST", body: JSON.stringify({ musicUserToken: syntheticToken }) });
  assert.equal((await tokenPOST(request(), context())).status, 404);
  assert.equal((await tokenGET(new Request("https://example.test/token"), context())).status, 404);
  assert.equal(state.calls.some((call) => call.data), false);
});

for (const lookup of ["uuid", "slug"] as const) {
  test(`trusted internal synchronization ${lookup} lookup retains synthetic owner credential server-side`, async () => {
    state.pending = [{ id: "track-1", appleMusic: { id: "song-1" } }];
    const result = await sync(payload as unknown as Parameters<typeof sync>[0], lookup === "uuid" ? fixture().id : "synthetic-setlist");
    assert.equal(result.success, true);
    assert.equal(state.pushes.length, 1);
    assert.equal(state.pushes[0][2] === syntheticToken, true);
    assert.equal(state.calls[0].overrideAccess === false, false);
    assert.equal(JSON.stringify(result).includes(syntheticToken), false);
  });
}

test("internal sync no-token, missing setlist and provider-error paths do not manufacture credentials", async () => {
  state.setlist = { ...fixture(), appleMusic: { playlistId: "p.synthetic" } };
  state.pending = [{ id: "track-1", appleMusic: { id: "song-1" } }];
  await sync(payload as unknown as Parameters<typeof sync>[0], "synthetic-setlist");
  assert.equal(state.pushes[0][2], undefined);
  state.setlist = null;
  await assert.rejects(() => sync(payload as unknown as Parameters<typeof sync>[0], "synthetic-setlist"), /Setlist not found/);
  state.setlist = fixture();
  state.pushError = true;
  await assert.rejects(() => sync(payload as unknown as Parameters<typeof sync>[0], "synthetic-setlist"), /Synthetic provider failure/);
});

function assertNativeHelperBoundary() {
  assert.deepEqual(state.helperDepths, [0], "actual slot helper must explicitly disable relationship population");
  assert.equal(state.helperNestedLoads, 0, "actual helper must perform zero nested document loads");
}
function assertTrackScalarsAndIDs(track: Record<string, unknown>, slotIndex: number, userId = "customer-1") {
  assert.equal(track.slotIndex, slotIndex);
  assert.equal(track.setlist, fixture().id);
  assert.equal(track.submittedBy, userId);
  assert.equal(track.duration, 180000);
  assert.equal(track.syncStatus, "pending");
  assert.equal(typeof track.title, "string");
  assert.equal(typeof track.artist, "string");
  assert.equal((track.appleMusic as Record<string, unknown>).id, `song-${slotIndex}`);
}

for (const actor of actors) {
  test(`actual my-slots GET ${actor.name} uses unpopulated slot documents without credentials`, async () => {
    state.nativeSlots = true;
    state.user = actor.user;
    state.trackDocs = state.trackDocs.map((track) => ({ ...track, submittedBy: actor.user?.id ?? "customer-1" }));
    const response = await mySlotsGET(new Request("https://example.test/my-slots"), context());
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(JSON.stringify(body).includes(syntheticToken), false);
    if (actor.user) {
      assertNativeHelperBoundary();
      assertTrackScalarsAndIDs(body.slots.slot1, 1, actor.user.id);
      assertTrackScalarsAndIDs(body.slots.slot2, 2, actor.user.id);
      assert.equal(body.slots.slot1.title, "Synthetic track 1");
      assert.equal(body.slots.slot1.note, "Synthetic note 1");
      assert.equal(body.slots.slot1.album, "album-1");
      assert.deepEqual(body.slots.slot1.tags, ["tag-1"]);
      assert.equal(body.slots.totalFilled, 2);
    } else {
      assert.deepEqual(state.helperDepths, []);
      assert.equal(body.slots.slot1, null);
      assert.equal(body.slots.slot2, null);
    }
  });
}

test("actual RSC caller retains slot scalar views while native helper preserves relation IDs privately", async () => {
  state.nativeSlots = true;
  state.user = actors[1].user;
  const props = await pageProps();
  assertNativeHelperBoundary();
  assert.equal(JSON.stringify(props).includes(syntheticToken), false);
  assert.equal(props.initialUserSlotState?.slots[0].track?.id, "track-1");
  assert.equal(props.initialUserSlotState?.slots[0].track?.title, "Synthetic track 1");
  assert.equal(props.initialUserSlotState?.slots[0].track?.artist, "Synthetic artist");
  assert.equal(props.initialUserSlotState?.slots[0].note, "Synthetic note 1");
  assert.equal(props.initialUserSlotState?.slots[1].track?.id, "track-2");
  assert.equal(props.initialUserSlotState?.slots[1].track?.duration, 180000);
});

for (const operation of ["create", "update"] as const) {
  test(`actual slots POST ${operation} returns native-helper scalar tracks and IDs without populated credentials`, async () => {
    state.nativeSlots = true;
    state.user = actors[1].user;
    if (operation === "create") state.trackDocs = [slotFixture(2)];
    const response = await slotsPOST(new Request("https://example.test/slots", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slotIndex: 1, note: "Synthetic submitted note",
        track: { id: "song-1", title: "Synthetic submitted", artist: "Synthetic artist", duration: 180000, provider: "apple_music" }
      })
    }), context());
    assert.equal(response.status, 200);
    const body = await response.json();
    assertNativeHelperBoundary();
    assert.equal(JSON.stringify(body).includes(syntheticToken), false);
    assert.equal(state.otherNestedLoads > 0, true, "synthetic datastore must exercise installed population on other trusted queries");
    assertTrackScalarsAndIDs(body.slots.slot1, 1);
    assertTrackScalarsAndIDs(body.slots.slot2, 2);
    assert.equal(body.slots.slot1.id, operation === "create" ? "track-created" : "track-1");
    assert.equal(body.slots.slot1.title, "Synthetic submitted");
    assert.equal(body.slots.slot1.note, "Synthetic submitted note");
    assert.equal(body.slots.slot2.album, "album-1");
    assert.deepEqual(body.slots.slot2.tags, ["tag-1"]);
    assert.equal(body.savedTrack.id, body.slots.slot1.id);
    assert.equal(body.slots.totalFilled, 2);
  });
}

test("actual slots DELETE returns remaining native-helper track scalars and relation IDs without credentials", async () => {
  state.nativeSlots = true;
  state.user = actors[1].user;
  const response = await slotsDELETE(new Request("https://example.test/slots/1", { method: "DELETE" }), {
    params: Promise.resolve({ slug: "synthetic-setlist", slotIndex: "1" })
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assertNativeHelperBoundary();
  assert.equal(JSON.stringify(body).includes(syntheticToken), false);
  assert.equal(state.otherNestedLoads > 0, true);
  assert.equal(body.slots.slot1, null);
  assertTrackScalarsAndIDs(body.slots.slot2, 2);
  assert.equal(body.slots.slot2.id, "track-2");
  assert.equal(body.slots.slot2.note, "Synthetic note 2");
  assert.equal(body.slots.totalFilled, 1);
});

test("actual client view consumes boolean configuration without raw credential props", async () => {
  state.user = actors[3].user;
  const configured = await pageProps();
  const configuredHTML = renderToStaticMarkup(createElement(SetlistView, { ...configured, initialUserSlotState: null }));
  assert.equal(configuredHTML.includes("Sync active"), true);
  assert.equal(configuredHTML.includes(syntheticToken), false);
  state.setlist = { ...fixture(), appleMusic: { playlistId: "p.synthetic", playlistUrl: "https://example.test/playlist" } };
  const unconfigured = await pageProps();
  const unconfiguredHTML = renderToStaticMarkup(createElement(SetlistView, { ...unconfigured, initialUserSlotState: null }));
  assert.equal(unconfiguredHTML.includes("Action required"), true);
  state.setlist = { ...fixture(), appleMusic: null };
  const absentGroup = await pageProps();
  const absentGroupHTML = renderToStaticMarkup(createElement(SetlistView, { ...absentGroup, initialUserSlotState: null }));
  assert.equal(absentGroupHTML.includes("Action required"), true);
  state.setlist = { ...fixture(), appleMusic: { playlistId: "p.synthetic", playlistUrl: "https://example.test/playlist" } };
  state.user = null;
  const anonymous = await pageProps();
  const anonymousHTML = renderToStaticMarkup(createElement(SetlistView, { ...anonymous, initialUserSlotState: null }));
  assert.equal(anonymousHTML.includes("Curator controls"), false);
  if (previewOutput) {
    await writeFile(previewOutput, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>S1 synthetic initial-state render</title><link rel="stylesheet" href="setlist-preview.css"></head><body><section id="configured"><h1>Configured curator · synthetic fixture</h1>${configuredHTML}</section><section id="unconfigured"><h1>Unconfigured curator · synthetic fixture</h1>${unconfiguredHTML}</section><section id="anonymous"><h1>Anonymous · synthetic fixture</h1>${anonymousHTML}</section></body></html>`);
  }
});
