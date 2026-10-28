import { test } from "node:test";
import assert from "node:assert/strict";
import { getPayload } from "@/lib/payload";
import { sql } from "@payloadcms/db-postgres";

test("authentication system integrity & database safety", async (t) => {
  const payload = await getPayload();

  await t.test("API route handler (/api/auth/get-session) responds with HTTP 200", async () => {
    assert.ok(payload.betterAuth, "payload.betterAuth must be initialized");
    assert.equal(typeof payload.betterAuth.handler, "function");

    const req = new Request("http://localhost:3000/api/auth/get-session", { method: "GET" });
    const res = await payload.betterAuth.handler(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data, null);
  });

  await t.test("user deletion cascades cleanly without foreign key constraint violations", async () => {
    // Insert a test user
    const testEmail = `cascade-test-${Date.now()}@test.com`;
    const user = await payload.create({
      collection: "users",
      draft: false,
      data: {
        name: "Cascade Integrity Test",
        email: testEmail,
        emailVerified: true,
        localePreference: "en",
        membershipStatus: "applicant",
      },
    });

    // Create an associated session pointing to the user
    const sessionToken = `test-token-${Date.now()}`;
    const sessionResult = await payload.db.drizzle.execute(sql`
      INSERT INTO "public"."sessions" ("id", "token", "expires_at", "user_id", "created_at", "updated_at")
      VALUES (gen_random_uuid(), ${sessionToken}, now() + interval '1 day', ${user.id}, now(), now())
      RETURNING id;
    `);
    const sessionId = sessionResult.rows[0]?.id;
    assert.ok(sessionId);

    // Delete user - this must NOT throw null-constraint violation and must cascade cleanly
    await payload.delete({
      collection: "users",
      id: user.id,
    });

    // Verify session was cascaded
    const remaining = await payload.db.drizzle.execute(sql`
      SELECT count(*) FROM "public"."sessions" WHERE id = ${sessionId};
    `);
    assert.equal(Number(remaining.rows[0]?.count), 0);
  });

  await t.test("passkeys table enforces index on credential_id", async () => {
    const indexCheck = await payload.db.drizzle.execute(sql`
      SELECT indexname, indexdef FROM pg_indexes 
      WHERE tablename = 'passkeys' AND indexdef LIKE '%credential_id%';
    `);
    assert.ok(indexCheck.rows.length >= 1, "An index on credential_id must exist in passkeys table");
  });

  await t.test("email OTP verification tokens are securely stored as hashed values", async () => {
    const testOtpEmail = `otp-hash-test-${Date.now()}@test.com`;
    
    // Request OTP via Better-Auth handler
    const req = new Request("http://localhost:3000/api/auth/email-otp/send-verification-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testOtpEmail, type: "sign-in" }),
    });

    const res = await payload.betterAuth.handler(req);
    assert.equal(res.status, 200);

    // Check row in verifications table
    const verification = await payload.db.drizzle.execute(sql`
      SELECT identifier, value FROM "public"."verifications" 
      WHERE identifier LIKE ${`%${testOtpEmail}%`}
      ORDER BY created_at DESC LIMIT 1;
    `);

    assert.equal(verification.rows.length, 1);
    const storedValue = verification.rows[0]?.value as string;
    assert.ok(storedValue);
    // Hashed OTP is a cryptographic hash with attempt counter (hash:attempts), NOT a 6-digit plain code
    const [hash, attempts] = storedValue.split(":");
    assert.ok(hash.length >= 32, "Stored OTP must be a cryptographic hash");
    assert.equal(attempts, "0", "Initial attempt count must be 0");
    assert.ok(!/^\d{6}$/.test(hash), "Stored OTP must never be a plaintext 6-digit code");
  });
});
