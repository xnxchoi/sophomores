import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { loadEnvConfig } from "@next/env";
import type { MemberMailNotification } from "../../lib/member-auth/mail";
import { capturePayloadTestLifecycle } from "../support/payload-lifecycle";

// Explicit opt-in permits writes to the existing local development database.
// Email delivery is always injected below; configured SMTP is never invoked.
test("canonical Payload authentication and member-session integrity", {
  skip: process.env.PAYLOAD_DATABASE_TESTS !== "1",
  timeout: 60_000,
}, async (t) => {
  // The installed Payload getPayload() otherwise opens a development HMR socket
  // outside Next. Disable that test-unrelated client instead of forcing exit.
  const previousHmr = process.env.DISABLE_PAYLOAD_HMR;
  process.env.DISABLE_PAYLOAD_HMR = "true";
  t.after(() => {
    if (previousHmr === undefined) delete process.env.DISABLE_PAYLOAD_HMR;
    else process.env.DISABLE_PAYLOAD_HMR = previousHmr;
  });
  const root = fileURLToPath(new URL("../../", import.meta.url));
  loadEnvConfig(root);
  const database = new URL(process.env.DATABASE_URI ?? "");
  assert.ok(["postgres:", "postgresql:"].includes(database.protocol));
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(database.hostname));
  assert.ok(database.pathname.length > 1, "A local development database must be selected");

  // Import only after loading the project's configuration and checking locality.
  const [{ getPayload }, { betterAuth }, { createBetterAuthPlugins }, { Pool }, { createPayloadMemberRuntime }] =
    await Promise.all([
      import("../../lib/payload"),
      import("better-auth"),
      import("../../lib/auth/options"),
      import("pg"),
      import("../../lib/member-auth/payload-runtime"),
    ]);
  const payload = await getPayload();
  const closePayload = capturePayloadTestLifecycle(payload);
  const pool = new Pool({
    connectionString: database.href,
    max: 2,
    connectionTimeoutMillis: 2_000,
    statement_timeout: 5_000,
    lock_timeout: 1_000,
  });
  const userIds = new Set<string>();
  const emails = new Set<string>();
  const challengeIds = new Set<string>();
  const bindLimitKeys = new Set<string>();
  const testIp = `127.${randomBytes(3).join(".")}`;
  let routePool: import("pg").Pool | undefined;
  t.after(async () => {
    try {
      for (const id of userIds) {
        await pool.query("DELETE FROM canonical_member.phone_bindings WHERE user_id=$1", [id]);
        await pool.query("DELETE FROM public.users WHERE id=$1", [id]);
      }
      for (const id of challengeIds) {
        await pool.query("DELETE FROM phone_verification.challenges WHERE id=$1", [id]);
      }
      for (const key of bindLimitKeys) {
        await pool.query("DELETE FROM canonical_member.bind_limits WHERE key_hash=$1", [key]);
      }
      for (const email of emails) {
        await pool.query("DELETE FROM public.admins WHERE email=$1", [email]);
        await pool.query("DELETE FROM public.verifications WHERE identifier LIKE $1", [`%${email}%`]);
      }
      await pool.query("DELETE FROM public.rate_limit WHERE key LIKE $1", [`${testIp}|%`]);
    } finally {
      await pool.end();
      await routePool?.end();
      await closePayload();
    }
  });

  const configuredOrigin = payload.betterAuth.options.baseURL;
  assert.equal(typeof configuredOrigin, "string");
  const origin = new URL(configuredOrigin as string).origin;
  assert.equal(new URL(origin).protocol, "http:");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname));
  const deliveries: MemberMailNotification[] = [];
  const auth = betterAuth({
    ...payload.betterAuth.options,
    plugins: createBetterAuthPlugins({
      appURL: origin,
      mailer: async (notification) => { deliveries.push(notification); },
    }),
  });
  const secret = auth.options.secret;
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("Canonical authentication requires its configured secret");
  }
  const runtime = createPayloadMemberRuntime({
    origin,
    databaseUrl: database.href,
    secret,
    verificationSecret: randomBytes(32).toString("hex"),
    emailDelivery: true,
    google: false,
  }, { pool });

  const request = (path: string, body?: Record<string, unknown>, cookie = "") =>
    new Request(`${origin}/api/auth${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        origin,
        "content-type": "application/json",
        "x-forwarded-for": testIp,
        cookie,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

  await t.test("anonymous canonical get-session returns no session", async () => {
    const response = await auth.handler(request("/get-session"));
    assert.equal(response.status, 200);
    assert.equal(await response.json(), null);
  });

  await t.test("database deletion of a fixture user cascades its canonical session", async () => {
    const email = `cascade-${randomUUID()}@fixture.invalid`;
    emails.add(email);
    const user = await payload.create({
      collection: "users",
      overrideAccess: true,
      data: {
        name: "Cascade Integrity Fixture",
        email,
        emailVerified: true,
        localePreference: "en",
        membershipStatus: "applicant",
      },
    });
    userIds.add(user.id);
    const sessionId = randomUUID();
    await pool.query(`INSERT INTO public.sessions
      (id,token,expires_at,user_id,created_at,updated_at)
      VALUES ($1,$2,now() + interval '1 day',$3,now(),now())`,
    [sessionId, randomUUID(), user.id]);
    await pool.query("DELETE FROM public.users WHERE id=$1", [user.id]);
    userIds.delete(user.id);
    const remaining = await pool.query("SELECT id FROM public.sessions WHERE id=$1", [sessionId]);
    assert.equal(remaining.rows.length, 0);
  });

  await t.test("passkey credentials retain an indexed lookup", async () => {
    const result = await pool.query(`SELECT indexname FROM pg_indexes
      WHERE schemaname='public' AND tablename='passkeys' AND indexdef LIKE '%credential_id%'`);
    assert.ok(result.rows.length > 0);
  });

  await t.test("actual email OTP and a fixture phone proof activate the same canonical member without external delivery", async () => {
    const email = `canonical-otp-${randomUUID()}@fixture.invalid`;
    emails.add(email);
    const sent = await auth.handler(request("/email-otp/send-verification-otp", { email, type: "sign-in" }));
    assert.equal(sent.status, 200);
    const notification = deliveries.find((delivery) => delivery.email === email && delivery.type === "email-otp");
    assert.ok(notification?.type === "email-otp", "The injected memory delivery must receive the OTP");
    assert.match(notification.otp, /^[A-Z0-9]{6}$/);

    const stored = await pool.query<{ value: string }>(`SELECT value FROM public.verifications
      WHERE identifier LIKE $1 ORDER BY created_at DESC LIMIT 1`, [`%${email}%`]);
    assert.equal(stored.rows.length, 1);
    const [hash, attempts] = stored.rows[0].value.split(":");
    assert.ok(hash.length >= 32);
    assert.equal(attempts, "0");
    assert.equal(stored.rows[0].value.includes(notification.otp), false);

    const wrong = notification.otp === "000000" ? "111111" : "000000";
    const rejected = await auth.handler(request("/sign-in/email-otp", { email, otp: wrong }));
    assert.equal(rejected.ok, false);
    assert.equal(rejected.headers.getSetCookie().some((cookie) => cookie.includes("session_token=")), false);

    const accepted = await auth.handler(request("/sign-in/email-otp", { email, otp: notification.otp.toLowerCase() }));
    assert.equal(accepted.status, 200);
    const setCookies = accepted.headers.getSetCookie();
    assert.ok(setCookies.some((cookie) => cookie.includes("session_token=") && /HttpOnly/i.test(cookie)));
    const cookie = setCookies.map((value) => value.split(";")[0]).join("; ");
    const sessionRequest = request("/get-session", undefined, cookie);
    const session = await auth.api.getSession({ headers: sessionRequest.headers, query: { disableCookieCache: true } });
    assert.ok(session);
    userIds.add(session.user.id);
    assert.equal(session.user.email, email);
    assert.equal(session.user.emailVerified, true);
    assert.ok(Number.isFinite(new Date(session.session.createdAt).getTime()),
      "Canonical sessions must expose an authoritative freshness timestamp");

    const principal = await runtime.toMemberPrincipal(sessionRequest);
    assert.ok(principal);
    assert.equal(principal.userId, session.user.id);
    assert.equal(principal.sessionId, session.session.id);
    assert.deepEqual(await runtime.service.status(principal), {
      authenticated: true,
      emailVerified: true,
      phoneBound: false,
      member: false,
    });
    const [{ GET }, { getPayloadMemberRuntime }] = await Promise.all([
      import("../../app/api/member/status/route"),
      import("../../lib/member-auth/payload-runtime"),
    ]);
    routePool = getPayloadMemberRuntime()?.pool;
    // Browsers normally omit Origin on same-origin GET requests.
    const statusResponse = await GET(new Request(`${origin}/api/member/status`, {
      headers: { cookie, host: new URL(origin).host },
    }));
    assert.equal(statusResponse.status, 200);
    const status = await statusResponse.json();
    assert.equal(status.success, true);
    assert.equal(status.data.authenticated, true);
    assert.equal(status.data.emailVerified, true);
    assert.equal(status.data.phoneBound, false);
    assert.equal(status.data.member, false);

    // This is an explicitly test-owned verified proof, not a carrier/receiver test.
    const active = getPayloadMemberRuntime();
    assert.ok(active);
    assert.equal(active.config.origin, origin);
    const [{ digest: hashVerificationValue, normalizePhone, proofToken }, { SESSION_COOKIE }, { POST }] =
      await Promise.all([
        import("../../lib/phone-verification/server/crypto"),
        import("../../lib/phone-verification/server/http"),
        import("../../app/api/phone-verification/bind/route"),
      ]);
    const phone = `010${(randomBytes(4).readUInt32BE() % 100_000_000).toString().padStart(8, "0")}`;
    const challengeId = randomUUID();
    const browserToken = randomBytes(32).toString("base64url");
    const verificationSecret = active.config.verificationSecret;
    const sessionHash = hashVerificationValue(verificationSecret, "session", browserToken);
    const phoneHash = hashVerificationValue(verificationSecret, "phone", normalizePhone(phone));
    const proof = proofToken(verificationSecret, challengeId, sessionHash);
    const createdAt = new Date();
    assert.ok(createdAt.getTime() >= new Date(session.session.createdAt).getTime());
    challengeIds.add(challengeId);
    bindLimitKeys.add(hashVerificationValue(verificationSecret, "member-bind-rate", session.user.id));
    await pool.query(`INSERT INTO phone_verification.challenges
      (id,session_hash,phone_hash,token_hash,proof_hash,state,created_at,expires_at,policy_version)
      VALUES ($1,$2,$3,$4,$5,'verified',$6,$7,'local-skt-zoho-arc-v1')`, [
      challengeId,
      sessionHash,
      phoneHash,
      hashVerificationValue(verificationSecret, "challenge", randomBytes(32).toString("base64url")),
      hashVerificationValue(verificationSecret, "proof", proof),
      createdAt,
      new Date(createdAt.getTime() + 60_000),
    ]);
    const bindingRequest = () => new Request(`${origin}/api/phone-verification/bind`, {
      method: "POST",
      headers: {
        origin,
        host: new URL(origin).host,
        "content-type": "application/json",
        cookie: `${cookie}; ${SESSION_COOKIE}=${browserToken}`,
      },
      body: JSON.stringify({ challengeId, phone }),
    });
    const boundResponse = await POST(bindingRequest());
    assert.equal(boundResponse.status, 200);
    const boundText = await boundResponse.text();
    assert.deepEqual(JSON.parse(boundText), { success: true, data: { phoneBound: true, member: true } });
    for (const privateValue of [phone, browserToken, proof, challengeId]) {
      assert.equal(boundText.includes(privateValue), false);
    }
    const binding = await pool.query(`SELECT b.user_id,c.state FROM canonical_member.phone_bindings b
      JOIN phone_verification.challenges c ON c.id=b.challenge_id
      WHERE b.user_id=$1 AND c.id=$2`, [session.user.id, challengeId]);
    assert.deepEqual(binding.rows, [{ user_id: session.user.id, state: "consumed" }]);

    const identicalRetry = await POST(bindingRequest());
    assert.equal(identicalRetry.status, 200);
    assert.equal(await identicalRetry.text(), boundText);
    const bindingCount = await pool.query(`SELECT count(*)::int AS count
      FROM canonical_member.phone_bindings WHERE user_id=$1`, [session.user.id]);
    assert.equal(bindingCount.rows[0].count, 1);

    const memberResponse = await GET(new Request(`${origin}/api/member/status`, {
      headers: { cookie, host: new URL(origin).host },
    }));
    assert.equal(memberResponse.status, 200);
    const memberText = await memberResponse.text();
    const memberStatus = JSON.parse(memberText);
    assert.equal(memberStatus.success, true);
    assert.equal(memberStatus.data.authenticated, true);
    assert.equal(memberStatus.data.emailVerified, true);
    assert.equal(memberStatus.data.phoneBound, true);
    assert.equal(memberStatus.data.member, true);
    for (const privateValue of [phone, browserToken, proof, challengeId]) {
      assert.equal(memberText.includes(privateValue), false);
    }

    const replay = await auth.handler(request("/sign-in/email-otp", { email, otp: notification.otp }));
    assert.equal(replay.ok, false);
    assert.equal(replay.headers.getSetCookie().some((value) => value.includes("session_token=")), false);
  });

  await t.test("actual verified-domain OTP enrolls one least-privilege staff account without activating membership", async () => {
    const email = `${randomUUID()}@sophomores.co`;
    emails.add(email);
    const user = await payload.create({
      collection: "users",
      overrideAccess: true,
      data: {
        name: "Staff OTP Fixture",
        email,
        emailVerified: false,
        localePreference: "en",
        membershipStatus: "applicant",
      },
    });
    userIds.add(user.id);
    const beforeVerification = await payload.find({
      collection: "admins",
      overrideAccess: true,
      where: { email: { equals: email } },
      limit: 2,
      depth: 0,
    });
    assert.equal(beforeVerification.totalDocs, 0);

    const sent = await auth.handler(request("/email-otp/send-verification-otp", { email, type: "sign-in" }));
    assert.equal(sent.status, 200);
    const notification = deliveries.find((delivery) => delivery.email === email && delivery.type === "email-otp");
    assert.ok(notification?.type === "email-otp");
    const accepted = await auth.handler(request("/sign-in/email-otp", { email, otp: notification.otp }));
    assert.equal(accepted.status, 200);
    const staffCookie = accepted.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    const headers = new Headers({ cookie: staffCookie });
    const session = await payload.betterAuth.api.getSession({
      headers,
      query: { disableCookieCache: true },
    });
    assert.ok(session);
    assert.equal(session.user.id, user.id);
    assert.equal(session.user.emailVerified, true);

    // Exercise Payload's registered strategy chain, not a mocked staff session.
    const bridged = await payload.auth({ headers });
    assert.equal(bridged.user?.collection, "admins");
    assert.equal(bridged.user?.role, "staff");
    const repeatedBridge = await payload.auth({ headers });
    assert.equal(repeatedBridge.user?.id, bridged.user?.id);
    const admins = await payload.find({
      collection: "admins",
      overrideAccess: true,
      where: { email: { equals: email } },
      limit: 2,
      depth: 0,
    });
    assert.equal(admins.totalDocs, 1);
    assert.equal(admins.docs[0].role, "staff");
    assert.equal(admins.docs[0].id, bridged.user?.id);

    const principal = await runtime.toMemberPrincipal(request("/get-session", undefined, staffCookie));
    assert.ok(principal);
    assert.deepEqual(await runtime.service.status(principal), {
      authenticated: true,
      emailVerified: true,
      phoneBound: false,
      member: false,
    });

    // An old signed session must lose its CMS bridge if email verification is revoked.
    await pool.query("UPDATE public.users SET email_verified=false WHERE id=$1", [user.id]);
    const revokedBridge = await payload.auth({ headers });
    assert.notEqual(revokedBridge.user?.collection, "admins");
  });
});
