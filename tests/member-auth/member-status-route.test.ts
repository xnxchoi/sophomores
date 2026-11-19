import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";
import type { MemberPrincipal } from "@/lib/member-auth/contracts";

test("member status distinguishes runtime and read failures without turning them into signed-out", async (t) => {
  const source = "export const getPayloadMemberRuntime = () => globalThis.__memberStatusRouteRuntime()";
  const mockUrl = "data:text/javascript," + encodeURIComponent(source);
  const hook = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "@/lib/member-auth/payload-runtime" &&
          context.parentURL?.endsWith("/api/member/status/route.ts")) {
        return { url: mockUrl, shortCircuit: true };
      }
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url === mockUrl) return { format: "module", source, shortCircuit: true };
      return nextLoad(url, context);
    }
  });
  t.after(() => hook.deregister());
  const key = "__memberStatusRouteRuntime";
  const previous = Object.getOwnPropertyDescriptor(globalThis, key);
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, key, previous);
    else Reflect.deleteProperty(globalThis, key);
  });
  const setRuntime = (value: () => unknown) =>
    Object.defineProperty(globalThis, key, { value, configurable: true });
  const { GET } = await import("@/app/api/member/status/route");
  const check = () => GET(new Request("http://localhost:3240/api/member/status"));
  const assertUnavailable = async (response: Response) => {
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await response.json(), {
      success: false,
      error: { code: "UNAVAILABLE", message: "Member authentication is unavailable." }
    });
  };
  const capabilities = { emailOtp: true, magicLink: false, google: false, passkey: true };
  const anonymous = { authenticated: false, phoneBindingAuth: "anonymous", emailVerified: false, phoneBound: false, member: false };
  const workingRuntime = {
    config: { origin: "http://localhost:3240" },
    capabilities,
    service: {
      async status(principal: MemberPrincipal | null) {
        assert.equal(principal, null);
        return anonymous;
      }
    },
    toMemberPrincipal: async () => null
  };

  const warn = t.mock.method(console, "warn", () => {});
  const error = t.mock.method(console, "error", () => {});
  setRuntime(() => null);
  await assertUnavailable(await check());
  assert.deepEqual(warn.mock.calls.map(({ arguments: args }) => args), [
    ["Member status runtime is not configured or is disabled."]
  ]);

  setRuntime(() => { throw new Error("private config diagnostic"); });
  await assertUnavailable(await check());
  setRuntime(() => ({
    ...workingRuntime,
    toMemberPrincipal: async () => { throw new Error("private storage diagnostic"); }
  }));
  await assertUnavailable(await check());
  assert.deepEqual(error.mock.calls.map(({ arguments: args }) => args), [
    ["Member status runtime setup failed."],
    ["Member status read failed."]
  ]);

  setRuntime(() => workingRuntime);
  const guest = await check();
  assert.equal(guest.status, 200);
  assert.deepEqual(await guest.json(), { success: true, data: { ...anonymous, capabilities } });
  assert.equal(warn.mock.callCount(), 1);
  assert.equal(error.mock.callCount(), 2);
});
