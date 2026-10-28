import assert from "node:assert/strict";
import test from "node:test";
import { getPayload } from "../../lib/payload";
import { isStaffEmail, ensureStaffAdminProvisioned } from "../../lib/auth/staff";

test("staff registration: users with sophomores.co domain receive automatic staff status", async (t) => {
  const payload = await getPayload();

  t.after(async () => {
    try {
      const pool = payload.db.pool as any;
      if (pool) {
        const idleClients = pool._idle?.map((item: any) => item.client || item) || [];
        const busy = pool._clients?.filter((c: any) => !idleClients.includes(c)) || [];
        for (const b of busy) {
          try {
            b.release();
          } catch {}
        }
        await pool.end().catch(() => {});
      }
      const handles = (process as any)._getActiveHandles?.() || [];
      for (const h of handles) {
        if (typeof h?.unref === "function") h.unref();
        if (h?.constructor?.name === "ChildProcess" && typeof h.kill === "function") h.kill();
      }
    } catch {}
  });

  await t.test("isStaffEmail validates sophomores.co domain correctly", () => {
    assert.equal(isStaffEmail("alex@sophomores.co"), true);
    assert.equal(isStaffEmail("ALEX@SOPHOMORES.CO"), true);
    assert.equal(isStaffEmail("  team@sophomores.co  "), true);
    assert.equal(isStaffEmail("lead@engineering.sophomores.co"), true);

    // Non-staff domains
    assert.equal(isStaffEmail("user@gmail.com"), false);
    assert.equal(isStaffEmail("hacker@not-sophomores.co"), false);
    assert.equal(isStaffEmail("user@sophomores.com"), false);
    assert.equal(isStaffEmail("user@sophomores.org"), false);
    assert.equal(isStaffEmail(null), false);
    assert.equal(isStaffEmail(""), false);
  });

  await t.test("user registering with @sophomores.co automatically receives staff role and status", async () => {
    const staffEmail = `test-staff-${Date.now()}@sophomores.co`;

    const user = await payload.create({
      collection: "users",
      draft: false,
      data: {
        name: "Test Staff User",
        email: staffEmail,
        emailVerified: true,
        localePreference: "en",
        membershipStatus: "applicant",
      },
    });

    assert.ok(user.id);
    assert.equal(user.email, staffEmail);
    // Role must be set to staff
    const role = Array.isArray(user.role) ? user.role[0] : user.role;
    assert.equal(role, "staff");
    // Membership status must be upgraded to staff
    assert.equal(user.membershipStatus, "staff");

    // An admin account should also be provisioned in the admins collection
    const admin = await payload.find({
      collection: "admins",
      where: { email: { equals: staffEmail } },
      limit: 1,
    });
    assert.equal(admin.totalDocs, 1);
    assert.equal(admin.docs[0].email, staffEmail);
    assert.equal(admin.docs[0].role, "staff");
  });

  await t.test("standard registration with non-staff domain retains regular user status", async () => {
    const attendeeEmail = `attendee-${Date.now()}@gmail.com`;

    const user = await payload.create({
      collection: "users",
      draft: false,
      data: {
        name: "Regular Attendee",
        email: attendeeEmail,
        emailVerified: false,
        localePreference: "ko",
        membershipStatus: "applicant",
      },
    });

    assert.ok(user.id);
    assert.equal(user.email, attendeeEmail);
    const isStaff = Array.isArray(user.role) ? user.role.includes("staff") : false;
    assert.equal(isStaff, false);
    assert.equal(user.membershipStatus, "applicant");

    // Must NOT provision an admin record
    const admin = await payload.find({
      collection: "admins",
      where: { email: { equals: attendeeEmail } },
      limit: 1,
    });
    assert.equal(admin.totalDocs, 0);
  });
});
