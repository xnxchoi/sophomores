import assert from "node:assert/strict";
import test from "node:test";
import { betterAuthPluginOptions } from "@/lib/auth/options";
import {
  adminMagicLinkAllowed,
  callbackPathname,
  cmsAdminCallbackPath,
  safeAdminDestination
} from "@/lib/auth/cms-login";
import { accountDisplayName } from "@/lib/auth/staff-email";
import { authenticateStaffSession } from "@/lib/auth/staff-strategy";
import { staffCmsLoginPlugin } from "@/payload/admin/staff-login-plugin";

const origin = "http://localhost:3000";
const token = "a".repeat(32);

function magicLink(callback: string, extra = ""): string {
  return `${origin}/api/auth/magic-link/verify?token=${token}&callbackURL=${encodeURIComponent(callback)}${extra}`;
}

test("staff auth is registered ahead of the customer collection", () => {
  const config = staffCmsLoginPlugin({
    collections: [{ slug: "users" }, { slug: "admins" }, { slug: "orders" }]
  } as never);
  assert.deepEqual(
    config.collections?.map((collection) => collection.slug),
    ["admins", "users", "orders"]
  );
});

test("email sign-in supplies a name when the form does not", () => {
  assert.equal(accountDisplayName("editor@sophomores.co", ""), "editor");
  assert.equal(accountDisplayName("a.b+c@sophomores.co", "  "), "a b c");
  assert.equal(accountDisplayName("editor@sophomores.co", "Ada"), "Ada");
  assert.equal(accountDisplayName("", ""), "Member");
});

test("cms login exposes email OTP and magic link", () => {
  assert.deepEqual(betterAuthPluginOptions.admin?.loginMethods, [
    "emailOTP",
    "magicLink"
  ]);
});

test("admin magic links are limited to staff callbacks on the admin path", () => {
  assert.equal(callbackPathname(magicLink("/vault")), "/vault");
  assert.equal(callbackPathname(magicLink(`${origin}/vault`)), "/vault");
  assert.equal(
    adminMagicLinkAllowed("editor@sophomores.co", magicLink("/vault")),
    true
  );
  assert.equal(
    adminMagicLinkAllowed("editor@sophomores.co", magicLink(`${origin}/vault`)),
    true
  );
  assert.equal(
    adminMagicLinkAllowed("person@gmail.com", magicLink("/vault")),
    false
  );
  assert.equal(
    adminMagicLinkAllowed("editor@sophomores.co", magicLink("/account")),
    true
  );
  assert.equal(
    adminMagicLinkAllowed(
      "editor@sophomores.co",
      magicLink("https://evil.invalid/vault")
    ),
    false
  );
  assert.equal(
    adminMagicLinkAllowed("editor@sophomores.co", "not a url"),
    false
  );
  assert.equal(cmsAdminCallbackPath, "/vault");
});

test("post-login navigation stays inside the admin route", () => {
  assert.equal(
    safeAdminDestination("/vault/collections/orders", "/vault"),
    "/vault/collections/orders"
  );
  assert.equal(
    safeAdminDestination(["/vault/collections/orders"], "/vault"),
    "/vault/collections/orders"
  );
  assert.equal(
    safeAdminDestination("/vault/collections/orders?depth=0", "/vault"),
    "/vault/collections/orders?depth=0"
  );
  assert.equal(
    safeAdminDestination("https://evil.invalid/vault", "/vault"),
    "/vault"
  );
  assert.equal(
    safeAdminDestination("//evil.invalid/vault", "/vault"),
    "/vault"
  );
  assert.equal(safeAdminDestination("/vault-evil", "/vault"), "/vault");
  assert.equal(safeAdminDestination("/other", "/vault"), "/vault");
  assert.equal(safeAdminDestination(undefined, "/vault"), "/vault");
});

test("a verified staff session opens the matching admin and nothing else", async () => {
  const admin = {
    id: "admin-1",
    email: "editor@sophomores.co",
    role: "editor"
  };
  const payload = {
    betterAuth: {
      api: {
        getSession: async () => ({
          user: { email: "Editor@Sophomores.co", emailVerified: true }
        })
      }
    },
    find: async () => ({ docs: [admin] })
  };
  const allowed = await authenticateStaffSession({
    headers: new Headers(),
    payload
  });
  assert.equal(allowed.user?.collection, "admins");
  assert.equal(allowed.user?._strategy, "staff-better-auth");
  assert.equal(allowed.user?.id, "admin-1");

  const outsider = await authenticateStaffSession({
    headers: new Headers(),
    payload: {
      betterAuth: {
        api: {
          getSession: async () => ({ user: { email: "person@gmail.com" } })
        }
      },
      find: async () => {
        throw new Error("must not look up a non-staff session");
      }
    }
  });
  assert.equal(outsider.user, null);

  const created: Array<{ id: string; email: string }> = [];
  const provisioned = await authenticateStaffSession({
    headers: new Headers(),
    payload: {
      betterAuth: {
        api: {
          getSession: async () => ({
            user: {
              email: "new@sophomores.co",
              emailVerified: true,
              name: "New"
            }
          })
        }
      },
      find: async () => ({ docs: [...created], totalDocs: created.length }),
      create: async () => {
        created.push({ id: "created", email: "new@sophomores.co" });
        return created[0];
      }
    } as Parameters<typeof authenticateStaffSession>[0]["payload"]
  });
  assert.equal(provisioned.user?.id, "created");
  assert.equal(created.length, 1);

  const broken = await authenticateStaffSession({
    headers: new Headers(),
    payload: {
      betterAuth: {
        api: {
          getSession: async () => {
            throw new Error("down");
          }
        }
      },
      find: async () => ({ docs: [admin] })
    }
  });
  assert.equal(broken.user, null);
});
