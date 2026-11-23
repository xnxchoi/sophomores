import "next/dist/server/node-environment-baseline";

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createCipheriv, randomUUID } from "node:crypto";
import { registerHooks } from "node:module";
import type { TestContext } from "node:test";
import { createAuthEndpoint } from "better-auth/api";
import { getPayload } from "payload";
import type { PostgresAdapter } from "@payloadcms/db-postgres";
import { Pool } from "pg";
import { migrations } from "@/payload/migrations";
import { tapCookie } from "@/lib/nfc/tap-entry";
import { computeAesSdmMac } from "@/lib/nfc/sun-verifier";
import { loadNfcEpochKeys, nfcFingerprint } from "@/lib/nfc/storage-keys";
import { capturePayloadTestLifecycle } from "../support/payload-lifecycle";
import { dispatchTap } from "./next-tap-dispatch";

/** A second database on the existing test-owned container; no live .env or providers. */
export async function proveColdNfcInspection(t: TestContext, control: Pool, base: string) {
  const database = new URL(base);
  database.pathname = "/nfc_cold_tap";
  await control.query("CREATE DATABASE nfc_cold_tap");
  const db = new Pool({ connectionString: database.href });
  t.after(async () => { await db.end(); });
  const env = {
    DATABASE_URI: database.href, PAYLOAD_SECRET: randomUUID() + randomUUID(),
    BETTER_AUTH_SECRET: randomUUID() + randomUUID(), NEXT_PUBLIC_SERVER_URL: "https://sophomores.co",
    NFC_TAP_ENABLED: "1", NFC_TAP_FINGERPRINT_SECRET: Buffer.alloc(32, 6).toString("base64url"),
    NFC_TAP_KEY_FIXTURE_META: Buffer.alloc(16, 11).toString("hex"),
    NFC_TAP_KEY_FIXTURE_MAC: Buffer.alloc(16, 12).toString("hex"),
    MEMBER_AUTH_MODE: "production", MEMBER_AUTH_ORIGIN: "https://sophomores.co",
    PHONE_VERIFICATION_MODE: "production", PHONE_VERIFICATION_ORIGIN: "https://sophomores.co",
    PHONE_VERIFICATION_DATABASE_URL: database.href, PHONE_VERIFICATION_STATE_SECRET: Buffer.alloc(32, 13).toString("hex"),
    PHONE_VERIFICATION_ZOHO_WEBHOOK_SECRET: randomUUID(),
    PHONE_VERIFICATION_RECIPIENT: "fixture@fixture.invalid",
    PHONE_VERIFICATION_ZOHO_ACCOUNT_ID: "1", PHONE_VERIFICATION_ZOHO_USER_ID: "2",
    PHONE_VERIFICATION_ZOHO_INTEGRATION_ID: "3", PORTONE_PAYMENT_MODE: "disabled",
  };
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const hook = registerHooks({
    resolve: (specifier, context, nextResolve) => {
      const file = specifier === "server-only" ? "../fixtures/team/server-only.ts"
        : null;
      return file ? { url: new URL(file, import.meta.url).href, shortCircuit: true } : nextResolve(specifier, context);
    },
  });
  t.after(() => hook.deregister());
  const route = await import("@/app/(nfc)/nfc/[ref]/route");
  const { configuredTapSecrets, inspectTapHandoff } = await import("@/lib/nfc/tap-entry-runtime");
  const { default: config } = await import("@payload-config");
  // Boot the migration client with onInit disabled; the route's own cold
  // inspection client must initialize Auth without booting the normal writer.
  const migrate = await getPayload({ key: "nfc-cold-migration-fixture", config, disableOnInit: true });
  const closeMigrate = capturePayloadTestLifecycle(migrate);
  const adapter = migrate.db as unknown as PostgresAdapter;
  try {
    // The generic Payload type erases the registered PostgreSQL migration args.
    type RegisteredMigrations = NonNullable<Parameters<typeof migrate.db.migrate>[0]>["migrations"];
    await migrate.db.migrate({ migrations: migrations as unknown as RegisteredMigrations });
    const { pushSchema } = adapter.requireDrizzleKit();
    // Compare only this table, without applying the dev push or touching other schemas.
    const handoff = await pushSchema({ nfc_tap_handoffs: adapter.tables.nfc_tap_handoffs },
      adapter.drizzle, ["public"], ["nfc_tap_handoffs"]);
    assert.equal(handoff.hasDataLoss, false);
    assert.deepEqual(handoff.warnings, []);
    const statements: unknown = Reflect.get(handoff, "statementsToExecute");
    assert.ok(Array.isArray(statements));
    // Drizzle introspects public sequences even with a single-table filter.
    assert.deepEqual(statements.filter(statement => String(statement).includes("nfc_tap_handoffs")), []);
    console.log("NFC handoff table: no table, index or constraint changes proposed by dev push (not applied).");
  } finally { await closeMigrate(); }

  const buyer = randomUUID();
  await db.query("INSERT INTO users (id, email, name, email_verified, membership_status) VALUES ($1,$2,$3,true,'approved')",
    [buyer, "tap-buyer@fixture.invalid", "Fixture name"]);
  const fresh = randomUUID();
  const aged = randomUUID();
  const expired = randomUUID();
  for (const [token, age, remaining] of [[fresh, 0, 7], [aged, 3, 4], [expired, 8, -1]] as const) {
    await db.query(`INSERT INTO sessions (id, user_id, token, expires_at, created_at, updated_at)
      VALUES ($1, $2, $3, now() + $4 * interval '1 day', now() - $5 * interval '1 day', now() - $5 * interval '1 day')`,
      [randomUUID(), buyer, token, remaining, age]);
  }
  const ref = Buffer.alloc(16, 19).toString("base64url");
  const uid = Buffer.alloc(7, 14);
  const card = randomUUID();
  const secrets = configuredTapSecrets(env);
  assert.ok(secrets);
  const metaRef = "NFC_TAP_KEY_FIXTURE_META";
  const macRef = "NFC_TAP_KEY_FIXTURE_MAC";
  const keys = await loadNfcEpochKeys(secrets, metaRef, macRef);
  assert.ok(keys);
  await db.query("INSERT INTO nfc_cards (id, ref, uid_fingerprint, status, member_id) VALUES ($1,$2,$3,'active',$4)",
    [card, ref, nfcFingerprint(secrets, "uid", uid), buyer]);
  await db.query(`INSERT INTO nfc_card_epochs (id, card_id, status, profile, meta_key_ref, mac_key_ref, meta_fingerprint, mac_fingerprint)
    VALUES ($1,$2,'active','aes-sun-v1',$3,$4,$5,$6)`, [randomUUID(), card, metaRef, macRef, keys.metaFingerprint, keys.macFingerprint]);
  const clean = `https://sophomores.co/nfc/${ref}`;
  const urlFor = (counter: number) => {
    const plain = Buffer.alloc(16);
    plain[0] = 0xc7;
    uid.copy(plain, 1);
    plain.writeUIntLE(counter, 8, 3);
    const cipher = createCipheriv("aes-128-cbc", keys.metaReadKey, Buffer.alloc(16)).setAutoPadding(false);
    const picc = Buffer.concat([cipher.update(plain), cipher.final()]).toString("hex").toUpperCase();
    const mac = computeAesSdmMac(keys.fileReadKey, { counter, uid }, Buffer.from(`${picc}&cmac=`));
    return `${clean}?picc=${picc}&cmac=${mac.toString("hex").toUpperCase()}`;
  };
  const snapshot = async () => (await db.query(`SELECT
    (SELECT jsonb_agg(to_jsonb(u) ORDER BY id) FROM users u)::text AS users,
    (SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM sessions s)::text AS sessions,
    (SELECT jsonb_agg(to_jsonb(c) ORDER BY id) FROM nfc_cards c)::text AS cards,
    (SELECT jsonb_agg(to_jsonb(e) ORDER BY id) FROM nfc_card_epochs e)::text AS epochs,
    (SELECT count(*)::int FROM nfc_member_welcome) AS welcomes,
    (SELECT count(*)::int FROM home_page) AS home,
    (SELECT count(*)::int FROM site_editorial) AS editorial`)).rows[0];
  const before = await snapshot();
  const url = urlFor(1);
  const send = dispatchTap(() => route, ref, url);
  const get = (cookie?: string, target = url) => send("GET", { host: "sophomores.co", ...(cookie ? { cookie } : {}) }, target);
  const countHandoffs = async () =>
    (await db.query("SELECT count(*)::int FROM nfc_tap_handoffs")).rows[0].count;
  const missing = await get();
  const { getNfcPayload } = await import("@/payload");
  const { auth, payload } = await getNfcPayload(true);
  t.after(capturePayloadTestLifecycle(payload));
  const { payload: writer } = await getNfcPayload(false);
  t.after(capturePayloadTestLifecycle(writer));
  assert.equal(missing.headers.get("location"), "/nfc/confirm/signed-out");
  assert.equal(missing.headers.has("set-cookie"), false);
  assert.equal(await countHandoffs(), 0);
  const authContext = await auth.$context;
  const sign = createAuthEndpoint.serverOnly({ method: "GET" }, async ctx => ctx.setSignedCookie(
    authContext.authCookies.sessionToken.name, ctx.headers!.get("fixture-token")!, authContext.secret, { path: "/" },
  ));
  const signedCookie = async (token: string) =>
    (await sign({ headers: new Headers({ "fixture-token": token }), context: authContext })).split(";")[0];
  const ready = async (response: Response, cookie: string) => {
    assert.equal(response.status, 303);
    assert.equal(await response.text(), "");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    const location = response.headers.get("location")!;
    assert.match(location, /^\/nfc\/confirm\/[A-Za-z0-9_-]{21}[AQgw]$/);
    const line = response.headers.get("set-cookie")!;
    assert.match(line, /; Secure/i);
    assert.match(line, /; HttpOnly/i);
    assert.match(line, /; SameSite=lax/i);
    assert.match(line, /; Max-Age=120/i);
    const binding = line.match(new RegExp("^" + tapCookie + "=([^;]+)"))![1];
    const id = location.split("/").at(-1)!;
    const view = await inspectTapHandoff(id, new Headers({ cookie }), binding);
    assert.ok("confirmation" in view);
    assert.equal(view.confirmation, id);
    assert.equal(await countHandoffs(), 1);
    return { id, binding, view };
  };
  for (const token of [expired, "tampered"]) {
    const cookie = await signedCookie(token === "tampered" ? fresh : token);
    const response = await get(token === "tampered" ? cookie.replace(fresh, randomUUID()) : cookie);
    assert.equal(response.headers.get("location"), "/nfc/confirm/signed-out");
    assert.equal(response.headers.has("set-cookie"), false);
    assert.equal(await countHandoffs(), 0);
    assert.deepEqual(await snapshot(), before);
  }
  const readOnly = await payload.db.pool.query("SHOW default_transaction_read_only");
  assert.equal(readOnly.rows[0].default_transaction_read_only, "on");
  const cookie = await signedCookie(fresh);
  assert.equal((await send("GET", { cookie, "sec-purpose": "prefetch" })).status, 204);
  assert.equal(await countHandoffs(), 0);
  const agedCookie = await signedCookie(aged);
  const expiredHandoff = await ready(await get(agedCookie), agedCookie);
  const post = (id: string, binding?: string, origin = new URL(clean).origin, session = cookie) =>
    send("POST", { host: "sophomores.co", cookie: session + (binding ? `; ${tapCookie}=${binding}` : ""),
      "content-type": "application/x-www-form-urlencoded", origin }, clean, "confirmation=" + id);
  const assertRedirect = (response: Response, target: string) => {
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), target);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.equal(response.headers.has("set-cookie"), false);
  };
  const cleanup = await readFile(new URL("../../deployment/ops/nfc-handoff-cleanup.sql", import.meta.url), "utf8");
  await db.query(cleanup);
  assert.equal(await countHandoffs(), 1, "cleanup cannot remove a live handoff");
  await db.query("UPDATE nfc_tap_handoffs SET expires_at=clock_timestamp()-interval '1 second'");
  assert.deepEqual(await inspectTapHandoff(expiredHandoff.id, new Headers({ cookie }), expiredHandoff.binding), { state: "stale" });
  assertRedirect(await post(expiredHandoff.id, expiredHandoff.binding), "/nfc/confirm/stale");
  await db.query(cleanup);
  assert.equal(await countHandoffs(), 0, "cleanup removes the expired row");

  const first = await ready(await get(cookie), cookie);
  assert.equal(first.view.state, "ready");
  const stockRef = Buffer.alloc(16, 45).toString("base64url");
  const stockUrl = url.replace(ref, stockRef);
  await db.query("INSERT INTO nfc_cards (id, ref, uid_fingerprint, status) VALUES ($1,$2,$3,'stock')",
    [randomUUID(), stockRef, Buffer.alloc(32, 47).toString("hex")]);
  const stock = await get(cookie, stockUrl);
  // A different valid member with an authentic proof for the active card sees the same result as stock.
  const foreign = randomUUID();
  const foreignToken = randomUUID();
  await db.query("INSERT INTO users (id,email,name,email_verified,membership_status) VALUES ($1,$2,'Fixture',true,'approved')",
    [foreign, "foreign@fixture.invalid"]);
  await db.query("INSERT INTO sessions (id,user_id,token,expires_at) VALUES ($1,$2,$3,now()+interval '1 day')",
    [randomUUID(), foreign, foreignToken]);
  const foreignResponse = await get(await signedCookie(foreignToken));
  assertRedirect(stock, "/nfc/confirm/unavailable");
  assertRedirect(foreignResponse, "/nfc/confirm/unavailable");
  assert.equal(await stock.text(), await foreignResponse.text());
  await db.query("DELETE FROM nfc_cards WHERE ref=$1", [stockRef]);
  await db.query("DELETE FROM sessions WHERE user_id=$1", [foreign]);
  await db.query("DELETE FROM users WHERE id=$1", [foreign]);
  assert.deepEqual(await snapshot(), before);

  assertRedirect(await post(first.id, first.binding, "https://fixture.invalid"), "/nfc/confirm/stale");
  assertRedirect(await post(first.id), "/nfc/confirm/stale");
  assertRedirect(await post(first.id, first.binding, new URL(clean).origin, await signedCookie(expired)), "/nfc/confirm/stale");
  assertRedirect(await post(first.id, expiredHandoff.binding), "/nfc/confirm/stale");
  assert.equal(await countHandoffs(), 1);
  assert.deepEqual(await snapshot(), before);

  // Both requests contend on the same row. Exactly one gets Welcome.
  const race = await Promise.all([post(first.id, first.binding), post(first.id, first.binding)]);
  assert.deepEqual(race.map(response => response.headers.get("location")).sort(), ["/nfc/confirm/stale", "/welcome"]);
  assert.equal(await countHandoffs(), 0);
  const afterFirst = await snapshot();
  assert.equal(afterFirst.welcomes, 1);
  assert.equal(afterFirst.sessions, before.sessions);
  assert.equal(afterFirst.users, before.users);
  assertRedirect(await get(cookie), "/nfc/confirm/stale");
  const later = await ready(await get(cookie, urlFor(2)), cookie);
  assert.equal(later.view.state, "already-linked");
  assertRedirect(await post(later.id, later.binding), "/me/settings/account");
  assert.equal((await snapshot()).welcomes, 1);
  assert.equal((await db.query("SELECT last_read_counter::int AS counter FROM nfc_card_epochs")).rows[0].counter, 2);
}
