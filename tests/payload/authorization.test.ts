import assert from "node:assert/strict";
import test from "node:test";
import type { Access, CollectionConfig } from "payload";
import { Users } from "@/payload/collections/users";
import { Admins } from "@/payload/collections/admins";
import { Orders } from "@/payload/collections/orders";
import {
  betterAuthOptions,
  betterAuthPluginOptions,
  createBetterAuthPlugins
} from "@/lib/auth/options";
import { isStaffEmail } from "@/lib/auth/staff-email";
import { ensureStaffAdminProvisioned } from "@/lib/auth/staff";
import { authenticateStaffSession } from "@/lib/auth/staff-strategy";

const customer = { id: "customer-a", collection: "users", role: ["admin"] };
const staff = {
  id: "staff-a",
  collection: "admins",
  role: "staff",
  _strategy: "staff-better-auth"
};
const admin = { ...staff, role: "admin" };
async function allowed(
  config: CollectionConfig,
  operation: "create" | "read" | "update" | "delete",
  user: unknown,
  data?: Record<string, unknown>
) {
  const policy = config.access?.[operation] as Access | undefined;
  assert.ok(policy, config.slug + " needs explicit " + operation + " access");
  return policy({ req: { user } as never, data, id: "customer-a" });
}

test("customer roles cannot confer collection administration", async () => {
  for (const collection of [Users, Admins, Orders]) {
    for (const operation of ["create", "delete"] as const)
      assert.equal(await allowed(collection, operation, customer), false);
  }
  assert.equal(
    await allowed(Admins, "update", customer, { role: "admin" }),
    false
  );
  assert.equal(
    await allowed(Orders, "update", customer, { status: "paid" }),
    false
  );
  assert.deepEqual(await allowed(Users, "read", customer), {
    id: { equals: "customer-a" }
  });
  assert.deepEqual(await allowed(Orders, "read", customer), {
    user: { equals: "customer-a" }
  });
});

test("customers may update only their own safe profile fields", async () => {
  assert.deepEqual(
    await allowed(Users, "update", customer, {
      name: "New",
      localePreference: "en"
    }),
    { id: { equals: "customer-a" } }
  );
  for (const field of [
    "email",
    "emailVerified",
    "role",
    "membershipStatus",
    "ticketTier",
    "phone",
    "phoneNumber",
    "phoneNumberVerified",
    "verified",
    "notes"
  ]) {
    assert.equal(
      await allowed(Users, "update", customer, { [field]: "forged" }),
      false,
      field
    );
  }
  assert.equal(await allowed(Users, "read", null), false);
});

test("CMS authority requires an admin collection principal and trusted strategy", async () => {
  assert.equal(await allowed(Admins, "create", staff), false);
  assert.equal(await allowed(Admins, "create", admin), true);
  assert.equal(
    await allowed(Admins, "create", { ...admin, _strategy: "local-jwt" }),
    false
  );
  assert.equal(
    await allowed(Admins, "create", { ...admin, collection: "users" }),
    false
  );
  assert.deepEqual(await allowed(Admins, "read", staff), {
    id: { equals: "staff-a" }
  });
  for (const user of [staff, admin]) {
    assert.equal(await allowed(Orders, "read", user), true);
    for (const operation of ["create", "update", "delete"] as const)
      assert.equal(
        await allowed(Orders, operation, user, { status: "paid" }),
        false
      );
  }
});

test("plugin customer self-update and additional fields exclude privileged inputs", () => {
  assert.deepEqual(betterAuthPluginOptions.users?.allowedFields, [
    "name",
    "localePreference"
  ]);
  assert.deepEqual(betterAuthPluginOptions.users?.adminRoles, []);
  for (const field of ["phone", "ticketTier", "role", "verified"] as const) {
    assert.equal(
      betterAuthOptions.user.additionalFields[field].input,
      false,
      field
    );
  }
});

test("staff enrollment accepts only the exact official domain", () => {
  assert.equal(isStaffEmail("  PERSON@SOPHOMORES.CO "), true);
  for (const email of [
    "person@team.sophomores.co",
    "person@evil.sophomores.co",
    "person@@sophomores.co",
    "person@sophomores.co.evil.invalid",
    "person@gmail.com",
    "@sophomores.co"
  ])
    assert.equal(isStaffEmail(email), false, email);
});

test("unverified staff sessions cannot look up or provision administrators", async () => {
  for (const emailVerified of [false, undefined]) {
    const result = await authenticateStaffSession({
      headers: new Headers(),
      payload: {
        betterAuth: {
          api: {
            getSession: async () => ({
              user: { email: "person@sophomores.co", emailVerified }
            })
          }
        },
        find: async () => {
          throw new Error("unverified identity must not query admins");
        }
      }
    });
    assert.equal(result.user, null);
  }
  let queried = false;
  await ensureStaffAdminProvisioned(
    { email: "person@sophomores.co", emailVerified: false },
    {
      find: async () => {
        queried = true;
        return { docs: [], totalDocs: 0 };
      }
    } as never
  );
  assert.equal(queried, false);
});

test("verified staff provisioning is server-owned, preserves higher roles and propagates failure", async () => {
  const created: Record<string, unknown>[] = [];
  const payload = {
    find: async (args: Record<string, unknown>) => {
      assert.equal(args.overrideAccess, true);
      return { docs: [], totalDocs: 0 };
    },
    create: async (args: Record<string, unknown>) => {
      created.push(args);
      return { id: "admin-a" };
    },
    logger: { info: () => {} }
  };
  await ensureStaffAdminProvisioned(
    { email: "person@sophomores.co", emailVerified: true },
    payload as never
  );
  assert.equal(created.length, 1);
  assert.equal(created[0].overrideAccess, true);
  const data = created[0].data as Record<string, unknown>;
  assert.equal(data.role, "staff");
  assert.equal(
    data.password,
    undefined,
    "local CMS passwords must not be provisioned"
  );
  await assert.rejects(
    ensureStaffAdminProvisioned(
      { email: "person@sophomores.co", emailVerified: true },
      {
        find: async () => {
          throw new Error("database unavailable");
        }
      } as never
    ),
    /database unavailable/
  );
});

test("canonical collection hooks do not activate membership when staff email verifies", async () => {
  const before = Users.hooks?.beforeChange?.[0];
  assert.ok(before);
  const input = {
    email: "person@sophomores.co",
    emailVerified: true,
    membershipStatus: "applicant",
    role: ["user"]
  };
  const result = await before({
    data: input,
    operation: "create",
    req: {}
  } as never);
  assert.notEqual(result, input);
  assert.deepEqual(result.role, ["staff"]);
  assert.equal(result.membershipStatus, "applicant");
  assert.deepEqual(input.role, ["user"], "hooks must not mutate their input");
});

test("generated customer field protections preserve schema without mutation", () => {
  const collection: CollectionConfig = {
    slug: "users",
    fields: [
      {
        name: "role",
        type: "select",
        options: ["user", "admin"],
        hasMany: true
      },
      { name: "emailVerified", type: "checkbox" },
      { name: "name", type: "text" },
      { name: "managePasskeys", type: "ui", admin: {} },
      { name: "sessions", type: "join", collection: "sessions", on: "userId" }
    ]
  };
  const result = betterAuthPluginOptions.users!.collectionOverrides!({
    collection
  });
  assert.notEqual(result, collection);
  for (const field of result.fields.slice(0, 2)) {
    assert.notEqual(field, collection.fields[result.fields.indexOf(field)]);
    assert.equal(
      (field as { access?: { update?: () => boolean } }).access?.update?.(),
      false
    );
  }
  assert.equal(
    (collection.fields[0] as { access?: unknown }).access,
    undefined
  );
  assert.equal(result.fields[2], collection.fields[2]);
  assert.equal(result.fields[3], collection.fields[3]);
  assert.equal(result.fields[4], collection.fields[4]);
});

test("email delivery is injectable without console-success or a phone-login fallback", async () => {
  const delivered: unknown[] = [];
  const plugins = createBetterAuthPlugins({
    mailer: async (notification) => {
      delivered.push(notification);
    }
  });
  const otp = plugins.find((plugin) => plugin.id === "email-otp")!.options as {
    generateOTP: () => string;
    sendVerificationOTP: (value: {
      email: string;
      otp: string;
      type: string;
    }) => Promise<void>;
  };
  assert.match(otp.generateOTP(), /^[A-Z0-9]{6}$/);
  await otp.sendVerificationOTP({
    email: "person@example.invalid",
    otp: "ABC123",
    type: "sign-in"
  });
  assert.equal(delivered.length, 1);
  await assert.rejects(
    otp.sendVerificationOTP({
      email: "person@example.invalid",
      otp: "ABC123",
      type: "forget-password"
    }),
    /unavailable/
  );
  const phone = plugins.find((plugin) => plugin.id === "phone-number")!
    .options as { sendOTP: () => Promise<void> };
  await assert.rejects(phone.sendOTP(), /unavailable/);
  const unavailable = createBetterAuthPlugins({ mailer: null }).find(
    (plugin) => plugin.id === "email-otp"
  )!.options as typeof otp;
  await assert.rejects(
    unavailable.sendVerificationOTP({
      email: "person@example.invalid",
      otp: "ABC123",
      type: "sign-in"
    }),
    /unavailable/
  );
});

test("partial profile hooks retain name and evaluate complete staff identity", async () => {
  const validate = Users.hooks!.beforeValidate![0];
  const partial = { localePreference: "en" };
  assert.equal(
    await validate({
      data: partial,
      originalDoc: { name: "Existing" }
    } as never),
    partial
  );
  assert.equal(await validate({ data: undefined } as never), undefined);
  const before = Users.hooks!.beforeChange![0];
  const data = { emailVerified: true };
  const result = await before({
    data,
    operation: "update",
    originalDoc: {
      email: "person@sophomores.co",
      role: ["admin"],
      membershipStatus: "applicant"
    }
  } as never);
  assert.deepEqual(result.role, ["admin"]);
  assert.equal(data.emailVerified, true);
  const unverified = await before({
    data: { email: "person@sophomores.co", emailVerified: false },
    operation: "create",
    req: {}
  } as never);
  assert.deepEqual(unverified.role, ["user"]);
  const after = Users.hooks!.afterChange![0];
  const doc = { email: "person@sophomores.co", emailVerified: false };
  assert.equal(
    await after({
      doc,
      req: {
        payload: {
          find: () => {
            throw new Error("must not provision");
          }
        }
      }
    } as never),
    doc
  );
});

test("existing verified CMS role is preserved and provisioning races are idempotent", async () => {
  let creates = 0;
  for (const role of ["staff", "editor", "admin"]) {
    await ensureStaffAdminProvisioned(
      { email: "person@sophomores.co", emailVerified: true },
      {
        find: async () => ({ docs: [{ id: "existing", role }], totalDocs: 1 }),
        create: async () => {
          creates++;
        }
      } as never
    );
  }
  assert.equal(creates, 0);
  let reads = 0;
  await ensureStaffAdminProvisioned(
    { email: "person@sophomores.co", emailVerified: true },
    {
      find: async () => ({
        docs: reads++ === 0 ? [] : [{ id: "raced", role: "staff" }]
      }),
      create: async () => {
        throw new Error("duplicate email");
      }
    } as never
  );
  assert.equal(reads, 2);
});

test("passwordless Admins explicitly retains its unique email identity", () => {
  const email = Admins.fields.find(
    (field) => "name" in field && field.name === "email"
  );
  assert.ok(email);
  assert.equal(email.type, "email");
  assert.equal((email as { unique?: boolean }).unique, true);
  assert.equal((email as { required?: boolean }).required, true);
});

test("canonical session DTO retains createdAt for fresh-session enforcement", () => {
  const override = betterAuthPluginOptions.sessions?.collectionOverrides;
  assert.ok(override);
  const original: CollectionConfig = {
    slug: "sessions",
    fields: [
      { name: "createdAt", type: "date", saveToJWT: false },
      { name: "updatedAt", type: "date", saveToJWT: false }
    ]
  };
  const result = override({ collection: original });
  assert.equal((result.fields[0] as { saveToJWT?: boolean }).saveToJWT, true);
  assert.equal(
    (original.fields[0] as { saveToJWT?: boolean }).saveToJWT,
    false
  );
  assert.equal(result.fields[1], original.fields[1]);
});
