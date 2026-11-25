import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { registerHooks } from "node:module";
import { after, before, test } from "node:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { authenticateStaffSession } from "@/lib/auth/staff-strategy";
import { revokeReviewEditorSessions } from "@/lib/auth/review-editor-revoke";
import { isConfiguredStaffEmail, reviewEditorOrigin } from "@/lib/auth/review-editor-policy";
import type { MemberMailNotification } from "@/lib/member-auth/mail";

const origin = reviewEditorOrigin;
const editor = "named-review-fixture@sophomores.co";
const deliveries: MemberMailNotification[] = [];
const fixtureEnv = { NEXT_PUBLIC_SERVER_URL: origin, REVIEW_OWNER_EMAIL: editor, MEMBER_AUTH_MODE: "disabled" };
const savedEnv = Object.fromEntries(Object.keys(fixtureEnv).map(key => [key, process.env[key]]));
Object.assign(process.env, fixtureEnv);

const database: Record<string, Record<string, unknown>[]> = {
  user: [], session: [], account: [], verification: [], rateLimit: [], passkey: [],
};
function createAuth({ createBetterAuthPlugins, betterAuthOptions }: typeof import("@/lib/auth/options")) {
  return betterAuth({
    ...betterAuthOptions, secret: randomBytes(32).toString("hex"),
    database: memoryAdapter(database),
    // Only the Payload after-hooks need real Local API storage; the grant proof
    // drives the registered staff bridge against a synthetic Local API.
    databaseHooks: {
      session: betterAuthOptions.databaseHooks.session,
      user: { create: { before: betterAuthOptions.databaseHooks.user.create.before } }
    },
    rateLimit: { enabled: false },
    plugins: createBetterAuthPlugins({ appURL: origin, mailer: async notification => { deliveries.push(notification); } })
  });
}
let options: typeof import("@/lib/auth/options");
let auth: ReturnType<typeof createAuth>;
before(async () => {
  options = await import("@/lib/auth/options");
  auth = createAuth(options);
});
after(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
const post = (path: string, body: object, requestOrigin = origin) =>
  auth.handler(new Request(origin + "/api/auth" + path, {
    method: "POST", headers: { "content-type": "application/json", origin: requestOrigin }, body: JSON.stringify(body),
  }));
const otp = (email: string) => post("/email-otp/send-verification-otp", { email, type: "sign-in" });
const magic = (email: string, callbackURL = "/vault") => post("/sign-in/magic-link", { email, callbackURL });

test("review auth sends nothing to customers or unlisted domain mailboxes; member discovery is disabled", async () => {
  for (const email of ["unlisted@sophomores.co", "customer@example.invalid"]) {
    assert.equal((await otp(email)).status, 403);
    assert.equal((await magic(email)).status, 403);
  }
  assert.equal((await magic(editor, "/me")).status, 403);
  assert.equal((await post("/member-email-entry/check", { email: editor })).status, 403);
  assert.equal((await post("/email-otp/send-verification-otp", { email: editor, type: "sign-in" }, "https://wrong.example")).status, 403);
  const wrongHost = await auth.handler(new Request(origin + "/api/auth/email-otp/send-verification-otp", {
    method: "POST", headers: { "content-type": "application/json", origin, host: "wrong.example" },
    body: JSON.stringify({ email: editor, type: "sign-in" }),
  }));
  assert.equal(wrongHost.status, 403);
  assert.equal(database.verification.length, 0);
  assert.equal(deliveries.length, 0);
});

test("a verified named editor can log in, but removal denies their old CMS session and fresh mail", async () => {
  const signIn = async (email: string) => {
    assert.equal((await otp(email)).status, 200);
    const note = deliveries.at(-1);
    assert.ok(note?.type === "email-otp");
    const result = await post("/sign-in/email-otp", { email, otp: note.otp });
    assert.equal(result.status, 200);
    assert.match(result.headers.getSetCookie().join(";"), /Secure/i);
    assert.match(result.headers.getSetCookie().join(";"), /HttpOnly/i);
    return result.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
  };
  const cookie = await signIn(editor);
  assert.notEqual(await signIn(editor), cookie);
  const context = await auth.$context;
  await assert.rejects(revokeReviewEditorSessions(origin, editor, context.internalAdapter), /Remove the editor/);
  assert.equal((await magic(editor)).status, 200);
  const delayed = deliveries.at(-1);
  assert.ok(delayed?.type === "magic-link");
  assert.equal(new URL(delayed.url).origin, origin);
  assert.equal(new URL(delayed.url).pathname, "/api/auth/magic-link/verify");
  assert.equal(new URL(delayed.url).searchParams.get("callbackURL"), "/vault");
  let docs: { id: string; role: string }[] = [];
  let creates = 0;
  const payload = {
    betterAuth: auth,
    find: async () => ({ docs }),
    create: async ({ data }: { data: { role: string; email: string } }) => {
      assert.equal(data.email, editor);
      creates++;
      docs = [{ id: "editor-admin", role: data.role }];
    },
  };
  const bridge = (value = cookie) => authenticateStaffSession({
    headers: new Headers({ cookie: value }),
    payload,
  });
  assert.equal((await bridge("")).user, null);
  assert.equal(creates, 0);
  assert.equal((await bridge()).user?.role, "staff");
  assert.equal(creates, 1);
  assert.equal((await bridge()).user?.id, "editor-admin");
  docs = [];
  assert.equal((await bridge()).user?.id, "editor-admin", "deleting a row alone is not revocation");
  assert.equal(creates, 2);
  docs = [{ id: "editor-admin", role: "admin" }];
  assert.equal((await bridge()).user?.role, "admin", "the explicitly assigned owner role survives staff bootstrap");
  assert.equal(creates, 2);
  // Switch the one allowed identity: test stale links through the session hook,
  // not merely the empty-profile endpoint stop.
  process.env.REVIEW_OWNER_EMAIL = "replacement-owner@sophomores.co";
  try {
    docs = [];
    assert.equal((await bridge()).user, null);
    assert.equal(creates, 2);
    await assert.rejects(auth.api.getSession({ headers: new Headers({ cookie }) }), /unavailable/);
    assert.equal((await otp(editor)).status, 403);
    assert.equal((await magic(editor)).status, 403);
    const delayedResponse = await auth.handler(new Request(delayed.url));
    assert.equal(delayedResponse.headers.getSetCookie().some(value => value.includes("session_token=")), false);
    assert.equal(database.session.length, 2);
    assert.notEqual(delayedResponse.headers.get("location"), origin + "/vault");
    assert.equal(await revokeReviewEditorSessions(origin, editor, context.internalAdapter), 2);
    assert.equal(await revokeReviewEditorSessions(origin, editor, context.internalAdapter), 0);
    assert.equal(database.session.length, 0);
    assert.equal(await auth.api.getSession({ headers: new Headers({ cookie }) }), null);
  } finally { process.env.REVIEW_OWNER_EMAIL = editor; }
});


test("the exact review host has no domain-only fallback, and the normal site is unchanged", () => {
  assert.equal(isConfiguredStaffEmail(origin, editor, {}), false);
  for (const list of [editor + ",", editor + "," + editor.toUpperCase(), "other@example.invalid", ""]) {
    assert.equal(isConfiguredStaffEmail(origin, editor, { REVIEW_OWNER_EMAIL: list }), false);
  }
  assert.equal(isConfiguredStaffEmail(origin, editor.toUpperCase(), { REVIEW_OWNER_EMAIL: editor }), true);
  assert.equal(isConfiguredStaffEmail("https://sophomores.co", editor, { REVIEW_OWNER_EMAIL: editor }), false);
  assert.equal(isConfiguredStaffEmail("https://sophomores.co", editor, {}), true);
  assert.equal(isConfiguredStaffEmail("https://sophomores.co", "work@sophomores.co", {}), true);
});


test("OTP and magic link are the only review login mechanisms and the RP stays host scoped", async () => {
  const passkey = options.createBetterAuthPlugins({ appURL: origin }).find(plugin => plugin.id === "passkey");
  assert.deepEqual(passkey?.options && {
    rpID: Reflect.get(passkey.options, "rpID"), origin: Reflect.get(passkey.options, "origin")
  }, { rpID: "preview.sophomores.co", origin });
  for (const path of ["/sign-in/social", "/passkey/verify-authentication", "/update-user", "/multi-session/set-active"]) {
    const res = await post(path, {});
    assert.equal(res.ok, false, path);
  }
  assert.equal((await magic(editor)).status, 200);
  const note = deliveries.at(-1);
  assert.ok(note?.type === "magic-link");
  const result = await auth.handler(new Request(note.url, { headers: { "sec-fetch-site": "cross-site" } }));
  assert.equal(result.status, 302);
  assert.equal(result.headers.get("location"), origin + "/vault");
  assert.match(result.headers.getSetCookie().join(";"), /Secure/i);
  const replay = await auth.handler(new Request(note.url));
  assert.equal(replay.headers.getSetCookie().some(value => value.includes("session_token=")), false);
});


test("the same CMS cookie is not a customer session and cannot authorize collaboration", async t => {
  const sent = await otp(editor);
  assert.equal(sent.status, 200);
  const delivery = deliveries.at(-1);
  assert.ok(delivery?.type === "email-otp");
  const signed = await post("/sign-in/email-otp", { email: editor, otp: delivery.otp });
  assert.equal(signed.status, 200);
  const cookie = signed.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
  const headers = new Headers({ cookie, "x-sync-secret": "synthetic-shared-sync-value" });
  let providerCalls = 0;
  t.mock.method(globalThis, "fetch", async () => { providerCalls++; throw new Error("No provider I/O"); });
  const key = "__reviewEditorRouteFixture";
  let storageReads = 0;
  let allowPublicRead = false;
  const payload = { betterAuth: { api: {
    getSession: auth.api.getSession,
    listSessions: () => assert.fail("Customer session list accessed"),
    listUserAccounts: () => assert.fail("Customer accounts accessed"),
  } },
    auth: async () => ({ user: null }),
    find: async ({ collection }: { collection: string }) => {
      storageReads++;
      if (collection === "admins") return { docs: [{ id: "editor-admin", role: "staff" }] };
      assert.ok(allowPublicRead, "denied operations must not read storage");
      return { docs: collection === "setlists" ? [{ id: "fixture", isPublic: true, appleMusic: { playlistUrl: "https://music.apple.com/us/playlist/fixture" } }] : [] };
    },
  };
  Object.defineProperty(globalThis, key, { configurable: true, value: { headers, payload } });
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      const source = specifier === "next/headers" ? `export const headers = async () => globalThis.${key}.headers`
        : specifier === "@/payload" ? `export const getPayload = async () => globalThis.${key}.payload`
        // The setlist reads carry the caller's Payload principal on a local request; this stub has no
        // Payload config for createLocalReq, so the request is the principal Payload's own auth returns.
        : specifier === "@/lib/music/local-request" ? `export const setlistLocalRequest = async (payload, request, known) =>
            ({ user: known ?? (await payload.auth({ headers: request.headers })).user ?? null, payloadAPI: "local", context: {} });
          export const setlistMember = (req) => req.user?.collection === "users" ? req.user : null;`
        : undefined;
      return source === undefined ? nextResolve(specifier, context)
        : { url: "data:text/javascript," + encodeURIComponent(source), shortCircuit: true };
    },
    load(url, context, nextLoad) {
      if (url.startsWith("data:text/javascript,")) return {
        format: "module", source: decodeURIComponent(url.slice("data:text/javascript,".length)), shortCircuit: true
      };
      return nextLoad(url, context);
    }
  });
  t.after(() => { hooks.deregister(); Reflect.deleteProperty(globalThis, key); });
  const oldSecret = process.env.SETLIST_SYNC_SECRET;
  process.env.SETLIST_SYNC_SECRET = "synthetic-shared-sync-value";
  t.after(() => {
    if (oldSecret === undefined) delete process.env.SETLIST_SYNC_SECRET;
    else process.env.SETLIST_SYNC_SECRET = oldSecret;
  });

  assert.equal((await authenticateStaffSession({ payload, headers })).user?.collection, "admins");
  const customer = await import("@/lib/auth/server");
  assert.equal((await customer.currentUser()) === null, true, "staff cookie is not a customer identity");
  assert.equal(await customer.getSession(), null);
  assert.equal(await customer.getDeviceSessions(), null);
  assert.equal(await customer.getUserAccounts(), null);
  assert.equal((await auth.handler(new Request(origin + "/api/auth/get-session", { headers }))).status, 403);
  const request = (path: string, method = "GET") => new Request(origin + path, { method, headers });
  const context = { params: Promise.resolve({ slug: "fixture", entryId: "11111111-1111-4111-8111-111111111111" }) };
  const sync = await import("@/app/api/setlists/[slug]/sync/route");
  const slots = await import("@/app/api/setlists/[slug]/slots/route");
  const slot = await import("@/app/api/setlists/[slug]/slots/[entryId]/route");
  const own = await import("@/app/api/setlists/[slug]/my-slots/route");
  const apple = await import("@/app/api/setlists/[slug]/apple-token/route");
  for (const [fn, path, method] of [
    [sync.POST, "sync", "POST"], [slots.POST, "slots", "POST"], [slot.DELETE, "slots/entry", "DELETE"], [slot.PATCH, "slots/entry", "PATCH"],
    [own.GET, "my-slots", "GET"], [apple.GET, "apple-token", "GET"], [apple.POST, "apple-token", "POST"]
  ] as const) {
    const response = await fn(request("/api/setlists/fixture/" + path, method), context);
    assert.equal(response.status, 403, path);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
  const developer = await import("@/app/api/music/apple/developer-token/route");
  const playlist = await import("@/app/api/music/apple/playlist/route");
  const search = await import("@/app/api/music/apple/search/route");
  const denied = await Promise.all([
    developer.GET(request("/api/music/apple/developer-token")), playlist.GET(request("/api/music/apple/playlist?id=fixture")),
    search.GET(request("/api/music/apple/search?q=fixture")),
  ]);
  assert.deepEqual(denied.map(response => response.status), [403, 403, 403]);

  const { commercePlugin } = await import("@/lib/commerce/ecommerce");
  const { commerceDomainPlugin } = await import("@/lib/commerce/domain");
  const { postgresAdapter } = await import("@payloadcms/db-postgres");
  const config = await commerceDomainPlugin(await commercePlugin({ collections: [], endpoints: [],
    secret: "synthetic", db: postgresAdapter({ pool: {} }) }));
  const endpoints = config.endpoints ?? [];
  const cartEndpoints = config.collections?.find(collection => collection.slug === "carts")?.endpoints;
  assert.ok(Array.isArray(cartEndpoints) && cartEndpoints.length > 0);
  const checkoutEndpoints = endpoints.filter(endpoint => endpoint.path.startsWith("/payments/"));
  assert.ok(checkoutEndpoints.some(endpoint => endpoint.path.endsWith("/initiate")));
  const ordersAndInvitations = endpoints.filter(endpoint =>
    ["/commerce/orders/:orderID/admissions", "/commerce/guest-operations"].includes(endpoint.path));
  assert.equal(ordersAndInvitations.length, 2);
  const cmsRequest = { headers, user: { id: "editor-admin", collection: "admins", _strategy: "staff-better-auth", role: "admin" },
    get payload(): never { throw new Error("Denied operations must not open Payload"); },
  } as unknown as import("payload").PayloadRequest;
  for (const endpoint of [...cartEndpoints, ...checkoutEndpoints, ...ordersAndInvitations]) {
    const response = await endpoint.handler(cmsRequest);
    assert.equal(response.status, 403, endpoint.path);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
  assert.equal(storageReads, 1, "only the CMS bridge performed an admin lookup");

  allowPublicRead = true;
  const setlist = await import("@/app/api/setlists/[slug]/route");
  const publicResponse = await setlist.GET(request("/api/setlists/fixture"), context);
  assert.equal(publicResponse.status, 200);
  assert.deepEqual((await publicResponse.json()).setlist.tracks, []);
  assert.equal(providerCalls, 0);
});


test("Payload generic reads preserve the CMS exception without admitting a removed owner", async t => {
  assert.equal((await otp(editor)).status, 200);
  const delivery = deliveries.at(-1);
  assert.ok(delivery?.type === "email-otp");
  const signed = await post("/sign-in/email-otp", { email: editor, otp: delivery.otp });
  assert.equal(signed.status, 200);
  const headers = new Headers({ cookie: signed.headers.getSetCookie().map(value => value.split(";")[0]).join("; ") });
  const admin: import("@/payload-types").Admin = {
    id: "owner-admin", email: editor, name: "Fixture owner", role: "admin", collection: "admins",
    createdAt: "2026-11-20T00:00:00Z", updatedAt: "2026-11-20T00:00:00Z",
  };
  const bridge = () => authenticateStaffSession({
    headers,
    payload: { betterAuth: auth, find: async () => ({ docs: [{ ...admin }] }) },
  });
  const bridged = (await bridge()).user;
  assert.equal(bridged?.collection, "admins");
  assert.equal(bridged?.id, admin.id);
  assert.equal(bridged?.role, "admin");
  const owner = { ...admin, _strategy: bridged._strategy };
  const { BasePayload, buildConfig, createLocalReq } = await import("payload");
  const { postgresAdapter } = await import("@payloadcms/db-postgres");
  const { Users } = await import("@/payload/collections/users");
  const { Admins } = await import("@/payload/collections/admins");
  const { Tracks } = await import("@/payload/collections/tracks");
  const { Setlists } = await import("@/payload/collections/setlists");
  const { SetlistPositions } = await import("@/payload/collections/setlist-positions");
  const { Albums } = await import("@/payload/collections/albums");
  const { Tags } = await import("@/payload/collections/tags");
  const override = options.betterAuthPluginOptions.users?.collectionOverrides;
  assert.ok(override);
  const users = override({ collection: Users });
  const payload = await new BasePayload().init({
    config: buildConfig({
      secret: randomBytes(32).toString("hex"),
      telemetry: false,
      typescript: { autoGenerate: false },
      admin: { user: "admins" },
      // Setlists relate to their event (music Hardening C); a minimal stand-in keeps the config valid.
      collections: [Admins, users, Tracks, Setlists, SetlistPositions, Albums, Tags, { slug: "commerce-events", fields: [] }],
      db: postgresAdapter({ pool: {}, push: false }),
    }),
    disableDBConnect: true,
    disableOnInit: true,
  });
  let reads = 0;
  const accessFilters: unknown[] = [];
  t.mock.method(payload.db, "find", async ({ collection, where }: { collection: string; where?: unknown }) => {
    reads++;
    accessFilters.push(where);
    const docs = collection === "users" ? [{ id: "other-account", email: "synthetic@example.invalid" }]
      : collection === "tracks" && !JSON.stringify(where).includes("isPublic") ?
        [{ id: "private-track", title: "Synthetic private track", setlist: "private-setlist" }] : [];
    return { docs, hasNextPage: false, hasPrevPage: false, totalDocs: docs.length, totalPages: 1, page: 1, limit: 10,
      pagingCounter: 1, nextPage: null, prevPage: null };
  });
  const read = async (collection: "users" | "tracks", user: typeof owner | null) => {
    const endpoints = payload.collections[collection].config.endpoints;
    assert.ok(Array.isArray(endpoints));
    const endpoint = endpoints.find(e => e.method === "get" && e.path === "/");
    assert.ok(endpoint, "Payload installs generic collection REST reads");
    const req = await createLocalReq({ req: { user,
      payloadAPI: "REST", routeParams: { collection }, query: { depth: "0" } } }, payload);
    return endpoint.handler(req);
  };
  const accounts = await read("users", owner);
  assert.equal(accounts.status, 200);
  assert.deepEqual((await accounts.json()).docs.map((doc: { id: string }) => doc.id), ["other-account"]);
  const tracks = await read("tracks", owner);
  assert.equal(tracks.status, 200);
  assert.deepEqual((await tracks.json()).docs.map((doc: { id: string }) => doc.id), ["private-track"]);
  assert.equal(reads, 2);

  for (const collection of [Tracks, Setlists]) {
    const ownerRequest = await createLocalReq({ user: owner }, payload);
    const anonymousRequest = await createLocalReq({}, payload);
    for (const action of ["create", "update", "delete"] as const) {
      const policy = collection.access?.[action];
      assert.ok(policy);
      assert.equal(await policy({ req: ownerRequest }), true);
      assert.equal(await policy({ req: anonymousRequest }), false);
    }
  }

  // The same signed cookie remains durable but is no longer a Payload CMS
  // principal once its mailbox is removed. Normal public track reads remain.
  process.env.REVIEW_OWNER_EMAIL = "replacement-owner@sophomores.co";
  try {
    const removed = (await bridge()).user;
    assert.equal(removed, null);
    await assert.rejects(read("users", removed), { status: 403 });
    assert.equal(reads, 2);
    const publicTracks = await read("tracks", removed);
    assert.equal(publicTracks.status, 200);
    assert.deepEqual((await publicTracks.json()).docs, []);
    assert.equal(JSON.stringify(accessFilters.at(-1)).includes("setlist.isPublic"), true);
  } finally {
    process.env.REVIEW_OWNER_EMAIL = editor;
  }
});
