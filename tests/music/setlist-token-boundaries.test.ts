import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire, registerHooks } from "node:module";
import { after, before, beforeEach, test } from "node:test";
import { pathToFileURL } from "node:url";
import { createElement, isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { messagesByLocale } from "@/i18n/messages";
import type { SetlistData, UserSlotState } from "@/lib/music/types";
import { Setlists } from "@/payload/collections/setlists";
import { Tracks } from "@/payload/collections/tracks";
import { Forbidden, ValidationError } from "payload";

type Actor = { id: string; collection?: string; role?: string; email?: string; _strategy?: string; emailVerified?: boolean; setlistCurator?: boolean } | null;
type SyntheticSetlist = Record<string, unknown> & { id: string; appleMusic?: Record<string, unknown> | null };
type Call = {
  collection: string; id?: string; data?: Record<string, unknown>; overrideAccess?: boolean; req?: Record<string, unknown>; user?: Actor;
  depth?: number; where?: { and?: Array<Record<string, { equals?: unknown }>> };
};
type SyntheticTrack = Record<string, unknown> & { id: string; slotIndex: number; setlist: string; submittedBy: string };
const syntheticToken = "synthetic-owner-credential-never-a-real-token";
const actors: Array<{ name: string; user: Actor; curator: boolean }> = [
  { name: "anonymous", user: null, curator: false },
  { name: "customer", user: { id: "customer-1", collection: "users", role: "user", email: "customer@example.test" }, curator: false },
  { name: "staff", user: { id: "staff-1", collection: "admins", role: "staff", _strategy: "staff-better-auth", setlistCurator: true }, curator: true },
  // CMS staff without the super-admin-set curator grant is not a curator.
  { name: "staff without curator grant", user: { id: "staff-2", collection: "admins", role: "admin", _strategy: "staff-better-auth" }, curator: false },
  // A staff-domain email on a member account is not curator authority; only a CMS staff principal is.
  { name: "member with staff-domain email", user: { id: "curator-1", collection: "users", email: "fixture@sophomores.co", emailVerified: true }, curator: false }
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
    createError: null as unknown,
    positionReads: 0,
    playlistError: false,
    pushError: false,
    providerCalls: 0,
    playlistArgs: [] as unknown[][],
    playlistTracks: [] as Array<{ id: string; title: string; artist: string }>,
    eligibilityCalls: 0,
    // Runs the shipped evaluateUserEligibility instead of the always-eligible stub.
    realEligibility: false,
    slotCalls: 0,
    nativeSlots: false,
    helperActive: false,
    setlistLookupActive: false,
    setlistLookupNestedLoads: 0,
    helperNestedLoads: 0,
    cmsStaffAuthCalls: 0,
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
let realEvaluate: typeof import("../../src/lib/music/eligibility").evaluateUserEligibility;
async function nativeDocument(collection: "tracks" | "setlists", doc: Record<string, unknown>, depth = 2, currentDepth = 1) {
  return nativeAfterRead({
    collection: collection === "tracks" ? Tracks : Setlists,
    context: {}, depth, currentDepth, doc: structuredClone(doc), draft: false, fallbackLocale: null,
    global: null, locale: "en", overrideAccess: true, showHiddenFields: false,
    req: {
      user: state.user, payloadAPI: "local", context: {},
      payload: { config: { defaultDepth: 2, maxDepth: 10, localization: false }, collections: { setlists: { config: Setlists }, tracks: { config: Tracks } } },
      payloadDataLoader: {
        load: async (cacheKey: string) => {
          if (state.helperActive) state.helperNestedLoads++;
          else state.otherNestedLoads++;
          if (state.setlistLookupActive) state.setlistLookupNestedLoads++;
          // Installed collections/dataloader.js defines this key. Preserve its
          // depth/currentDepth so native traversal, not this adapter, ends cycles.
          const [, relatedCollection, id, relatedDepth, relatedCurrentDepth] = JSON.parse(cacheKey);
          if (relatedCollection === "setlists") {
            const relatedSetlist = state.setlist;
            return relatedSetlist && relatedSetlist.id === id ? nativeDocument("setlists", relatedSetlist, relatedDepth, relatedCurrentDepth) : null;
          }
          if (relatedCollection === "tracks") {
            const track = state.trackDocs.find((doc) => doc.id === id);
            return track ? nativeDocument("tracks", track, relatedDepth, relatedCurrentDepth) : null;
          }
          throw new Error("Unexpected synthetic relationship collection");
        }
      }
    }
  });
}
// Access-checked calls (overrideAccess: false) run the shipped collection access,
// so the request-scoped music grants are exercised end to end.
function principal(args: Call): Actor | undefined {
  return (args.req?.user as Actor | undefined) ?? args.user;
}
function visibleSetlist(args: Call): boolean {
  if (!state.setlist) return false;
  if (args.overrideAccess !== false) return true;
  const read = Setlists.access!.read!({ req: { user: principal(args) } } as never);
  return read === true || state.setlist.isPublic === true;
}
async function enforceWriteAccess(operation: "create" | "update" | "delete", args: Call): Promise<void> {
  if (args.overrideAccess !== false) return;
  const collection = args.collection === "tracks" ? Tracks : Setlists;
  const access = collection.access![operation]!;
  const allowed = await access({ req: args.req ?? { user: args.user }, data: args.data, id: args.id } as never);
  if (!allowed) throw new Forbidden();
}
const payload = {
  async auth({ headers }: { headers: Headers }) {
    state.cmsStaffAuthCalls++;
    // Payload's own auth resolves members ("users") and CMS staff ("admins") alike.
    return { user: state.user ?? null };
  },
  async find(args: Call) {
    // The running order is a trusted id-only read (src/lib/music/running-order.ts),
    // counted on its own so the setlist/track call assertions stay exact.
    if (args.collection === "setlist-positions") {
      state.positionReads++;
      return { docs: [], totalDocs: 0 };
    }
    state.calls.push(args);
    if (state.databaseError) throw new Error("Synthetic database unavailable");
    if (state.nativeSlots) {
      if (state.helperActive) state.helperDepths.push(args.depth);
      const docs = args.collection === "setlists" ? state.setlist ? [state.setlist] : [] : state.trackDocs.filter((doc) =>
        (args.where?.and ?? []).every((clause) => Object.entries(clause).every(([field, condition]) => condition.equals === undefined || doc[field] === condition.equals)));
      const priorLookup = state.setlistLookupActive;
      state.setlistLookupActive = priorLookup || args.collection === "setlists";
      try {
        return { docs: await Promise.all(docs.map((doc) => nativeDocument(args.collection as "tracks" | "setlists", doc, args.depth))), totalDocs: docs.length };
      } finally { state.setlistLookupActive = priorLookup; }
    }
    return { docs: args.collection === "setlists" ? visibleSetlist(args) ? [structuredClone(state.setlist)] : [] : structuredClone(state.pending) };
  },
  async count(args: Call) {
    state.calls.push(args);
    if (state.databaseError) throw new Error("Synthetic database unavailable");
    return { totalDocs: state.setlist ? 1 : 0 };
  },
  async findByID(args: Call) {
    state.calls.push(args);
    if (state.databaseError) throw new Error("Synthetic database unavailable");
    return state.setlist ? structuredClone(state.setlist) : null;
  },
  async update(args: Call) {
    state.calls.push(args);
    await enforceWriteAccess("update", args);
    if (state.nativeSlots && args.collection === "tracks") {
      state.trackDocs = state.trackDocs.map((doc) => doc.id === args.id ? { ...doc, ...args.data } : doc);
      const doc = state.trackDocs.find((track) => track.id === args.id)!;
      return nativeDocument("tracks", doc, args.depth);
    }
    return args.data;
  },
  async create(args: Call) {
    state.calls.push(args);
    await enforceWriteAccess("create", args);
    if (state.createError) throw state.createError;
    const doc = { ...args.data, id: "track-created" } as SyntheticTrack;
    state.trackDocs = [...state.trackDocs, doc];
    return nativeDocument("tracks", doc, args.depth);
  },
  async delete(args: Call) {
    state.calls.push(args);
    await enforceWriteAccess("delete", args);
    state.trackDocs = state.trackDocs.filter((doc) => doc.id !== args.id);
    return {};
  }
};
const harness = {
  payload,
  user: () => state.user,
  eligibility(...args: Parameters<typeof realEvaluate>) {
    state.eligibilityCalls++;
    if (state.realEligibility) return realEvaluate(...args);
    return { isEligible: true, canEdit: true, maxSlots: 2 };
  },
  async slots(...args: Parameters<typeof getNativeSlots>) {
    state.slotCalls++;
    if (!state.nativeSlots) return { entries: [], totalFilled: 0 };
    state.helperActive = true;
    try { return await getNativeSlots(...args); }
    finally { state.helperActive = false; }
  },
  async playlist(...args: unknown[]) {
    state.providerCalls++;
    state.playlistArgs.push(args);
    if (state.playlistError) throw new Error(`Synthetic playlist failure with upstream body: ${syntheticToken}`);
    return { id: "p.synthetic", title: "Synthetic fallback", url: "https://example.test/playlist", tracks: state.playlistTracks };
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
let slotsDELETE: typeof import("@/app/api/setlists/[slug]/slots/[entryId]/route").DELETE;
let slotsPATCH: typeof import("@/app/api/setlists/[slug]/slots/[entryId]/route").PATCH;
let page: typeof import("@/app/(site)/setlists/[slug]/page").default;
let sync: typeof import("@/lib/music/sync").syncSetlistToAppleMusic;
let SetlistView: typeof import("@/components/music/SetlistView").SetlistView;
const moduleUrl = (source: string) => `data:text/javascript,${encodeURIComponent(source)}`;

test("private setlist page imports the actual async Next request headers API", async () => {
  const source = await readFile(new URL("../../src/app/(site)/setlists/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(source, /import\s*\{\s*headers\s*\}\s*from\s*["']next\/headers["']/);
  assert.match(source, /await\s+headers\(\)/);
});

before(async () => {
  process.env = { NODE_ENV: "test" };
  Object.defineProperty(globalThis, key, { configurable: true, value: harness });
  const target = `globalThis.${key}`;
  hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      const parent = decodeURIComponent(context.parentURL ?? "");
      let source: string | undefined;
      if (specifier === "@/payload") source = `export const getPayload=async()=>${target}.payload;`;
      if (specifier === "@/lib/auth/server") source = `export const currentUser=async()=>${target}.user();`;
      // A fresh request object per call, as createLocalReq returns, carrying the Payload principal.
      // The guard's sign-in and curator contract without its in-process limits
      // (tests/music/apple-music-route-guard.test.ts covers the limits).
      if (specifier === "@/lib/music/route-guard") source = `import { NextResponse } from "next/server";
        export const privateJson=(body,init={})=>NextResponse.json(body,{status:init.status,headers:{"cache-control":"private, no-store"}});
        export async function guardMusicRoute(request, scope, need) {
          const { user } = await ${target}.payload.auth({ headers: request.headers });
          const curator = user?.collection === "admins" && user._strategy === "staff-better-auth" && user.setlistCurator === true;
          if (!user) return { response: privateJson({ error: "Sign in to continue." }, { status: 401 }) };
          if (need === "curator" ? !curator : user.collection !== "users") return { response: privateJson({ error: "Not allowed." }, { status: 403 }) };
          return { user };
        }`;
      if (specifier === "@/lib/music/local-request") source = `export const setlistLocalRequest=async()=>({user:${target}.user(),payloadAPI:"local",context:{}}); export const setlistMember=(req)=>req.user?.collection==="users"?req.user:null;`;
      if (specifier === "@/lib/music/apple-music" || parent.endsWith("/lib/music/sync.ts") && specifier === "./apple-music") {
        source = `export const getAppleMusicPlaylist=(...args)=>${target}.playlist(...args); export const addTracksToApplePlaylist=(...args)=>${target}.push(...args);`;
      }
      if (specifier === "@/lib/music/eligibility") {
        source = `export const evaluateUserEligibility=async(...args)=>${target}.eligibility(...args); export const getUserSetlistSlots=(...args)=>${target}.slots(...args); export const isAccountActivated=()=>true; export const entryCap=(s)=>s.maxSlotsPerUser===1?1:2;`;
      }
      if (parent.endsWith("/app/(site)/setlists/[slug]/page.tsx")) {
        if (specifier === "next/headers") source = "export const headers=async()=>new Headers();";
        // A missing or private setlist calls notFound(); the stub reports it, so the assertions compare it.
        if (specifier === "next/navigation") source = "export function notFound(){throw new Error('SYNTHETIC_NOT_FOUND');} export function redirect(url){throw new Error('SYNTHETIC_REDIRECT ' + url);}";
        if (specifier === "@/components/music/SetlistView") source = "export function SetlistView(){return null;}";
        if (specifier === "@/components/music/SetlistUnavailable") source = "export function SetlistLoadStatus(){return null;}";
      }
      if (parent.endsWith("/components/arc/button/button.tsx") && specifier === "./button.module.css") {
        source = "export default {};";
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
  ({ DELETE: slotsDELETE, PATCH: slotsPATCH } = await import("@/app/api/setlists/[slug]/slots/[entryId]/route"));
  ({ getUserSetlistSlots: getNativeSlots, evaluateUserEligibility: realEvaluate } = await import("../../src/lib/music/eligibility"));
  const entry = pathToFileURL(createRequire(import.meta.url).resolve("payload"));
  ({ afterRead: nativeAfterRead } = await import(new URL("./fields/hooks/afterRead/index.js", entry).href));
  ({ default: page } = await import("@/app/(site)/setlists/[slug]/page"));
  ({ syncSetlistToAppleMusic: sync } = await import("@/lib/music/sync"));
  ({ SetlistView } = await import("@/components/music/SetlistView"));
});
beforeEach(() => { state = freshState(); process.env = { NODE_ENV: "test" }; });

test("review public setlist reads project server-side catalog tracks without opening customer operations", async () => {
  const origin = "https://preview.sophomores.co";
  process.env.NEXT_PUBLIC_SERVER_URL = origin;
  const playlistUrl = "https://music.apple.com/kr/playlist/pl.u-fixture";
  state.setlist = { ...fixture(), appleMusic: { playlistUrl, ownerUserToken: syntheticToken } };
  state.playlistTracks = [{ id: "catalog-track", title: "Catalog track", artist: "Fixture artist" }];
  const response = await publicGET(new Request(origin + "/api/setlists/synthetic-setlist"), context());
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(result.setlist.tracks.map((track: { id: string }) => track.id), ["catalog-track"]);
  const view = await pageProps();
  assert.equal(view.archiveOnly, true);
  assert.deepEqual(view.initialSetlist.tracks.map((track) => track.id), ["catalog-track"]);
  assert.deepEqual(state.playlistArgs, Array.from({ length: 2 }, () => [playlistUrl, undefined, { catalogOnly: true }]));
  assert.equal(JSON.stringify([result, view]).includes(syntheticToken), false);

  const operations = [
    tokenGET(new Request(origin + "/api/setlists/synthetic-setlist/apple-token"), context()),
    tokenPOST(new Request(origin + "/api/setlists/synthetic-setlist/apple-token", { method: "POST" }), context()),
    mySlotsGET(new Request(origin + "/api/setlists/synthetic-setlist/my-slots"), context()),
  ];
  for (const [path, method] of [
    ["developer-token", "GET"], ["playlist", "GET"], ["search", "GET"],
  ] as const) {
    const handler = path === "developer-token" ? (await import("@/app/api/music/apple/developer-token/route")).GET
      : path === "playlist" ? (await import("@/app/api/music/apple/playlist/route")).GET
      : (await import("@/app/api/music/apple/search/route")).GET;
    operations.push(handler(new Request(origin + "/api/music/apple/" + path, { method })));
  }
  const { POST: syncPOST } = await import("@/app/api/setlists/[slug]/sync/route");
  operations.push(syncPOST(new Request(origin + "/api/setlists/synthetic-setlist/sync", { method: "POST" }), context()));
  const calls = state.calls.length;
  for (const operation of operations) {
    const denied = await operation;
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get("cache-control"), "private, no-store");
  }
  assert.equal(state.calls.length, calls);
  assert.equal(state.providerCalls, 2);
});

test("review catalog failure leaves a public setlist and the confirmed-absent archive readable", async (t) => {
  t.mock.method(console, "warn", () => undefined);
  process.env.NEXT_PUBLIC_SERVER_URL = "https://preview.sophomores.co";
  state.playlistError = true;
  const response = await publicGET(new Request(process.env.NEXT_PUBLIC_SERVER_URL + "/api/setlists/synthetic-setlist"), context());
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).setlist.tracks, []);
  const stored = await pageProps();
  assert.equal(stored.playlistUnavailable, true);
  assert.deepEqual(stored.initialSetlist.tracks, []);
  state.setlist = null;
  const archive = await pageProps("seoul-2026");
  assert.equal(archive.initialSetlist.id, "seoul-2026-virtual");
  assert.equal(archive.initialSetlist.status, "finalized");
  assert.equal(archive.archiveOnly, true);
  assert.deepEqual(archive.initialSetlist.tracks, []);
  await assert.rejects(() => pageProps(), notFoundAt());
  state.setlist = { ...fixture(), isPublic: false };
  await assert.rejects(() => pageProps("seoul-2026"), notFoundAt());
  state.databaseError = true;
  await assertUnavailablePage("seoul-2026");
  assert.equal(state.providerCalls, 3);
});
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
async function pageResult(slug = "synthetic-setlist") {
  const result = await page({ params: Promise.resolve({ slug }) });
  assert.ok(isValidElement<{ failure: "setlist" | "playlist" | null; children?: unknown }>(result));
  assert.equal(typeof result.type === "function" && result.type.name, "SetlistLoadStatus");
  return result.props;
}
// The setlist page's not-found outcome: notFound(), which renders the site's 404.
const notFoundAt = (_slug = "synthetic-setlist") => ({ message: "SYNTHETIC_NOT_FOUND" });
async function pageProps(slug = "synthetic-setlist") {
  const { children: result } = await pageResult(slug);
  assert.ok(isValidElement(result));
  assert.equal(typeof result.type === "function" && result.type.name, "SetlistView");
  return (result as ReactElement<{ initialSetlist: SetlistData; initialUserSlotState: UserSlotState | null; isCurator: boolean; isAuthenticated: boolean; archiveOnly: boolean; playlistUnavailable: boolean }>).props;
}
async function assertUnavailablePage(slug?: string) {
  const result = await pageResult(slug);
  assert.deepEqual(result, { failure: "setlist" });
}

for (const actor of actors) {
  test(`public GET ${actor.name} preserves existing private-setlist visibility`, async () => {
    state.user = actor.user;
    state.setlist = { ...fixture(), isPublic: false };
    const response = await publicGET(new Request("https://example.test/private-setlist"), context());
    // One access-checked read with the caller's principal; not visible answers the same 404 as missing.
    assert.equal(state.calls[0].overrideAccess, false);
    assert.equal((state.calls[0].req?.user as Actor | undefined) ?? null, actor.user);
    assert.equal(response.status, actor.user?.collection === "admins" ? 200 : 404);
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
    // Signed out is 401; signed in without curator rights is 403.
    assert.equal(status.status, actor.curator ? 200 : actor.user ? 403 : 401);
    assert.equal(JSON.stringify(await status.json()).includes(syntheticToken), false);
    const result = await tokenPOST(new Request("https://example.test/token", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ musicUserToken: syntheticToken })
    }), context());
    assert.equal(result.status, actor.curator ? 200 : actor.user ? 403 : 401);
    assert.equal(JSON.stringify(await result.json()).includes(syntheticToken), false);
    const writes = state.calls.filter((call) => call.data);
    assert.equal(writes.length, actor.curator ? 1 : 0);
    if (actor.curator) {
      // The write runs through Setlists access and sends only the changed subfield;
      // Payload keeps omitted group subfields (playlistId) from the stored document.
      const written = writes[0].data!.appleMusic as Record<string, unknown>;
      assert.equal(written.ownerUserToken === syntheticToken, true);
      assert.deepEqual(Object.keys(written), ["ownerUserToken"]);
      assert.equal(writes[0].overrideAccess, false);
      assert.equal(typeof writes[0].req, "object");
    }
  });
}

const visibilityPageActors: Array<{ name: string; user: Actor; cmsStaff: boolean }> = [
  ...actors.map((actor) => ({ name: actor.name, user: actor.user, cmsStaff: actor.user?.collection === "admins" })),
  { name: "customer claiming staff role", user: { id: "forged-staff", collection: "users", role: "staff" }, cmsStaff: false },
  { name: "customer claiming admin role", user: { id: "forged-admin", collection: "users", role: "admin" }, cmsStaff: false },
  { name: "admin without verified strategy", user: { id: "unverified-admin", collection: "admins", role: "admin", _strategy: "other" }, cmsStaff: false },
  { name: "verified CMS editor", user: { id: "editor-1", collection: "admins", role: "editor", _strategy: "staff-better-auth" }, cmsStaff: true },
  { name: "verified CMS admin", user: { id: "admin-1", collection: "admins", role: "admin", _strategy: "staff-better-auth" }, cmsStaff: true }
];

test("native populated-setlist positive control loads the correct Track and honors relationship depth", async () => {
  state.nativeSlots = true;
  state.setlist = { ...fixture(), tracks: ["track-1"] };
  const query = await payload.find({ collection: "setlists" });
  assert.equal(state.setlistLookupNestedLoads > 0, true);
  const document = query.docs[0] as Record<string, unknown>;
  const related = (document.tracks as Array<Record<string, unknown>>)[0];
  assert.equal(related.id, "track-1");
  assert.equal(related.title, "Synthetic track 1");
  assert.equal(related.artist, "Synthetic artist");
  assert.equal(related.duration, 180000);
  const backReference = related.setlist as Record<string, unknown>;
  assert.equal(backReference.id, fixture().id);
  assert.equal((backReference.tracks as string[])[0], "track-1", "installed depth limit must end the relationship cycle at an ID");
});

for (const actor of visibilityPageActors) {
  for (const slug of ["synthetic-setlist", "seoul-2026"]) {
    test(`RSC populated private ${slug} ${actor.cmsStaff ? "allows" : "denies"} ${actor.name} without initial nested loads`, async (t) => {
      const warnings = t.mock.method(console, "warn", () => undefined);
      state.nativeSlots = true;
      state.user = actor.user;
      state.setlist = { ...fixture(), slug, isPublic: false, tracks: ["track-1"] };
      if (actor.cmsStaff) {
        const props = await pageProps(slug);
        assert.equal(state.cmsStaffAuthCalls, 1);
        assert.equal(props.initialSetlist.id, fixture().id);
        assert.equal(props.initialSetlist.tracks.length, 2);
        assert.equal(props.initialSetlist.tracks[0].id, "track-1");
        assert.equal(props.initialSetlist.tracks[0].title, "Synthetic track 1");
        assert.equal(props.initialSetlist.tracks[0].artist, "Synthetic artist");
        assert.equal(props.initialSetlist.tracks[0].duration, 180000);
        assert.equal(Object.hasOwn(props.initialSetlist.tracks[0], "setlist"), false);
        assert.equal(JSON.stringify(props).includes(syntheticToken), false);
        assert.equal(state.providerCalls, 1);
        assert.equal(state.eligibilityCalls, 1);
        assert.equal(state.slotCalls, 1);
      } else {
        await assert.rejects(() => pageProps(slug), notFoundAt(slug));
        assert.equal(state.cmsStaffAuthCalls, 1);
        assert.equal(state.providerCalls, 0);
        assert.equal(state.calls.length, 1);
        assert.equal(state.calls[0].collection, "setlists");
        assert.equal(state.eligibilityCalls, 0);
        assert.equal(state.slotCalls, 0);
      }
      assert.equal(state.setlistLookupNestedLoads, 0, "visibility must be decided before Setlists.tracks population");
      assert.equal(warnings.mock.callCount(), 0);
    });
  }
}

for (const actor of [visibilityPageActors[0], visibilityPageActors[1], visibilityPageActors[2]]) {
  test(`RSC populated public record preserves ${actor.name} scalar Track output without initial nested loads`, async () => {
    state.nativeSlots = true;
    state.user = actor.user;
    state.setlist = { ...fixture(), tracks: ["track-1"] };
    const props = await pageProps();
    assert.equal(state.setlistLookupNestedLoads, 0);
    assert.equal(props.initialSetlist.id, fixture().id);
    assert.equal(props.initialSetlist.tracks.length, 2);
    assert.equal(props.initialSetlist.tracks[0].id, "track-1");
    assert.equal(props.initialSetlist.tracks[0].title, "Synthetic track 1");
    assert.equal(props.initialSetlist.tracks[0].duration, 180000);
    assert.equal(props.initialSetlist.tracks[1].id, "track-2");
    assert.equal(Object.hasOwn(props.initialSetlist.tracks[0], "setlist"), false);
    assert.equal(JSON.stringify(props).includes(syntheticToken), false);
    assert.equal(state.providerCalls, 1);
  });
}

for (const actor of visibilityPageActors) {
  test(`RSC public record remains readable for ${actor.name} without altering token protection`, async () => {
    state.user = actor.user;
    const props = await pageProps();
    assert.equal(props.initialSetlist.id, fixture().id);
    assert.equal(props.initialSetlist.title, "Synthetic setlist");
    assert.equal(JSON.stringify(props).includes(syntheticToken), false);
    assert.equal(state.providerCalls, 1);
    assert.equal(state.calls.filter((call) => call.collection === "tracks").length, 1);
    assert.equal(state.eligibilityCalls, actor.user ? 1 : 0);
    assert.equal(state.slotCalls, actor.user ? 1 : 0);
  });

  for (const isPublic of [false, null, undefined]) {
    for (const slug of ["synthetic-setlist", "seoul-2026"]) {
      test(`RSC ${slug} nonpublic ${String(isPublic)} record ${actor.cmsStaff ? "allows" : "denies"} ${actor.name} before browser/provider work`, async (t) => {
        const warnings = t.mock.method(console, "warn", () => undefined);
        const errors = t.mock.method(console, "error", () => undefined);
        state.user = actor.user;
        state.setlist = { ...fixture(), slug, isPublic };
        if (actor.cmsStaff) {
          const props = await pageProps(slug);
          assert.equal(props.initialSetlist.id, fixture().id);
          assert.equal(props.initialSetlist.title, "Synthetic setlist");
          assert.equal(JSON.stringify(props).includes(syntheticToken), false);
          assert.equal(state.providerCalls, 1);
          assert.equal(state.calls.filter((call) => call.collection === "tracks").length, 1);
          assert.equal(state.eligibilityCalls, 1);
          assert.equal(state.slotCalls, 1);
        } else {
          await assert.rejects(() => pageProps(slug), notFoundAt(slug));
          assert.equal(state.providerCalls, 0, "known private denial must not invoke provider or fallback");
          // seoul-2026 adds one existence-only trusted count so a private row 404s instead of showing the archive.
          assert.equal(state.calls.length, slug === "seoul-2026" ? 2 : 1, "known private denial stops after the setlist lookup");
          assert.equal(state.calls.every((call) => call.collection === "setlists"), true);
          assert.equal(state.calls[0].overrideAccess, false, "the setlist read runs through Setlists access");
          assert.equal(state.eligibilityCalls, 0);
          assert.equal(state.slotCalls, 0);
        }
        assert.equal(warnings.mock.callCount(), 0, "private denial must not enter the broad error catch");
        assert.equal(errors.mock.callCount(), 0);
      });
    }
  }
}

for (const failure of ["missing", "database failure"] as const) {
  for (const slug of ["synthetic-setlist", "seoul-2026"]) {
    test(`RSC ${slug} distinguishes ${failure}; only confirmed absence can admit the public archive`, async (t) => {
      const warnings = t.mock.method(console, "warn", () => undefined);
      state.setlist = null;
      state.databaseError = failure === "database failure";
      if (state.databaseError) {
        await assertUnavailablePage(slug);
        assert.equal(state.providerCalls, 0);
      } else if (slug === "seoul-2026") {
        const props = await pageProps(slug);
        assert.equal(props.initialSetlist.id, "seoul-2026-virtual");
        assert.equal(props.initialSetlist.title, "Synthetic fallback");
        assert.equal(props.archiveOnly, true);
        assert.equal(props.initialUserSlotState, null);
        assert.equal(JSON.stringify(props).includes(syntheticToken), false);
        assert.equal(state.providerCalls, 1);
      } else {
        await assert.rejects(() => pageProps(slug), notFoundAt(slug));
        assert.equal(state.providerCalls, 0);
      }
      // Confirmed absence of seoul-2026 needs the access read plus one trusted existence count.
      assert.equal(state.calls.length, failure === "missing" && slug === "seoul-2026" ? 2 : 1);
      assert.equal(state.calls[0].overrideAccess, false);
      assert.equal(state.eligibilityCalls, 0);
      assert.equal(state.slotCalls, 0);
      assert.equal(warnings.mock.callCount(), failure === "database failure" ? 1 : 0);
    });
  }
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
  state.user = actors[2].user;
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
  await assert.rejects(() => pageProps(), notFoundAt());
  state.databaseError = true;
  await assert.rejects(() => publicGET(new Request("https://example.test/failure"), context()), /Synthetic database unavailable/);
  await assertUnavailablePage();
  assert.equal(state.providerCalls, 0);
});

test("provider failure and page fallback remain credential-free", async (t) => {
  const warnings = t.mock.method(console, "warn", () => undefined);
  state.playlistError = true;
  const response = await publicGET(new Request("https://example.test/provider-failure"), context());
  assertPublicGroup((await response.json()).setlist.appleMusic);
  warnings.mock.resetCalls();
  const partial = await pageProps();
  assertPublicGroup(partial.initialSetlist.appleMusic as Record<string, unknown>);
  assert.equal(partial.playlistUnavailable, true);
  assert.equal(partial.initialSetlist.tracks.length, 0);
  assert.doesNotMatch(renderSetlist(partial), /No tracks found/);
  assert.deepEqual(warnings.mock.calls.map((call) => call.arguments), [["[setlist] Playlist tracks unavailable"]]);
  state.playlistError = false;
  state.setlist = null;
  const props = await pageProps("seoul-2026");
  assert.deepEqual(props.initialSetlist.appleMusic, {
    playlistId: "p.synthetic",
    playlistUrl: "https://music.apple.com/kr/playlist/pl.u-LdbqqJmC2AEP9E"
  });
  assert.equal(props.archiveOnly, true);
  assert.equal(props.initialUserSlotState, null);
  assert.equal(JSON.stringify(props).includes(syntheticToken), false);
});

test("public archive provider failure returns unavailable, never provider details", async (t) => {
  const warnings = t.mock.method(console, "warn", () => undefined);
  state.setlist = null;
  state.playlistError = true;
  await assertUnavailablePage("seoul-2026");
  assert.equal(state.providerCalls, 1);
  assert.deepEqual(warnings.mock.calls.map((call) => call.arguments), [["Could not load the public setlist archive."]]);
});

test("stored playlist failure keeps authorized local tracks and declares a partial load", async (t) => {
  t.mock.method(console, "warn", () => undefined);
  state.playlistError = true;
  state.nativeSlots = true;
  const result = await pageResult();
  assert.equal(result.failure, "playlist");
  const partial = await pageProps();
  assert.equal(partial.playlistUnavailable, true);
  assert.deepEqual(partial.initialSetlist.tracks.map((track) => track.id), ["track-1", "track-2"]);
  assert.match(renderSetlist(partial), /Synthetic track 1/);
  assert.equal(JSON.stringify(partial).includes(syntheticToken), false);
});

for (const actor of actors) {
  test(`${actor.name} private setlist slot read stops before eligibility or returns authorized own slots`, async () => {
    state.user = actor.user;
    state.setlist = { ...fixture(), isPublic: false };
    const response = await mySlotsGET(new Request("https://example.test/slots"), context());
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(state.calls[0].overrideAccess, false);
    if (actor.user?.collection === "admins") {
      assert.equal(response.status, 200);
      assert.equal(state.eligibilityCalls, 1);
      assert.equal(state.slotCalls, 1);
    } else {
      assert.equal(response.status, 404);
      assert.equal(state.calls.length, 1);
      assert.equal(state.calls[0].depth, 0);
      assert.equal(state.eligibilityCalls, 0);
      assert.equal(state.slotCalls, 0);
    }
    assert.equal((await response.text()).includes(syntheticToken), false);
  });
}

test("member cannot enter scoped slot mutation handlers on a private setlist", async () => {
  state.user = actors[1].user;
  state.setlist = { ...fixture(), isPublic: false };
  const post = await slotsPOST(new Request("https://example.test/slots", { method: "POST", body: "{}" }), context());
  const deletion = await slotsDELETE(new Request("https://example.test/slots/track-1", { method: "DELETE" }), {
    params: Promise.resolve({ slug: "synthetic-setlist", entryId: "track-1" })
  });
  assert.equal(post.status, 404);
  assert.equal(deletion.status, 404);
  assert.deepEqual(state.calls.map(({ collection }) => collection), ["setlists", "setlists"]);
  assert.equal(state.eligibilityCalls, 0);
  assert.equal(state.slotCalls, 0);
});

test("authorized token write retains malformed/empty/missing failure paths without writing", async () => {
  state.user = actors[2].user;
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
  assert.equal(state.helperDepths.length > 0 && state.helperDepths.every((depth) => depth === 0), true,
    "actual entry helper must explicitly disable relationship population");
  assert.equal(state.helperNestedLoads, 0, "actual helper must perform zero nested document loads");
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
      // Entries by id with computed positions; no seat, order key or relations.
      assert.deepEqual(body.entries, [
        { id: "track-1", position: 1, title: "Synthetic track 1", artist: "Synthetic artist", note: "Synthetic note 1" },
        { id: "track-2", position: 2, title: "Synthetic track 2", artist: "Synthetic artist", note: "Synthetic note 2" }
      ]);
    } else {
      assert.deepEqual(state.helperDepths, []);
      assert.deepEqual(body.entries, []);
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
  assert.deepEqual(props.initialUserSlotState?.slots.map((slot) => [slot.position, slot.entryId]), [[1, "track-1"], [2, "track-2"]]);
});

const entryRequest = (method: string, body?: unknown) => new Request("https://example.test/slots", {
  method, headers: { "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) })
});
const entryContext = (entryId: string) => ({ params: Promise.resolve({ slug: "synthetic-setlist", entryId }) });
const submitted = { id: "song-1", title: "Synthetic submitted", artist: "Synthetic artist", duration: 180000 };

test("actual entry POST takes the first free hidden seat and returns entries without credentials", async () => {
  state.nativeSlots = true;
  state.user = actors[1].user;
  state.trackDocs = [slotFixture(2)];
  // A seat or position in the body is ignored: the server chooses the seat.
  const response = await slotsPOST(entryRequest("POST", { slotIndex: 2, position: 1, note: "Synthetic submitted note", track: submitted }), context());
  assert.equal(response.status, 200);
  const body = await response.json();
  assertNativeHelperBoundary();
  assert.equal(JSON.stringify(body).includes(syntheticToken), false);
  const created = state.calls.find((call) => call.collection === "tracks" && call.data && !call.id);
  assert.equal(created?.data?.slotIndex, 1);
  assert.equal(created?.data?.submittedBy, "customer-1");
  assert.equal(body.savedTrack.id, "track-created");
  assert.deepEqual(body.entries.map((entry: { id: string }) => entry.id).sort(), ["track-2", "track-created"]);
});

test("actual entry PATCH edits one entry by id and never sends owner, setlist, seat or order", async () => {
  state.nativeSlots = true;
  state.user = actors[1].user;
  const response = await slotsPATCH(entryRequest("PATCH", { note: "Changed note", track: submitted }), entryContext("track-1"));
  assert.equal(response.status, 200);
  const write = state.calls.find((call) => call.collection === "tracks" && call.id === "track-1" && call.data);
  assert.equal(write?.overrideAccess, false);
  for (const key of ["setlist", "submittedBy", "slotIndex", "_setlist-positions_runningOrder_order"])
    assert.equal(key in (write?.data ?? {}), false, key);
  assert.equal(write?.data?.note, "Changed note");
  const body = await response.json();
  assert.equal(JSON.stringify(body).includes(syntheticToken), false);
});

test("actual entry DELETE removes one entry by id and returns the rest without credentials", async () => {
  state.nativeSlots = true;
  state.user = actors[1].user;
  const response = await slotsDELETE(entryRequest("DELETE"), entryContext("track-1"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assertNativeHelperBoundary();
  assert.equal(JSON.stringify(body).includes(syntheticToken), false);
  assert.deepEqual(body.entries, [{ id: "track-2", title: "Synthetic track 2", artist: "Synthetic artist", note: "Synthetic note 2" }]);
});

// SlotManager's links go through the transition router, which needs a mounted app router (a render, never a push).
const renderRouter = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} } as unknown as AppRouterInstance;

function renderSetlist(props: Awaited<ReturnType<typeof pageProps>>) {
  return renderToStaticMarkup(createElement(AppRouterContext.Provider, { value: renderRouter },
    createElement(NextIntlClientProvider, {
      locale: "en",
      timeZone: "Asia/Seoul",
      messages: messagesByLocale.en,
      children: createElement(SetlistView, { ...props, initialUserSlotState: null })
    })));
}

test("actual client view consumes boolean configuration without raw credential props", async () => {
  state.user = actors[2].user;
  const configured = await pageProps();
  const configuredHTML = renderSetlist(configured);
  assert.equal(configuredHTML.includes("Sync active"), true);
  assert.equal(configuredHTML.includes(syntheticToken), false);
  state.setlist = { ...fixture(), appleMusic: { playlistId: "p.synthetic", playlistUrl: "https://example.test/playlist" } };
  const unconfigured = await pageProps();
  const unconfiguredHTML = renderSetlist(unconfigured);
  assert.equal(unconfiguredHTML.includes("Action required"), true);
  state.setlist = { ...fixture(), appleMusic: null };
  const absentGroup = await pageProps();
  const absentGroupHTML = renderSetlist(absentGroup);
  assert.equal(absentGroupHTML.includes("Action required"), true);
  state.setlist = { ...fixture(), appleMusic: { playlistId: "p.synthetic", playlistUrl: "https://example.test/playlist" } };
  state.user = null;
  const anonymous = await pageProps();
  const anonymousHTML = renderSetlist(anonymous);
  assert.equal(anonymousHTML.includes("Curator controls"), false);
  if (previewOutput) {
    await writeFile(previewOutput, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>S1 synthetic initial-state render</title><link rel="stylesheet" href="setlist-preview.css"></head><body><section id="configured"><h1>Configured curator · synthetic fixture</h1>${configuredHTML}</section><section id="unconfigured"><h1>Unconfigured curator · synthetic fixture</h1>${unconfiguredHTML}</section><section id="anonymous"><h1>Anonymous · synthetic fixture</h1>${anonymousHTML}</section></body></html>`);
  }
});

test("actual archive client stays read-only even for staff", async () => {
  state.user = actors[2].user;
  state.setlist = null;
  const props = await pageProps("seoul-2026");
  const html = renderSetlist(props);
  assert.match(html, /Public archive/);
  assert.doesNotMatch(html, /Curator controls|Attendee nominations|Nominations closed|Nominations close in/);
  assert.equal(html.includes(syntheticToken), false);
});

// Entries are addressed by stable id; the seat is chosen by the server and never a position.
const entryPost = (track: unknown = { id: "song-1", title: "Synthetic submitted", artist: "Synthetic artist" }) =>
  slotsPOST(entryRequest("POST", { track }), context());
const entryDelete = (entryId: string) => slotsDELETE(entryRequest("DELETE"), entryContext(entryId));

test("entry routes refuse a malformed entry id before any write", async () => {
  state.nativeSlots = true;
  state.user = actors[1].user;
  for (const entryId of ["../track-1", "track 1", "1;drop", "x".repeat(65)]) {
    assert.equal((await entryDelete(entryId)).status, 400, entryId);
    assert.equal((await slotsPATCH(entryRequest("PATCH", { note: "n" }), entryContext(entryId))).status, 400, entryId);
  }
  assert.equal(state.calls.some((call) => call.collection === "tracks" && (call.data || call.id)), false);
});

// The Postgres adapter reports a unique clash as a ValidationError naming the
// index columns (installed @payloadcms/drizzle upsertRow/handleUpsertError.js).
const uniqueClash = (path: string) => new ValidationError({
  collection: "tracks", errors: [{ message: "Value must be unique", path }]
});

test("entry POST answers a simultaneous take of the same seat with 409", async () => {
  state.nativeSlots = true;
  state.user = actors[1].user;
  state.trackDocs = [];
  state.createError = uniqueClash("setlist_id, submitted_by_id, slot_index");
  const response = await entryPost();
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /just added/);
});

test("entry POST with both entries used is 409 without a write", async () => {
  state.nativeSlots = true;
  state.user = actors[1].user;
  const response = await entryPost();
  assert.equal(response.status, 409);
  assert.equal(state.calls.some((call) => call.collection === "tracks" && call.data), false);
});

test("entry POST counts a legacy entry without a seat toward the cap", async () => {
  state.nativeSlots = true;
  state.user = actors[1].user;
  // A member-attributed row from before seats were required: no valid seat.
  state.trackDocs = [slotFixture(1), { ...slotFixture(2), id: "track-legacy", slotIndex: null as unknown as number }];
  const response = await entryPost();
  assert.equal(response.status, 409);
  assert.equal(state.calls.some((call) => call.collection === "tracks" && call.data), false);
});

test("entry POST does not treat any other unique clash as a taken seat", async () => {
  state.nativeSlots = true;
  state.user = actors[1].user;
  state.trackDocs = [];
  for (const error of [uniqueClash("slug"), new ValidationError({ collection: "setlists", errors: [{ message: "x", path: "setlist_id, submitted_by_id, slot_index" }] })]) {
    state.createError = error;
    await assert.rejects(entryPost(), (thrown) => thrown === error);
  }
});

test("entry writes need a member session", async () => {
  state.user = null;
  assert.equal((await entryPost()).status, 401);
  assert.equal((await entryDelete("track-1")).status, 401);
  // A CMS staff account is not an attendee: it edits Tracks in the CMS instead.
  state.user = actors[2].user;
  assert.equal((await entryPost()).status, 403);
  assert.equal(state.calls.length, 0);
});

test("an eligible member's entry writes run through Payload access with the request threaded", async () => {
  state.nativeSlots = true;
  state.user = actors[1].user;
  state.trackDocs = [slotFixture(2)];
  assert.equal((await entryPost()).status, 200);
  assert.equal((await entryDelete("track-2")).status, 200);
  const writes = state.calls.filter((call) => call.collection === "tracks" && (call.data || call.id) && !call.where);
  assert.equal(writes.length, 2);
  for (const write of writes) {
    assert.equal(write.overrideAccess, false);
    assert.equal(typeof write.req, "object");
  }
  // The routes write neither the setlist dirty flag nor any position; Tracks hooks do.
  assert.equal(state.calls.some((call) => (call.collection === "setlists" || call.collection === "setlist-positions") && call.data), false);
});

test("a curator (CMS staff) can bind Apple Music on a private setlist; the write runs through Setlists access", async () => {
  state.user = actors[2].user;
  state.setlist = { ...fixture(), isPublic: false };
  const result = await tokenPOST(new Request("https://example.test/token", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ playlistId: "p.private" })
  }), context());
  assert.equal(result.status, 200);
  const writes = state.calls.filter((call) => call.data);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].overrideAccess, false);
  assert.deepEqual(writes[0].data, { appleMusic: { playlistId: "p.private" } });
});

test("entry POST and PATCH reject a malformed body without throwing", async () => {
  state.nativeSlots = true;
  state.user = actors[1].user;
  state.trackDocs = [];
  for (const body of ["null", "[]", JSON.stringify({ track: { id: "s", title: 7, artist: "A" } }),
    JSON.stringify({ track: { id: "s", title: "T", artist: "A" }, note: 5 })]) {
    const response = await slotsPOST(new Request("https://example.test/slots", { method: "POST", body }), context());
    assert.equal(response.status, 400, body);
  }
  for (const body of ["{}", JSON.stringify({ note: 5 })]) {
    const response = await slotsPATCH(new Request("https://example.test/slots/track-1", { method: "PATCH", body }), entryContext("track-1"));
    assert.equal(response.status, 400, body);
  }
});

test("apple-token POST answers malformed JSON shapes with 400, never 500", async () => {
  state.user = actors[2].user;
  for (const body of ["null", "[]", "5", "\"text\"", JSON.stringify({ playlistId: 5 }), JSON.stringify({ musicUserToken: { nested: true } })]) {
    const result = await tokenPOST(new Request("https://example.test/token", { method: "POST", body }), context());
    assert.equal(result.status, 400, body);
  }
  assert.equal(state.calls.some((call) => call.data), false);
});

// Review-B setlist audit (25 Nov): only an active setlist with a valid future deadline takes
// entries, through the shipped eligibility, whatever isPublic says.
const entryParams = () => ({ params: Promise.resolve({ slug: "synthetic-setlist", entryId: "track-1" }) });
const entryWrites = () => [
  slotsPOST(new Request("https://example.test/slots", { method: "POST", body: JSON.stringify({ track: { id: "song-9", title: "T", artist: "A" } }) }), context()),
  slotsPATCH(new Request("https://example.test/slots/track-1", { method: "PATCH", body: JSON.stringify({ note: "n" }) }), entryParams()),
  slotsDELETE(new Request("https://example.test/slots/track-1", { method: "DELETE" }), entryParams())
];
const closedSetlists: Array<[string, Partial<SyntheticSetlist>, string]> = [
  ["a public draft", { status: "draft" }, "setlist_locked"],
  ["a public locked setlist", { status: "locked" }, "setlist_locked"],
  ["a public finalized setlist", { status: "finalized" }, "setlist_locked"],
  ["an active setlist with an unreadable deadline", { deadline: "not-a-date" }, "deadline_passed"],
  ["an active setlist with no deadline", { deadline: null }, "deadline_passed"],
  ["an active setlist past its deadline", { deadline: "2000-01-01T00:00:00.000Z" }, "deadline_passed"]
];
for (const [name, change, reason] of closedSetlists) {
  test(`member POST/PATCH/DELETE on ${name} is refused before any write`, async () => {
    state.realEligibility = true;
    state.user = actors[1].user;
    state.setlist = { ...fixture(), ...change } as SyntheticSetlist;
    for (const response of await Promise.all(entryWrites())) {
      assert.equal(response.status, 403);
      assert.equal((await response.json()).reason, reason);
    }
    assert.equal(state.calls.some((call) => call.data !== undefined), false, "no create, update or delete ran");
    assert.equal(state.eligibilityCalls, 3);
  });
}

test("an active public setlist with a future deadline passes the status gate (later gates still decide)", async () => {
  state.realEligibility = true;
  state.user = actors[1].user;
  for (const response of await Promise.all(entryWrites())) {
    const { reason } = await response.json();
    assert.notEqual(reason, "setlist_locked");
    assert.notEqual(reason, "deadline_passed");
  }
});
