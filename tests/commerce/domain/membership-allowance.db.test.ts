import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { CollectionSlug, PayloadRequest } from "payload";

// Single membership token per account (owner, 22 Nov), proven on native PostgreSQL:
// the account allowance spans products and events, a verified release frees it,
// and the live-key fence reads a set that shrinks between pages without a miss.
// Uses the disposable reconciliation container (see reconciliation-postgres-fixture).
test(
  "single membership token per account on native PostgreSQL",
  {
    skip: process.env.COMMERCE_PAYLOAD_DATABASE_TESTS !== "1",
    timeout: 240000
  },
  async (t) => {
    process.env.DISABLE_PAYLOAD_HMR = "true";
    const { openReconciliationDatabase, target } =
      await import("../portone/reconciliation-postgres-fixture");
    const { seedCheckoutCart, initiateThroughEndpoint } =
      await import("../core/payment-postgres-fixture");
    const { createLocalReq } = await import("payload");
    const { inPaymentTransaction } =
      await import("../../../src/lib/commerce/_shared/transaction");
    const { withCommerceWrite } =
      await import("../../../src/lib/commerce/access");
    const { releaseReservation, reservePurchase } =
      await import("../../../src/lib/commerce/reservations");
    const { Pool } = await import("pg");

    const probe = new Pool({ connectionString: target.url, max: 1 });
    let prepared = false;
    try {
      prepared = Boolean(
        (
          await probe.query(
            "SELECT to_regclass('public.commerce_reconciliations') AS ledger"
          )
        ).rows[0].ledger
      );
    } finally {
      await probe.end();
    }
    if (!prepared) await (await openReconciliationDatabase(true)).close();
    const db = await openReconciliationDatabase();
    t.after(db.close);
    const control = new Pool({ connectionString: target.url, max: 2 });
    t.after(() => control.end());
    const account = async (customerID: string) =>
      (
        await control.query(
          `SELECT
    (SELECT count(*)::int FROM commerce_reservations WHERE customer_id=$1 AND state='reserved') AS reserved_rows,
    (SELECT count(*)::int FROM commerce_allowances WHERE customer_id=$1) AS allowance_rows,
    (SELECT release_i_d FROM commerce_allowances WHERE customer_id=$1 LIMIT 1) AS release,
    (SELECT reserved_quantity::int FROM commerce_allowances WHERE customer_id=$1 LIMIT 1) AS reserved`,
          [customerID]
        )
      ).rows[0];

    const first = await seedCheckoutCart(db.payload);
    const second = await seedCheckoutCart(db.payload, first);
    let preparedID = "";
    let blocked = first;

    await t.test(
      "concurrent attempts on two products and events leave one reservation in one allowance",
      async () => {
        const carts = [first, second];
        const results = await Promise.allSettled(
          carts.map((cart) =>
            initiateThroughEndpoint(db.payload, first.user, {
              cartID: cart.cartID,
              shippingAddress: cart.shippingAddress
            })
          )
        );
        assert.deepEqual(results.map((result) => result.status).sort(), [
          "fulfilled",
          "rejected"
        ]);
        const winner = results.findIndex(
          (result) => result.status === "fulfilled"
        );
        preparedID = (
          results[winner] as PromiseFulfilledResult<{ transactionID: string }>
        ).value.transactionID;
        blocked = carts[1 - winner];
        assert.deepEqual(await account(first.customerID), {
          reserved_rows: 1,
          allowance_rows: 1,
          release: "membership",
          reserved: 1
        });
        // Another account is independent.
        const other = await seedCheckoutCart(db.payload);
        await initiateThroughEndpoint(db.payload, other.user, {
          cartID: other.cartID,
          shippingAddress: other.shippingAddress
        });
        assert.equal((await account(other.customerID)).reserved, 1);
      }
    );

    await t.test(
      "a verified release frees the account and the other product can then prepare",
      async () => {
        await assert.rejects(
          initiateThroughEndpoint(db.payload, first.user, {
            cartID: blocked.cartID,
            shippingAddress: blocked.shippingAddress
          })
        );
        const req = (await createLocalReq({}, db.payload)) as PayloadRequest;
        await inPaymentTransaction(req, () =>
          withCommerceWrite(req, () =>
            releaseReservation({
              req,
              attemptID: preparedID,
              verifiedReason: "verified-failure",
              providerEventID: "fixture-verified-failure"
            })
          )
        );
        assert.equal((await account(first.customerID)).reserved, 0);
        await initiateThroughEndpoint(db.payload, first.user, {
          cartID: blocked.cartID,
          shippingAddress: blocked.shippingAddress
        });
        assert.deepEqual(await account(first.customerID), {
          reserved_rows: 1,
          allowance_rows: 1,
          release: "membership",
          reserved: 1
        });
      }
    );

    await t.test(
      "the live-key fence finds a membership key when earlier keys are cancelled between reads",
      async () => {
        // A fresh buyer with 100 live event keys and one live membership key that sorts last.
        const buyer = await seedCheckoutCart(db.payload);
        const now = new Date().toISOString();
        const create = (collection: string, data: Record<string, unknown>) =>
          db.payload.db.create({
            collection: collection as CollectionSlug,
            customID: data.id as string,
            data: { ...data, createdAt: now, updatedAt: now }
          });
        const eventOrder = randomUUID(),
          membershipOrder = randomUUID();
        await create("orders", {
          id: eventOrder,
          commerceVersion: "legacy",
          customer: buyer.customerID,
          currency: "KRW",
          amount: 0
        });
        await create("orders", {
          id: membershipOrder,
          commerceVersion: "commerce-v1",
          customer: buyer.customerID,
          currency: "KRW",
          amount: 0
        });
        const keyIDs = Array.from({ length: 101 }, () => randomUUID()).sort();
        // Fixture links only: every row points at the real transaction prepared above.
        for (const [index, id] of keyIDs.entries()) {
          const admission = randomUUID(),
            order = index === 100 ? membershipOrder : eventOrder;
          await create("commerce-admissions", {
            id: admission,
            orderUnitKey: `${admission}:1`,
            unit: 1,
            status: "available",
            order,
            transaction: preparedID,
            event: buyer.eventID,
            buyer: buyer.customerID
          });
          await create("commerce-key-grant-intents", {
            id,
            operationKey: id,
            entitlement: admission,
            beneficiaryUser: buyer.customerID,
            recipientMode: "member_safe",
            state: "granted",
            attempts: 0,
            order,
            payment: preparedID
          });
        }
        const req = (await createLocalReq(
          { user: buyer.user },
          db.payload
        )) as PayloadRequest;
        const find = req.payload.find.bind(req.payload);
        let reads = 0;
        // A cancel commits on its own connection between the second and third read,
        // removing ten already-read keys from the live set.
        req.payload.find = (async (args: Parameters<typeof find>[0]) => {
          const result = await find(args);
          if (
            args.collection ===
              ("commerce-key-grant-intents" as CollectionSlug) &&
            ++reads === 2
          ) {
            await control.query(
              "UPDATE commerce_key_grant_intents SET state='cancelled' WHERE id = ANY($1::uuid[])",
              [keyIDs.slice(0, 10)]
            );
          }
          return result;
        }) as typeof find;
        t.after(() => {
          req.payload.find = find;
        });
        const snapshotHash = "a".repeat(64);
        await assert.rejects(
          inPaymentTransaction(req, () =>
            withCommerceWrite(req, () =>
              reservePurchase({
                req,
                attemptID: randomUUID(),
                customerID: buyer.customerID,
                releaseID: "membership",
                productID: buyer.productID,
                eventID: buyer.eventID,
                quantity: 1,
                accountLimit: 1,
                snapshotHash
              })
            )
          ),
          /earlier membership key is not yet cancelled/
        );
        req.payload.find = find;
        assert.equal(reads, 3);
        assert.equal(
          (
            await control.query(
              "SELECT count(*)::int AS n FROM commerce_key_grant_intents WHERE beneficiary_user_id=$1 AND state='cancelled'",
              [buyer.customerID]
            )
          ).rows[0].n,
          10
        );
        assert.equal((await account(buyer.customerID)).reserved_rows, 0);
      }
    );
  }
);
