import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { request as httpRequest } from "node:http";
import { createServer } from "node:net";
import { test } from "node:test";
import { trialChallengeSchema, trialStatusSchema } from "../../lib/phone-verification/client-contracts";
import account from "../fixtures/customer-auth-design-responses.json";
import catalogue from "../fixtures/ticket-preview-catalogue.json";

test("isolated synthetic ticket fixture requires email and a matching live single-use phone proof", { timeout: 30_000 }, async (t) => {
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const address = reservation.address();
  assert.ok(address && typeof address === "object");
  const port = address.port;
  await new Promise<void>((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
  const origin = "http://127.0.0.1:" + port;
  const child = spawn(process.execPath, ["--import", "tsx", "tests/support/ticket-selection-preview.mjs"], {
    cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"],
    env: { NODE_ENV: "test", TICKET_PREVIEW_PORT: String(port), PATH: process.env.PATH }
  });
  const exited = once(child, "exit");
  t.after(async () => { if (child.exitCode === null) child.kill("SIGTERM"); await exited; });
  await Promise.race([
    new Promise<void>((resolve) => child.stdout.on("data", (chunk) => { if (String(chunk).includes(origin)) resolve(); })),
    exited.then(() => { throw new Error("Synthetic fixture exited before listening."); }),
    new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error("Synthetic fixture did not start.")), 10_000); timer.unref(); })
  ]);
  const request = (path: string, method = "GET", body?: unknown, headers?: Record<string, string>) => fetch(origin + path, {
    method, headers: { Origin: origin, "Content-Type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const reset = async (phoneProof = "verified", member = "anonymous") => {
    assert.equal((await request("/fixture/state", "POST", { member, quote: "ready", delayMs: 0, phoneProof })).status, 200);
  };
  const signIn = () => request("/api/auth/sign-in/email-otp", "POST", { email: account.email, otp: "ABC123" });
  const create = async () => {
    const response = await request("/api/phone-verification/challenges", "POST", { phone: "010-1234-5678" });
    assert.equal(response.status, 200);
    return trialChallengeSchema.parse((await response.json()).data);
  };
  const proof = async (id: string) => {
    const response = await request("/api/phone-verification/challenges/" + id);
    assert.equal(response.status, 200);
    return trialStatusSchema.parse((await response.json()).data);
  };
  const bind = (id: string, phone = "+821012345678") => request("/api/phone-verification/bind", "POST", { challengeId: id, phone });
  const member = async () => (await (await request("/api/member/status")).json()).data.member;

  await t.test("preserves default controls and fails closed without proof", async () => {
    const initial = await (await request("/fixture/state")).json();
    assert.deepEqual(initial, { member: "anonymous", quote: "ready", delayMs: 0, phoneProof: "pending" });
    assert.equal((await bind(account.challenge.id)).status, 400);
    assert.equal(await member(), false);
    assert.equal((await request("/fixture/quote", "POST", { catalogueVersion: catalogue.version, items: [{ ticketTypeId: catalogue.ticketTypes[0].id, quantity: 1 }] })).status, 503);
    assert.equal((await request("/api/auth/sign-in/email-otp", "POST", { email: account.email, otp: "BAD123" })).status, 400);
    assert.equal((await request("/fixture/state", "POST", { member: "anonymous", quote: "short-expiry", delayMs: 2000 })).status, 200);
    assert.deepEqual(await (await request("/fixture/state")).json(), { member: "anonymous", quote: "short-expiry", delayMs: 2000, phoneProof: "pending" });
  });
  await t.test("email→challenge→verified proof→bind→server member→test quote; consumed proof cannot replay", async () => {
    await reset();
    assert.equal((await signIn()).status, 200);
    const challenge = await create();
    assert.equal(challenge.recipient, account.challenge.recipient);
    assert.equal(challenge.body, account.challenge.body);
    assert.ok(Date.parse(challenge.expiresAt) > Date.now());
    assert.equal((await bind(challenge.id)).status, 400, "status proof has not been observed");
    assert.equal((await proof(challenge.id)).state, "verified");
    assert.equal((await bind(challenge.id, "+821087654321")).status, 400);
    assert.equal((await bind("missing-proof")).status, 400);
    const bound = await bind(challenge.id, "010 1234 5678");
    assert.deepEqual(await bound.json(), { success: true, data: { phoneBound: true, member: true } });
    assert.equal(await member(), true);
    assert.equal((await proof(challenge.id)).state, "consumed");
    assert.equal((await bind(challenge.id)).status, 400);
    const response = await request("/fixture/quote", "POST", { catalogueVersion: catalogue.version, items: [{ ticketTypeId: catalogue.ticketTypes[0].id, quantity: 1 }] });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).checkoutAvailable, false);
  });
  await t.test("anonymous, pending, expired, unavailable, cancelled and replaced proofs never activate membership", async () => {
    await reset();
    let challenge = await create();
    await proof(challenge.id);
    assert.equal((await bind(challenge.id)).status, 400);
    for (const variant of ["pending", "expired"]) {
      await reset(variant);
      await signIn();
      challenge = await create();
      assert.equal((await proof(challenge.id)).state, variant);
      assert.equal((await bind(challenge.id)).status, 400);
      assert.equal(await member(), false);
    }
    await reset("receiver-unavailable");
    await signIn();
    const unavailable = await request("/api/phone-verification/challenges", "POST", { phone: "01012345678" });
    assert.equal(unavailable.status, 503);
    assert.equal((await unavailable.json()).error.code, "RECEIVER_UNAVAILABLE");
    await reset();
    await signIn();
    challenge = await create();
    await proof(challenge.id);
    assert.equal((await request("/api/phone-verification/challenges/" + challenge.id, "DELETE")).status, 200);
    assert.equal((await proof(challenge.id)).state, "cancelled");
    assert.equal((await bind(challenge.id)).status, 400);
    const replacement = await create();
    assert.notEqual(replacement.id, challenge.id);
    assert.equal((await bind(challenge.id)).status, 400);
    await proof(replacement.id);
    const current = await create();
    assert.equal((await bind(replacement.id)).status, 400, "a replacement invalidates even a previously verified proof");
    await proof(current.id);
    await request("/api/auth/sign-out", "POST", {});
    assert.equal((await bind(current.id)).status, 400);
    assert.equal(await member(), false);
    await signIn();
    assert.equal((await bind(current.id)).status, 400, "signing in again cannot revive a proof from another auth state");
    await reset();
    await signIn();
    challenge = await create();
    await proof(challenge.id);
    await reset();
    await signIn();
    assert.equal((await bind(challenge.id)).status, 400, "applying visible fixture controls clears all proof authority");
  });
  await t.test("loopback-only routes reject foreign hosts/origins, query flags, unsafe methods, malformed and oversized bodies", async () => {
    await reset();
    const foreignHostStatus = await new Promise<number | undefined>((resolve, reject) => {
      const request = httpRequest(origin + "/fixture/state", { headers: { Host: "example.invalid" } }, (response) => { response.resume(); resolve(response.statusCode); });
      request.on("error", reject);
      request.end();
    });
    assert.equal(foreignHostStatus, 403);
    assert.equal((await request("/fixture/state", "GET", undefined, { Origin: "https://example.invalid" })).status, 403);
    assert.equal((await request("/fixture/state", "GET", undefined, { "Sec-Fetch-Site": "cross-site" })).status, 403);
    assert.equal((await request("/fixture/state?member=member")).status, 400);
    assert.equal((await fetch(origin + "/api/phone-verification/challenges/missing", { method: "DELETE" })).status, 403);
    assert.equal((await fetch(origin + "/api/phone-verification/challenges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: "01012345678" }) })).status, 403);
    for (const [path, method] of [["/api/phone-verification/challenges", "GET"], ["/api/phone-verification/challenges/missing", "POST"], ["/api/phone-verification/bind", "GET"]]) {
      assert.equal((await request(path, method)).status, 405);
    }
    for (const body of [{ phone: "not-a-number" }, { phone: "01012345678", member: true }]) {
      assert.equal((await request("/api/phone-verification/challenges", "POST", body)).status, 400);
    }
    assert.equal((await request("/api/phone-verification/challenges", "POST", { phone: "x".repeat(17_000) })).status, 400);
    assert.equal((await request("/api/phone-verification/challenges", "POST", { phone: "01012345678" }, { "Content-Type": "text/plain" })).status, 400);
    assert.equal((await request("/api/phone-verification/bind", "POST", { challengeId: "../proof", phone: "01012345678" })).status, 400);
    assert.equal((await request("/api/phone-verification/bind", "POST", { challengeId: account.challenge.id, phone: "01012345678", verified: true })).status, 400);
    assert.equal((await fetch(origin + "/api/phone-verification/challenges", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: "{" })).status, 400);
    assert.equal((await request("/api/provider/proxy", "POST", {})).status, 503);
    assert.equal(await member(), false);
  });
});
