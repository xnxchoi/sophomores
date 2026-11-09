import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { memoryAdapter } from "better-auth/adapters/memory";
import type { Pool } from "pg";
import { createMemberAuth } from "@/lib/member-auth/server";
import { normalizeMemberEmailEntryRequest } from "@/lib/member-auth/email-entry";
import { assertPayloadAuthRequest } from "@/lib/member-auth/payload-policy";
import { assertMemberAuthRequest } from "@/lib/member-auth/server";
import { createMemberClient } from "@/lib/member-auth/client";

const origin = "http://localhost:3240";
function fixture() {
  const database: Record<string, Record<string, unknown>[]> = { user: [], session: [], account: [], verification: [], rateLimit: [], passkey: [] };
  let deliveries = 0;
  const auth = createMemberAuth({ mode: "local", origin, databaseUrl: "postgres://localhost/unused", secret: "b".repeat(64),
    verificationSecret: "a".repeat(64), rpId: "localhost", google: null, mail: null }, {
    pool: memoryAdapter(database) as unknown as Pool, isActiveMember: async () => false, sendMail: async () => { deliveries++; }
  });
  const request = async (body: unknown, options: { path?: string; headers?: Record<string, string>; raw?: string } = {}) => {
    const incoming = new Request(`${origin}/api/auth${options.path ?? "/member-email-entry/check"}`, { method: "POST",
      headers: { origin, "content-type": "application/json", ...options.headers }, body: options.raw ?? JSON.stringify(body) });
    const normalized = await normalizeMemberEmailEntryRequest(incoming);
    return normalized instanceof Response ? normalized : auth.handler(normalized);
  };
  return { database, auth, request, deliveries: () => deliveries };
}

test("native SDK discovery returns only existence and never proof, delivery or session", async () => {
  const f = fixture();
  const ctx = await f.auth.$context;
  await ctx.internalAdapter.createUser({ email: "existing@example.com", emailVerified: true, name: "PRIVATE" }, { method: "email-otp" });
  for (const [email, account] of [[" Existing@example.com ", "existing"], ["new@example.com", "new"]]) {
    const response = await f.request({ email });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, data: { account } });
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.has("set-cookie"), false);
  }
  assert.equal(f.database.user.length, 1);
  for (const name of ["session", "account", "verification"]) assert.equal(f.database[name].length, 0);
  assert.equal(f.deliveries(), 0);
});

test("native discovery rejects malformed bodies, authority fields, query and wrong origin", async () => {
  const f = fixture();
  for (const body of [{ email: "incomplete" }, { email: ["valid@example.com"] }, ["valid@example.com"], { email: "valid@example.com", member: true }, { email: "valid@example.com", role: "staff" }, { email: "valid@example.com", callbackURL: "/tickets" }, { email: "valid@example.com", extra: true }])
    assert.notEqual((await f.request(body)).status, 200);
  assert.notEqual((await f.request({}, { raw: "[]" })).status, 200);
  assert.notEqual((await f.request({ email: "valid@example.com" }, { path: "/member-email-entry/check?email=other@example.com" })).status, 200);
  assert.notEqual((await f.request({ email: "valid@example.com" }, { headers: { origin: "https://evil.invalid" } })).status, 200);
  assert.equal(f.database.user.length, 0);
  assert.equal(f.database.session.length, 0);
});

test("discovery uses one ten-per-minute bucket before lookup despite arbitrary forwarded IPs", async () => {
  const f = fixture();
  const context = await f.auth.$context;
  const original = context.internalAdapter.findUserByEmail;
  let lookups = 0;
  context.internalAdapter.findUserByEmail = async (...args) => { lookups++; return original(...args); };
  for (let index = 0; index < 11; index++) {
    const response = await f.request({ email: "new@example.com" }, { headers: { "x-forwarded-for": `198.51.100.${index + 1}`, "x-member-local-ip": `203.0.113.${index + 1}` } });
    assert.equal(response.status, index < 10 ? 200 : 429);
    if (index === 10) assert.ok(Number(response.headers.get("retry-after") ?? response.headers.get("x-retry-after")) > 0);
  }
  assert.equal(lookups, 10);
});

test("discovery boundary rejects encoded/trailing aliases and leaves unrelated auth untouched", async () => {
  for (const path of ["/member-email-entry/check/", "/%6dember-email-entry/check", "/member-email-entry/%63heck", "/member-email-entry%2fcheck"]) {
    const result = await normalizeMemberEmailEntryRequest(new Request(`${origin}/api/auth${path}`, { method: "POST", headers: { "x-forwarded-for": "198.51.100.2" } }));
    assert.equal(result instanceof Response, true);
  }
  const request = new Request(`${origin}/api/auth/sign-in/social`, { method: "POST", headers: { "x-forwarded-for": "198.51.100.2" } });
  assert.equal(await normalizeMemberEmailEntryRequest(request) === request, true);
  const route = readFileSync("src/app/api/auth/[...all]/route.ts", "utf8");
  assert.match(route, /normalizeMemberEmailEntryRequest\(request, 5000, betterAuthOptions.baseURL\)/);
  const options = readFileSync("src/lib/auth/options.ts", "utf8");
  assert.match(options, /memberEmailEntry\(origin\)/);
});

test("client discovery is explicit, abortable, validated and honors bounded retry metadata", async () => {
  const calls: RequestInit[] = [];
  const signal = new AbortController().signal;
  const client = createMemberClient(undefined, async (_url, init) => { calls.push(init!); return Response.json({success:true,data:{account:"new"}}); });
  assert.deepEqual(await client.lookupEmail(" person@example.com ", { signal }), { account: "new" });
  assert.equal(calls[0].signal?.aborted, false);
  assert.equal(calls[0].credentials, "same-origin");
  assert.equal(calls[0].body, JSON.stringify({email:"person@example.com"}));
  await assert.rejects(client.lookupEmail("incomplete"));
  assert.equal(calls.length, 1);
  const limited = createMemberClient(undefined, async () => new Response("", {status:429,headers:{"Retry-After":"37"}}));
  await assert.rejects(limited.lookupEmail("person@example.com"), {kind:"rate-limited", retryAfterSeconds:37});
});

test("both request authorities allow only the discovery email body", async () => {
  const f = fixture();
  const config = { mode: "local" as const, origin, databaseUrl: "postgres://localhost/unused", secret: "b".repeat(64), verificationSecret: "a".repeat(64), rpId: "localhost" as const, google: null, mail: null };
  for (const call of [
    (body: Record<string, unknown>, query?: URLSearchParams) => assertPayloadAuthRequest(origin, "/member-email-entry/check", body, query),
    (body: Record<string, unknown>, query?: URLSearchParams) => assertMemberAuthRequest(config, "/member-email-entry/check", body, query),
  ]) {
    assert.doesNotThrow(() => call({email:"person@example.com"}));
    assert.throws(() => call({email:["person@example.com"]}));
    assert.throws(() => call({email:"person@example.com", metadata:{}}));
    assert.throws(() => call({email:"person@example.com"}, new URLSearchParams("email=other@example.com")));
  }
  const plugin = f.auth.options.plugins!.find((plugin) => plugin.id === "member-email-entry");
  assert.equal(plugin?.rateLimit?.[0].max, 10);
  assert.equal(plugin?.rateLimit?.[0].window, 60);
  assert.equal(f.auth.options.rateLimit?.storage, "database");
  await f.auth.$context;
});

test("native database limiter failure never falls back to an unrestricted user lookup", async () => {
  const f = fixture();
  const context = await f.auth.$context;
  let lookups = 0;
  context.internalAdapter.findUserByEmail = async () => { lookups++; return null; };
  const original = context.adapter.findMany;
  context.adapter.findMany = async (input) => {
    if (input.model === "rateLimit") throw new Error("synthetic limiter storage failure");
    return original(input);
  };
  await assert.rejects(f.request({ email: "new@example.com" }), /synthetic limiter storage failure/);
  assert.equal(lookups, 0);
  for (const model of ["user", "session", "account", "verification"]) assert.equal(f.database[model].length, 0);
  assert.equal(f.deliveries(), 0);
});

test("discovery ingress bounds chunked bodies, malformed JSON, media type and slow streams", async () => {
  const request = (body: ReadableStream<Uint8Array> | string, headers: Record<string, string> = {}) => new Request(`${origin}/api/auth/member-email-entry/check`, {
    method: "POST", headers: { origin, "content-type": "application/json", ...headers }, body,
    duplex: "half",
  } as RequestInit);
  for (const [incoming, status] of [
    [request(new ReadableStream({start(controller) { controller.enqueue(new TextEncoder().encode(" ".repeat(2049))); controller.close(); }})), 413],
    [request("{invalid"), 400],
    [request("{}", {"content-type":"text/plain"}), 415],
    [request(new ReadableStream({start() {}})), 408],
  ] as const) {
    const result = await normalizeMemberEmailEntryRequest(incoming, 10);
    assert.equal(result instanceof Response, true);
    assert.equal((result as Response).status, status);
    assert.equal((result as Response).headers.get("cache-control"), "private, no-store");
  }
});

test("canonical local Host survives Next loopback URL normalization without trusting forwarded hosts", async () => {
  const incoming = (url: string, headers: Record<string, string>) => new Request(url, { method: "POST",
    headers: { origin, "content-type": "application/json", ...headers }, body: JSON.stringify({email:"person@example.com"}) });
  const alias = `${origin.replace("localhost", "127.0.0.1")}/api/auth/member-email-entry/check`;
  const accepted = await normalizeMemberEmailEntryRequest(incoming(alias, {host:"localhost:3240"}), 5000, origin);
  assert.equal(accepted instanceof Request, true);
  for (const [url, headers] of [
    [alias, {host:"evil.invalid"}],
    [alias, {host:"127.0.0.1:3240", "x-forwarded-host":"localhost:3240"}],
    [alias.replace(":3240", ":3241"), {host:"localhost:3240"}],
    [alias, {"x-forwarded-host":"localhost:3240"}],
    [alias, {host:"localhost:3240", origin:"http://evil.invalid"}],
  ] as const) {
    const rejected = await normalizeMemberEmailEntryRequest(incoming(url, headers), 5000, origin);
    assert.equal(rejected instanceof Response, true);
    assert.equal((rejected as Response).status, 403);
  }
  const publicOrigin = "https://members.example.com";
  for (const url of ["https://evil.invalid/api/auth/member-email-entry/check", "https://127.0.0.1/api/auth/member-email-entry/check"]) {
    const rejected = await normalizeMemberEmailEntryRequest(incoming(url, {origin:publicOrigin,host:"members.example.com"}), 5000, publicOrigin);
    assert.equal(rejected instanceof Response, true);
    assert.equal((rejected as Response).status, 403);
  }
});
