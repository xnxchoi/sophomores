import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, before, beforeEach, test } from "node:test";

// Apple Music routes spend the shared Apple quota. The caller is the principal
// Payload's own auth returns: a curator is a verified CMS staff principal
// (developer-token, playlist, setlist apple-token); search needs an activated
// member account. Each account is limited per route; an address is counted only
// for refused requests. Provider and Payload are stubbed; handlers and the
// limiter run as shipped.
type Actor = Record<string, unknown> & { id: string };
const member: Actor = { id: "member-1", collection: "users", email: "member@example.test", emailVerified: true };
const unverifiedMember: Actor = { id: "member-2", collection: "users", email: "new@example.test" };
const forgedCurator: Actor = { id: "member-3", collection: "users", email: "fixture@sophomores.co", emailVerified: true, role: "admin" };
const staff: Actor = { id: "staff-1", collection: "admins", role: "staff", _strategy: "staff-better-auth" };
// Curator authority is the super-admin-set grant on the admins row, not a role.
const ungrantedAdmin: Actor = { ...staff, id: "admin-1", role: "admin", setlistCurator: false };
const curator: Actor = { ...staff, id: "curator-1", setlistCurator: true };
const state = { user: null as Actor | null, providerCalls: 0, searchArgs: [] as unknown[][] };
const key = "__sphmrsAppleMusicGuard";
const target = `globalThis.${key}`;
const moduleUrl = (source: string) => `data:text/javascript,${encodeURIComponent(source)}`;
const setlist = {
  id: "11111111-1111-4111-8111-111111111111", slug: "synthetic-setlist", isPublic: true,
  appleMusic: { playlistId: "p.synthetic", playlistUrl: "https://example.test/playlist" }
};
const harness = {
  payload: {
    async auth() { return { user: state.user }; },
    async find() { return { docs: [structuredClone(setlist)] }; },
    async update(args: { data: unknown }) { return args.data; }
  },
  provider(kind: string, ...args: unknown[]) {
    state.providerCalls++;
    if (kind === "search") { state.searchArgs.push(args); return []; }
    if (kind === "playlist") return { id: "p.synthetic", tracks: [] };
    return "synthetic-developer-token";
  }
};
let hooks: ReturnType<typeof registerHooks>;
let developerToken: (request: Request) => Promise<Response>;
let playlist: (request: Request) => Promise<Response>;
let search: (request: Request) => Promise<Response>;
let appleTokenGET: (request: Request, context: { params: Promise<{ slug: string }> }) => Promise<Response>;
const originalEnvironment = process.env;
let ipCounter = 0;
// Each test uses its own client addresses so refusal windows never leak between tests.
const freshIp = () => `198.51.${Math.floor(++ipCounter / 250)}.${(ipCounter % 250) + 1}`;
const get = (path: string, ip: string) => new Request(`https://example.test${path}`, { headers: { "x-forwarded-for": ip } });
const context = () => ({ params: Promise.resolve({ slug: "synthetic-setlist" }) });

before(async () => {
  process.env = { NODE_ENV: "test" };
  Object.defineProperty(globalThis, key, { configurable: true, value: harness });
  hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      let source: string | undefined;
      if (specifier === "@/payload") source = `export const getPayload=async()=>${target}.payload;`;
      if (specifier === "@/lib/music/apple-music") source = [
        `export const getAppleMusicDeveloperToken=async(...a)=>${target}.provider("token",...a);`,
        `export const getAppleMusicPlaylist=async(...a)=>${target}.provider("playlist",...a);`,
        `export const searchAppleMusicSongs=async(...a)=>${target}.provider("search",...a);`
      ].join("");
      if (specifier === "@/lib/music/config") source = "export const getAppleMusicConfig=()=>({storefront:'us'}); export const isAppleMusicConfigured=()=>true;";
      if (source !== undefined) return { url: moduleUrl(source), shortCircuit: true };
      if (specifier === "pg" || specifier.includes("payload-runtime")) throw new Error("Route guard test must not bootstrap runtime services");
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url.startsWith("data:text/javascript,")) return {
        format: "module", source: decodeURIComponent(url.slice("data:text/javascript,".length)), shortCircuit: true
      };
      return nextLoad(url, context);
    }
  });
  ({ GET: developerToken } = await import("@/app/api/music/apple/developer-token/route"));
  ({ GET: playlist } = await import("@/app/api/music/apple/playlist/route"));
  ({ GET: search } = await import("@/app/api/music/apple/search/route"));
  ({ GET: appleTokenGET } = await import("@/app/api/setlists/[slug]/apple-token/route"));
});
beforeEach(() => { state.user = null; state.providerCalls = 0; state.searchArgs = []; });
after(() => {
  hooks.deregister();
  process.env = originalEnvironment;
  Reflect.deleteProperty(globalThis, key);
});

const routes = [
  { name: "developer-token", call: (ip: string) => developerToken(get("/api/music/apple/developer-token", ip)), role: "curator" },
  { name: "playlist", call: (ip: string) => playlist(get("/api/music/apple/playlist?id=pl.synthetic", ip)), role: "curator" },
  { name: "search", call: (ip: string) => search(get("/api/music/apple/search?q=synthetic", ip)), role: "member" },
  { name: "setlist apple-token", call: (ip: string) => appleTokenGET(get("/api/setlists/synthetic-setlist/apple-token", ip), context()), role: "curator" }
] as const;
const allowedActor = (role: string, id: string): Actor => ({ ...(role === "curator" ? curator : member), id });

for (const route of routes) {
  test(`${route.name}: no session is 401 and never reaches Apple`, async () => {
    assert.equal((await route.call(freshIp())).status, 401);
    assert.equal(state.providerCalls, 0);
  });

  if (route.role === "curator") {
    test(`${route.name}: a member, even with a staff-domain email and an admin role claim, is 403`, async () => {
      for (const actor of [member, forgedCurator]) {
        state.user = actor;
        assert.equal((await route.call(freshIp())).status, 403);
      }
      assert.equal(state.providerCalls, 0);
    });

    test(`${route.name}: CMS staff without the curator grant is 403, whatever the role`, async () => {
      for (const actor of [staff, ungrantedAdmin]) {
        state.user = actor;
        assert.equal((await route.call(freshIp())).status, 403);
      }
      assert.equal(state.providerCalls, 0);
    });
  } else {
    test(`${route.name}: an unverified member account and a CMS staff account are 403`, async () => {
      for (const actor of [unverifiedMember, staff]) {
        state.user = actor;
        assert.equal((await route.call(freshIp())).status, 403);
      }
      assert.equal(state.providerCalls, 0);
    });
  }

  test(`${route.name}: an allowed caller still works, privately cached`, async () => {
    state.user = allowedActor(route.role, `${route.name}-allowed`);
    const response = await route.call(freshIp());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  });

  test(`${route.name}: one account over its limit gets 429 with Retry-After`, async () => {
    state.user = allowedActor(route.role, `${route.name}-busy`);
    let last: Response | undefined;
    for (let attempt = 0; attempt < 200; attempt++) {
      last = await route.call(freshIp());
      if (last.status !== 200) break;
    }
    assert.equal(last?.status, 429);
    assert.match(last?.headers.get("retry-after") ?? "", /^[1-9]\d*$/);
    const calls = state.providerCalls;
    assert.equal((await route.call(freshIp())).status, 429);
    assert.equal(state.providerCalls, calls, "a limited request must not reach Apple");
  });

  test(`${route.name}: an address with too many refused requests gets 429, but its signed-in callers still work`, async () => {
    const ip = freshIp();
    let last: Response | undefined;
    for (let attempt = 0; attempt < 500; attempt++) {
      last = await route.call(ip);
      if (last.status !== 401) break;
    }
    assert.equal(last?.status, 429);
    state.user = allowedActor(route.role, `${route.name}-same-venue`);
    assert.equal((await route.call(ip)).status, 200, "refusals from one address never lock out admitted accounts");
  });
}

test("refusal windows are per route: a saturated search address still gets 401 on developer-token", async () => {
  const ip = freshIp();
  let status = 401;
  while (status === 401) status = (await search(get("/api/music/apple/search?q=a", ip))).status;
  assert.equal(status, 429);
  assert.equal((await developerToken(get("/api/music/apple/developer-token", ip))).status, 401);
});

test("a full account table admits a new account instead of locking it out", async () => {
  for (let index = 0; index < 2100; index++) {
    state.user = { ...member, id: `crowd-${index}` };
    assert.equal((await search(get("/api/music/apple/search?q=a", freshIp()))).status, 200);
  }
  state.user = { ...member, id: "late-arrival" };
  assert.equal((await search(get("/api/music/apple/search?q=a", freshIp()))).status, 200);
});

test("an account window reopens after the window passes", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2099-01-01T00:00:00Z") });
  state.user = { ...member, id: "window-user" };
  let status = 200;
  while (status === 200) status = (await search(get("/api/music/apple/search?q=a", freshIp()))).status;
  assert.equal(status, 429);
  t.mock.timers.tick(61_000);
  assert.equal((await search(get("/api/music/apple/search?q=a", freshIp()))).status, 200);
});

test("search rejects a storefront that is not a two-letter code", async () => {
  state.user = { ...member, id: "storefront-user" };
  const bad = await search(get("/api/music/apple/search?q=a&storefront=us%2Fplaylists%2Fx", freshIp()));
  assert.equal(bad.status, 400);
  assert.equal(state.providerCalls, 0);
  const good = await search(get("/api/music/apple/search?q=a&storefront=KR", freshIp()));
  assert.equal(good.status, 200);
  assert.equal(state.searchArgs[0][2], "kr");
});
