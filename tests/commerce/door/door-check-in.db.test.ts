import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { createLocalReq, type Payload, type TypedUser } from "payload";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { LOCK, unlockQr } from "./fixtures";

// Disposable loopback container created for this proof only and removed afterwards (tests/support/database-proof.mjs).
const target = {
  container: "sphmrs-door-check-in-20261116",
  port: 55498,
  database: "door_check_in_proof"
};
// Throwaway in-test Locksmith key: pinned for this proof only.
const locksmith = privateKeyToAccount(generatePrivateKey());

test(
  "The door: two concurrent scans of one admission on two app instances, exactly one admits",
  {
    skip: process.env.DOOR_CHECK_IN_DATABASE_TESTS !== "1",
    timeout: 300_000
  },
  async (t) => {
    const { isolateTransport, openProofDatabase, seedAttempt, confirmation } =
      await import("../core/payment-postgres-fixture");
    const { runReconciliation } =
      await import("../../../src/lib/commerce/portone/admission");
    const { assertPaymentRiskReviewed } =
      await import("../../../src/lib/commerce/portone/review");
    const { doorCheckIn } =
      await import("../../../src/lib/commerce/door/check-in");
    isolateTransport(t, target.port);
    const first = await openProofDatabase(true, new Set(), target);
    t.after(first.close);
    // A second Payload instance with its own pool: a second door phone's server.
    const second = await openProofDatabase(false, new Set(), target);
    t.after(second.close);
    t.diagnostic(
      `PostgreSQL ${first.version}; loopback only; QR signer and chain evidence synthetic`
    );

    // Settle a real order through the ledger, so its admission and key-grant intent exist (ADR-0004).
    const f = await seedAttempt(first.payload);
    await delay(1100);
    const attempt = await confirmation(first.payload, f);
    const response = await runReconciliation(
      attempt.req,
      {
        transactionID: f.transactionID,
        paymentID: f.transactionID.replaceAll("-", ""),
        cartID: f.cartID
      },
      "confirm",
      async () => {
        await assertPaymentRiskReviewed(
          attempt.req,
          attempt.req.data as { transactionID: string; paymentID: string },
          undefined,
          attempt.deps
        );
        return attempt.run();
      },
      attempt.deps
    );
    assert.equal(response.status, 200);
    const {
      rows: [intent]
    } = await first.control.query(
      "SELECT id::text, entitlement_id::text AS admission FROM commerce_key_grant_intents WHERE payment_id=$1::uuid",
      [f.transactionID]
    );
    assert.ok(intent?.admission);
    // The worker's grant is another slice: fixture preparation only records the granted token, bypassing hooks.
    await first.payload.db.updateOne({
      collection: "commerce-key-grant-intents" as never,
      id: intent.id,
      data: {
        state: "granted",
        tokenID: "42",
        target: {
          chainID: 84532,
          lock: LOCK,
          recipient: `0x${"b".repeat(40)}`
        },
        grantedAt: new Date().toISOString()
      } as never
    });
    const staffID = randomUUID();
    await first.payload.db.create({
      collection: "admins" as never,
      customID: staffID,
      data: { email: `${staffID}@fixture.invalid` } as never
    });
    const staff = {
      id: staffID,
      collection: "admins",
      _strategy: "staff-better-auth",
      role: "staff"
    } as unknown as TypedUser;
    const {
      rows: [admission]
    } = await first.control.query(
      "SELECT event_id::text AS event FROM commerce_admissions WHERE id=$1::uuid",
      [intent.admission]
    );
    const scan = await unlockQr(locksmith, { tokenId: "42" });
    const door = async (payload: Payload) =>
      doorCheckIn({
        req: await createLocalReq({ user: staff }, payload),
        eventID: admission.event,
        method: "qr",
        scan,
        signers: [locksmith.address]
      });

    await t.test(
      "concurrent QR scans: exactly one admits, the others see the first check-in",
      async (st) => {
        let waiting = 0;
        let watching = true;
        const watcher = (async () => {
          while (watching) {
            const { rows } = await first.control.query(
              "SELECT count(*)::int AS n FROM pg_locks WHERE locktype='advisory' AND NOT granted"
            );
            waiting = Math.max(waiting, rows[0].n);
            await delay(1);
          }
        })();
        const results = await Promise.all(
          [first, second, first, second, first, second].map((instance) =>
            door(instance.payload)
          )
        );
        watching = false;
        await watcher;
        st.diagnostic(
          `outcomes ${results.map((result) => result.outcome).join(", ")}; most sessions seen waiting on an advisory lock: ${waiting}`
        );
        assert.deepEqual(results.map((result) => result.outcome).sort(), [
          "admitted",
          ...Array(5).fill("already-checked-in")
        ]);
        const admitted = results.find(
          (result) => result.outcome === "admitted"
        )!;
        const repeat = results.find(
          (result) => result.outcome === "already-checked-in"
        )!;
        assert.ok("checkedInAt" in admitted && "checkedInAt" in repeat);
        const { rows } = await first.control.query(
          "SELECT status::text, checked_in_at FROM commerce_admissions WHERE id=$1::uuid",
          [intent.admission]
        );
        assert.equal(rows[0].status, "checked-in");
        assert.equal(
          new Date(rows[0].checked_in_at).toISOString(),
          admitted.checkedInAt
        );
        assert.equal(
          new Date(repeat.checkedInAt).toISOString(),
          admitted.checkedInAt
        );
      }
    );

    await t.test(
      "a later name check-in of the same admission is refused as already checked in",
      async () => {
        const result = await doorCheckIn({
          req: await createLocalReq({ user: staff }, second.payload),
          eventID: admission.event,
          method: "name",
          admissionID: intent.admission
        });
        assert.equal(result.outcome, "already-checked-in");
      }
    );

    await t.test(
      "every attempt is logged once, and the log is append-only",
      async () => {
        const { rows } = await first.control.query(
          "SELECT id::text, method::text, result::text, operator_id::text AS operator, admission_id::text AS admission, token_i_d AS token FROM commerce_door_attempts ORDER BY attempted_at, result"
        );
        assert.deepEqual(
          rows
            .map((row) => [
              row.method,
              row.result,
              row.operator,
              row.admission,
              row.token
            ])
            .sort(),
          [
            ["name", "already-checked-in", staffID, intent.admission, null],
            ["qr", "admitted", staffID, intent.admission, "42"],
            ...Array(5).fill([
              "qr",
              "already-checked-in",
              staffID,
              intent.admission,
              "42"
            ])
          ]
        );
        const req = await createLocalReq({}, first.payload);
        await assert.rejects(
          first.payload.update({
            collection: "commerce-door-attempts" as never,
            id: rows[0].id,
            data: { result: "admitted" } as never,
            overrideAccess: true,
            req
          }),
          /append-only/
        );
        await assert.rejects(
          first.payload.delete({
            collection: "commerce-door-attempts" as never,
            id: rows[0].id,
            overrideAccess: true,
            req
          }),
          /append-only/
        );
      }
    );
  }
);
