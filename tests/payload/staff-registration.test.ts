import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import { capturePayloadTestLifecycle } from "../support/payload-lifecycle";
import { isStaffEmail } from "@/lib/auth/staff";

test(
  "staff registration: verified exact-domain identities receive CMS staff without membership activation",
  { skip: process.env.PAYLOAD_DATABASE_TESTS !== "1", timeout: 60_000 },
  async (t) => {
    const root = fileURLToPath(new URL("../../", import.meta.url));
    loadEnvConfig(root);
    let database: URL;
    try {
      database = new URL(process.env.DATABASE_URI ?? "");
    } catch {
      assert.fail(
        "DATABASE_URI must select the existing local development database."
      );
    }
    assert.ok(["postgres:", "postgresql:"].includes(database.protocol));
    assert.ok(
      ["localhost", "127.0.0.1", "[::1]"].includes(database.hostname),
      "Database integration only runs against loopback."
    );
    assert.ok(
      database.pathname.length > 1,
      "A local development database must be selected."
    );
    const previousHmr = process.env.DISABLE_PAYLOAD_HMR;
    process.env.DISABLE_PAYLOAD_HMR = "true";
    t.after(() => {
      if (previousHmr === undefined) delete process.env.DISABLE_PAYLOAD_HMR;
      else process.env.DISABLE_PAYLOAD_HMR = previousHmr;
    });
    const { getPayload } = await import("@/lib/payload");
    const payload = await getPayload();
    const closePayload = capturePayloadTestLifecycle(payload);

    const fixtures: Array<{ id: string; email: string }> = [];
    t.after(async () => {
      try {
        for (const fixture of fixtures) {
          const admins = await payload.find({
            collection: "admins",
            overrideAccess: true,
            where: { email: { equals: fixture.email } },
            limit: 1
          });
          for (const admin of admins.docs)
            await payload.delete({
              collection: "admins",
              id: admin.id,
              overrideAccess: true
            });
          await payload.delete({
            collection: "users",
            id: fixture.id,
            overrideAccess: true
          });
        }
      } finally {
        await closePayload();
      }
    });

    await t.test(
      "isStaffEmail validates sophomores.co domain correctly",
      () => {
        assert.equal(isStaffEmail("alex@sophomores.co"), true);
        assert.equal(isStaffEmail("ALEX@SOPHOMORES.CO"), true);
        assert.equal(isStaffEmail("  team@sophomores.co  "), true);
        assert.equal(isStaffEmail("lead@engineering.sophomores.co"), false);

        // Non-staff domains
        assert.equal(isStaffEmail("user@gmail.com"), false);
        assert.equal(isStaffEmail("hacker@not-sophomores.co"), false);
        assert.equal(isStaffEmail("user@sophomores.com"), false);
        assert.equal(isStaffEmail("user@sophomores.org"), false);
        assert.equal(isStaffEmail(null), false);
        assert.equal(isStaffEmail(""), false);
      }
    );

    await t.test(
      "verified @sophomores.co registration receives staff role without membership activation",
      async () => {
        const staffEmail = `test-staff-${Date.now()}@sophomores.co`;

        const user = await payload.create({
          collection: "users",
          draft: false,
          data: {
            name: "Test Staff User",
            email: staffEmail,
            emailVerified: true,
            localePreference: "en",
            membershipStatus: "applicant"
          }
        });

        fixtures.push(user);
        assert.ok(user.id);
        assert.equal(user.email, staffEmail);
        // Role must be set to staff
        const role = Array.isArray(user.role) ? user.role[0] : user.role;
        assert.equal(role, "staff");
        // CMS access does not establish a verified phone binding or activate membership.
        assert.equal(user.membershipStatus, "applicant");

        // An admin account should also be provisioned in the admins collection
        const admin = await payload.find({
          collection: "admins",
          where: { email: { equals: staffEmail } },
          limit: 1
        });
        assert.equal(admin.totalDocs, 1);
        assert.equal(admin.docs[0].email, staffEmail);
        assert.equal(admin.docs[0].role, "staff");
      }
    );

    await t.test(
      "unverified official-domain registration cannot enroll CMS staff",
      async () => {
        const email = `unverified-staff-${Date.now()}@sophomores.co`;
        const user = await payload.create({
          collection: "users",
          overrideAccess: true,
          data: {
            name: "Unverified Staff",
            email,
            emailVerified: false,
            localePreference: "en",
            membershipStatus: "applicant"
          }
        });
        fixtures.push(user);
        assert.equal(user.role?.includes("staff"), false);
        assert.equal(user.membershipStatus, "applicant");
        const admins = await payload.find({
          collection: "admins",
          overrideAccess: true,
          where: { email: { equals: email } }
        });
        assert.equal(admins.totalDocs, 0);
        const verified = await payload.update({
          collection: "users",
          id: user.id,
          overrideAccess: true,
          data: { emailVerified: true }
        });
        assert.equal(verified.role?.includes("staff"), true);
        assert.equal(verified.membershipStatus, "applicant");
      }
    );

    await t.test(
      "standard registration with non-staff domain retains regular user status",
      async () => {
        const attendeeEmail = `attendee-${Date.now()}@gmail.com`;

        const user = await payload.create({
          collection: "users",
          draft: false,
          data: {
            name: "Regular Attendee",
            email: attendeeEmail,
            emailVerified: false,
            localePreference: "ko",
            membershipStatus: "applicant"
          }
        });

        fixtures.push(user);
        assert.ok(user.id);
        assert.equal(user.email, attendeeEmail);
        const isStaff = Array.isArray(user.role)
          ? user.role.includes("staff")
          : false;
        assert.equal(isStaff, false);
        assert.equal(user.membershipStatus, "applicant");

        // Must NOT provision an admin record
        const admin = await payload.find({
          collection: "admins",
          where: { email: { equals: attendeeEmail } },
          limit: 1
        });
        assert.equal(admin.totalDocs, 0);
      }
    );
  }
);
