import assert from "node:assert/strict";
import test from "node:test";
import { createRecoveryHandlers } from "../../../lib/member-auth/recovery/http";
import { RecoveryService } from "../../../lib/member-auth/recovery/service";
import { loadRecoveryConfig } from "../../../lib/member-auth/recovery/runtime";
import { AccountRecoveryRequests } from "../../../lib/payload/collections/AccountRecoveryRequests";

const origin = "http://localhost:3000";
const input = { phone: "01012345678", contactEmail: "claim@example.com" };
const req = (body: unknown = input, headers: Record<string, string> = {}) =>
  new Request(origin + "/api/member/recovery", {
    method: "POST",
    headers: { origin, "content-type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
test("intake is generic, durable, and never sets a cookie", async () => {
  const calls: unknown[] = [];
  const service = new RecoveryService(
    {
      submit: async (value) => {
        calls.push(value);
      },
      review: async () => 1
    },
    "s".repeat(32)
  );
  const response = await createRecoveryHandlers({ origin, service }).submit(
    req()
  );
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), {
    success: true,
    data: { status: "pending_staff_review" }
  });
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(calls.length, 1);
  assert.match(response.headers.get("cache-control")!, /no-store/);
});
test("strict intake rejects identity injection and hostile authority before storage", async () => {
  let calls = 0;
  const handlers = createRecoveryHandlers({
    origin,
    service: {
      submit: async () => {
        calls++;
      }
    }
  });
  for (const request of [
    req({ ...input, userId: "forged" }),
    req(input, { origin: "http://evil.test" }),
    req(input, { host: "evil.test" }),
    req(input, { rsc: "1" }),
    req(input, { "sec-fetch-site": "cross-site" }),
    req({ ...input, phone: "bad" })
  ]) {
    assert.notEqual((await handlers.submit(request)).status, 202);
  }
  assert.equal(calls, 0);
});
test("deadline does not wait for hostile stream cancellation", async () => {
  const stream = new ReadableStream({
    pull: () => new Promise(() => {}),
    cancel: () => new Promise(() => {})
  });
  const request = new Request(origin + "/api/member/recovery", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: stream,
    duplex: "half"
  } as RequestInit);
  const handlers = createRecoveryHandlers({
    origin,
    bodyTimeoutMs: 10,
    service: {
      submit: async () => {
        throw new Error("must not submit");
      }
    }
  });
  const result = await Promise.race([
    handlers.submit(request),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("deadline hung")), 300)
    )
  ]);
  assert.equal(result.status, 408);
});
test("independent local config needs no phone-verifier settings and rejects remote databases", () => {
  const env = {
    MEMBER_AUTH_MODE: "local",
    MEMBER_AUTH_ORIGIN: origin,
    DATABASE_URI: "postgres://localhost:4141/app",
    BETTER_AUTH_SECRET: "s".repeat(32)
  };
  assert.equal(loadRecoveryConfig(env)?.origin, origin);
  assert.throws(() =>
    loadRecoveryConfig({ ...env, DATABASE_URI: "postgres://remote.test/app" })
  );
  assert.equal(loadRecoveryConfig({}), null);
});
test("only verified CMS superadmins can read queue; no one can mutate Payload CRUD", async () => {
  const admin = {
    collection: "admins",
    _strategy: "staff-better-auth",
    role: "admin",
    id: "admin"
  };
  for (const user of [
    null,
    { ...admin, role: "staff" },
    { ...admin, collection: "users" },
    { ...admin, _strategy: "local-jwt" }
  ]) {
    assert.equal(
      await AccountRecoveryRequests.access!.read!({ req: { user } as never }),
      false
    );
  }
  assert.equal(
    await AccountRecoveryRequests.access!.read!({
      req: { user: admin } as never
    }),
    true
  );
  for (const op of ["create", "update", "delete"] as const)
    assert.equal(
      await AccountRecoveryRequests.access![op]!({
        req: { user: admin } as never
      }),
      false
    );
});

test("review HTTP authorizes trusted superadmin and strictly rejects grants and stale revisions", async () => {
  const admin = {
    collection: "admins",
    _strategy: "staff-better-auth",
    role: "admin",
    id: "019a4000-0000-7000-8000-000000000001"
  };
  let writes = 0;
  const service = {
    submit: async () => {},
    review: async () => {
      writes++;
      throw new Error("storage unavailable");
    }
  };
  const input = {
    expectedRevision: 0,
    status: "closed",
    internalNote: "Independent review pending"
  };
  const denied = createRecoveryHandlers({
    origin,
    service,
    resolveStaff: async () => ({ ...admin, role: "staff" })
  });
  assert.equal((await denied.review(req(input), admin.id)).status, 403);
  const handlers = createRecoveryHandlers({
    origin,
    service,
    resolveStaff: async () => admin
  });
  for (const body of [
    { ...input, status: "approved" },
    { ...input, email: "forged@example.com" },
    { ...input, expectedRevision: -1 }
  ])
    assert.equal((await handlers.review(req(body), admin.id)).status, 400);
  assert.equal(writes, 0);
  assert.equal((await handlers.review(req(input), admin.id)).status, 503);
  assert.equal(writes, 1);
});
