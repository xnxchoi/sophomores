import assert from "node:assert/strict";
import { test } from "node:test";
import type { MemberAuthConfig } from "@/lib/member-auth/config";
import { createMemberAuth } from "@/lib/member-auth/server";
import {
  createPayloadAuthBefore,
  createPayloadPasskeyPolicy
} from "@/lib/member-auth/payload-policy";

// Owner, 2026-11-16: adding or using a passkey never depends on phone
// verification. Registering, listing and signing in with a passkey need a
// signed-in account with a verified email (for sign-in, an existing account),
// not a phone binding. Linking a social account and checkout keep the gate.

const config: MemberAuthConfig = {
  mode: "local", origin: "http://localhost:3240", databaseUrl: "postgres://localhost/sophomores_verification_test_auth",
  secret: "b".repeat(64), verificationSecret: "a".repeat(64), rpId: "localhost", google: null, mail: null
};
const VERIFIED = "verified-account";
const UNVERIFIED = "unverified-account";
const uv = {
  registration: { registrationInfo: { userVerified: true } },
  authentication: { authenticationInfo: { userVerified: true } }
};
const session = (emailVerified: boolean) => ({
  user: { id: emailVerified ? VERIFIED : UNVERIFIED, emailVerified },
  session: { createdAt: new Date() }
});

/** No phone binding anywhere: isActiveMember is always false. */
async function serverAuth() {
  const owners: Record<string, string> = { "verified-credential": VERIFIED, "unverified-credential": UNVERIFIED };
  const pool = {
    query: async (sql: string, params: string[]) => {
      if (sql.includes("member_auth.passkey")) return { rows: owners[params[0]] ? [{ userId: owners[params[0]] }] : [] };
      if (sql.includes('member_auth."user"')) return { rows: params[0] === VERIFIED ? [{ verified: 1 }] : [] };
      throw new Error("Unexpected query");
    },
    connect: async () => { throw new Error("Database access is forbidden in this test"); }
  };
  const auth = createMemberAuth(config, { pool: pool as never, isActiveMember: async () => false, sendMail: async () => {} });
  await auth.$context;
  const plugin = (auth.options.plugins as { id: string; options?: unknown }[]).find((entry) => entry.id === "passkey");
  const options = plugin!.options as {
    registration: { afterVerification: (input: unknown) => Promise<unknown> };
    authentication: { afterVerification: (input: unknown) => Promise<unknown> };
  };
  return { before: auth.options.hooks!.before!, options };
}

test("local auth: a verified-email account registers and lists passkeys without a phone binding", async () => {
  const { before, options } = await serverAuth();
  for (const path of ["/passkey/generate-register-options", "/passkey/verify-registration", "/passkey/list-user-passkeys"]) {
    await before({ path, headers: new Headers(), context: { session: session(true) } } as never);
    await assert.rejects(before({ path, headers: new Headers(), context: { session: session(false) } } as never), { status: "FORBIDDEN" }, path);
  }
  await options.registration.afterVerification({ verification: uv.registration, user: { id: VERIFIED } });
  await assert.rejects(options.registration.afterVerification({ verification: uv.registration, user: { id: UNVERIFIED } }));
});

test("local auth: signing in with a passkey needs an existing verified account, not a phone binding", async () => {
  const { options } = await serverAuth();
  await options.authentication.afterVerification({ verification: uv.authentication, clientData: { id: "verified-credential" }, ctx: { headers: {} } });
  for (const id of ["unverified-credential", "unknown-credential"])
    await assert.rejects(options.authentication.afterVerification({ verification: uv.authentication, clientData: { id }, ctx: { headers: {} } }), Error, id);
});

test("local auth: account linking still needs the phone-verified member", async () => {
  const { before } = await serverAuth();
  await assert.rejects(before({ path: "/list-accounts", headers: new Headers(), context: { session: session(true) } } as never), { status: "FORBIDDEN" });
});

test("canonical auth: passkey paths need a verified-email session, never a phone binding", async () => {
  const before = createPayloadAuthBefore("http://localhost:3000");
  for (const path of ["/passkey/generate-register-options", "/passkey/verify-registration", "/passkey/list-user-passkeys"]) {
    // No server session store and no member runtime: a phone-binding lookup could only answer "not a member".
    await before({ path, headers: new Headers(), responseHeaders: new Headers(), context: { options: {}, session: session(true) } } as never);
    await assert.rejects(before({ path, headers: new Headers(), responseHeaders: new Headers(), context: { options: {}, session: session(false) } } as never), Error, path);
  }
  await assert.rejects(before({ path: "/list-accounts", headers: new Headers(), responseHeaders: new Headers(), context: { options: {}, session: session(true) } } as never));
});

test("canonical auth: registering and signing in with a passkey check the account, not the phone", async () => {
  const policy = createPayloadPasskeyPolicy({
    isVerifiedAccount: async (id) => id === VERIFIED,
    passkeyUser: async (credential) => ({ "verified-credential": VERIFIED, "unverified-credential": UNVERIFIED })[credential] ?? null
  });
  await policy.registration.afterVerification({ verification: uv.registration, user: { id: VERIFIED } });
  await assert.rejects(policy.registration.afterVerification({ verification: uv.registration, user: { id: UNVERIFIED } }));
  await policy.authentication.afterVerification({ verification: uv.authentication, clientData: { id: "verified-credential" }, ctx: {} });
  for (const id of ["unverified-credential", "unknown-credential"])
    await assert.rejects(policy.authentication.afterVerification({ verification: uv.authentication, clientData: { id }, ctx: {} }), Error, id);
});
