import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, before, test } from "node:test";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { defaultHomeHref, homeEntryGatePath, homeEntryMarker, warpEntryCookie } from "@/lib/content/home";
import { HomeEntry, entryCodePattern, newEntryCode } from "@/payload/globals/home-entry";

// Owner, 24 Nov: "make the users go to shop home by default. I want the main warp page being activated for only a set
// period of time, and for those entering with a particular link." The Warp home shows inside the window, after an
// entry link, or to staff previewing it; every other "/" goes to the default home, by a real redirect.
type Server = typeof import("@/lib/content/home-entry.server");
let server: Server;
let serverOnly: ReturnType<typeof registerHooks>;
const previousSecret = process.env.PAYLOAD_SECRET;
before(async () => {
  process.env.PAYLOAD_SECRET = "test-secret-for-the-warp-entry-cookie";
  serverOnly = registerHooks({
    resolve: (specifier, context, nextResolve) => specifier === "server-only"
      ? { url: new URL("../fixtures/team/server-only.ts", import.meta.url).href, shortCircuit: true }
      : nextResolve(specifier, context)
  });
  server = await import("@/lib/content/home-entry.server");
});
after(() => {
  serverOnly?.deregister();
  if (previousSecret === undefined) delete process.env.PAYLOAD_SECRET;
  else process.env.PAYLOAD_SECRET = previousSecret;
});

const hour = 60 * 60 * 1000;
const now = Date.parse("2026-12-01T03:00:00.000Z");
const code = "SpringWindow_0123456789a";
const open = () => server.parseHomeEntry({
  warpStart: new Date(now - hour).toISOString(), warpEnd: new Date(now + hour).toISOString(), entryLinks: [{ code }]
});
const shut = () => server.parseHomeEntry({ entryLinks: [{ code }] });
const cookieOf = (response: Response) => response.headers.get("set-cookie") ?? "";
const passOf = (response: Response) => /sphmrs_warp=([^;]+)/.exec(cookieOf(response))?.[1];

test("the default home is one constant, and the gate's names line up with the config", async () => {
  assert.equal(defaultHomeHref, "/shop");
  assert.equal(warpEntryCookie, "sphmrs_warp");
  const config = (await import("../../next.config")).default;
  const rewrites = await config.rewrites?.();
  assert.ok(rewrites && !Array.isArray(rewrites));
  const gate = (rewrites.beforeFiles ?? []).find((rule) => rule.destination === homeEntryGatePath);
  assert.ok(gate, "a rewrite sends '/' to the gate");
  assert.equal(gate.source, "/");
  assert.deepEqual(gate.missing?.map((item) => `${item.type}:${item.key}`), [`cookie:${warpEntryCookie}`, "cookie:__prerender_bypass", `query:${homeEntryMarker}`]);
  const matches = (pathname: string) => getPathMatch(gate.source, { strict: true, removeUnnamedParams: true, sensitive: false })(pathname) !== false;
  assert.equal(matches("/"), true);
  for (const pathname of ["/shop", "/w/x", "/music", "/home-entry"]) assert.equal(matches(pathname), false, pathname);
  // Entry links never reach the request log.
  const ignore = config.logging && typeof config.logging === "object" ? config.logging.incomingRequests : undefined;
  const patterns = ignore && typeof ignore === "object" ? ignore.ignore ?? [] : [];
  assert.equal(patterns.some((pattern) => pattern.test(`/w/${code}`)), true);
  assert.equal(patterns.some((pattern) => pattern.test("/shop")), false);
});

test("the window is open only while both ends are set and now is between them", () => {
  assert.equal(server.warpWindowOpen(open(), now), true);
  assert.equal(server.warpWindowOpen(open(), now + 2 * hour), false);
  assert.equal(server.warpWindowOpen(open(), now - 2 * hour), false);
  assert.equal(server.warpWindowOpen(shut(), now), false);
  assert.equal(server.warpWindowOpen(server.parseHomeEntry({ warpStart: new Date(now - hour).toISOString() }), now), false);
  assert.equal(server.warpWindowOpen(server.parseHomeEntry(null), now), false);
});

test("the cookie-less '/' gate: the default home outside the window, a window pass inside it", () => {
  const closed = server.homeGateResponse({ entry: shut(), now });
  assert.equal(closed.status, 307);
  assert.equal(closed.headers.get("location"), defaultHomeHref);
  assert.equal(cookieOf(closed), "");
  assert.equal(closed.headers.get("cache-control"), "private, no-store");

  const inside = server.homeGateResponse({ entry: open(), now });
  assert.equal(inside.status, 303);
  // Review-B r1: one pass only. The way back carries the marker, which the gate's rewrite never catches, so a
  // browser that refuses the cookie lands on the Warp home instead of being sent round.
  assert.equal(inside.headers.get("location"), `/?${homeEntryMarker}`);
  assert.match(cookieOf(inside), /^sphmrs_warp=window\.\d+\.[A-Za-z0-9_-]{43}; Path=\/; Max-Age=3600; HttpOnly; SameSite=Lax/);
  // The pass ends with the window when that comes first.
  assert.equal(server.readWarpPass(passOf(inside), now)?.expires, now + hour);

  // Max-Age never rounds to 0 (which would delete the cookie at once) and never outlives the window.
  const closing = (left: number) => server.parseHomeEntry({ warpStart: new Date(now - hour).toISOString(), warpEnd: new Date(now + left).toISOString() });
  const late = server.homeGateResponse({ entry: closing(1500), now });
  assert.equal(late.status, 303);
  assert.match(cookieOf(late), /; Max-Age=1; /);
  const last = server.homeGateResponse({ entry: closing(400), now });
  assert.equal(last.headers.get("location"), `/?${homeEntryMarker}`);
  assert.equal(cookieOf(last), "", "under a second left: no pass, just the one way back");
});

test("an entry link: a valid code sets a 6-hour link pass; every answer leaves for '/' and keeps the code out of the page", () => {
  const valid = server.entryLinkResponse({ entry: shut(), code, now, address: "198.51.100.1" });
  assert.equal(valid.status, 303);
  assert.equal(valid.headers.get("location"), "/");
  assert.equal(valid.headers.get("referrer-policy"), "no-referrer");
  assert.equal(valid.headers.get("cache-control"), "private, no-store");
  assert.match(cookieOf(valid), /; Max-Age=21600; HttpOnly; SameSite=Lax/);
  assert.equal(cookieOf(valid).includes(code), false, "the cookie never carries the code");
  assert.equal(server.readWarpPass(passOf(valid), now)?.kind, "link");

  for (const wrong of ["SpringWindow_0123456789b", "short", "", "../../etc", `${code}x`]) {
    const response = server.entryLinkResponse({ entry: shut(), code: wrong, now, address: "198.51.100.2" });
    assert.equal(response.status, 303, wrong);
    assert.equal(response.headers.get("location"), "/");
    assert.equal(cookieOf(response), "", wrong);
  }
});

test("a pass is trusted only when signed here and not expired", () => {
  const pass = server.issueWarpPass({ kind: "link", expires: now + hour });
  assert.deepEqual(server.readWarpPass(pass, now), { kind: "link", expires: now + hour });
  assert.equal(server.readWarpPass(pass, now + hour), null, "expired");
  const [kind, expires, mac] = pass.split(".");
  assert.equal(server.readWarpPass(`${kind}.${Number(expires) + hour}.${mac}`, now), null, "extended");
  assert.equal(server.readWarpPass(`window.${expires}.${mac}`, now), null, "kind changed");
  assert.equal(server.readWarpPass("link.99999999999999.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", now), null, "forged");
  assert.equal(server.readWarpPass(undefined, now), null);
});

test("who sees the Warp home", () => {
  const link = server.readWarpPass(server.issueWarpPass({ kind: "link", expires: now + hour }), now);
  const window = server.readWarpPass(server.issueWarpPass({ kind: "window", expires: now + hour }), now);
  assert.equal(server.warpHomeAllowed({ entry: shut(), pass: null, now, staff: true }), true, "staff previewing");
  assert.equal(server.warpHomeAllowed({ entry: shut(), pass: link, now, staff: false }), true, "after an entry link");
  assert.equal(server.warpHomeAllowed({ entry: open(), pass: null, now, staff: false }), true, "inside the window");
  assert.equal(server.warpHomeAllowed({ entry: shut(), pass: window, now, staff: false }), false, "the window closed early");
  assert.equal(server.warpHomeAllowed({ entry: shut(), pass: null, now, staff: false }), false, "everyone else");
});

test("the global is staff-only and accepts only codes made here", async () => {
  const req = (user: unknown) => ({ req: { user } }) as never;
  const read = HomeEntry.access?.read as (args: never) => boolean;
  assert.equal(read(req(null)), false, "no public read");
  const links = HomeEntry.fields.find((field) => "name" in field && field.name === "entryLinks");
  assert.ok(links && links.type === "array");
  const codeField = links.fields.find((field) => "name" in field && field.name === "code");
  assert.ok(codeField && codeField.type === "text" && typeof codeField.validate === "function");
  const validate = codeField.validate as (value: unknown) => true | string;
  assert.equal(validate(code), true);
  assert.notEqual(validate("short"), true);
  assert.equal(server.entryCodeMatches(server.parseHomeEntry({ entryLinks: [{ code: "short" }] }), "short"), false);
});

test("entry-link attempts are limited per address; other addresses are unaffected", () => {
  const address = "203.0.113.9";
  for (let attempt = 0; attempt < server.entryLinkLimit.max; attempt++) {
    assert.equal(server.entryLinkResponse({ entry: shut(), code: "wrong", now, address }).status, 303);
  }
  const refused = server.entryLinkResponse({ entry: shut(), code, now, address });
  assert.equal(refused.status, 429, "even a valid code waits once the address is over the limit");
  assert.equal(cookieOf(refused), "");
  assert.equal(refused.headers.get("cache-control"), "private, no-store");
  assert.ok(Number(refused.headers.get("retry-after")) >= 1);
  assert.equal(server.entryLinkResponse({ entry: shut(), code, now, address: "203.0.113.10" }).status, 303);
  // The window resets.
  assert.equal(server.entryLinkResponse({ entry: shut(), code, now: now + server.entryLinkLimit.windowMs + 1, address }).status, 303);
});

test("codes are made by the server: a new row gets a fresh code, a saved row keeps its own", async () => {
  assert.match(newEntryCode(), entryCodePattern);
  assert.notEqual(newEntryCode(), newEntryCode());
  const links = HomeEntry.fields.find((field) => "name" in field && field.name === "entryLinks");
  assert.ok(links && links.type === "array");
  const codeField = links.fields.find((field) => "name" in field && field.name === "code");
  assert.ok(codeField && codeField.type === "text");
  assert.equal(codeField.admin?.readOnly, true, "staff never type a code");
  const hook = codeField.hooks?.beforeValidate?.[0];
  assert.ok(hook);
  const run = (siblingData: unknown, originalDoc: unknown) => hook({ siblingData, originalDoc, value: "typed-by-hand-0000000000" } as never);
  const fresh = await run({ id: "row-new" }, { entryLinks: [{ id: "row-1", code }] });
  assert.match(String(fresh), entryCodePattern);
  assert.notEqual(fresh, "typed-by-hand-0000000000", "whatever the request sent is ignored");
  assert.equal(await run({ id: "row-1" }, { entryLinks: [{ id: "row-1", code }] }), code);
});

test("an unreadable store means the default home, not an error", async () => {
  const quiet = console.error;
  console.error = () => {};
  try {
    const entry = await server.readHomeEntry(() => Promise.reject(new Error("Payload could not start")));
    assert.deepEqual(entry, { warpStart: null, warpEnd: null, codes: [] });
    assert.equal(server.homeGateResponse({ entry, now }).headers.get("location"), defaultHomeHref);
  } finally {
    console.error = quiet;
  }
});
