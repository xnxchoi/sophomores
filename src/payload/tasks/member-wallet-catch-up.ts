import type { JobsConfig, TaskConfig } from "payload";
import { catchUpKeyGrantTargets, type WalletCatchUpResult } from "@/lib/commerce/keys/wallet-catch-up";

export const MEMBER_WALLET_QUEUE = "member-wallet-catch-up";

export const memberWalletCatchUpTask: TaskConfig<{ input: Record<string, never>; output: WalletCatchUpResult }> = {
  slug: MEMBER_WALLET_QUEUE,
  retries: 0,
  outputSchema: [
    { name: "inspected", type: "number", required: true },
    { name: "moved", type: "number", required: true },
    { name: "held", type: "number", required: true },
    { name: "conflicts", type: "number", required: true },
    { name: "cycleComplete", type: "checkbox", required: true },
  ],
  handler: async ({ req }) => ({ output: await catchUpKeyGrantTargets(req.payload) }),
};

const deny = () => false;

// The Local API can run the registered task in a proof. No automatic trigger or public runner.
export const walletCatchUpJobs = {
  tasks: [memberWalletCatchUpTask],
  deleteJobOnComplete: false,
  access: { queue: deny, run: deny, cancel: deny },
} satisfies JobsConfig;
