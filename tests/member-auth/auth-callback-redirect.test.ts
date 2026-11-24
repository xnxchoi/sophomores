import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, before, test } from "node:test";
import type { MemberAuthConfig } from "@/lib/member-auth/config";

// Review-A, 24 Nov: Better Auth's OAuth failure redirect appends the provider's error and error_description verbatim
// to the pinned callback URL. The FIRST Location that leaves the server must already be clean, on both handler paths.
const origin = "http://localhost:3240";
const diagnostic = "Upstream said member@example.invalid at db.internal";
const secret = "t".repeat(64);
// A synthetic Apple first-time profile (Apple sends it once, as JSON, with the first authorization).
const profile = JSON.stringify({ name: { firstName: "Synthetic", lastName: "Member" }, email: "synthetic.member@example.invalid" });
const key = "__authCallbackRedirectTest";
const state = globalThis as unknown as Record<string, { handler: (request: Request) => Promise<Response> } | undefined>;
const moduleUrl = (source: string) => `data:text/javascript,${encodeURIComponent(source)}`;
let hooks: { deregister(): void } | undefined;
let route: typeof import("@/app/api/auth/[...all]/route");
let local: typeof import("@/lib/member-auth/server");

function providerFailure(location: string): Response {
  const headers = new Headers({ location });
  headers.append("set-cookie", "better-auth.state=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
  headers.append("set-cookie", "better-auth.pkce=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
  return new Response(null, { status: 302, headers });
}
const failure = (base: string, error: string) =>
  `${base}${base.includes("?") ? "&" : "?"}${new URLSearchParams({ error, error_description: diagnostic })}`;
const callback = () => new Request(`${origin}/api/auth/callback/google?code=provider-code&state=s`, { headers: { host: "localhost:3240" } });

before(async () => {
  hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "server-only") return { url: moduleUrl("export {};"), shortCircuit: true };
      if ((context.parentURL ?? "").includes("/app/api/auth/")) {
        if (specifier === "@/payload") return { url: moduleUrl(`export async function getPayload(){ return { betterAuth: globalThis.${key} }; }`), shortCircuit: true };
        if (specifier === "@/lib/auth/options") return { url: moduleUrl(`export const betterAuthOptions = { baseURL: "${origin}", secret: "${secret}" };`), shortCircuit: true };
      }
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url.startsWith("data:text/javascript,")) return { format: "module", source: decodeURIComponent(url.slice("data:text/javascript,".length)), shortCircuit: true };
      return nextLoad(url, context);
    }
  });
  route = await import("@/app/api/auth/[...all]/route");
  local = await import("@/lib/member-auth/server");
});
after(() => { hooks?.deregister(); delete state[key]; });

const config: MemberAuthConfig = { mode: "local", origin, databaseUrl: "postgres://localhost/sophomores_verification_test_auth",
  secret: "b".repeat(64), verificationSecret: "a".repeat(64), rpId: "localhost", google: null, mail: null };
const paths = {
  payload: async (response: Response) => { state[key] = { handler: async () => response }; return route.GET(callback()); },
  local: async (response: Response) => local.handleMemberAuthRequest({ handler: async () => response }, config, callback())
};

for (const [name, handle] of Object.entries(paths)) {
  test(`${name} handler: the first Location keeps only a listed next and a recognised code, with status and cookies`, async () => {
    for (const [pinned, error, expected] of [
      ["/sign-in?next=/me/orders", "access_denied", "/sign-in?next=/me/orders&error=access_denied"],
      ["/sign-in?next=/me/orders", "provider exploded", "/sign-in?next=/me/orders&error=unknown"],
      [`${origin}/sign-in?next=/me`, "access_denied", `${origin}/sign-in?next=/me&error=access_denied`],
      ["/account", "unable_to_link_account", "/account?error=unable_to_link_account"],
      ["/tickets", "access_denied", "/tickets?error=access_denied"],
      // Null-prototype cleanup: these keys are ordinary keys and are dropped (Review-A LOW).
      ["/sign-in?next=/me&__proto__=x&constructor=y", "access_denied", "/sign-in?next=/me&error=access_denied"]
    ] as const) {
      const response = await handle(providerFailure(failure(pinned, error)));
      assert.equal(response.status, 302, pinned);
      const location = response.headers.get("location") ?? "";
      assert.equal(location, expected, pinned);
      assert.equal(/member@example|db\.internal|error_description|Upstream|__proto__|constructor/.test(location), false, location);
      assert.equal(response.headers.getSetCookie().length, 2, "every Set-Cookie survives");
    }
  });

  test(`${name} handler: success, provider and already-clean redirects are left exactly as they are`, async () => {
    for (const location of ["/sign-in?next=/me", "/account/continue", "/tickets", "https://accounts.google.com/o/oauth2/v2/auth?client_id=x&state=s",
      "/api/auth/error?error=state_mismatch"]) {
      const response = await handle(providerFailure(location));
      assert.equal(response.headers.get("location"), location);
      assert.equal(response.headers.getSetCookie().length, 2);
    }
  });
}

// Review-A, 24 Nov: Apple's form_post. Better Auth first turns the POST into a same-origin GET to our own
// /api/auth/callback/apple, copying every field (error_description included) into that Location.
test("a redirect to our own provider callback keeps only what Better Auth reads, with the error as a recognised code", async () => {
  const hop = `${origin}/api/auth/callback/apple?${new URLSearchParams({ code: "c", state: "s", user: '{"name":{"firstName":"A"}}', iss: "https://appleid.apple.com",
    error: "user_cancelled_authorize", error_description: diagnostic })}&__proto__=x&constructor=y`;
  for (const handle of Object.values(paths)) {
    const response = await handle(providerFailure(hop));
    const location = new URL(response.headers.get("location") ?? "", origin);
    assert.equal(response.status, 302);
    assert.equal(location.pathname, "/api/auth/callback/apple");
    // Apple's profile never stays in a URL, even on an error (Review-A, 24 Nov).
    assert.deepEqual([...location.searchParams.keys()].sort(), ["code", "error", "iss", "state"]);
    assert.equal(location.searchParams.get("error"), "user_cancelled_authorize");
    assert.equal(location.searchParams.get("state"), "s");
    assert.equal(/member@example|db\.internal|error_description|__proto__|constructor/.test(location.href), false, location.href);
    assert.equal(response.headers.getSetCookie().length, 2);
  }
  const clean = `${origin}/api/auth/callback/apple?code=c&state=s`;
  assert.equal((await paths.local(providerFailure(clean))).headers.get("location"), clean, "a clean hop is untouched");
});

test("payload handler: Better Auth's real form_post conversion leaves without the provider's description", async () => {
  const { betterAuth } = await import("better-auth");
  const { memoryAdapter } = await import("better-auth/adapters/memory");
  const auth = betterAuth({
    baseURL: origin, secret: "s".repeat(64), database: memoryAdapter({ user: [], session: [], account: [], verification: [] }),
    trustedOrigins: [origin, "https://appleid.apple.com"], socialProviders: { apple: { clientId: "fixture", clientSecret: "fixture" } }
  });
  state[key] = { handler: auth.handler };
  for (const [error, expected] of [["user_cancelled_authorize", "user_cancelled_authorize"], ["invalid_request for member@example.invalid", "unknown"]] as const) {
    const body = new URLSearchParams({ state: "opaque-state", error, error_description: diagnostic, user: profile });
    const response = await route.POST(new Request(`${origin}/api/auth/callback/apple`, {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin: "https://appleid.apple.com" }, body
    }));
    assert.equal(response.status, 302, error);
    const location = new URL(response.headers.get("location") ?? "", origin);
    assert.equal(location.pathname, "/api/auth/callback/apple", "the POST became Better Auth's own GET hop");
    assert.equal(location.searchParams.get("error"), expected);
    assert.equal(location.searchParams.get("state"), "opaque-state");
    assert.equal(location.searchParams.has("error_description"), false);
    assert.equal(location.searchParams.has("user"), false, "an error drops the profile");
    assert.equal(response.headers.getSetCookie().some((cookie) => cookie.startsWith("sphmrs-apple-profile=")), false, "and stashes nothing");
    assert.equal(/member@example|db\.internal|Upstream|Synthetic/.test(location.href), false, location.href);
  }
});

test("payload handler: a successful Apple form_post moves the profile into a sealed cookie, and the GET hands it back to Better Auth", async () => {
  const { betterAuth } = await import("better-auth");
  const { memoryAdapter } = await import("better-auth/adapters/memory");
  state[key] = { handler: betterAuth({
    baseURL: origin, secret: "s".repeat(64), database: memoryAdapter({ user: [], session: [], account: [], verification: [] }),
    trustedOrigins: [origin, "https://appleid.apple.com"], socialProviders: { apple: { clientId: "fixture", clientSecret: "fixture" } }
  }).handler };
  const posted = await route.POST(new Request(`${origin}/api/auth/callback/apple`, {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin: "https://appleid.apple.com" },
    body: new URLSearchParams({ state: "opaque-state", code: "authorization-code", user: profile })
  }));
  assert.equal(posted.status, 302);
  const hop = new URL(posted.headers.get("location") ?? "", origin);
  assert.equal(hop.pathname, "/api/auth/callback/apple");
  assert.deepEqual([...hop.searchParams.keys()].sort(), ["code", "state"], "the profile left the URL");
  assert.equal(/Synthetic|example\.invalid/.test(hop.href), false);
  const stash = posted.headers.getSetCookie().find((cookie) => cookie.startsWith("sphmrs-apple-profile="));
  assert.ok(stash, "the profile is stashed");
  assert.match(stash, /; Path=\/api\/auth\/callback\/apple; Max-Age=600; HttpOnly; SameSite=Lax/);
  assert.equal(/Synthetic|example\.invalid|firstName/.test(stash), false, "sealed, not readable");
  const sealed = stash.split(";")[0];

  // The GET hop: Better Auth sees the profile on the request the route builds; the browser's URL never had it.
  let seen: URL | undefined;
  state[key] = { handler: async (request) => { seen = new URL(request.url); return new Response(null, { status: 302, headers: { location: "/sign-in?next=/me" } }); } };
  const got = await route.GET(new Request(hop, { headers: { cookie: sealed } }));
  assert.equal(seen?.searchParams.get("user"), profile, "Apple sign-up names are not lost");
  assert.equal(seen?.searchParams.get("state"), "opaque-state");
  assert.equal(got.headers.get("location"), "/sign-in?next=/me");
  assert.ok(got.headers.getSetCookie().some((cookie) => cookie.startsWith("sphmrs-apple-profile=;") && cookie.includes("Max-Age=0")), "the stash is cleared");

  // Bound to its state and sealed: another state, a tampered value, or an error hop restores nothing (and clears it).
  for (const [url, cookie] of [[`${origin}/api/auth/callback/apple?code=c&state=another-state`, sealed],
    [hop.href, `${sealed.slice(0, -4)}AAAA`], [`${hop.href}&error=access_denied`, sealed]] as const) {
    seen = undefined;
    const response = await route.GET(new Request(url, { headers: { cookie } }));
    assert.equal(seen?.searchParams.has("user"), false, url);
    assert.ok(response.headers.getSetCookie().some((value) => value.startsWith("sphmrs-apple-profile=;")), "cleared");
  }
});
