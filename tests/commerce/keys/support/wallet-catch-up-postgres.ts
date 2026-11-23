import assert from "node:assert/strict";
import type { Payload } from "payload";
import { MEMBER_WALLET_QUEUE } from "@/payload/tasks/member-wallet-catch-up";
import type { WalletCatchUpResult } from "@/lib/commerce/keys/wallet-catch-up";
import { proofTargets } from "../../../support/proof-ports.mjs";

export const database = proofTargets.walletCatchUp;
export const walletEnv = {
  MEMBER_WALLET_CHAIN_ID: "84532",
  MEMBER_WALLET_OWNER_ADDRESS: "0x1111111111111111111111111111111111111111",
  MEMBER_WALLET_LOCK_ADDRESS: "0x2222222222222222222222222222222222222222",
};

export const queue = (payload: Payload) => payload.jobs.queue({ task: MEMBER_WALLET_QUEUE, queue: MEMBER_WALLET_QUEUE, input: {} });

export async function runRegisteredBatch(payload: Payload) {
  assert.equal(payload.config.jobs.autoRun, undefined);
  const job = await queue(payload);
  await payload.jobs.runByID({ id: job.id, silent: true });
  const stored = await payload.findByID({ collection: "payload-jobs", id: job.id, overrideAccess: true });
  const success = stored.log?.find((entry) => entry.taskSlug === MEMBER_WALLET_QUEUE && entry.state === "succeeded");
  assert.ok(success?.output && stored.completedAt, "the registered task must run and acknowledge");
  return success.output as WalletCatchUpResult;
}
