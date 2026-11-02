import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { capturePayloadTestLifecycle } from "../../support/payload-lifecycle";

test(
  "real Payload recovery queue restricts reads to trusted superadmins and denies all generic writes",
  {
    skip: process.env.PAYLOAD_DATABASE_TESTS !== "1",
    timeout: 30_000
  },
  async (t) => {
    loadEnvConfig(process.cwd());
    const database = new URL(process.env.DATABASE_URI ?? "");
  assert.equal(database.search, "");
  assert.equal(database.hash, "");
    assert.ok(["postgres:", "postgresql:"].includes(database.protocol));
    assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(database.hostname));
    assert.notEqual(process.env.NODE_ENV, "production");
    t.mock.method(globalThis, "fetch", async () => {
      throw new Error("No network allowed in recovery integration");
    });
    const previousHmr = process.env.DISABLE_PAYLOAD_HMR;
    process.env.DISABLE_PAYLOAD_HMR = "true";
    t.after(() => {
      if (previousHmr === undefined) delete process.env.DISABLE_PAYLOAD_HMR;
      else process.env.DISABLE_PAYLOAD_HMR = previousHmr;
    });
    const { getPayload } = await import("../../../lib/payload");
    const payload = await getPayload();
    const closePayload = capturePayloadTestLifecycle(payload);
    const pool = new Pool({
      connectionString: database.href,
      max: 1,
      connectionTimeoutMillis: 2000,
      statement_timeout: 5000,
      query_timeout: 6000,
      allowExitOnIdle: true
    });
    const id = randomUUID();
    t.after(async () => {
      try {
        await pool.query(
          "DELETE FROM public.account_recovery_requests WHERE id=$1",
          [id]
        );
      } finally {
        await pool.end();
        await closePayload();
      }
    });
    await pool.query(
      `INSERT INTO public.account_recovery_requests
    (id,phone,contact_email,created_at,updated_at,expires_at)
    VALUES ($1,'01000000000','queue-fixture@example.invalid',now(),now(),now()+interval '720 hours')`,
      [id]
    );
    // Principals are explicit Local API fixtures, not new staff identities,
    // credentials, sessions, or evidence of browser authentication.
    const trusted = {
      id: randomUUID(),
      email: "queue-fixture@sophomores.co",
      collection: "admins",
      _strategy: "staff-better-auth",
      role: "admin"
    };
    const denied = [
      undefined,
      { ...trusted, collection: "users" },
      { ...trusted, role: "staff" },
      { ...trusted, role: "editor" },
      { ...trusted, _strategy: "local-jwt" }
    ];
    for (const user of denied) {
      await assert.rejects(
        payload.find({
          collection: "account-recovery-requests",
          user: user as never,
          overrideAccess: false
        }),
        { status: 403 }
      );
      await assert.rejects(
        payload.findByID({
          collection: "account-recovery-requests",
          id,
          user: user as never,
          overrideAccess: false
        }),
        { status: 403 }
      );
    }
    const stored = await payload.findByID({
      collection: "account-recovery-requests",
      id,
      user: trusted as never,
      overrideAccess: false
    });
    assert.equal(stored.phone, "01000000000");
    assert.equal(stored.contactEmail, "queue-fixture@example.invalid");
    assert.equal(stored.claimVerification, "unverified");
    assert.equal(stored.revision, 0);
    for (const user of [...denied, trusted]) {
      await assert.rejects(
        payload.update({
          collection: "account-recovery-requests",
          id,
          user: user as never,
          overrideAccess: false,
          data: { status: "closed" }
        }),
        { status: 403 }
      );
      await assert.rejects(
        payload.delete({
          collection: "account-recovery-requests",
          id,
          user: user as never,
          overrideAccess: false
        }),
        { status: 403 }
      );
      await assert.rejects(
        payload.create({
          collection: "account-recovery-requests",
          user: user as never,
          overrideAccess: false,
          data: {
            phone: "01000000000",
            contactEmail: "forged@example.invalid",
            claimVerification: "unverified",
            reason: "lost_email",
            status: "submitted",
            revision: 0,
            expiresAt: new Date().toISOString()
          }
        }),
        { status: 403 }
      );
    }
  }
);
