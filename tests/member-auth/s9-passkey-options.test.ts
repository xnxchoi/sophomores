import assert from "node:assert/strict";
import { test } from "node:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import type { Pool } from "pg";
import type { MemberAuthConfig } from "@/lib/member-auth/config";
import { createPayloadAuthBefore } from "@/lib/member-auth/payload-policy";
import { ACCOUNT_TRAY_PASSKEY, ACCOUNT_TRAY_PASSKEY_SESSION } from "@/lib/member-auth/paths";
import { createMemberAuth } from "@/lib/member-auth/server";

for (const stack of ["local", "payload-policy"] as const) {
  test(`${stack} passkey options do not disclose the account switched in after preflight`, async () => {
    const config: MemberAuthConfig = {
      mode: "local", origin: "http://localhost:3240",
      databaseUrl: "postgres://localhost/sophomores_verification_test",
      secret: "b".repeat(64), verificationSecret: "a".repeat(64), rpId: "localhost", google: null,
      mail: { host: "smtp.zeptomail.com", port: 465, username: "fixture", password: "fixture", from: "auth@fixture.invalid" }
    };
    const emails = ["original@fixture.invalid", "replacement@fixture.invalid"];
    const database = {
      user: emails.map((email, index) => ({
        id: `4f0c9a8e-0d43-4b8f-9a55-1d2f3e4a5b6${index}`,
        email, name: email, emailVerified: true, createdAt: new Date(), updatedAt: new Date()
      })),
      session: [], account: [], verification: [], rateLimit: [], passkey: []
    };
    let code: string | undefined;
    const local = createMemberAuth(config, {
      pool: memoryAdapter(database) as unknown as Pool,
      isActiveMember: async () => false,
      sendMail: async (mail) => { if (mail.type === "email-otp") code = mail.otp; }
    });
    const auth = stack === "local" ? local : betterAuth({
      ...local.options, hooks: { before: createPayloadAuthBefore(config.origin) }
    });
    const request = (path: string, headers: HeadersInit = {}, body?: unknown) => {
      const requestHeaders = new Headers(headers);
      requestHeaders.set("origin", config.origin);
      requestHeaders.set("x-member-local-ip", "127.0.0.1");
      if (body !== undefined) requestHeaders.set("content-type", "application/json");
      return auth.handler(new Request(`${config.origin}/api/auth${path}`, {
        headers: requestHeaders, method: body === undefined ? "GET" : "POST",
        body: body === undefined ? undefined : JSON.stringify(body)
      }));
    };
    const signIn = async (email: string) => {
      code = undefined;
      assert.equal((await request("/email-otp/send-verification-otp", {}, { email, type: "sign-in" })).status, 200);
      assert.ok(code);
      const result = await request("/sign-in/email-otp", {}, { email, otp: code });
      assert.equal(result.status, 200);
      const cookie = result.headers.getSetCookie().find((item) => item.startsWith("sophomores-member.session_token="));
      assert.ok(cookie);
      return cookie.split(";", 1)[0];
    };

    const originalCookie = await signIn(emails[0]);
    const preflight = await request("/get-session?disableCookieCache=true", { cookie: originalCookie });
    const { session: { id: expected } } = await preflight.json();
    assert.ok(expected);
    const replacementCookie = await signIn(emails[1]);
    const optionsPath = "/passkey/generate-register-options";
    const trayOptions = optionsPath + "?context=" + ACCOUNT_TRAY_PASSKEY;
    const before = database.verification.length;
    for (const path of [trayOptions, optionsPath]) {
      const denied = await request(path, { cookie: replacementCookie, [ACCOUNT_TRAY_PASSKEY_SESSION]: expected });
      assert.equal(denied.status, 403);
      assert.equal((await denied.json()).code, "PASSKEY_SESSION_CHANGED");
    }
    const missing = await request(trayOptions, { cookie: replacementCookie });
    assert.equal(missing.status, 403);
    assert.equal(database.verification.length, before, "no challenge may be issued for a mismatched/missing binding");

    const exact = await request(trayOptions, { cookie: originalCookie, [ACCOUNT_TRAY_PASSKEY_SESSION]: expected });
    assert.equal(exact.status, 200);
    assert.equal((await exact.json()).user.displayName, emails[0]);
    const settings = await request(optionsPath, { cookie: replacementCookie });
    assert.equal(settings.status, 200);
    assert.equal((await settings.json()).user.displayName, emails[1]);
  });
}
