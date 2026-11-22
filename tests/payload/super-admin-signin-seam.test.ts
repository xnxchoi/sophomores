import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { registerHooks } from "node:module";
import { after, before, test } from "node:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import type { MemberMailNotification } from "@/lib/member-auth/mail";

// The real staff sign-in seam for the configured first super admin (super admin r3):
// Better Auth with the app's own hooks and plugins, the CMS magic link sent to that
// address, its verification creating a session, and session.create.after retrying the
// bootstrap for an admins row that already exists. Payload is a synthetic Local API.
const origin = "http://localhost:3000";
// Placeholder personal address on a public-style mail domain; the real value lives only in .env.local.
const owner = "first.owner@example.net";
const fixtureEnv = { NEXT_PUBLIC_SERVER_URL: origin, MEMBER_AUTH_MODE: "disabled", PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL: owner };
const savedEnv = Object.fromEntries(["REVIEW_OWNER_EMAIL", ...Object.keys(fixtureEnv)].map((key) => [key, process.env[key]]));
delete process.env.REVIEW_OWNER_EMAIL;
Object.assign(process.env, fixtureEnv);

// Synthetic Local API: one existing staff row for the owner, writes applied on commit.
type Admin = { id: string; email: string; role: string };
const admins = new Map<string, Admin>([["owner-admin", { id: "owner-admin", email: owner, role: "staff" }]]);
const staged = new Map<string, Partial<Admin>>();
const logged: unknown[] = [];
const fakePayload = {
  config: { i18n: { fallbackLanguage: "en", supportedLanguages: { en: { dateFNSKey: "en-US", translations: {} } }, translations: {} }, admin: { user: "admins" } },
  logger: { info: (...args: unknown[]) => logged.push(args), warn: (...args: unknown[]) => logged.push(args), error: (...args: unknown[]) => logged.push(args) },
  db: {
    name: "postgres",
    sessions: { tx: { db: { execute: async () => ({ rows: [] }) } } },
    beginTransaction: async () => "tx",
    commitTransaction: async () => { for (const [id, data] of staged) Object.assign(admins.get(id)!, data); staged.clear(); },
    rollbackTransaction: async () => { staged.clear(); },
  },
  find: async ({ where }: { where: { role?: { equals: string }; email?: { equals: string } } }) => {
    const docs = [...admins.values()].filter((row) => (!where.role || row.role === where.role.equals) && (!where.email || row.email === where.email.equals));
    return { docs, totalDocs: docs.length };
  },
  findByID: async ({ id }: { id: string }) => admins.get(id) ?? null,
  update: async ({ id, data }: { id: string; data: Partial<Admin> }) => { staged.set(id, data); return { ...admins.get(id), ...data }; },
  create: async () => { throw new Error("The existing row is never recreated"); },
};
(globalThis as Record<string, unknown>).__superAdminSeamPayload = fakePayload;
const source = "export const getPayload = async () => globalThis.__superAdminSeamPayload";
const mockUrl = "data:text/javascript," + encodeURIComponent(source);
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/payload" && context.parentURL?.endsWith("/lib/auth/staff.ts")) return { url: mockUrl, shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === mockUrl) return { format: "module", source, shortCircuit: true };
    return nextLoad(url, context);
  },
});

const deliveries: MemberMailNotification[] = [];
const database: Record<string, Record<string, unknown>[]> = { user: [], session: [], account: [], verification: [], rateLimit: [], passkey: [] };
function createAuth({ createBetterAuthPlugins, betterAuthOptions }: typeof import("@/lib/auth/options")) {
  return betterAuth({
    ...betterAuthOptions, secret: randomBytes(32).toString("hex"), database: memoryAdapter(database),
    // The app's session hooks (including the new after hook); user hooks need real Payload storage.
    databaseHooks: { session: betterAuthOptions.databaseHooks.session },
    rateLimit: { enabled: false },
    plugins: createBetterAuthPlugins({ appURL: origin, mailer: async (notification) => { deliveries.push(notification); } }),
  });
}
let auth: ReturnType<typeof createAuth>;
before(async () => {
  auth = createAuth(await import("@/lib/auth/options"));
  const now = new Date();
  for (const [id, email] of [["owner-user", owner], ["other-user", "someone.else@example.net"]]) {
    database.user.push({ id, email, emailVerified: true, name: "Fixture", createdAt: now, updatedAt: now });
  }
});
after(() => {
  hook.deregister();
  for (const [key, value] of Object.entries(savedEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
});

const magic = (email: string) => auth.handler(new Request(origin + "/api/auth/sign-in/magic-link", {
  method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ email, callbackURL: "/admin" }),
}));

test("the configured first super admin gets the CMS magic link; another personal address does not", async () => {
  assert.equal((await magic("someone.else@example.net")).status, 200);
  assert.equal(deliveries.length, 0, "no CMS link for any other public-domain address");
  assert.equal((await magic(owner)).status, 200);
  const note = deliveries.at(-1);
  assert.ok(note?.type === "magic-link");
  assert.equal(note.email, owner);
  assert.equal(new URL(note.url).searchParams.get("callbackURL"), "/admin");
});

test("signing in with an existing staff row promotes it through session.create.after", async () => {
  const note = deliveries.at(-1);
  assert.ok(note?.type === "magic-link");
  assert.equal(admins.get("owner-admin")?.role, "staff");
  const response = await auth.handler(new Request(note.url));
  assert.equal(response.headers.getSetCookie().some((value) => value.includes("session_token=")), true, "a session was created");
  assert.equal(admins.get("owner-admin")?.role, "admin");
  assert.equal(JSON.stringify(logged).toLowerCase().includes(owner), false, "no log line carries the address");
});

// session.create.after on its own: the lookup it guards, and what a failed lookup does to sign-in.
const afterHook = async () => (await import("@/lib/auth/options")).betterAuthOptions.databaseHooks.session.create.after as
  (session: { userId: string }, ctx: unknown) => Promise<void>;
const withHookEnv = async (value: Record<string, string | undefined>, work: () => Promise<void>) => {
  const saved = Object.fromEntries(Object.keys(value).map((key) => [key, process.env[key]]));
  for (const [key, next] of Object.entries(value)) { if (next === undefined) delete process.env[key]; else process.env[key] = next; }
  try { await work(); } finally {
    for (const [key, before] of Object.entries(saved)) { if (before === undefined) delete process.env[key]; else process.env[key] = before; }
  }
};
const lookupContext = (findUserById: (id: string) => Promise<unknown>) => ({ context: { internalAdapter: { findUserById } } });

test("the after hook does no user lookup without a bootstrap address or on the review copy", async () => {
  const hook = await afterHook();
  let lookups = 0;
  const ctx = lookupContext(async () => { lookups++; return null; });
  for (const env of [{ PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL: undefined }, { PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL: "not-an-address" },
    { REVIEW_OWNER_EMAIL: "reviewer@example.org" }]) {
    await withHookEnv(env, () => hook({ userId: "owner-user" }, ctx));
  }
  assert.equal(lookups, 0);
  await hook({ userId: "other-user" }, ctx);
  assert.equal(lookups, 1, "the configured address outside the review copy does look the user up");
});

test("a rejected user lookup never fails the sign-in and logs no address", async () => {
  const hook = await afterHook();
  const errors: unknown[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { errors.push(args); };
  try {
    await hook({ userId: "owner-user" }, lookupContext(async () => {
      throw Object.assign(new Error("lookup failed for " + owner), { name: "AdapterError" });
    }));
  } finally { console.error = original; }
  const text = JSON.stringify(errors);
  assert.match(text, /AdapterError/);
  assert.equal(text.toLowerCase().includes(owner), false);
});
