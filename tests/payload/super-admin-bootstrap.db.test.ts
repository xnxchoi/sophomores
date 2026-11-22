import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

// Disposable loopback container created for this proof only (see tests/support/database-proof.mjs).
const target = { container: "sphmrs-superadmin-20261122", port: 55493, database: "superadmin_proof" };

test("two instances with different bootstrap addresses promote exactly one first super admin", {
  skip: process.env.SUPERADMIN_DATABASE_TESTS !== "1", timeout: 180_000,
}, async (t) => {
  const inspected = JSON.parse(execFileSync("docker", ["inspect", target.container], { encoding: "utf8", maxBuffer: 65536 }));
  const container = inspected[0];
  assert.equal(container.State.Running, true);
  assert.deepEqual(container.HostConfig.PortBindings, { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: String(target.port) }] });
  const volume = process.env.SPHMRS_PROOF_VOLUME || `${target.container}-data`;
  assert.equal(container.Mounts.some((mount: { Name?: string; Destination: string }) => mount.Name === volume && mount.Destination === "/var/lib/postgresql/data"), true);

  const { postgresAdapter } = await import("@payloadcms/db-postgres");
  const { buildConfig, getPayload } = await import("payload");
  const { capturePayloadTestLifecycle } = await import("../support/payload-lifecycle");
  const { ensureFirstSuperAdmin } = await import("../../src/payload/seed/super-admin");
  // Widen the window between "no super admin yet" and the promotion, so an unserialised decision would double-promote.
  const widen = async () => { await delay(150); };
  const config = (push: boolean) => buildConfig({
    secret: randomUUID(), telemetry: false, admin: { user: "admins", disable: true }, typescript: { autoGenerate: false },
    db: postgresAdapter({ pool: { connectionString: `postgres://postgres@127.0.0.1:${target.port}/${target.database}`, max: 3,
      connectionTimeoutMillis: 5000 }, idType: "uuid", push }),
    collections: [{ slug: "admins", auth: { disableLocalStrategy: true, strategies: [] }, hooks: { beforeChange: [async ({ data }) => { await widen(); return data; }] },
      // Mirrors src/payload/collections/admins: the local strategy is off, so email is declared explicitly.
      fields: [{ name: "email", type: "email", unique: true, required: true, index: true }, { name: "name", type: "text", required: true },
        { name: "role", type: "select", required: true, defaultValue: "editor", options: ["admin", "editor", "staff"] }] }],
  });
  const first = await getPayload({ config: await config(true), key: randomUUID() });
  const closeFirst = capturePayloadTestLifecycle(first);
  const second = await getPayload({ config: await config(false), key: randomUUID() });
  const closeSecond = capturePayloadTestLifecycle(second);
  t.after(async () => { await closeSecond(); await closeFirst(); });

  for (let round = 1; round <= 5; round++) {
    await first.delete({ collection: "admins", where: { id: { exists: true } }, overrideAccess: true });
    const addresses = [`first.${round}@example.net`, `second.${round}@example.net`];
    for (const email of addresses) await first.create({ collection: "admins", overrideAccess: true, data: { email, name: email, role: "staff" } as never });
    const results = await Promise.all([
      ensureFirstSuperAdmin(first, { PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL: addresses[0] }),
      ensureFirstSuperAdmin(second, { PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL: addresses[1] }),
    ]);
    assert.deepEqual([...results].sort(), ["present", "promoted"], `round ${round}: ${results.join(", ")}`);
    const admins = await first.find({ collection: "admins", overrideAccess: true, where: { role: { equals: "admin" } } });
    assert.equal(admins.totalDocs, 1, `round ${round}: exactly one super admin`);
    // A repeat run on either instance changes nothing.
    assert.equal(await ensureFirstSuperAdmin(second, { PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL: addresses[1] }), "present");
    assert.equal((await first.find({ collection: "admins", overrideAccess: true, where: { role: { equals: "admin" } } })).totalDocs, 1);
  }
});
