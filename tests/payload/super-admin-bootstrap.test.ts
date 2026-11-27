import assert from "node:assert/strict";
import test from "node:test";
import type { Config, Payload } from "payload";
import { ensureFirstSuperAdmin, bootstrapSuperAdminEmail, superAdminEnsurePlugin } from "@/payload/seed/super-admin";
import { ensureStaffAdminProvisioned, isStaffAddress, isVerifiedStaff } from "@/lib/auth/staff";
import { adminMagicLinkAllowed } from "@/lib/auth/cms-login";

type Admin = { id: string; email: string; role: "admin" | "editor" | "staff"; name: string };
type Where = { role?: { equals: string }; email?: { equals: string } };

// In-memory admins table behind the Local API calls the bootstrap makes; writes apply on commit.
function fakePayload(rows: Admin[], options: { transaction?: boolean; swallowCommit?: boolean } = {}) {
  const table = new Map(rows.map((row) => [row.id, { ...row }]));
  const staged = new Map<string, Partial<Admin>>();
  const calls: string[] = [];
  const logs = { info: 0, warn: 0, error: 0 };
  const logged: unknown[] = [];
  const payload = {
    config: { i18n: { fallbackLanguage: "en", supportedLanguages: { en: { dateFNSKey: "en-US", translations: {} } }, translations: {} }, admin: { user: "admins" } },
    logger: { info: (...args: unknown[]) => { logs.info++; logged.push(args); }, warn: (...args: unknown[]) => { logs.warn++; logged.push(args); },
      error: (...args: unknown[]) => { logs.error++; logged.push(args); } },
    db: {
      name: "postgres",
      // The advisory lock statement runs on the owned session.
      sessions: { tx: { db: { execute: async () => { calls.push("lock"); return { rows: [] }; } } } },
      beginTransaction: async () => options.transaction === false ? null : "tx",
      // swallowCommit: like the installed adapter, a failed commit rolls back without throwing.
      commitTransaction: async () => { if (!options.swallowCommit) for (const [id, data] of staged) Object.assign(table.get(id)!, data); staged.clear(); },
      rollbackTransaction: async () => { staged.clear(); },
    },
    find: async ({ collection, where, overrideAccess }: { collection: string; where: Where; overrideAccess: boolean }) => {
      assert.equal(collection, "admins");
      assert.equal(overrideAccess, true);
      calls.push("find");
      const docs = [...table.values()].filter((row) => (!where.role || row.role === where.role.equals) && (!where.email || row.email === where.email.equals));
      return { docs, totalDocs: docs.length };
    },
    update: async ({ id, data }: { id: string; data: Partial<Admin> }) => { calls.push(`update:${id}:${data.role}`); staged.set(id, data); return { ...table.get(id), ...data }; },
    create: async () => { calls.push("create"); throw new Error("The bootstrap never creates rows"); },
    // The durable read after commit: no transaction, committed rows only.
    findByID: async ({ collection, id, req }: { collection: string; id: string; req?: unknown }) => {
      assert.equal(collection, "admins");
      assert.equal(req, undefined);
      calls.push("read-back");
      const row = table.get(id);
      return row ? { ...row } : null;
    },
  } as unknown as Payload;
  return { payload, table, calls, logs, logged };
}

const env = { PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL: " Owner@Example.com " };
const staff = (id: string, email: string, role: Admin["role"] = "staff"): Admin => ({ id, email, role, name: id });

test("an empty CMS promotes only the configured staff account, and a repeat run changes nothing", async () => {
  const f = fakePayload([staff("owner", "owner@example.com"), staff("other", "other@example.com", "editor")]);
  assert.equal(await ensureFirstSuperAdmin(f.payload, env), "promoted");
  assert.equal(f.table.get("owner")?.role, "admin");
  assert.equal(f.table.get("other")?.role, "editor");
  assert.equal(await ensureFirstSuperAdmin(f.payload, env), "present");
  assert.deepEqual(f.calls.filter((call) => call !== "find"), ["lock", "update:owner:admin", "read-back", "lock"]);
});

test("an existing super admin is left alone, and nobody is demoted or promoted", async () => {
  const f = fakePayload([staff("first", "first@example.com", "admin"), staff("owner", "owner@example.com")]);
  assert.equal(await ensureFirstSuperAdmin(f.payload, env), "present");
  assert.deepEqual([f.table.get("first")?.role, f.table.get("owner")?.role], ["admin", "staff"]);
  assert.equal(f.calls.some((call) => call !== "find" && call !== "lock"), false);
});

test("a missing staff row waits without creating one", async () => {
  const f = fakePayload([staff("other", "other@example.com")]);
  assert.equal(await ensureFirstSuperAdmin(f.payload, env), "missing-staff");
  assert.equal(f.calls.includes("create"), false);
  assert.equal(f.table.get("other")?.role, "staff");
  assert.equal(f.logs.warn, 1);
});

test("an unset or invalid address does nothing", async () => {
  const f = fakePayload([staff("owner", "owner@example.com")]);
  assert.equal(await ensureFirstSuperAdmin(f.payload, {}), "unconfigured");
  assert.equal(await ensureFirstSuperAdmin(f.payload, { PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL: "not-an-address" }), "unconfigured");
  assert.deepEqual(f.calls, []);
  assert.equal(f.logs.error, 1);
  assert.equal(bootstrapSuperAdminEmail(env), "owner@example.com");
});

test("a failed promotion rolls back and reports failure", async () => {
  const f = fakePayload([staff("owner", "owner@example.com")]);
  (f.payload as unknown as { update: () => Promise<never> }).update = async () => { throw new Error("synthetic failure"); };
  assert.equal(await ensureFirstSuperAdmin(f.payload, env), "failed");
  assert.equal(f.table.get("owner")?.role, "staff");
});

test("the startup ensure runs after existing onInit hooks and never blocks boot", async () => {
  const order: string[] = [];
  const config = superAdminEnsurePlugin({ onInit: async () => { order.push("inner"); } } as never) as Config;
  await config.onInit?.({ logger: { error: () => {} } } as never);
  assert.deepEqual(order, ["inner"]);
});

test("without its own transaction the bootstrap refuses to decide", async () => {
  const f = fakePayload([staff("owner", "owner@example.com")], { transaction: false });
  assert.equal(await ensureFirstSuperAdmin(f.payload, env), "failed");
  assert.equal(f.table.get("owner")?.role, "staff");
  assert.equal(f.calls.includes("find"), false);
});

// Placeholder personal address on a public-style mail domain; the real value lives only in .env.local.
const personal = "first.owner@example.net";
const withEnv = async (value: Record<string, string | undefined>, work: () => Promise<void> | void) => {
  const saved = Object.fromEntries(Object.keys(value).map((key) => [key, process.env[key]]));
  Object.assign(process.env, value);
  try { await work(); } finally {
    for (const [key, before] of Object.entries(saved)) { if (before === undefined) delete process.env[key]; else process.env[key] = before; }
  }
};

test("only the exact verified bootstrap address joins staff, and never on the review copy", () => {
  const bootstrap = { PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL: personal };
  const origin = "http://localhost:3000";
  assert.equal(isVerifiedStaff({ email: " First.Owner@Example.NET ", emailVerified: true }, origin, bootstrap), true);
  assert.equal(isVerifiedStaff({ email: personal, emailVerified: false }, origin, bootstrap), false);
  assert.equal(isVerifiedStaff({ email: "someone.else@example.net", emailVerified: true }, origin, bootstrap), false);
  assert.equal(isVerifiedStaff({ email: personal, emailVerified: true }, origin, {}), false);
  assert.equal(isVerifiedStaff({ email: personal, emailVerified: true }, origin, { ...bootstrap, REVIEW_OWNER_EMAIL: "reviewer@example.org" }), false);
});

test("a sign-in with an existing staff row retries the bootstrap", async () => {
  await withEnv({ PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL: personal }, async () => {
    const f = fakePayload([staff("owner", personal)]);
    await ensureStaffAdminProvisioned({ email: personal, emailVerified: true, name: "Owner" }, f.payload);
    assert.equal(f.table.get("owner")?.role, "admin");
    assert.equal(f.calls.includes("create"), false);
  });
});

test("extra staff eligibility is exact, verified, and ignored on restricted review profiles", () => {
  const origin = "http://localhost:3000";
  const env = { STAFF_EXTRA_EMAILS: " Ops@Example.net , backup+cms@example.org ", PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL: personal };
  for (const email of [" ops@EXAMPLE.net ", "backup+cms@example.org", "member@sophomores.co", personal]) {
    assert.equal(isVerifiedStaff({ email, emailVerified: true }, origin, env), true);
  }
  for (const email of ["another@example.net", "ops@sub.example.net", "member@sub.sophomores.co", "backup@example.org"]) {
    assert.equal(isStaffAddress(email, origin, env), false);
  }
  assert.equal(isVerifiedStaff({ email: "ops@example.net", emailVerified: false }, origin, env), false);
  assert.equal(isStaffAddress("ops@example.net", origin, { STAFF_EXTRA_EMAILS: "ops@example.net, *" }), false);
  const reviewEnv = { ...env, REVIEW_OWNER_EMAIL: "reviewer@sophomores.co" };
  for (const email of ["ops@example.net", personal, "member@sophomores.co"]) {
    assert.equal(isStaffAddress(email, "https://preview.sophomores.co", reviewEnv), false);
  }
  assert.equal(isStaffAddress("reviewer@sophomores.co", "https://preview.sophomores.co", reviewEnv), true);
});

test("the first verified sign-in of the bootstrap address creates its staff row, then promotes it", async () => {
  await withEnv({ PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL: personal }, async () => {
    const f = fakePayload([]);
    (f.payload as unknown as { create: (args: { data: Admin }) => Promise<Admin> }).create = async ({ data }) => {
      const row = { ...data, id: "owner" };
      f.table.set(row.id, row);
      return row;
    };
    await ensureStaffAdminProvisioned({ email: personal, emailVerified: true, name: "Owner" }, f.payload);
    assert.deepEqual([...f.table.values()].map((row) => [row.email, row.role]), [[personal, "admin"]]);
  });
});

test("the review copy never promotes, even with the address configured and a matching staff row", async () => {
  const f = fakePayload([staff("owner", "owner@example.com")]);
  for (const reviewEnv of [{ ...env, REVIEW_OWNER_EMAIL: "reviewer@example.org" }, { ...env, NEXT_PUBLIC_SERVER_URL: "https://preview.sophomores.co" }]) {
    assert.equal(await ensureFirstSuperAdmin(f.payload, reviewEnv), "review-copy");
  }
  assert.equal(f.table.get("owner")?.role, "staff");
  assert.deepEqual(f.calls, [], "no lock, read or write on the review copy");
});

test("a commit the adapter swallowed is a failure, never 'promoted'", async () => {
  const f = fakePayload([staff("owner", "owner@example.com")], { swallowCommit: true });
  assert.equal(await ensureFirstSuperAdmin(f.payload, env), "failed");
  assert.equal(f.table.get("owner")?.role, "staff");
  assert.equal(f.logs.info, 0, "no success line");
});

test("failure diagnostics never carry the configured address", async () => {
  const f = fakePayload([staff("owner", "owner@example.com")]);
  (f.payload as unknown as { update: () => Promise<never> }).update = async () => {
    throw Object.assign(new Error('Failed query: update "admins" ... params: owner@example.com'), { name: "DrizzleQueryError", cause: { code: "23505" } });
  };
  assert.equal(await ensureFirstSuperAdmin(f.payload, env), "failed");
  const text = JSON.stringify(f.logged);
  assert.equal(text.toLowerCase().includes("owner@example.com"), false);
  // A fixed label and correlation ID only: no property value of the thrown error is logged.
  assert.doesNotMatch(text, /DrizzleQueryError|23505|Failed query/);
  assert.match(text, /"errorClass":"Error","correlationId":"[0-9a-f-]{36}"/);
});

test("the CMS magic link uses the same staff-address rule as sign-in", () => {
  const origin = "http://localhost:3000";
  const link = (callback: string) => `${origin}/api/auth/magic-link/verify?token=${"a".repeat(32)}&callbackURL=${encodeURIComponent(callback)}`;
  const bootstrap = { PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL: personal };
  const rule = (env: Record<string, string>) => (address: string) => isStaffAddress(address, origin, env);
  assert.equal(adminMagicLinkAllowed(personal, link("/vault"), rule(bootstrap)), true);
  assert.equal(adminMagicLinkAllowed("someone.else@example.net", link("/vault"), rule(bootstrap)), false);
  assert.equal(adminMagicLinkAllowed(personal, link("/vault"), rule({})), false);
  assert.equal(adminMagicLinkAllowed(personal, link("/vault"), rule({ ...bootstrap, REVIEW_OWNER_EMAIL: "reviewer@example.org" })), false);
  assert.equal(adminMagicLinkAllowed("editor@sophomores.co", link("/vault"), rule(bootstrap)), true);
  // The default stays domain-only, so a caller that does not pass the rule never widens it.
  assert.equal(adminMagicLinkAllowed(personal, link("/vault")), false);
});
