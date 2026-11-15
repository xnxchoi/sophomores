import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import {
  createLocalReq,
  type CollectionSlug,
  type Payload,
  type TypedUser
} from "payload";

// Disposable loopback container created for this proof only and removed afterwards.
const target = {
  container: "sphmrs-guest-invite-20261116",
  port: 55493,
  database: "guest_invite_proof"
};
const HOUR = 60 * 60 * 1000;

test(
  "paid guest invite: settlement and the 48-hour lapse against PostgreSQL",
  {
    skip: process.env.GUEST_INVITE_DATABASE_TESTS !== "1",
    timeout: 240_000
  },
  async (t) => {
    const {
      isolateTransport,
      openProofDatabase,
      confirmation,
      providerConfig,
      nativeSession
    } = await import("./payment-postgres-fixture");
    const { sql } = await import("@payloadcms/db-postgres");
    const { runReconciliation } =
      await import("../../../src/lib/commerce/portone/admission");
    const { assertPaymentRiskReviewed } =
      await import("../../../src/lib/commerce/portone/review");
    const { projectLocalResult } =
      await import("../../../src/lib/commerce/portone/result");
    const { readPortOneTransaction, createPortOneAdapter } =
      await import("../../../src/lib/commerce/portone/adapter");
    const { createGuestInvite, lapseDueGuestInvites } =
      await import("../../../src/lib/commerce/guest-invites");
    const { inCommerceTransaction, inPaymentTransaction } =
      await import("../../../src/lib/commerce/_shared/transaction");
    isolateTransport(t, target.port);
    const db = await openProofDatabase(true, new Set(), target);
    t.after(db.close);
    t.diagnostic(
      `PostgreSQL ${db.version}; loopback only; provider evidence synthetic`
    );
    // Synthetic, never-approved fixture facts so the real catalogue opens for the checkout.
    const policy = {
      effectiveDate: "2020-01-01",
      sections: [
        {
          heading: "Test policy",
          paragraphs: ["Test fixture, not approved public policy."]
        }
      ]
    };
    await db.payload.updateGlobal({
      slug: "commerce-publication" as never,
      overrideAccess: true,
      data: {
        _status: "published",
        publicationApproved: true,
        physicalProductApproved: true,
        fulfillmentReady: true,
        addressRetentionApproved: true,
        shippingCountries: ["KR"],
        disclosure: {
          seller: {
            name: "Test seller",
            registrationNumber: "123-45-67890",
            representative: "Test",
            address: "Test address",
            phone: "02-1234-5678"
          },
          policies: { terms: policy, privacy: policy, refund: policy }
        }
      } as never
    });
    const address = {
      country: "KR" as const,
      recipientName: "Fixture",
      phone: "01012345678",
      postalCode: "12345",
      addressLine1: "Fixture only"
    };

    // Fixture preparation writes rows directly, as the shared fixture does. Every
    // behaviour under test (invite, hold, checkout, settle, lapse) runs through
    // the domain functions and Payload's own hooks on the owning req.
    async function seedEvent(
      payload: Payload,
      membershipStatus: string,
      capacity = 10
    ) {
      const memberID = randomUUID(),
        eventID = randomUUID(),
        productID = randomUUID(),
        cartID = randomUUID();
      const mediaID = randomUUID(),
        membershipID = randomUUID(),
        membershipCartID = randomUUID();
      const now = new Date().toISOString();
      const sale = {
        _status: "published",
        publicationApproved: true,
        event: eventID,
        inventory: 10,
        reservedQuantity: 0,
        priceInKRWEnabled: true,
        saleStartsAt: new Date(Date.now() - 60000).toISOString(),
        saleEndsAt: new Date(Date.now() + HOUR).toISOString()
      };
      const rows = [
        {
          collection: "media",
          id: mediaID,
          data: { filename: `${mediaID}.png`, mimeType: "image/png" }
        },
        {
          collection: "users",
          id: memberID,
          data: {
            email: `${memberID}@fixture.invalid`,
            name: "Inviting member",
            membershipStatus
          }
        },
        {
          collection: "commerce-events",
          id: eventID,
          data: {
            name: "Fixture",
            publicationApproved: true,
            capacity,
            transportCapacity: capacity,
            reservedQuantity: 0,
            committedQuantity: 0,
            partIStartsAt: now,
            partIEndsAt: new Date(Date.now() + HOUR).toISOString(),
            claimCutoffAt: now
          }
        },
        {
          collection: "products",
          id: productID,
          data: {
            ...sale,
            images: [{ id: randomUUID(), image: mediaID }],
            title: "Guest invite",
            description: "Never offered",
            productKind: "guest_invite",
            priceInKRW: 10000,
            shippingFeeKRW: 0,
            dispatchSchedule: "Emailed"
          }
        },
        {
          collection: "products",
          id: membershipID,
          data: {
            ...sale,
            images: [{ id: randomUUID(), image: mediaID }],
            title: "Membership",
            description: "Never offered",
            productKind: "membership",
            priceInKRW: 10000,
            shippingFeeKRW: 3000,
            dispatchSchedule: "Shipped"
          }
        },
        {
          collection: "carts",
          id: cartID,
          data: {
            customer: memberID,
            currency: "KRW",
            subtotal: 10000,
            items: [{ id: randomUUID(), product: productID, quantity: 1 }]
          }
        },
        {
          collection: "carts",
          id: membershipCartID,
          data: {
            customer: memberID,
            currency: "KRW",
            subtotal: 10000,
            items: [{ id: randomUUID(), product: membershipID, quantity: 1 }]
          }
        }
      ];
      for (const row of rows)
        await payload.db.create({
          collection: row.collection as CollectionSlug,
          customID: row.id,
          data: { ...row.data, createdAt: now, updatedAt: now }
        });
      const user = {
        id: memberID,
        email: `${memberID}@fixture.invalid`,
        collection: "users"
      } as TypedUser;
      return { memberID, eventID, productID, cartID, membershipCartID, user };
    }
    type Seeded = Awaited<ReturnType<typeof seedEvent>>;
    const invite = async (payload: Payload, s: Seeded, now = Date.now()) => {
      const req = await createLocalReq({ user: s.user }, payload);
      return inCommerceTransaction(req, () =>
        createGuestInvite(
          {
            req,
            productID: s.productID,
            guestName: "Guest One",
            guestEmail: "Guest.One@Example.com",
            now
          },
          {
            activeMember: async () => true,
            loadOffer: async () =>
              ({
                productID: s.productID,
                kind: "guest_invite",
                event: { id: s.eventID }
              }) as never
          }
        )
      );
    };
    type Attempt = {
      snapshot: {
        totalAmount: number;
        guestInviteID?: string;
        shippingAddress?: unknown;
      };
      user: TypedUser;
      customerID: string;
      eventID: string;
      productID: string;
      cartID: string;
      transactionID: string;
    };
    // Today's account checkout, unmodified: the adapter's initiatePayment in its owned payment transaction.
    async function initiate(
      payload: Payload,
      s: Seeded,
      cartID: string,
      shippingAddress?: typeof address
    ): Promise<Attempt> {
      const req = await createLocalReq({ user: s.user }, payload);
      req.data = { attemptID: randomUUID() };
      const prepared = (await inPaymentTransaction(req, async () => {
        try {
          return await createPortOneAdapter({
            config: providerConfig
          }).initiatePayment({
            data: {
              cart: { id: cartID },
              ...(shippingAddress ? { shippingAddress } : {})
            } as never,
            req,
            transactionsSlug: "transactions"
          } as never);
        } catch (error) {
          // Preserve the bounded first error before native ownership handling replaces it (as seedAttempt does).
          console.error(
            "initiate first error:",
            error instanceof Error ? error.message.slice(0, 200)
              : "non-Error"
          );
          throw error;
        }
      })) as unknown as { transactionID: string };
      const row = await readPortOneTransaction(
        await createLocalReq({ user: s.user }, payload),
        prepared.transactionID.replaceAll("-", "")
      );
      return {
        snapshot: row.portone.snapshot,
        user: s.user,
        customerID: s.memberID,
        eventID: s.eventID,
        productID: s.productID,
        cartID,
        transactionID: row.id
      };
    }
    const attempts = async (cartID: string) =>
      (
        await db.control.query(
          "SELECT count(*)::int AS n FROM transactions WHERE cart_id=$1::uuid",
          [cartID]
        )
      ).rows[0].n as number;
    const confirm = async (
      f: Attempt,
      options?: Parameters<typeof confirmation>[2]
    ) => {
      await delay(1100); // Global provider-GET rate (5/s) and per-attempt cooldown, as in the other proofs.
      const attempt = await confirmation(db.payload, f as never, options);
      return runReconciliation(
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
    };
    const state = async (s: Seeded, inviteID: string, transactionID?: string) =>
      (
        await db.control.query(
          `SELECT
    (SELECT state::text FROM commerce_guest_invites WHERE id=$1::uuid) AS invite,
    (SELECT member_notice::text FROM commerce_guest_invites WHERE id=$1::uuid) AS notice,
    (SELECT (active_key IS NOT NULL) FROM commerce_guest_invites WHERE id=$1::uuid) AS open,
    (SELECT (order_id IS NOT NULL AND admission_id IS NOT NULL) FROM commerce_guest_invites WHERE id=$1::uuid) AS linked,
    (SELECT reserved_quantity::int FROM commerce_events WHERE id=$2::uuid) AS "eventReserved",
    (SELECT committed_quantity::int FROM commerce_events WHERE id=$2::uuid) AS "eventCommitted",
    (SELECT count(*)::int FROM orders WHERE commerce_attempt_i_d=$4::text) AS orders,
    (SELECT count(*)::int FROM commerce_admissions WHERE guest_invite_id=$1::uuid AND guest_name='Guest One' AND event_account_key IS NULL) AS "guestAdmissions",
    (SELECT count(*)::int FROM commerce_admissions WHERE event_id=$2::uuid) AS admissions,
    (SELECT count(*)::int FROM commerce_key_grant_intents WHERE payment_id::text=$4::text) AS "keyIntents",
    (SELECT membership_status::text FROM users WHERE id=$3::uuid) AS membership,
    (SELECT count(*)::int FROM users WHERE lower(email)='guest.one@example.com') AS "guestAccounts",
    (SELECT status::text FROM transactions WHERE id::text=$4::text) AS payment`,
          [inviteID, s.eventID, s.memberID, transactionID ?? "none"]
        )
      ).rows[0] as Record<string, unknown>;

    await t.test(
      "a member buys an invite: paid, guest admitted against capacity, no membership change; replay changes nothing",
      async (st) => {
        // A grantable status: if the membership grant ran for this product, it would show here.
        const s = await seedEvent(db.payload, "applicant", 1);
        const created = await invite(db.payload, s);
        const held = await state(s, created.id);
        assert.equal(held.invite, "pending_payment");
        assert.equal(
          held.eventReserved,
          1,
          "the invite holds the event's only place"
        );
        await assert.rejects(
          initiate(db.payload, s, s.cartID, address),
          /takes no shipping address/,
          "a guest invite takes no shipping address"
        );
        assert.equal(await attempts(s.cartID), 0, "a rejected initiation leaves no payment attempt");
        const f = await initiate(db.payload, s, s.cartID);
        assert.equal(f.snapshot.guestInviteID, created.id);
        assert.equal(f.snapshot.shippingAddress, undefined);
        assert.equal(f.snapshot.totalAmount, 10000);
        const reservation = (
          await db.control.query(
            "SELECT state::text, guest_invite_id::text AS invite FROM commerce_reservations WHERE attempt_i_d=$1",
            [f.transactionID]
          )
        ).rows[0];
        assert.deepEqual(reservation, {
          state: "reserved",
          invite: created.id
        });
        assert.equal(
          (await state(s, created.id, f.transactionID)).eventReserved,
          1,
          "checkout does not hold the place twice"
        );
        const response = await confirm(f);
        assert.equal(response.status, 200, `status ${response.status}`);
        const settled = await state(s, created.id, f.transactionID);
        assert.deepEqual(settled, {
          invite: "paid",
          notice: null,
          open: true,
          linked: true,
          eventReserved: 0,
          eventCommitted: 1,
          orders: 1,
          guestAdmissions: 1,
          admissions: 1,
          keyIntents: 0,
          membership: "applicant",
          guestAccounts: 0,
          payment: "succeeded"
        });
        const req = await createLocalReq({ user: s.user }, db.payload);
        const local = await projectLocalResult(
          req,
          await readPortOneTransaction(req, f.transactionID.replaceAll("-", ""))
        );
        assert.equal(
          local.outcome,
          "confirmed",
          "the address-less guest order passes the post-settlement integrity reader"
        );
        const replay = await confirm(f);
        assert.equal(
          [200, 202].includes(replay.status),
          true,
          `replay status ${replay.status}`
        );
        assert.deepEqual(
          await state(s, created.id, f.transactionID),
          settled,
          "replaying the settle changes nothing"
        );
        const lapse = await inCommerceTransaction(req, () =>
          lapseDueGuestInvites({ req, now: Date.now() + 72 * HOUR })
        );
        assert.equal(
          lapse.lapsed.includes(created.id) ||
            lapse.deferred.includes(created.id),
          false,
          "a paid invite never lapses"
        );
        assert.deepEqual(await state(s, created.id, f.transactionID), settled);
        st.diagnostic(
          "initiated through the real adapter without an address; settled once; membership stayed applicant; no key intent; replay and lapse changed nothing"
        );
      }
    );

    await t.test(
      "a rolled-back settle leaves the invite holding its place, unpaid",
      async (st) => {
        await db.pool.query(
          "CREATE TABLE guest_commit_parent (id int PRIMARY KEY); CREATE TABLE guest_commit_child (id int REFERENCES guest_commit_parent(id) DEFERRABLE INITIALLY DEFERRED)"
        );
        st.after(() =>
          db.pool
            .query("DROP TABLE guest_commit_child, guest_commit_parent")
            .then(() => {})
        );
        const s = await seedEvent(db.payload, "applicant");
        // A roomy event, so the membership cart can only fail for its missing address.
        await assert.rejects(
          initiate(db.payload, s, s.membershipCartID),
          /shipping address is required/,
          "the membership offer still needs its address"
        );
        assert.equal(await attempts(s.membershipCartID), 0);
        const created = await invite(db.payload, s);
        const f = await initiate(db.payload, s, s.cartID);
        const before = await state(s, created.id, f.transactionID);
        const start = db.sqlTrace.length;
        let reached = false;
        const outcome = await confirm(f, {
          beforeConfirm: async (req) => {
            reached = true;
            await (
              await nativeSession(req)
            ).execute(sql`INSERT INTO guest_commit_child (id) VALUES (1)`);
          }
        }).then(
          (response) => response.status,
          (error: unknown) =>
            error instanceof Error ? error.message : "rejected"
        );
        assert.equal(reached, true, "the settle transaction ran to COMMIT");
        assert.notEqual(outcome, 200);
        assert.equal(db.sqlTrace.slice(start).includes("rollback"), true);
        assert.deepEqual(
          await state(s, created.id, f.transactionID),
          before,
          "invite, place, order, admission and membership all rolled back"
        );
        assert.equal(before.invite, "pending_payment");
        assert.equal(before.eventReserved, 1);
        st.diagnostic(
          `deferred-constraint COMMIT failure (${String(outcome)}); invite still pending with its place held`
        );
      }
    );

    await t.test(
      "after 48 hours the lapse releases an unpaid hold once; a rolled-back lapse changes nothing",
      async (st) => {
        const s = await seedEvent(db.payload, "approved");
        const created = await invite(db.payload, s, Date.now() - 49 * HOUR);
        const pending = await state(s, created.id);
        assert.equal(pending.eventReserved, 1);
        const req = await createLocalReq({}, db.payload);
        const failure = new Error("forced lapse rollback");
        await assert.rejects(
          inCommerceTransaction(req, async () => {
            const result = await lapseDueGuestInvites({ req });
            assert.equal(result.lapsed.includes(created.id), true);
            throw failure;
          }),
          (error) => error === failure
        );
        assert.deepEqual(
          await state(s, created.id),
          pending,
          "a rolled-back lapse keeps the invite and its place"
        );
        const first = await inCommerceTransaction(req, () =>
          lapseDueGuestInvites({ req })
        );
        assert.equal(first.lapsed.includes(created.id), true);
        const lapsed = await state(s, created.id);
        assert.deepEqual(
          {
            invite: lapsed.invite,
            notice: lapsed.notice,
            open: lapsed.open,
            eventReserved: lapsed.eventReserved
          },
          { invite: "lapsed", notice: "lapsed", open: false, eventReserved: 0 }
        );
        const second = await inCommerceTransaction(req, () =>
          lapseDueGuestInvites({ req })
        );
        assert.equal(second.lapsed.includes(created.id), false);
        assert.deepEqual(
          await state(s, created.id),
          lapsed,
          "a second run changes nothing"
        );
        const again = await invite(db.payload, s);
        assert.equal(
          (await state(s, again.id)).eventReserved,
          1,
          "the member can send a new invite"
        );
        st.diagnostic(
          "rollback kept the hold; lapse released it once; second run no-op; new invite accepted"
        );
      }
    );
  }
);
