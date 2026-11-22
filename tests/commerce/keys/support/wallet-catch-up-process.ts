import assert from "node:assert/strict";
import test from "node:test";
import { sql } from "@payloadcms/db-postgres";
import { isolateTransport, nativeSession, openProofDatabase } from "../../core/payment-postgres-fixture";
import { memberWalletCatchUpTask, walletCatchUpJobs } from "@/payload/tasks/member-wallet-catch-up";
import { database, queue, runRegisteredBatch } from "./wallet-catch-up-postgres";

test("private disposable catch-up process", { skip: !process.send || process.env.W2_WALLET_DATABASE_TESTS !== "1", timeout: 20_000 }, async (t) => {
  const mode = process.env.W2_CHILD_MODE;
  assert.ok(mode === "before" || mode === "ack" || mode === "recover");
  isolateTransport(t, database.port);
  const park = async (state: object) => {
    process.send?.(state);
    await new Promise<void>(() => {});
  };
  const db = await openProofDatabase(false, new Set(), database, {
    ...(mode === "before" ? { checkpointWritten: async (req) => {
      const { rows } = await (await nativeSession(req)).execute(sql`SELECT pg_backend_pid() AS pid,
        (SELECT count(*)::int FROM commerce_key_grant_intents WHERE state='pending') AS attached,
        (SELECT last_moved::int FROM member_wallet_catch_up LIMIT 1) AS moved`);
      await park({ type: "before", ...rows[0] });
    } } : {}),
    ...(mode === "ack" ? { jobs: { ...walletCatchUpJobs, tasks: [{ ...memberWalletCatchUpTask,
      onSuccess: async () => park({ type: "ack" }),
    }] } } : {}),
  });
  t.after(async () => { await db.close(); process.disconnect?.(); });
  if (mode === "recover") {
    process.send?.({ type: "recovered", result: await runRegisteredBatch(db.payload) });
  } else {
    const job = await queue(db.payload);
    await db.payload.jobs.runByID({ id: job.id, silent: true });
    assert.fail("crash-mode worker did not reach its barrier");
  }
});
