import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import type { PayloadRequest } from "payload";

// Disposable loopback container created for this proof only and removed afterwards.
const target = {
  container: "sphmrs-wallet-activation-20261116",
  port: 55498,
  database: "wallet_activation_proof"
};
const LOCK = "0x00000000000000000000000000000000000000a1";
const OWNER = "0x1111111111111111111111111111111111111111"; // throwaway custody owner

test(
  "a settled membership payment creates the member's wallet and attaches the Signet (PostgreSQL)",
  {
    skip: process.env.WALLET_ACTIVATION_DATABASE_TESTS !== "1",
    timeout: 240_000
  },
  async (t) => {
    process.env.MEMBER_WALLET_LOCK_ADDRESS = LOCK;
    process.env.MEMBER_WALLET_OWNER_ADDRESS = OWNER;
    const { isolateTransport, openProofDatabase, seedAttempt, confirmation } =
      await import("../core/payment-postgres-fixture");
    const { runReconciliation } =
      await import("../../../src/lib/commerce/portone/admission");
    const { assertPaymentRiskReviewed } =
      await import("../../../src/lib/commerce/portone/review");
    const { catchUpKeyGrantTargets, ensureMemberWallet } =
      await import("../../../src/lib/commerce/keys/member-wallet");
    const { lockCommerce } =
      await import("../../../src/lib/commerce/_shared/transaction");
    const { withWalletWrite } =
      await import("../../../src/lib/member-auth/wallet/access");
    const { loadWalletConfig, walletLockKey } =
      await import("../../../src/lib/member-auth/wallet/config");
    const { predictMemberSafe } =
      await import("../../../src/lib/member-auth/wallet/safe");
    const config = loadWalletConfig()!;
    isolateTransport(t, target.port);
    const db = await openProofDatabase(true, new Set(), target);
    t.after(db.close);
    t.diagnostic(
      `PostgreSQL ${db.version}; loopback only; provider evidence synthetic; no RPC`
    );
    type Attempt = Awaited<ReturnType<typeof seedAttempt>>;

    // Same ownership path as the Sunday membership proof: ledger-owned official confirmation.
    const settle = async (f: Attempt, replay = false) => {
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
      assert.ok(
        replay ? [200, 202].includes(response.status) : response.status === 200,
        `settle status ${response.status}`
      );
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
    const wallets = async (memberID: string) =>
      (
        await db.control.query(
          "SELECT * FROM member_wallets WHERE member_id=$1::uuid ORDER BY created_at",
          [memberID]
        )
      ).rows as Record<string, unknown>[];
    const paymentStatus = async (f: Attempt) =>
      (
        (
          await db.control.query(
            "SELECT status::text FROM transactions WHERE id=$1::uuid",
            [f.transactionID]
          )
        ).rows[0] as { status: string }
      ).status;
    const signetTarget = (memberID: string) => ({
      chainID: 84532,
      lock: LOCK,
      recipient: predictMemberSafe({ chainID: 84532, owner: OWNER, memberID })
        .safeAddress
    });
    const withoutOwner = async <T>(work: () => Promise<T>): Promise<T> => {
      delete process.env.MEMBER_WALLET_OWNER_ADDRESS;
      try {
        return await work();
      } finally {
        process.env.MEMBER_WALLET_OWNER_ADDRESS = OWNER;
      }
    };
    const serverReq = () =>
      ({ payload: db.payload, context: {} }) as unknown as PayloadRequest;

    const first = await seedAttempt(db.payload);
    const memberID = first.customerID;

    await t.test(
      "settling creates exactly one active wallet, owned by the custody key, and the Signet intent goes pending to that Safe",
      async (st) => {
        assert.deepEqual(await wallets(memberID), [], "no wallet before payment");
        await settle(first);
        const rows = await wallets(memberID);
        assert.equal(rows.length, 1);
        const safe = predictMemberSafe({ chainID: 84532, owner: OWNER, memberID });
        const [row] = rows;
        assert.equal(row.status, "active");
        assert.equal(row.active_slot, `${memberID}:84532`);
        assert.equal(row.safe_address, safe.safeAddress);
        assert.equal(row.owner_address, safe.ownerAddress);
        assert.equal(Number(row.threshold), 1);
        assert.equal(row.salt_nonce, safe.saltNonce);
        assert.equal(row.safe_version, "1.4.1");
        assert.equal(row.proxy_factory_address, safe.proxyFactoryAddress);
        assert.equal(row.singleton_address, safe.singletonAddress);
        assert.equal(row.fallback_handler_address, safe.fallbackHandlerAddress);
        assert.equal(row.config_hash, safe.configHash);
        const signet = await intent(first);
        assert.equal(signet.state, "pending");
        assert.deepEqual(signet.target, signetTarget(memberID));
        st.diagnostic(`Safe ${safe.safeAddress} computed offline; no network call (transport isolated)`);
      }
    );

    await t.test("replaying the settle changes nothing", async () => {
      const walletsBefore = await wallets(memberID);
      const intentBefore = await intent(first);
      await settle(first, true);
      assert.deepEqual(await wallets(memberID), walletsBefore);
      assert.deepEqual(await intent(first), intentBefore);
    });

    await t.test(
      "a payment settling while another transaction holds the member's wallet lock waits, then shares that wallet",
      async (st) => {
        const f = await seedAttempt(db.payload);
        const member = f.customerID;
        // Another transaction (as the hold-release hook or the sweep runs it) takes the lock and creates the wallet.
        const transactionID = await db.payload.db.beginTransaction();
        assert.ok(transactionID);
        const req = { payload: db.payload, transactionID, context: {} } as unknown as PayloadRequest;
        await lockCommerce(req, [walletLockKey(member, config.chainID)]);
        await ensureMemberWallet(req, member, config);
        const racing = settle(f);
        await delay(2500);
        assert.equal(await paymentStatus(f), "pending", "settlement waits on the wallet lock");
        await db.payload.db.commitTransaction(transactionID);
        await racing;
        assert.equal((await wallets(member)).length, 1);
        const row = await intent(f);
        assert.equal(row.state, "pending");
        assert.deepEqual(row.target, signetTarget(member));
        st.diagnostic("the settlement found the committed wallet and attached to it");
      }
    );

    await t.test(
      "without a configured owner, settle still succeeds and the intent stays awaiting a wallet; the sweep catches up once it is configured",
      async () => {
        const f = await seedAttempt(db.payload);
        await withoutOwner(() => settle(f));
        assert.equal(await paymentStatus(f), "succeeded");
        const row = await intent(f);
        assert.equal(row.state, "awaiting_wallet");
        assert.equal(row.target, null);
        assert.deepEqual(await wallets(f.customerID), []);
        const sweep = await catchUpKeyGrantTargets({ payload: db.payload, config });
        assert.ok(sweep.moved >= 1);
        assert.equal(sweep.more, false);
        assert.equal((await wallets(f.customerID)).length, 1);
        assert.deepEqual((await intent(f)).target, signetTarget(f.customerID));
      }
    );

    await t.test(
      "held and cancelled intents are untouched; releasing the hold attaches through the admission's own hook",
      async () => {
        const held = await seedAttempt(db.payload);
        const member = held.customerID;
        const cancelled = await seedAttempt(db.payload, undefined, member);
        await withoutOwner(async () => {
          await settle(held);
          await settle(cancelled);
        });
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
        await catchUpKeyGrantTargets({ payload: db.payload, config });
        assert.equal((await wallets(member)).length, 1, "the wallet exists even while the Signet is held");
        assert.equal((await intent(held)).state, "awaiting_wallet");
        assert.equal((await intent(cancelled)).state, "cancelled");
        // Released through the Local API, so the collection hook runs in PostgreSQL.
        await db.payload.update({
          collection: "commerce-admissions" as never,
          id: (await intent(held)).admission,
          data: { benefitReview: false } as never,
          overrideAccess: true
        });
        const row = await intent(held);
        assert.equal(row.state, "pending");
        assert.deepEqual(row.target, signetTarget(member));
        assert.equal((await intent(cancelled)).state, "cancelled");
        assert.equal((await wallets(member)).length, 1);
      }
    );

    await t.test(
      "the database refuses a second active wallet for a member and a second member on one Safe",
      async () => {
        const [row] = await wallets(memberID);
        const safe = predictMemberSafe({ chainID: 84532, owner: OWNER, memberID });
        const data = {
          member: memberID,
          chainID: 84532,
          status: "active",
          activeSlot: `${memberID}:84532`,
          walletKey: `84532:${safe.safeAddress.toLowerCase()}`,
          safeAddress: safe.safeAddress,
          ownerAddress: safe.ownerAddress,
          threshold: 1,
          saltNonce: safe.saltNonce,
          safeVersion: safe.safeVersion,
          proxyFactoryAddress: safe.proxyFactoryAddress,
          singletonAddress: safe.singletonAddress,
          fallbackHandlerAddress: safe.fallbackHandlerAddress,
          configHash: safe.configHash,
          boundAt: new Date().toISOString()
        };
        // Through Payload with the capability: the hook accepts it, the unique slot refuses it.
        const req = serverReq();
        await assert.rejects(
          withWalletWrite(req, () =>
            db.payload.create({ collection: "member-wallets" as never, data: data as never, overrideAccess: true, req })
          )
        );
        // Below the hooks: another member on the same Safe is refused by the unique wallet key.
        const other = (await seedAttempt(db.payload)).customerID;
        await assert.rejects(
          db.payload.db.create({
            collection: "member-wallets",
            data: { ...data, member: other, activeSlot: `${other}:84532` } as never
          })
        );
        assert.deepEqual(await wallets(memberID), [row]);
        assert.deepEqual(await wallets(other), []);
      }
    );

    await t.test(
      "a wallet can't be retired, retargeted, removed or written without the capability",
      async () => {
        const [wallet] = await wallets(memberID);
        const req = serverReq();
        for (const data of [
          { status: "pending" },
          { safeAddress: `0x${"c".repeat(40)}` },
          { ownerAddress: `0x${"2".repeat(40)}` },
          { activeSlot: "someone:84532" }
        ])
          await assert.rejects(
            withWalletWrite(req, () =>
              db.payload.update({ collection: "member-wallets" as never, id: String(wallet.id), data: data as never, overrideAccess: true, req })
            ),
            Error,
            JSON.stringify(data)
          );
        await assert.rejects(
          db.payload.update({ collection: "member-wallets" as never, id: String(wallet.id), data: { threshold: 2 } as never, overrideAccess: true, req }),
          /server owned/
        );
        await assert.rejects(
          withWalletWrite(req, () =>
            db.payload.delete({ collection: "member-wallets" as never, id: String(wallet.id), overrideAccess: true, req })
          ),
          /can't be removed/
        );
        assert.deepEqual(await wallets(memberID), [wallet]);
      }
    );

    await t.test(
      "deleting a member keeps the wallet record, anonymised",
      async () => {
        // A member with nothing but a wallet, so only the wallet's own foreign key is exercised.
        const lone = (await db.payload.db.create({
          collection: "users",
          data: { email: `departing-${Date.now()}@fixture.invalid`, name: "Fixture" } as never
        })) as unknown as { id: string };
        const loneID = String(lone.id);
        const req = serverReq();
        await ensureMemberWallet(req, loneID, config);
        const [wallet] = await wallets(loneID);
        assert.ok(wallet);
        await db.payload.db.deleteOne({ collection: "users", where: { id: { equals: loneID } } });
        const after = (
          await db.control.query("SELECT member_id, status::text FROM member_wallets WHERE id=$1::uuid", [wallet.id])
        ).rows[0];
        assert.deepEqual(after, { member_id: null, status: "active" });
      }
    );
  }
);
