import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import type { Payload, PayloadRequest } from "payload";

// Disposable loopback container created for this proof only and removed afterwards.
const target = {
  container: "sphmrs-wallet-activation-20261116",
  port: 55493,
  database: "wallet_activation_proof"
};
const LOCK = "0x00000000000000000000000000000000000000a1";
const SAFE = "0x00000000000000000000000000000000000000b2";

test(
  "wallet activation attaches awaiting keys under the member+chain lock (PostgreSQL)",
  {
    skip: process.env.WALLET_ACTIVATION_DATABASE_TESTS !== "1",
    timeout: 240_000
  },
  async (t) => {
    process.env.MEMBER_WALLET_LOCK_ADDRESS = LOCK;
    const { isolateTransport, openProofDatabase, seedAttempt, confirmation } =
      await import("../core/payment-postgres-fixture");
    const { runReconciliation } =
      await import("../../../src/lib/commerce/portone/admission");
    const { assertPaymentRiskReviewed } =
      await import("../../../src/lib/commerce/portone/review");
    const { attachMemberKeyGrants, catchUpKeyGrantTargets } =
      await import("../../../src/lib/commerce/keys/activation");
    const { lockCommerce } =
      await import("../../../src/lib/commerce/_shared/transaction");
    const { withWalletWrite } =
      await import("../../../src/lib/member-auth/wallet/access");
    const { loadWalletConfig, walletLockKey } =
      await import("../../../src/lib/member-auth/wallet/config");
    const config = loadWalletConfig()!;
    isolateTransport(t, target.port);
    const db = await openProofDatabase(true, new Set(), target);
    t.after(db.close);
    t.diagnostic(
      `PostgreSQL ${db.version}; loopback only; provider evidence synthetic; no RPC`
    );
    type Attempt = Awaited<ReturnType<typeof seedAttempt>>;

    // Same ownership path as the Sunday membership proof: ledger-owned official confirmation.
    const settle = async (f: Attempt) => {
      await delay(1100); // provider-GET rate and per-attempt cooldown
      const attempt = await confirmation(db.payload, f);
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
      assert.equal(response.status, 200, `settle status ${response.status}`);
    };
    const intent = async (f: Attempt) =>
      (
        await db.control.query(
          "SELECT id::text, state::text, target, entitlement_id::text AS admission FROM commerce_key_grant_intents WHERE payment_id=$1::uuid",
          [f.transactionID]
        )
      ).rows[0] as {
        id: string;
        state: string;
        target: { chainID: number; lock: string; recipient: string } | null;
        admission: string;
      };
    const walletRow = (
      memberID: string,
      safeAddress: string,
      status: "active" | "pending" = "active"
    ) => ({
      member: memberID,
      chainID: 84532,
      status,
      ...(status === "active"
        ? {
            activeSlot: `${memberID}:84532`,
            activeWalletKey: `84532:${safeAddress.toLowerCase()}`
          }
        : {}),
      walletKey: `84532:${safeAddress.toLowerCase()}`,
      memberWalletKey: `${memberID}:84532:${safeAddress.toLowerCase()}`,
      credentialSource: "wallet_passkey",
      credentialID: "Y3JlZGVudGlhbA",
      publicKey: "cHVibGlj",
      publicKeyX: `0x${"1".repeat(64)}`,
      publicKeyY: `0x${"2".repeat(64)}`,
      rpID: "localhost",
      origin: "http://localhost:3000",
      counter: 0,
      verifierAddress: `0x${"3".repeat(40)}`,
      ownerAddress: `0x${"4".repeat(40)}`,
      safeAddress,
      proxyFactoryAddress: `0x${"5".repeat(40)}`,
      singletonAddress: `0x${"6".repeat(40)}`,
      safeVersion: "1.4.1",
      saltNonce: "0",
      configHash: "f".repeat(64),
      boundAt: new Date().toISOString()
    });
    /** An activation transaction as bind/verify runs it: lock, write the wallet through its hook, attach. Left open until `commit`. */
    const openActivation = async (
      payload: Payload,
      memberID: string,
      safeAddress: string
    ) => {
      const transactionID = await payload.db.beginTransaction();
      assert.ok(transactionID);
      const req = {
        payload,
        transactionID,
        context: {}
      } as unknown as PayloadRequest;
      try {
        await lockCommerce(req, [walletLockKey(memberID, config.chainID)]);
        await withWalletWrite(req, () =>
          payload.create({
            collection: "member-wallets" as never,
            data: walletRow(memberID, safeAddress) as never,
            overrideAccess: true,
            req
          })
        );
        const moved = await attachMemberKeyGrants(
          req,
          { memberID, chainID: 84532, safeAddress },
          config
        );
        return {
          moved,
          commit: () => payload.db.commitTransaction(transactionID)
        };
      } catch (error) {
        await payload.db.rollbackTransaction(transactionID);
        throw error;
      }
    };
    const expected = { chainID: 84532, lock: LOCK, recipient: SAFE };

    // One member: an eligible paid order, one whose admission is under review, one cancelled.
    const eligible = await seedAttempt(db.payload);
    const memberID = eligible.customerID;
    const held = await seedAttempt(db.payload, undefined, memberID);
    const cancelled = await seedAttempt(db.payload, undefined, memberID);
    for (const f of [eligible, held, cancelled]) await settle(f);
    for (const f of [eligible, held, cancelled])
      assert.equal(
        (await intent(f)).state,
        "awaiting_wallet",
        "paying never waits on activation"
      );
    // Fixture preparation only (as the shared fixture seeds rows): put one on hold, cancel another.
    await db.payload.db.updateOne({
      collection: "commerce-admissions",
      id: (await intent(held)).admission,
      data: { benefitReview: true }
    });
    await db.payload.db.updateOne({
      collection: "commerce-key-grant-intents",
      id: (await intent(cancelled)).id,
      data: { state: "cancelled", cancelledAt: new Date().toISOString() }
    });
    const late = await seedAttempt(db.payload, undefined, memberID);

    await t.test(
      "activation attaches the eligible intent; a settlement racing it attaches too",
      async (st) => {
        const activation = await openActivation(db.payload, memberID, SAFE);
        assert.deepEqual(
          activation.moved,
          [(await intent(eligible)).id],
          "only the eligible intent is attached"
        );
        // The late payment settles while activation still holds the member+chain lock.
        const racing = settle(late);
        await delay(2500);
        const waiting = (
          await db.control.query(
            "SELECT status FROM transactions WHERE id=$1::uuid",
            [late.transactionID]
          )
        ).rows[0] as { status: string };
        assert.equal(
          waiting.status,
          "pending",
          "settlement waits on the wallet lock"
        );
        await activation.commit();
        await racing;
        for (const f of [eligible, late]) {
          const row = await intent(f);
          assert.equal(row.state, "pending");
          assert.deepEqual(row.target, expected);
        }
        st.diagnostic(
          "settlement that landed just after activation attached immediately"
        );
      }
    );

    await t.test("held and cancelled intents are untouched", async () => {
      const onHold = await intent(held);
      assert.equal(onHold.state, "awaiting_wallet");
      assert.equal(onHold.target, null);
      const gone = await intent(cancelled);
      assert.equal(gone.state, "cancelled");
      assert.equal(gone.target, null);
    });

    await t.test(
      "a second active wallet for the member is refused by the database",
      async () => {
        await assert.rejects(
          openActivation(
            db.payload,
            memberID,
            "0x00000000000000000000000000000000000000c3"
          ).then(async (activation) => {
            await activation.commit();
          })
        );
        const wallets = (
          await db.control.query(
            "SELECT safe_address FROM member_wallets WHERE member_id=$1::uuid AND status='active'",
            [memberID]
          )
        ).rows;
        assert.deepEqual(wallets, [{ safe_address: SAFE }]);
      }
    );

    await t.test(
      "an active wallet cannot be retired or retargeted through Payload",
      async () => {
        const [wallet] = (
          await db.control.query(
            "SELECT id::text FROM member_wallets WHERE member_id=$1::uuid",
            [memberID]
          )
        ).rows as { id: string }[];
        const req = {
          payload: db.payload,
          context: {}
        } as unknown as PayloadRequest;
        await assert.rejects(
          withWalletWrite(req, () =>
            db.payload.update({
              collection: "member-wallets" as never,
              id: wallet.id,
              data: { status: "pending", activeSlot: null } as never,
              overrideAccess: true,
              req
            })
          ),
          /cannot be retired/
        );
        await assert.rejects(
          withWalletWrite(req, () =>
            db.payload.update({
              collection: "member-wallets" as never,
              id: wallet.id,
              data: { safeAddress: `0x${"c".repeat(40)}` } as never,
              overrideAccess: true,
              req
            })
          ),
          /immutable/
        );
        await assert.rejects(
          db.payload.update({
            collection: "member-wallets" as never,
            id: wallet.id,
            data: { counter: 9 } as never,
            overrideAccess: true,
            req
          }),
          /server owned/
        );
      }
    );

    await t.test(
      "releasing the review hold attaches the intent through the admission's own hook",
      async () => {
        // Released through the Local API, so the collection hook runs in PostgreSQL.
        await db.payload.update({
          collection: "commerce-admissions" as never,
          id: (await intent(held)).admission,
          data: { benefitReview: false } as never,
          overrideAccess: true
        });
        const row = await intent(held);
        assert.equal(row.state, "pending");
        assert.deepEqual(row.target, expected);
        assert.equal((await intent(cancelled)).state, "cancelled");
        const sweep = await catchUpKeyGrantTargets({
          payload: db.payload,
          config
        });
        assert.equal(sweep.moved, 0, "nothing is left for the explicit sweep");
        assert.equal(sweep.more, false);
      }
    );

    await t.test(
      "a pending duplicate of another member's key never blocks; an active duplicate is refused",
      async () => {
        const otherMember = (await seedAttempt(db.payload)).customerID;
        const shared = "0x00000000000000000000000000000000000000d4";
        const req = {
          payload: db.payload,
          context: {}
        } as unknown as PayloadRequest;
        const create = (data: Record<string, unknown>) =>
          withWalletWrite(req, () =>
            db.payload.create({
              collection: "member-wallets" as never,
              data: data as never,
              overrideAccess: true,
              req
            })
          );
        const pending = walletRow(otherMember, shared, "pending");
        delete (pending as Record<string, unknown>).boundAt;
        await create(pending);
        // The same Safe as another member's pending row: allowed (a pending row proves nothing).
        const thirdMember = (await seedAttempt(db.payload)).customerID;
        await create(walletRow(thirdMember, shared));
        // A second ACTIVE wallet on the same Safe is refused by the database.
        await assert.rejects(create(walletRow(otherMember, shared)));
        const rows = (
          await db.control.query(
            "SELECT status FROM member_wallets WHERE wallet_key=$1 ORDER BY status",
            [`84532:${shared}`]
          )
        ).rows;
        assert.deepEqual(
          rows.map((row: { status: string }) => row.status),
          ["active", "pending"]
        );
      }
    );

    await t.test(
      "deleting a member keeps the wallet record, anonymised",
      async () => {
        // A member with nothing but a wallet, so only the wallet's own foreign key is exercised.
        const departing = (await db.payload.db.create({
          collection: "users",
          data: {
            email: `departing-${Date.now()}@fixture.invalid`,
            name: "Fixture"
          } as never
        })) as unknown as { id: string };
        const req = {
          payload: db.payload,
          context: {}
        } as unknown as PayloadRequest;
        const wallet = (await withWalletWrite(req, () =>
          db.payload.create({
            collection: "member-wallets" as never,
            data: walletRow(
              String(departing.id),
              "0x00000000000000000000000000000000000000e5"
            ) as never,
            overrideAccess: true,
            req
          })
        )) as unknown as { id: string };
        await db.payload.db.deleteOne({
          collection: "users",
          where: { id: { equals: departing.id } }
        });
        const after = (
          await db.control.query(
            "SELECT member_id, status::text FROM member_wallets WHERE id=$1::uuid",
            [wallet.id]
          )
        ).rows[0] as { member_id: string | null; status: string };
        assert.deepEqual(after, { member_id: null, status: "active" });
      }
    );
  }
);
