import assert from "node:assert/strict";
import { createCipheriv, randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { postgresAdapter, type PostgresAdapter, sql } from "@payloadcms/db-postgres";
import { buildConfig, createLocalReq, getPayload } from "payload";
import { Pool } from "pg";
import { nfcCollections } from "../../src/payload/collections/nfc";
import * as handoffMigration from "../../src/payload/migrations/20261123_030000_nfc_tap_handoffs";
import * as migration from "../../src/payload/migrations/20261122_153000_nfc_storage";
import { capturePayloadTestLifecycle } from "../support/payload-lifecycle";
import { isolateTransport } from "../commerce/core/payment-postgres-fixture";
import { consumeNfcTap, resolveNfcTap } from "../../src/lib/nfc/storage";
import { changeNfcBinding, registerNfcEpoch } from "../../src/lib/nfc/storage-commands";
import { computeAesSdmMac } from "../../src/lib/nfc/sun-verifier";
import { consumeNfcHandoff, inspectNfcTap, persistNfcHandoff } from "../../src/lib/nfc/storage";
import { handleTapPost } from "../../src/lib/nfc/tap-entry";
import { proveColdNfcInspection } from "./cold-tap-fixture";
import { resolveEditionRule } from "../../src/lib/commerce/edition-rules";
import { nativePurchaseSnapshotHash, projectNativeEditionReceipt } from "../../src/lib/commerce/native-edition-receipt";
import type { MemberPrincipal } from "../../src/lib/member-auth/contracts";

const name = "sphmrs-nfc-storage-20261122";
const port = 55516;
const database = "nfc_storage_proof";
const url = `postgres://postgres@127.0.0.1:${port}/${database}`;

test("NFC storage: real migrated Payload/Postgres, synthetic keys", {
  skip: process.env.NFC_STORAGE_DATABASE_TESTS !== "1", timeout: 90_000,
}, async (t) => {
  const [container] = JSON.parse(execFileSync("docker", ["inspect", name], { encoding: "utf8" }));
  assert.equal(container.State.Running, true);
  assert.match(container.Config.Labels["sphmrs.database-proof.run"], /^[0-9a-f-]{36}$/);
  assert.deepEqual(container.HostConfig.PortBindings, { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: String(port) }] });
  assert.ok(container.Config.Env.includes(`POSTGRES_DB=${database}`));
  assert.equal(container.HostConfig.Memory, 384 * 1024 * 1024);
  assert.ok(container.Mounts.some((m: { Name: string }) => m.Name === `${name}-data`));
  isolateTransport(t, port);
  const poolOptions = { connectionString: url, max: 8, options: "-c statement_timeout=10000 -c lock_timeout=8000" };
  const payload = await getPayload({ key: randomUUID(), config: buildConfig({
    secret: randomUUID(), telemetry: false, admin: { disable: true, user: "admins" },
    typescript: { autoGenerate: false },
    db: postgresAdapter({ pool: poolOptions, idType: "uuid", push: false }),
    collections: [{ slug: "users", fields: [] }, { slug: "admins", auth: true, fields: [] }, ...nfcCollections],
  }) });
  const close = capturePayloadTestLifecycle(payload);
  const control = new Pool(poolOptions);
  t.after(async () => { try { await close(); } finally { await control.end(); } });

  const { drizzle } = payload.db as unknown as PostgresAdapter;
  const [member, foreign, actor] = [randomUUID(), randomUUID(), randomUUID()];
  await drizzle.execute(sql`CREATE TABLE users (id uuid PRIMARY KEY, email_verified boolean NOT NULL DEFAULT true, membership_status text NOT NULL DEFAULT 'approved'); CREATE TABLE admins (id uuid PRIMARY KEY)`);
  await drizzle.execute(sql`INSERT INTO users (id) VALUES (${member}), (${foreign})`);
  await drizzle.execute(sql`INSERT INTO admins VALUES (${actor})`);
  const migrate = (action: typeof migration.up) =>
    drizzle.transaction(async (db) => action({ db, payload, req: await createLocalReq({}, payload) }));
  await migrate(migration.up);
  await migrate(migration.down);
  assert.equal((await control.query("SELECT to_regclass('nfc_cards') AS cards")).rows[0].cards, null);
  assert.equal((await control.query("SELECT COUNT(*)::int AS count FROM users")).rows[0].count, 2);
  await migrate(migration.up);

  await migrate(handoffMigration.up);
  await migrate(handoffMigration.down);
  await migrate(handoffMigration.up);

  const principal = (userId = member): MemberPrincipal => ({ userId, emailVerified: true, sessionCreatedAt: new Date() });
  const local = () => createLocalReq({}, payload);
  const staff = (role: "admin" | "staff" = "admin") => {
    const user = { id: actor, collection: "admins" as const, role, _strategy: "staff-better-auth",
      email: "issuer@fixture.invalid", name: "Issuer fixture",
      updatedAt: "2026-11-22T00:00:00Z", createdAt: "2026-11-22T00:00:00Z" };
    return createLocalReq({ user }, payload);
  };
  const keys = new Map<string, Buffer>();
  const secrets = { fingerprintSecret: Buffer.alloc(32, 0xdf), readVerifierKey: async (key: string) => keys.get(key) ?? null };
  const make = (n: number) => {
    const ref = Buffer.alloc(16, n).toString("base64url");
    const uid = Buffer.alloc(7, n);
    const metaKeyRef = `key-${n}-meta`;
    const macKeyRef = `key-${n}-mac`;
    keys.set(metaKeyRef, Buffer.alloc(16, n));
    keys.set(macKeyRef, Buffer.alloc(16, n + 100));
    return { ref, uid, metaKeyRef, macKeyRef };
  };
  type Provision = ReturnType<typeof make>;
  const uri = (tag: Provision, counter: number) => {
    const plaintext = Buffer.alloc(16);
    plaintext[0] = 0xc7;
    tag.uid.copy(plaintext, 1);
    plaintext.writeUIntLE(counter, 8, 3);
    const cipher = createCipheriv("aes-128-cbc", keys.get(tag.metaKeyRef)!, Buffer.alloc(16)).setAutoPadding(false);
    const picc = Buffer.concat([cipher.update(plaintext), cipher.final()]).toString("hex").toUpperCase();
    const mac = computeAesSdmMac(keys.get(tag.macKeyRef)!, { counter, uid: tag.uid }, Buffer.from(`${picc}&cmac=`));
    return `https://sophomores.co/nfc/${tag.ref}?picc=${picc}&cmac=${mac.toString("hex").toUpperCase()}`;
  };
  const resolve = async (tag: Provision, n: number, user = member) => resolveNfcTap(await local(), principal(user), uri(tag, n), secrets);
  const proof = async (tag: Provision, n: number) => {
    const token = await resolve(tag, n);
    assert.ok(token);
    return token;
  };
  const spend = async (token: Awaited<ReturnType<typeof proof>>) => consumeNfcTap(await local(), principal(), token);
  const active = async (tag: Provision) => (await control.query(
    "SELECT e.id, e.last_read_counter::int AS counter FROM nfc_card_epochs e JOIN nfc_cards c ON c.id=e.card_id WHERE c.ref=$1 AND e.status='active'",
    [tag.ref],
  )).rows[0] as { id: string; counter: number | null };
  const counts = async () => (await control.query(`SELECT
      (SELECT count(*)::int FROM users) AS members,
      (SELECT count(*)::int FROM nfc_cards) AS cards,
      (SELECT count(*)::int FROM nfc_card_epochs) AS epochs,
      (SELECT count(*)::int FROM nfc_member_welcome) AS markers,
      (SELECT count(*)::int FROM nfc_card_events) AS events`)).rows[0];
  const eligible = async () => true;
  const tag = make(1);
  const replacement = make(2);

  await t.test("registration, issuer restrictions and physical identity constraints", async () => {
    assert.equal(await registerNfcEpoch(await staff("staff"), tag, secrets), false);
    assert.equal(await registerNfcEpoch(await staff(), tag, secrets), true);
    assert.equal(await registerNfcEpoch(await staff(), replacement, secrets), true);
    const { ref } = tag;
    assert.equal(await changeNfcBinding(await staff(), { ref, member, command: "issue" }, async () => false), false);
    assert.equal(await changeNfcBinding(await staff(), { ref, member, command: "issue" }, eligible), true);
    assert.equal(await changeNfcBinding(await staff(), { ref: replacement.ref, member, command: "issue" }, eligible), false);
    await assert.rejects(control.query("UPDATE nfc_cards SET status='active', member_id=$1 WHERE ref=$2", [member, replacement.ref]), { code: "23505" });
    await assert.rejects(control.query("UPDATE nfc_card_epochs SET last_read_counter=1.5"), { code: "23514" });
    assert.equal(await resolve(tag, 1, foreign), null);
    const req = await staff();
    await assert.rejects(payload.find({ collection: "nfc-cards", req, overrideAccess: false }), { status: 403 });
    await assert.rejects(payload.create({ collection: "nfc-cards", req, overrideAccess: true,
      data: { status: "stock", ref: Buffer.alloc(16, 19).toString("base64url"), uidFingerprint: "fixture" } }), { status: 403 });
    const event = (await control.query("SELECT id FROM nfc_card_events WHERE action='issue'")).rows[0].id;
    await assert.rejects(payload.update({ collection: "nfc-card-events", id: event, req, overrideAccess: true,
      data: { reason: "lost" } }), { status: 403 });
    await assert.rejects(payload.delete({ collection: "nfc-card-events", id: event, req, overrideAccess: true }), { status: 403 });
    assert.deepEqual(await counts(), { members: 2, cards: 2, epochs: 2, markers: 0, events: 3 });
  });

  async function overlap<T>(actions: readonly (() => Promise<T>)[]): Promise<T[]> {
    const blocker = await control.connect();
    const pending: Promise<T>[] = [];
    try {
      await blocker.query("BEGIN");
      await blocker.query("SELECT id FROM nfc_cards WHERE ref=$1 FOR UPDATE", [tag.ref]);
      const waiters = async () => Number((await control.query(`SELECT count(*) FROM pg_stat_activity
        WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT id FROM % FOR UPDATE'`)).rows[0].count);
      for (const action of actions) {
        pending.push(action());
        void pending.at(-1)!.catch(() => {});
        for (let attempt = 0; await waiters() < pending.length; attempt++) {
          assert.ok(attempt < 200, "operations did not block on owning rows");
          await delay(10);
        }
      }
      await blocker.query("COMMIT");
      return await Promise.all(pending);
    } finally {
      await blocker.query("ROLLBACK");
      blocker.release();
      await Promise.allSettled(pending);
    }
  }

  await t.test("same-counter contenders create exactly one welcome; marker failure rolls back spend", async () => {
    const a = await proof(tag, 1);
    const b = await proof(tag, 1);
    await control.query("ALTER TABLE nfc_member_welcome ADD CONSTRAINT fixture_marker_failure CHECK (false)");
    await assert.rejects(spend(a));
    assert.equal((await active(tag)).counter, null);
    assert.equal((await counts()).markers, 0);
    await control.query("ALTER TABLE nfc_member_welcome DROP CONSTRAINT fixture_marker_failure");
    const results = await overlap([() => spend(a), () => spend(b)]);
    assert.equal(results.filter((v) => v === "welcome").length, 1);
    assert.equal(results.filter((v) => v === null).length, 1);
    assert.equal(await spend(a), null);
    assert.equal((await active(tag)).counter, 1);
    assert.deepEqual(await counts(), { members: 2, cards: 2, epochs: 2, markers: 1, events: 3 });
  });

  await t.test("higher-first rejects a stale verified lower proof; lower-first advances twice", async () => {
    const lower = await proof(tag, 2);
    const higher = await proof(tag, 3);
    assert.equal(await spend(higher), "membership");
    assert.equal(await spend(lower), null);
    const nextLow = await proof(tag, 4);
    const nextHigh = await proof(tag, 5);
    assert.equal(await spend(nextLow), "membership");
    assert.equal(await spend(nextHigh), "membership");
    assert.equal((await active(tag)).counter, 5);
    assert.equal((await counts()).markers, 1);
  });

  await t.test("old key and in-flight proof cannot cross rotation; replacement preserves welcome", async () => {
    const old = await active(tag);
    const verified = await proof(tag, 6);
    const unused = uri(tag, 7);
    const rotated = { ...make(3), ref: tag.ref, uid: tag.uid };
    const change = { ref: tag.ref, member, command: "retire-epoch" as const };
    assert.deepEqual(await overlap<boolean | "welcome" | "membership" | null>([
      async () => changeNfcBinding(await staff(), change, eligible),
      () => spend(verified),
    ]), [true, null]);
    assert.equal(await spend(verified), null);
    assert.equal(await registerNfcEpoch(await staff(), { ...rotated, macKeyRef: tag.macKeyRef }, secrets, old.id), false);
    keys.set("retired-role-alias", keys.get(tag.metaKeyRef)!);
    assert.equal(await registerNfcEpoch(await staff(), { ...rotated, macKeyRef: "retired-role-alias" }, secrets, old.id), false);
    assert.equal(await registerNfcEpoch(await staff(), rotated, secrets, old.id), true);
    const fetched: string[] = [];
    const tracked = { ...secrets, readVerifierKey: async (ref: string) => { fetched.push(ref); return keys.get(ref) ?? null; } };
    assert.equal(await resolveNfcTap(await local(), principal(), unused, tracked), null);
    assert.deepEqual(fetched.sort(), [rotated.metaKeyRef, rotated.macKeyRef].sort());
    const previousMac = keys.get(rotated.macKeyRef)!;
    keys.set(rotated.macKeyRef, keys.get(tag.macKeyRef)!);
    assert.equal(await resolveNfcTap(await local(), principal(), uri(rotated, 1), secrets), null);
    keys.set(rotated.macKeyRef, previousMac);
    assert.equal(await spend(verified), null);
    assert.equal(await spend(await proof(rotated, 1)), "membership");
    assert.equal((await active(tag)).counter, 1);
    assert.equal((await control.query("SELECT last_read_counter::int AS counter FROM nfc_card_epochs WHERE id=$1", [old.id])).rows[0].counter, 5);
    assert.deepEqual(await counts(), { members: 2, cards: 2, epochs: 3, markers: 1, events: 5 });

    const token = await proof(rotated, 2);
    const replace = async () => changeNfcBinding(await staff(), {
      ref: tag.ref, member, command: "replace", replacement: replacement.ref, reason: "lost",
    }, eligible);
    await control.query("ALTER TABLE nfc_card_events ADD CONSTRAINT fixture_audit_failure CHECK (action <> 'replace')");
    await assert.rejects(replace());
    await control.query("ALTER TABLE nfc_card_events DROP CONSTRAINT fixture_audit_failure");
    assert.equal((await active(tag)).counter, 1);
    assert.equal(await spend(token), "membership");
    assert.deepEqual(await overlap([replace, replace]), [true, false]);
    assert.equal(await replace(), false);
    assert.equal(await spend(token), null);
    assert.equal(await spend(await proof(replacement, 1)), "membership");
    assert.deepEqual(await counts(), { members: 2, cards: 2, epochs: 3, markers: 1, events: 6 });
  });
  await t.test("fixture buyers: book-only has no benefits; eligible paid order reaches first and later NFC routing", async () => {
    const buyer = randomUUID();
    await control.query("INSERT INTO users (id) VALUES ($1)", [buyer]);
    const stock = make(4);
    const spare = make(5);
    assert.equal(await registerNfcEpoch(await staff(), stock, secrets), true);
    assert.equal(await registerNfcEpoch(await staff(), spare, secrets), true);

    // Commerce authority is a labelled fixture, not a second checkout or grant service.
    // The real receipt projector still validates order ownership, payment and order-rule facts.
    const recorded = (kind: "book-only" | "personal" | "premium", amount: number, release: string) => {
      const rule = resolveEditionRule(kind, amount);
      assert.ok(rule);
      const snapshot = {
        version: 2, kind: "native-edition-v1", customerID: buyer, cartID: "fixture-cart",
        productID: release, releaseID: release, eventID: rule.editionEntitlements.freeLaunchTicket ? "fixture-event" : null,
        productVersion: "r1", variantID: kind, variantVersion: "r1", optionID: kind, variantTypeID: "edition",
        editionLabel: kind, ...rule, termsRevision: "r1", disclosureRevision: "r1", fulfillmentRevision: "r1",
        benefitRevision: "r1", quantity: 1, currency: "KRW", unitAmount: amount, shippingAmount: 0, totalAmount: amount,
        orderName: "Fixture edition",
        shippingAddress: { country: "KR", recipientName: "Fixture", phone: "01012345678",
          postalCode: "12345", addressLine1: "Fixture address" },
      };
      return projectNativeEditionReceipt(buyer, {
        id: "order-" + release, customer: buyer, commerceVersion: "commerce-v1", commerceAttemptID: "payment-" + release,
        commerceSnapshot: snapshot, amount, currency: "KRW", status: "processing", fulfillment: { status: "packed" },
      }, {
        id: "payment-" + release, order: "order-" + release, customer: buyer, status: "succeeded",
        amount, currency: "KRW", nativeSnapshotHash: nativePurchaseSnapshotHash(snapshot),
      });
    };
    const book = recorded("book-only", 35000, "release-book");
    const paid = recorded("personal", 82000, "release-a");
    const repeat = recorded("premium", 329000, "release-b");
    assert.ok(book && paid && repeat);
    assert.deepEqual(book.editionEntitlements, { membershipSignet: false, freeLaunchTicket: false });
    assert.deepEqual(paid.editionEntitlements, { membershipSignet: true, freeLaunchTicket: true });

    const eligibleFor = (order: typeof paid, accepted: boolean) => async (_req: unknown, id: string) =>
      accepted && order.memberID === id && order.editionEntitlements.membershipSignet && order.fulfillmentStatus === "packed";
    const issue = async (ref: string, permitted: ReturnType<typeof eligibleFor>) =>
      changeNfcBinding(await staff(), { ref, member: buyer, command: "issue" }, permitted);
    const hit = async (card: Provision, counter: number, memberChange?: "suspend" | "unverify") => {
      const url = uri(card, counter);
      const path = new URL(url).pathname;
      let sealed: string | undefined;
      let checkedMemberLock = false;
      const inputs = {
        inspect: async () => {
          const read = await inspectNfcTap(await local(), principal(buyer), url, secrets);
          if (!read || read === "stale") return { state: read === "stale" ? "stale" : "unavailable" };
          sealed = randomBytes(16).toString("base64url");
          await persistNfcHandoff(control, read, sealed, "a".repeat(64));
          return { state: "ready", signet: "issued", formRef: card.ref, confirmation: sealed };
        },
        confirm: async (_request: Request, confirmation: string) => {
          const req = await local();
          const spend = () => consumeNfcHandoff(req, principal(buyer), confirmation, "a".repeat(64), card.ref);
          if (!memberChange) return spend();
          const writer = await control.connect();
          let pending: Promise<"welcome" | "membership" | null> | undefined;
          try {
            await writer.query("BEGIN");
            await writer.query(memberChange === "suspend" ?
              "UPDATE users SET membership_status='suspended' WHERE id=$1" :
              "UPDATE users SET email_verified=false WHERE id=$1", [buyer]);
            pending = spend();
            void pending.catch(() => {});
            for (let attempt = 0; ; attempt++) {
              const waiting = await control.query(`SELECT 1 FROM pg_stat_activity
                WHERE datname=current_database() AND wait_event_type='Lock'
                AND query LIKE 'SELECT id FROM users WHERE id = % FOR UPDATE'`);
              if (waiting.rowCount) { checkedMemberLock = true; break; }
              assert.ok(attempt < 200, "confirmation did not contend on the member row");
              await delay(10);
            }
            await writer.query("COMMIT");
            return await pending;
          } finally {
            await writer.query("ROLLBACK");
            writer.release();
            await pending?.catch(() => {});
          }
        },
      };
      const before = await counts();
      const epoch = await active(card);
      const first = await inputs.inspect();
      assert.deepEqual(await counts(), before, "GET does not write");
      assert.deepEqual(await active(card), epoch, "GET does not advance read counter");
      const page = first.state;
      if (!sealed) return page;
      const reply = await handleTapPost(new Request(new URL(path, url), {
        method: "POST", headers: { origin: new URL(url).origin, "content-type": "application/x-www-form-urlencoded" },
        body: "confirmation=" + sealed,
      }), path, inputs.confirm);
      if (memberChange) assert.ok(checkedMemberLock, "database proved contention on the account row");
      return reply.headers.get("location");
    };
    const bookState = await counts();
    assert.equal(await issue(stock.ref, eligibleFor(book, true)), false);
    assert.equal(await hit(stock, 1), "unavailable");
    assert.deepEqual(await counts(), bookState);
    // Fixture authority preserves the earlier token and declines release B; the
    // real cross-release commerce adjudicator is separately owned by Auth.
    assert.equal(await issue(stock.ref, eligibleFor(paid, true)), true);
    assert.equal(await issue(spare.ref, eligibleFor(repeat, false)), false);
    const beforeTap = await counts();
    for (const change of ["suspend", "unverify"] as const) {
      assert.equal(await hit(stock, 1, change), "/nfc/confirm/stale");
      assert.equal((await active(stock)).counter, null);
      assert.deepEqual(await counts(), beforeTap);
      await control.query("UPDATE users SET membership_status='approved', email_verified=true WHERE id=$1", [buyer]);
    }
    assert.equal(await hit(stock, 1), "/welcome");
    assert.equal(await hit(stock, 1), "stale");
    assert.equal(await hit(stock, 2), "/me/settings/account");
    assert.deepEqual(await counts(), { ...beforeTap, markers: beforeTap.markers + 1 });
    assert.equal(await changeNfcBinding(await staff(), {
      ref: stock.ref, member: buyer, command: "replace", replacement: spare.ref, reason: "lost",
    }, eligibleFor(paid, true)), true);
    assert.equal(await hit(stock, 3), "unavailable");
    assert.equal(await hit(spare, 1), "/me/settings/account");
    assert.deepEqual(await counts(), { ...beforeTap, markers: beforeTap.markers + 1, events: beforeTap.events + 1 });
  });
  await t.test("Next Route Module + PostgreSQL: cold handoff GET only writes the ephemeral row", async subtest => {
    await proveColdNfcInspection(subtest, control, url);
  });
});
