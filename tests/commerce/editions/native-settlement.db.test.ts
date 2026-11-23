import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { proofTargets } from "../../support/proof-ports.mjs";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

test("E2: native-edition settlement persists frozen rules and fences Signet per account", {
  skip: process.env.NATIVE_EDITION_DATABASE_TESTS !== "1", timeout: 220_000,
}, async (t) => {
  const target = { container: process.env.NATIVE_EDITION_PROOF_CONTAINER ?? "", runLabel: process.env.NATIVE_EDITION_PROOF_RUN ?? "",
    port: proofTargets.nativeEdition.port, database: proofTargets.nativeEdition.database };
  assert.match(target.container, /^sphmrs-native-edition-[a-f0-9-]{36}$/);
  assert.match(target.runLabel, /^[a-f0-9-]{36}$/);
  const { openProofDatabase, isolateTransport, publishFixtureCatalogue, initiateAttempt, nativeSession,
    providerConfig, seedConfiguredAttempt } = await import("../core/payment-postgres-fixture");
  const { editions, seedMember, seedEvent, seedNativeCart, prepare, settle, settleOne, readResult, orders, effects,
    eventCapacity, eventWriteStamp, corruptVersion } = await import("./native-settlement-fixture");
  const { loadCommerceEditionOffer } = await import("../../../src/lib/commerce/editions");
  const { nativePurchaseSnapshotSchema } = await import("../../../src/lib/commerce/native-edition-receipt");
  const { createLocalReq } = await import("payload");
  const { sql } = await import("@payloadcms/db-postgres");
  const { inCommerceTransaction, inPaymentTransaction } = await import("../../../src/lib/commerce/_shared/transaction");
  const { up, down } = await import("../../../src/payload/migrations/20261122_160100_native_edition_settlement");
  const { down: downTicketTargets } = await import("../../../src/payload/migrations/20261123_040000_event_ticket_targets");
  isolateTransport(t, target.port);
  const { payload, pool, control, close, version } = await openProofDatabase(true, new Set(), target);
  t.after(close);
  t.diagnostic(`PostgreSQL ${version}; hosted payment, Unlock and NFC are stubs per ADR-0033; no issuance`);
  const migrate = async (apply: typeof up) => {
    const req = await createLocalReq({}, payload);
    await inPaymentTransaction(req, async () => apply({ db: await nativeSession(req), payload, req }));
  };
  const editionColumns = () => control.query(`SELECT table_name, column_name, is_nullable
    FROM information_schema.columns WHERE table_schema = 'public' AND (
      (table_name = 'commerce_reservations' AND column_name = 'event_id') OR
      (table_name IN ('carts_items', 'orders_items', 'transactions_items') AND column_name = 'variant_id'))
    ORDER BY table_name, column_name`).then(({ rows }) => rows);
  await t.test("empty DOWN and additive UP round-trip the isolated schema before settlement", async () => {
    const afterPush = await editionColumns();
    assert.equal(afterPush.length, 4);
    assert.ok(afterPush.every(row => row.is_nullable === "YES"));
    await migrate(down);
    assert.deepEqual(await editionColumns(), [
      { table_name: "commerce_reservations", column_name: "event_id", is_nullable: "NO" },
    ]);
    await migrate(up);
    assert.deepEqual(await editionColumns(), afterPush);
  });
  await publishFixtureCatalogue(payload);
  await t.test("legacy payment control settles through the same installed plugin and owned PG fixture", async () => {
    const donor = await initiateAttempt(payload);
    await settleOne(payload, { ...donor, paymentID: donor.transactionID.replaceAll("-", ""), total: 13_000 });
    assert.equal((await orders(control, donor.transactionID)).length, 1);
  });

  const conf = { chainID: 137 as const, lock: "0x" + "b".repeat(40), memberLock: "0x" + "a".repeat(40) };
  async function guestAttempt() {
    const guest = await seedConfiguredAttempt(payload, undefined, conf);
    const { user, customerID, cartID, transactionID, snapshot } = guest;
    return { ...guest, attempt: { user, customerID, cartID, transactionID, paymentID: transactionID.replaceAll("-", ""), total: snapshot.totalAmount } };
  }
  const guestState = (guest: Awaited<ReturnType<typeof guestAttempt>>) => control.query(`SELECT
      t.status, t.order_id, c.purchased_at, p.inventory::int, p.reserved_quantity::int AS product_reserved,
      e.reserved_quantity::int AS event_reserved, e.committed_quantity::int AS event_committed,
      r.state AS reservation_state, r.order_id AS reservation_order, r.ticket_target AS reservation_target,
      a.reserved_quantity::int AS allowance_reserved, a.paid_quantity::int AS allowance_paid, u.membership_status
    FROM transactions t JOIN carts c ON c.id = t.cart_id
    JOIN commerce_reservations r ON r.attempt_i_d = t.id::text
    JOIN users u ON u.id = r.customer_id JOIN products p ON p.id = r.product_id
    JOIN commerce_events e ON e.id = r.event_id
    JOIN commerce_allowances a ON a.customer_id = u.id AND a.release_i_d = $2
    WHERE t.id = $1`, [guest.transactionID, `guest:${guest.eventID}`]).then(({ rows }) => {
    assert.equal(rows.length, 1);
    return rows[0];
  });

  await t.test("Guest settlement pins two buyer-owned admissions and replays without granting membership", async () => {
    const { attempt, ...guest } = await guestAttempt();
    await settleOne(payload, attempt);
    await settleOne(payload, attempt);
    const settled = await orders(control, guest.transactionID);
    assert.equal(settled.length, 1);
    const rows = await control.query(`SELECT a.ticket_tier, a.ticket_target, a.buyer_id, a.claimed_account_id, a.event_account_key,
        k.beneficiary_user_id, k.recipient_mode, k.state, u.membership_status
      FROM commerce_admissions a JOIN commerce_key_grant_intents k ON k.entitlement_id = a.id
      JOIN users u ON a.buyer_id = u.id
      WHERE a.transaction_id = $1 ORDER BY a.unit`, [guest.transactionID]);
    assert.deepEqual(rows.rows, Array.from({ length: 2 }, () => ({
      ticket_tier: "guest", ticket_target: { chainID: conf.chainID, lock: conf.lock }, buyer_id: guest.customerID,
      claimed_account_id: null, event_account_key: null, beneficiary_user_id: guest.customerID,
      recipient_mode: "member_safe", state: "awaiting_wallet", membership_status: "applicant",
    })));
  });

  await t.test("overlapping Guest confirmations cannot settle twice and replay one receipt", async () => {
    const guest = await guestAttempt();
    const before = await guestState(guest);
    const entered = deferred<void>();
    const release = deferred<void>();
    let paused = false;
    await delay(1100);
    const first = settle(payload, guest.attempt, async (collection) => {
      if (collection !== "commerce-key-grant-intents" || paused) return;
      paused = true;
      entered.resolve();
      await release.promise;
    });
    const watchdog = new AbortController();
    try {
      await Promise.race([
        entered.promise,
        first.then(() => assert.fail("First confirmation finished before its intent hook")),
        delay(8_000, undefined, { signal: watchdog.signal }).then(() => assert.fail("First intent hook was not reached")),
      ]);
      assert.deepEqual(await guestState(guest), before, "The independent observer cannot see uncommitted settlement");
      assert.deepEqual(await effects(control, guest.transactionID), { grants: [], tickets: [] });
      const duplicate = await settle(payload, guest.attempt);
      assert.equal(duplicate.status, 202);
      // The open settlement holds the attempt lock; the duplicate must not
      // enter a second financial transaction while that lock is held.
      assert.equal((await duplicate.json()).outcome, "busy");
    } finally {
      watchdog.abort();
      release.resolve();
      await Promise.allSettled([first]);
    }
    const completed = await first;
    assert.equal(completed.status, 200);
    const committed = await orders(control, guest.transactionID);
    assert.equal(committed.length, 1);
    const recorded = await effects(control, guest.transactionID);
    assert.equal(recorded.tickets.length, 2);
    assert.equal(recorded.grants.length, 2);
    const settledState = await guestState(guest);
    assert.ok(Number.isFinite(new Date(settledState.purchased_at).getTime()) && settledState.purchased_at != null);
    assert.deepEqual(settledState, {
      ...before, status: "succeeded", order_id: committed[0].id,
      purchased_at: settledState.purchased_at, inventory: before.inventory - 2,
      product_reserved: before.product_reserved - 2, event_reserved: before.event_reserved - 2,
      event_committed: before.event_committed + 2, reservation_state: "settled", reservation_order: committed[0].id,
      allowance_reserved: before.allowance_reserved - 2, allowance_paid: before.allowance_paid + 2,
    });
    const replay = await settle(payload, guest.attempt);
    assert.equal(replay.status, 200);
    assert.equal((await replay.json()).orderID, committed[0].id);
    assert.deepEqual(await orders(control, guest.transactionID), committed);
    assert.deepEqual(await effects(control, guest.transactionID), recorded);
  });

  await t.test("failure after the second Guest grant intent rolls back every settlement effect", async () => {
    const guest = await guestAttempt();
    const before = await guestState(guest);
    let intentWrites = 0;
    let staged: unknown;
    await delay(1100);
    const result = await settle(payload, guest.attempt, async (collection, req) => {
      if (collection !== "commerce-key-grant-intents" || ++intentWrites !== 2) return;
      const session = await nativeSession(req);
      const { rows } = await session.execute(sql`SELECT
        (SELECT count(*)::int FROM commerce_admissions WHERE transaction_id = ${guest.transactionID}::uuid) AS tickets,
        (SELECT count(*)::int FROM commerce_key_grant_intents WHERE payment_id = ${guest.transactionID}::uuid) AS intents`);
      staged = rows[0];
      throw new Error("Fixture fault after the second Guest intent");
    }).then((response) => ({ ok: response.ok }), () => ({ ok: false }));
    assert.equal(result.ok, false, "A failed transaction must not acknowledge settlement");
    assert.equal(intentWrites, 2);
    assert.deepEqual(staged, { tickets: 2, intents: 2 }, "The failure happened after real writes in the owned transaction");
    assert.deepEqual(await orders(control, guest.transactionID), []);
    assert.deepEqual(await effects(control, guest.transactionID), { grants: [], tickets: [] });
    assert.deepEqual(await guestState(guest), before);
    // The independent observer proves storage rollback, not an acknowledged
    // endpoint outcome. An immediate retry must respect the reconciliation fence.
    const retry = await settle(payload, guest.attempt);
    assert.equal(retry.status, 202);
    assert.ok(["ownership-unknown", "cooldown"].includes((await retry.json()).outcome));
    assert.deepEqual(await orders(control, guest.transactionID), []);
    assert.deepEqual(await effects(control, guest.transactionID), { grants: [], tickets: [] });
    assert.deepEqual(await guestState(guest), before);
  });

  await t.test("Guest target DOWN refuses recorded ticket data without removing columns or changing rows", async () => {
    const guest = await guestAttempt();
    await settleOne(payload, guest.attempt);
    const stored = () => control.query(`SELECT
        (SELECT jsonb_build_array(check_in_authority, unlock_ticket_configuration) FROM commerce_events WHERE id = $1) AS event,
        (SELECT ticket_target FROM commerce_reservations WHERE attempt_i_d = $2::text) AS reservation,
        (SELECT jsonb_agg(jsonb_build_array(id, ticket_tier, ticket_target) ORDER BY unit)
          FROM commerce_admissions WHERE transaction_id = $2::uuid) AS tickets`,
      [guest.eventID, guest.transactionID]).then(({ rows }) => rows[0]);
    const columns = () => control.query(`SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND (
        (table_name = 'commerce_events' AND column_name IN ('check_in_authority', 'unlock_ticket_configuration'))
        OR (table_name = 'commerce_reservations' AND column_name = 'ticket_target')
        OR (table_name = 'commerce_admissions' AND column_name IN ('ticket_tier', 'ticket_target')))
      ORDER BY table_name, column_name`).then(({ rows }) => rows);
    const before = await stored();
    const schema = await columns();
    assert.equal(schema.length, 5);
    assert.equal(before.tickets.length, 2);
    const req = await createLocalReq({}, payload);
    await assert.rejects(inPaymentTransaction(req, async () => {
      const db = await nativeSession(req);
      // Remove the other refusal conditions in this disposable transaction so
      // a broken admission guard cannot pass because event settings still exist.
      await db.execute(sql`UPDATE commerce_events SET check_in_authority = NULL, unlock_ticket_configuration = NULL
        WHERE check_in_authority IS NOT NULL OR unlock_ticket_configuration IS NOT NULL`);
      await db.execute(sql`UPDATE commerce_reservations SET ticket_target = NULL WHERE ticket_target IS NOT NULL`);
      await downTicketTargets({ db, payload, req });
      throw new Error("Fixture rollback: DOWN unexpectedly accepted retained admissions");
    }), (error: unknown) =>
      error instanceof Error && error.cause instanceof Error &&
      /Cannot remove configured or recorded event ticket targets/.test(error.cause.message));
    assert.deepEqual(await columns(), schema);
    assert.deepEqual(await stored(), before);
  });

  for (const edition of editions) await t.test(`09: ${edition.kind} binds the actual SKU and replays frozen obligations`, async () => {
    const user = await seedMember(payload);
    const decoy = await seedEvent(payload, "Other approved event; never select it by order");
    const launch = edition.bundle ? await seedEvent(payload, "Authoritative launch event") : null;
    const f = await seedNativeCart(payload, user, edition, launch);
    const before = await eventCapacity(control);
    const untouchedEvents = edition.bundle ? null : await eventWriteStamp(control);
    const membership = () => control.query("SELECT membership_status, xmin::text AS write_stamp FROM users WHERE id=$1",
      [f.customerID]).then(({ rows }) => rows);
    const beforeMember = edition.bundle ? null : await membership();
    const a = await prepare(payload, f);
    const reserved = await eventCapacity(control);
    assert.deepEqual(reserved, before.map(row => row.id === launch ? { ...row, reserved: "1" } : row));
    await settleOne(payload, a);
    const stored = await orders(control, a.transactionID);
    assert.equal(stored.length, 1);
    const [order] = stored;
    const snapshot = nativePurchaseSnapshotSchema.parse(order.snapshot);
    assert.deepEqual([snapshot.customerID, snapshot.cartID, snapshot.productID, snapshot.releaseID,
      snapshot.variantID, snapshot.optionID, snapshot.orderName, snapshot.eventID, snapshot.quantity,
      snapshot.unitAmount, snapshot.totalAmount, order.amount, order.currency, snapshot.editionKind, snapshot.editionRuleVersion,
      snapshot.editionEntitlements], [
      f.customerID, f.cartID, f.offer.productID, f.offer.releaseID, f.offer.edition.variantID, f.optionID,
      f.offer.title, launch, 1, f.offer.priceKRW, f.total, String(f.total), "KRW", edition.kind, 1,
      { membershipSignet: edition.bundle, freeLaunchTicket: edition.bundle },
    ]);
    const benefits = await effects(control, a.transactionID);
    const committed = await eventCapacity(control);
    assert.deepEqual(benefits.tickets.map(({ event, buyer }) => ({ event, buyer })),
      edition.bundle ? [{ event: launch, buyer: f.customerID }] : []);
    assert.deepEqual(benefits.grants.map(({ buyer }) => buyer), edition.bundle ? [f.customerID] : []);
    assert.deepEqual(committed, before.map(row => row.id === launch ? { ...row, committed: "1" } : row));
    if (!edition.bundle) {
      assert.deepEqual(await eventWriteStamp(control), untouchedEvents, "book-only never writes shared event capacity");
      assert.deepEqual(await membership(), beforeMember, "book-only never grants membership");
    }
    assert.ok(committed.some(row => row.id === decoy));

    // Switch the fixture to another valid active rule, not an unavailable offer.
    const replacement = edition.bundle ? editions[0] : editions[1];
    await payload.db.updateOne({ collection: "products", id: f.productID,
      data: { title: "Catalogue revision B", event: decoy, updatedAt: new Date().toISOString() } });
    await payload.db.updateOne({ collection: "variantOptions", id: f.optionID, data: { value: replacement.kind, label: replacement.title } });
    await payload.db.updateOne({ collection: "variants", id: f.variantID, data: { priceInKRW: replacement.price } });
    const active = await loadCommerceEditionOffer(payload, f.productID);
    assert.ok(active, "replacement rule must be an available offer");
    assert.deepEqual([active.title, active.editionKind, active.priceKRW, active.editionEntitlements], [
      "Catalogue revision B", replacement.kind, replacement.price,
      { membershipSignet: replacement.bundle, freeLaunchTicket: replacement.bundle },
    ]);
    const replay = await settle(payload, a);
    assert.equal(replay.status, 200);
    assert.equal((await replay.json()).orderID, order.id);
    const result = await readResult(payload, a);
    assert.equal(result.status, 200);
    assert.equal(result.body.outcome, "confirmed");
    assert.equal(result.body.orderID, order.id);
    assert.deepEqual(result.body.snapshot, order.snapshot);
    assert.deepEqual(await orders(control, a.transactionID), stored);
    assert.deepEqual(await effects(control, a.transactionID), benefits);
    assert.deepEqual(await eventCapacity(control), committed);
    await payload.db.updateOne({ collection: "variants", id: f.variantID, data: { priceInKRW: replacement.price + 1 } });
    assert.equal(await loadCommerceEditionOffer(payload, f.productID), null);
    assert.equal((await (await settle(payload, a)).json()).orderID, order.id);
  });

  for (const rule of [undefined, 99]) await t.test(`09: ${rule === undefined ? "missing" : "unknown"} recorded rule cannot replay`, async () => {
    const f = await seedNativeCart(payload, await seedMember(payload), editions[1], await seedEvent(payload, "Launch"));
    const a = await prepare(payload, f);
    await settleOne(payload, a);
    const [order] = await orders(control, a.transactionID);
    assert.ok(order, "need a real settled native attempt before injecting corrupt evidence");
    const previous = await effects(control, a.transactionID);
    const capacity = await eventCapacity(control);
    await corruptVersion(control, a, order.snapshot, rule);
    const poisoned = await orders(control, a.transactionID);
    const result = await readResult(payload, a);
    assert.ok([409, 503].includes(result.status), "corrupt persisted native rules stop receipt reads");
    assert.equal(result.body.outcome, "integrity-stop");
    assert.equal(result.body.orderID, undefined);
    const replay = await settle(payload, a).then(response => ({ status: response.status, rejected: false }), () => ({ status: 0, rejected: true }));
    assert.ok(replay.rejected || [409, 503].includes(replay.status), "corrupt persisted native rules stop confirmation replay");
    assert.deepEqual(await orders(control, a.transactionID), poisoned);
    assert.deepEqual(await effects(control, a.transactionID), previous);
    assert.deepEqual(await eventCapacity(control), capacity);
  });

  await t.test("staff SKU writes serialize with reserve and finalize without dropping or restoring stock", async () => {
    const { sql } = await import("@payloadcms/db-postgres");
    const { adjustEditionStock } = await import("../../../src/payload/collections/commerce-editions");
    const f = await seedNativeCart(payload, await seedMember(payload), editions[1], await seedEvent(payload, "Stock proof"));
    const admin = { id: f.customerID, collection: "admins", _strategy: "staff-better-auth", role: "admin" } as unknown as import("payload").TypedUser;
    const stock = () => control.query("SELECT inventory::int AS n FROM variants WHERE id=$1", [f.variantID]).then(({ rows }) => rows[0].n);
    const staleForm = { publicationApproved: false, inventory: await stock() };
    const saveWhileLocked = async <T>(start: (pause: () => Promise<void>) => Promise<T>, save: (req: import("payload").PayloadRequest) => Promise<unknown>) => {
      const reached = deferred<void>(), release = deferred<void>();
      const running = start(async () => { reached.resolve(); await release.promise; });
      let write: Promise<unknown> | undefined;
      try {
        await Promise.race([reached.promise, running.then(() => { throw new Error("Payment missed its test barrier"); })]);
        const req = await createLocalReq({ user: admin }, payload);
        const pid = deferred<number>();
        write = inCommerceTransaction(req, async () => {
          const session = await nativeSession(req);
          const { rows } = await session.execute(sql`SELECT pg_backend_pid() AS pid`);
          pid.resolve(Number(rows[0].pid));
          return save(req);
        });
        const completed = write.then(() => false, () => false);
        const backend = await Promise.race([pid.promise, completed]);
        assert.notEqual(backend, false, "the CMS transaction must own a backend");
        let waiting = false;
        for (let i = 0; i < 60; i++) {
          const { rowCount } = await control.query("SELECT 1 FROM pg_locks WHERE pid=$1 AND locktype='advisory' AND NOT granted", [backend]);
          if (rowCount) { waiting = true; break; }
          await delay(25);
        }
        assert.ok(waiting, "staff save must wait on the actual inventory advisory lock");
      } finally {
        release.resolve();
        await Promise.allSettled(write ? [running, write] : [running]);
      }
      assert.ok(write);
      return { payment: await running, write };
    };
    assert.equal(await stock(), 10);
    const reserved = await saveWhileLocked(pause => prepare(payload, f, pause),
      req => adjustEditionStock(req, { variantID: f.variantID, expectedInventory: 10, inventory: 0 }));
    await assert.rejects(reserved.write, /Inventory cannot fall below active reservations/);
    assert.equal(await stock(), 10);
    await delay(1100);
    const paid = await saveWhileLocked(pause => settle(payload, reserved.payment,
      async collection => { if (collection === "orders") await pause(); }),
    req => payload.update({ collection: "variants", id: f.variantID, data: { publicationApproved: true, inventory: 10 }, overrideAccess: false, req }));
    assert.equal(paid.payment.status, 200);
    await paid.write;
    const [order] = await orders(control, reserved.payment.transactionID);
    assert.ok(order);
    assert.equal(await stock(), 9, "CMS metadata save must not undo the official SKU decrement");
    const saved = await payload.update({ collection: "variants", id: f.variantID, data: staleForm, user: admin, overrideAccess: false });
    assert.equal(saved.publicationApproved, staleForm.publicationApproved);
    assert.equal(await stock(), 9, "an old form submitted after the sale cannot restore a sold unit");
    assert.equal((await (await settle(payload, reserved.payment)).json()).orderID, order.id);
    assert.equal(await stock(), 9, "replay must not decrement stock twice");
    const adjustmentReq = await createLocalReq({ user: admin }, payload);
    await assert.rejects(adjustEditionStock(adjustmentReq, { variantID: f.variantID, expectedInventory: 10, inventory: 8 }),
      /Inventory changed/);
    assert.equal(await stock(), 9);
    await adjustEditionStock(adjustmentReq, { variantID: f.variantID, expectedInventory: 9, inventory: 8 });
    assert.equal(await stock(), 8, "a fresh explicit stock edit still works");
  });

  await t.test("10: two products/releases race for one Signet; other accounts and guest tickets stay eligible", async () => {
    const { claimGuestAdmission, issueGuestClaim } = await import("../../../src/lib/commerce/guests");
    const member = await seedMember(payload);
    const carts = await Promise.all([1, 2].map(async i =>
      seedNativeCart(payload, member, i === 1 ? editions[1] : editions[2], await seedEvent(payload, `Release ${i} launch`))));
    assert.notEqual(carts[0].offer.releaseID, carts[1].offer.releaseID);
    // Both adapter transactions enter concurrently through separate requests.
    // Hold the real transaction table briefly so a pending insert cannot commit
    // before its competitor is started; the test never orders a winner.
    const blocker = await control.connect();
    let concurrent: Promise<PromiseSettledResult<Awaited<ReturnType<typeof prepare>>>[]> | undefined;
    let observedContenders = false;
    let finished = false;
    try {
      await blocker.query("BEGIN");
      await blocker.query("LOCK TABLE transactions IN SHARE MODE");
      concurrent = Promise.allSettled(carts.map(f => prepare(payload, f))).finally(() => { finished = true; });
      for (let i = 0; i < 60 && !finished; i++) {
        const { rows } = await pool.query(`SELECT 1 FROM pg_locks blocked_insert JOIN pg_locks blocked_prepare
          ON blocked_insert.pid = ANY(pg_blocking_pids(blocked_prepare.pid))
          WHERE blocked_insert.relation = 'transactions'::regclass AND NOT blocked_insert.granted
          AND blocked_prepare.locktype = 'advisory' AND NOT blocked_prepare.granted LIMIT 1`);
        if (rows.length) { observedContenders = true; break; }
        await delay(25);
      }
    } finally {
      try { await blocker.query("ROLLBACK"); } finally { blocker.release(); }
    }
    assert.ok(concurrent);
    const outcomes = await concurrent;
    const prepared = outcomes.flatMap(x => x.status === "fulfilled" ? [x.value] : []);
    assert.equal(prepared.length, 1, "the losing checkout never reaches payment");
    assert.equal(observedContenders, true, "observe both prepare backends queued on the real locks");
    const [a] = prepared;
    assert.deepEqual((await control.query(`SELECT release_i_d, reserved_quantity::int AS reserved, paid_quantity::int AS paid
      FROM commerce_allowances WHERE customer_id = $1`, [a.customerID])).rows,
    [{ release_i_d: "membership", reserved: 1, paid: 0 }]);
    await settleOne(payload, a);
    const orderRows = await orders(control, a.transactionID);
    const benefits = await effects(control, a.transactionID);
    assert.equal(orderRows.length, 1);
    assert.equal(benefits.grants.length, 1);
    assert.equal(benefits.tickets.length, 1);
    assert.equal((await (await settle(payload, a)).json()).orderID, orderRows[0].id);
    assert.deepEqual(await effects(control, a.transactionID), benefits);
    for (const f of carts) {
      const stored = await control.query("SELECT id FROM transactions WHERE cart_id = $1", [f.cartID]);
      assert.deepEqual(stored.rows.map(row => row.id), prepared.filter(a => a.cartID === f.cartID).map(a => a.transactionID),
        "refused admission must leave no orphan payment");
    }
    const retryCart = await seedNativeCart(payload, member, editions[2], await seedEvent(payload, "Later release"));
    await assert.rejects(prepare(payload, retryCart), "a new cart does not evade the account-wide Signet fence");
    const other = await seedNativeCart(payload, await seedMember(payload), editions[2], retryCart.eventID);
    const otherAttempt = await prepare(payload, other);
    await settleOne(payload, otherAttempt);
    assert.deepEqual((await effects(control, otherAttempt.transactionID)).grants.map(g => g.buyer), [other.customerID]);

    // Separately eligible Guest Ticket with a settled legacy donor/order.
    // Prepare unoccupied admission fixture state, then use the real claim path;
    // this proves no cross-type admission block, not event-token issuance.
    const donor = await initiateAttempt(payload);
    await settleOne(payload, { ...donor, paymentID: donor.transactionID.replaceAll("-", ""), total: 13_000 });
    const donorTicket = (await effects(control, donor.transactionID)).tickets[0];
    assert.ok(donorTicket);
    await payload.db.updateOne({ collection: "commerce-events", id: donor.eventID,
      data: { claimCutoffAt: new Date(Date.now() + 30 * 60_000).toISOString() } });
    await payload.db.updateOne({ collection: "commerce-admissions", id: donorTicket.id,
      data: { eventAccountKey: null, guestName: "Synthetic guest" } });
    const donorReq = await createLocalReq({ user: donor.user }, payload);
    const invitation = await inPaymentTransaction(donorReq, () => issueGuestClaim({ req: donorReq, admissionID: donorTicket.id }));
    const req = await createLocalReq({ user: member }, payload);
    const isActive = async (id: string) => {
      const { rows } = await control.query("SELECT membership_status FROM users WHERE id=$1", [id]);
      return rows[0]?.membership_status === "approved";
    };
    const claimed = await inPaymentTransaction(req, () => claimGuestAdmission({ req, token: invitation.token }, isActive));
    assert.equal(claimed.admissionID, donorTicket.id);
    const linked = await control.query("SELECT claimed_account_id, event_id FROM commerce_admissions WHERE id=$1", [claimed.admissionID]);
    assert.deepEqual(linked.rows, [{ claimed_account_id: String(member.id), event_id: donor.eventID }]);
  });

  await t.test("10: exact Paid after verified retirement stays in review after the other release settles", async () => {
    const { createAdapterEndpoints } = await import("../../../src/lib/commerce/portone/endpoints");
    const { paidReviewScope } = await import("../../../src/lib/commerce/portone/accounting");
    const member = await seedMember(payload);
    const loser = await prepare(payload, await seedNativeCart(payload, member, editions[1], await seedEvent(payload, "First launch")));
    const winnerCart = await seedNativeCart(payload, member, editions[2], await seedEvent(payload, "Second launch"));
    const getPayment = (status: "FAILED" | "PAID") => async () => ({
      id: loser.paymentID, status, storeId: providerConfig.storeId,
      channel: { key: providerConfig.channelKey, type: "TEST" }, customer: { id: loser.customerID }, currency: "KRW",
      amount: { total: loser.total, paid: status === "PAID" ? loser.total : 0, cancelled: 0 }, disputes: [],
    });
    const retire = createAdapterEndpoints({ config: providerConfig, getPayment: getPayment("FAILED") }, async () => loser.customerID)
      .find(e => e.path === "/retire");
    assert.ok(retire);
    const req = await createLocalReq({ user: member }, payload);
    req.data = { transactionID: loser.transactionID, paymentID: loser.paymentID, cartID: loser.cartID };
    await delay(1100);
    const retired = await retire.handler(req);
    assert.equal(retired.status, 200);
    assert.equal((await retired.json()).outcome, "retired");
    const winner = await prepare(payload, winnerCart);
    await settleOne(payload, winner);
    const won = await effects(control, winner.transactionID);
    assert.equal(won.grants.length, 1);
    assert.equal(won.tickets.length, 1);
    const capacity = await eventCapacity(control);
    const event = { type: "Transaction.Paid", data: { paymentId: loser.paymentID, storeId: providerConfig.storeId } };
    const webhook = createAdapterEndpoints({ config: providerConfig, getPayment: getPayment("PAID"), verifyWebhook: async () => event })
      .find(e => e.path === "/webhooks");
    assert.ok(webhook);
    const request = Object.assign(new Request(providerConfig.origin + "/api/payments/portone/webhooks", {
      method: "POST", headers: { "content-type": "application/json", "webhook-id": "late-native-paid",
        "webhook-timestamp": "1", "webhook-signature": "synthetic" }, body: JSON.stringify(event),
    }), { user: null, payload, context: {} }) as unknown as import("payload").PayloadRequest;
    await delay(1100);
    const reply = await webhook.handler(request);
    assert.equal(reply.status, 200);
    assert.equal((await reply.json()).outcome, "late-paid-quarantined");
    assert.equal((await readResult(payload, loser)).body.outcome, "review-required");
    assert.equal((await control.query("SELECT 1 FROM commerce_reconciliations WHERE scope = $1",
      [paidReviewScope(loser.transactionID)])).rowCount, 1);
    assert.deepEqual(await orders(control, loser.transactionID), []);
    assert.deepEqual(await effects(control, loser.transactionID), { grants: [], tickets: [] });
    assert.deepEqual(await effects(control, winner.transactionID), won);
    assert.deepEqual(await eventCapacity(control), capacity);
  });

  await t.test("populated DOWN refuses and leaves purchase columns intact", async () => {
    const before = await editionColumns();
    const { rows } = await control.query("SELECT count(*)::int AS n FROM orders_items WHERE variant_id IS NOT NULL");
    assert.ok(rows[0].n > 0);
    await assert.rejects(migrate(down), (error: unknown) => {
      const cause = error instanceof Error ? error.cause : null;
      return cause instanceof Error && /rollback refused/.test(cause.message);
    });
    assert.deepEqual(await editionColumns(), before);
  });
});
