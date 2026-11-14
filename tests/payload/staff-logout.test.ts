import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { betterAuth } from "better-auth";
import { Admins } from "@/payload/collections/admins";

const origin = "http://localhost:3000";
const context = betterAuth({ baseURL: origin, secret: randomBytes(32).toString("hex") }).$context;

test("staff logout delegates to canonical sign-out with the original request headers", async () => {
  const hooks = Admins.hooks?.afterLogout;
  assert.equal(hooks?.length, 1);
  const headers = new Headers({ cookie: "fixture=staff-session", origin });
  const calls: unknown[] = [];
  const req = {
    method: "POST",
    headers,
    payload: {
      betterAuth: {
        $context: context,
        api: {
          signOut: async (args: unknown) => {
            calls.push(args);
            return { success: true };
          },
        },
      },
    },
  };
  for (const hook of hooks ?? []) {
    await hook({ req } as never);
  }
  assert.deepEqual(calls, [{ headers }]);
  assert.equal((calls[0] as { headers: Headers }).headers, headers);
});

for (const rejectedOrigin of ["https://foreign.invalid", "null", undefined]) {
  test(`staff logout rejects ${rejectedOrigin ?? "missing"} origin before revoking a session`, async () => {
    const hook = Admins.hooks?.afterLogout?.[0];
    assert.ok(hook);
    const headers = new Headers({ cookie: "fixture=staff-session" });
    if (rejectedOrigin !== undefined) headers.set("origin", rejectedOrigin);
    let called = false;
    await assert.rejects(() => hook({
      req: {
        method: "POST",
        headers,
        payload: {
          betterAuth: {
            $context: context,
            api: { signOut: async () => { called = true; return { success: true }; } },
          },
        },
      },
    } as never));
    assert.equal(called, false);
  });
}

test("staff logout propagates canonical session-revocation errors", async () => {
  const hook = Admins.hooks?.afterLogout?.[0];
  assert.ok(hook);
  const failure = new Error("Fixture revocation failure");
  await assert.rejects(() => hook({
    req: {
      method: "POST",
      headers: new Headers({ origin }),
      payload: {
        betterAuth: { $context: context, api: { signOut: async () => { throw failure; } } },
      },
    },
  } as never), (error) => error === failure);
});

test("staff logout rejects an unsuccessful canonical response", async () => {
  const hook = Admins.hooks?.afterLogout?.[0];
  assert.ok(hook);
  await assert.rejects(() => hook({
    req: {
      method: "POST",
      headers: new Headers({ origin }),
      payload: {
        betterAuth: { $context: context, api: { signOut: async () => ({ success: false }) } },
      },
    },
  } as never), /Unable to end the staff session/);
});

test("staff logout fails closed when the canonical auth runtime is unavailable", async () => {
  const hook = Admins.hooks?.afterLogout?.[0];
  assert.ok(hook);
  await assert.rejects(() => hook({
    req: { headers: new Headers(), payload: {} },
  } as never));
});
