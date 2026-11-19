import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import test from "node:test";
import { capturePayloadTestLifecycle } from "../support/payload-lifecycle";

// Explicit command only: PAYLOAD_DATABASE_TESTS=1 node --import tsx --test this-file, against the loopback
// development database after the team-members migration. The ordinary unit suite never initialises Payload.
// REST and GraphQL run these same Local API operations with the request's user and overrideAccess false, so
// each query shape below is what an anonymous visitor or a signed-in member gets from either API.
test(
  "the Team roster leaks nothing to anonymous visitors or signed-in members",
  { skip: process.env.PAYLOAD_DATABASE_TESTS !== "1", timeout: 60_000 },
  async (t) => {
    const root = fileURLToPath(new URL("../../", import.meta.url));
    loadEnvConfig(root);
    const database = new URL(process.env.DATABASE_URI ?? "");
    assert.ok(["postgres:", "postgresql:"].includes(database.protocol));
    assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(database.hostname), "Database integration only runs against loopback.");
    process.env.DISABLE_PAYLOAD_HMR = "true";
    const { getPayload } = await import("@/payload");
    const payload = await getPayload();
    const closePayload = capturePayloadTestLifecycle(payload);
    const email = `team-roster-${randomUUID()}@example.invalid`;
    // One cleanup, registered before anything is created, removes whatever was acquired: a failed second
    // create still deletes the first.
    const acquired: { member?: string | number; entry?: string | number } = {};
    t.after(async () => {
      try {
        if (acquired.entry !== undefined) await payload.delete({ collection: "team-members", id: acquired.entry, overrideAccess: true });
        if (acquired.member !== undefined) await payload.delete({ collection: "users", id: acquired.member, overrideAccess: true });
      } finally {
        await closePayload();
      }
    });
    const member = await payload.create({ collection: "users", overrideAccess: true,
      data: { email, name: "roster-account-name", emailVerified: true, localePreference: "en", membershipStatus: "applicant" } });
    acquired.member = member.id;
    const entry = await payload.create({ collection: "team-members", overrideAccess: true,
      data: { user: member.id, displayName: "Approved Name", role: "Design", status: "published", order: 1 } });
    acquired.entry = entry.id;

    const anonymous = undefined;
    const linked = { ...member, collection: "users" } as never;
    const forbidden = async (operation: () => Promise<unknown>) =>
      assert.rejects(operation, (error: unknown) => {
        assert.equal((error as { status?: number }).status, 403);
        return true;
      });
    const shapes = [
      {},
      { select: { user: true, displayName: true } },
      { depth: 2 },
      { depth: 1, populate: { users: { email: true, name: true } } },
      { where: { "user.email": { equals: email } } },
      { where: { "user.name": { like: "roster-account" } } },
      { sort: "user.name" }
    ];
    for (const [label, user] of [["anonymous", anonymous], ["linked member", linked]] as const) {
      await t.test(`${label}: every read shape is refused`, async () => {
        for (const shape of shapes) {
          await forbidden(() => payload.find({ collection: "team-members", user, overrideAccess: false, ...shape } as never));
        }
        await forbidden(() => payload.findByID({ collection: "team-members", id: entry.id, user, overrideAccess: false, depth: 2 } as never));
        await forbidden(() => payload.count({ collection: "team-members", user, overrideAccess: false } as never));
      });
    }

    await t.test("the public projection returns display values only", async () => {
      const { registerHooks } = await import("node:module");
      const serverOnly = registerHooks({
        resolve: (specifier, context, nextResolve) => specifier === "server-only"
          ? { url: new URL("../fixtures/team/server-only.ts", import.meta.url).href, shortCircuit: true }
          : nextResolve(specifier, context),
      });
      t.after(() => serverOnly.deregister());
      const { loadTeamRoster } = await import("@/lib/content/team-roster.server");
      const people = await loadTeamRoster(payload);
      const mine = people.filter((person) => person.id === String(entry.id));
      assert.deepEqual(mine, [{ id: String(entry.id), name: "Approved Name", role: "Design" }]);
      const serialized = JSON.stringify(people);
      for (const leak of [String(member.id), email, "roster-account-name"]) assert.equal(serialized.includes(leak), false, leak);
    });
  }
);
