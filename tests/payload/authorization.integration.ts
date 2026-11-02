import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import test from "node:test";
import { capturePayloadTestLifecycle } from "../support/payload-lifecycle";

// Explicit command only: PAYLOAD_DATABASE_TESTS=1 node --import tsx --test this-file.
// The ordinary unit suite must never initialize Payload or a configured provider.
test(
  "Payload enforces authorization through its real Local API",
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
    const networkAttempts: string[] = [];
    t.mock.method(globalThis, "fetch", async () => {
      networkAttempts.push(
        new Error("Unexpected HTTP access in CRUD integration").stack ??
          "HTTP access"
      );
      throw new Error("HTTP access is disabled in CRUD integration.");
    });
    const { getPayload } = await import("../../lib/payload");
    const payload = await getPayload();
    const closePayload = capturePayloadTestLifecycle(payload);
    const users: string[] = [];
    const orders: string[] = [];
    t.after(async () => {
      try {
        for (const id of orders)
          await payload.delete({
            collection: "orders",
            id,
            overrideAccess: true
          });
        for (const id of users)
          await payload.delete({
            collection: "users",
            id,
            overrideAccess: true
          });
      } finally {
        await closePayload();
      }
    });
    t.after(() => {
      assert.deepEqual(
        networkAttempts,
        [],
        "CRUD integration must not perform HTTP requests"
      );
    });
    const createUser = async () => {
      const user = await payload.create({
        collection: "users",
        overrideAccess: true,
        data: {
          email: "authorization-" + randomUUID() + "@example.invalid",
          name: "Authorization Fixture",
          emailVerified: true,
          localePreference: "en",
          membershipStatus: "applicant"
        }
      });
      users.push(user.id);
      return user;
    };
    const owner = await createUser();
    const other = await createUser();
    const customer = {
      ...owner,
      role: ["admin"],
      collection: "users"
    } as never;
    const cmsStaffData = {
      id: randomUUID(),
      email: "staff@sophomores.co",
      role: "staff",
      collection: "admins",
      _strategy: "staff-better-auth"
    };
    const cmsStaff = cmsStaffData as never;
    const cmsAdmin = { ...cmsStaffData, role: "admin" } as never;
    for (const user of [owner, other]) {
      const order = await payload.create({
        collection: "orders",
        overrideAccess: true,
        data: {
          user: user.id,
          ticketQuantity: 1,
          totalAmount: 1234,
          currency: "KRW",
          status: "pending",
          paymentProvider: "complimentary"
        }
      });
      orders.push(order.id);
    }
    const forbidden = async (operation: () => Promise<unknown>) =>
      assert.rejects(operation, (error: unknown) => {
        assert.equal((error as { status?: number }).status, 403);
        return true;
      });

    await t.test(
      "owner filters restrict both collection lists and individual reads",
      async () => {
        const ownUsers = await payload.find({
          collection: "users",
          user: customer,
          overrideAccess: false
        });
        assert.deepEqual(
          ownUsers.docs.map((doc) => doc.id),
          [owner.id]
        );
        const ownOrders = await payload.find({
          collection: "orders",
          user: customer,
          overrideAccess: false
        });
        assert.deepEqual(
          ownOrders.docs.map((doc) => doc.id),
          [orders[0]]
        );
        await assert.rejects(
          payload.findByID({
            collection: "users",
            id: other.id,
            user: customer,
            overrideAccess: false
          })
        );
        await assert.rejects(
          payload.findByID({
            collection: "orders",
            id: orders[1],
            user: customer,
            overrideAccess: false
          })
        );
        await forbidden(() =>
          payload.find({ collection: "orders", overrideAccess: false })
        );
      }
    );

    await t.test(
      "safe profile changes survive while privilege and identity writes are rejected",
      async () => {
        const updated = await payload.update({
          collection: "users",
          id: owner.id,
          user: customer,
          overrideAccess: false,
          data: { name: "Safe Profile" }
        });
        assert.equal(updated.name, "Safe Profile");
        for (const data of [
          { role: ["admin"] },
          { emailVerified: true },
          { membershipStatus: "approved" },
          { ticketTier: "vip" },
          { email: "forged@sophomores.co" }
        ]) {
          await forbidden(() =>
            payload.update({
              collection: "users",
              id: owner.id,
              user: customer,
              overrideAccess: false,
              data: data as never
            })
          );
        }
        await forbidden(() =>
          payload.update({
            collection: "users",
            id: other.id,
            user: customer,
            overrideAccess: false,
            data: { name: "Cross-owner" }
          })
        );
        const stored = await payload.findByID({
          collection: "users",
          id: owner.id,
          overrideAccess: true
        });
        assert.equal(stored.email, owner.email);
        assert.equal(stored.membershipStatus, "applicant");
        assert.equal(stored.role?.includes("admin"), false);
      }
    );

    await t.test(
      "neither customers nor CMS roles can manufacture paid orders",
      async () => {
        for (const user of [customer, cmsStaff, cmsAdmin]) {
          await forbidden(() =>
            payload.update({
              collection: "orders",
              id: orders[0],
              user,
              overrideAccess: false,
              data: { status: "paid", totalAmount: 0 }
            })
          );
          await forbidden(() =>
            payload.create({
              collection: "orders",
              user,
              overrideAccess: false,
              data: {
                user: owner.id,
                ticketQuantity: 1,
                totalAmount: 0,
                currency: "KRW",
                status: "paid",
                paymentProvider: "complimentary"
              }
            })
          );
          await forbidden(() =>
            payload.delete({
              collection: "orders",
              id: orders[0],
              user,
              overrideAccess: false
            })
          );
        }
        const stored = await payload.findByID({
          collection: "orders",
          id: orders[0],
          overrideAccess: true
        });
        assert.equal(stored.status, "pending");
        assert.equal(stored.totalAmount, 1234);
      }
    );

    await t.test(
      "customer and ordinary staff principals cannot manage CMS administrators",
      async () => {
        for (const user of [customer, cmsStaff]) {
          await forbidden(() =>
            payload.create({
              collection: "admins",
              user,
              overrideAccess: false,
              data: {
                name: "Forged Admin",
                email: "forged-" + randomUUID() + "@example.invalid",
                role: "admin"
              }
            })
          );
        }
      }
    );
  }
);
