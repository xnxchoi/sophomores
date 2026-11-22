import assert from "node:assert/strict";
import test from "node:test";
import { walletCatchUpJobs, memberWalletCatchUpTask, MEMBER_WALLET_QUEUE } from "@/payload/tasks/member-wallet-catch-up";
import { WALLET_CATCH_UP_LIMITS } from "@/lib/commerce/keys/wallet-catch-up";

test("catch-up registers one private, bounded task without queueing or starting a scheduler", async () => {
  assert.deepEqual(walletCatchUpJobs.tasks, [memberWalletCatchUpTask]);
  assert.equal(memberWalletCatchUpTask.slug, MEMBER_WALLET_QUEUE);
  assert.equal(memberWalletCatchUpTask.schedule, undefined);
  assert.equal(memberWalletCatchUpTask.retries, 0);
  assert.equal("autoRun" in walletCatchUpJobs, false);
  assert.equal(await walletCatchUpJobs.access.queue(), false);
  assert.equal(await walletCatchUpJobs.access.run(), false);
  assert.equal(await walletCatchUpJobs.access.cancel(), false);
  assert.deepEqual(WALLET_CATCH_UP_LIMITS, {
    transactions: 1, pages: 1, rows: 20, selectedRows: 21, locks: 81, deadlineMs: 5000,
  });
});
