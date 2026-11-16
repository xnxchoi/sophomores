import { pathToFileURL } from "node:url";
import type { CatchUpResult } from "../src/lib/commerce/keys/member-wallet";

/*
 * Member-wallet catch-up (ADR-0013). Members who paid while the custody owner
 * (MEMBER_WALLET_OWNER_ADDRESS) or the lock was not configured have Signet
 * intents still awaiting a wallet. Settlement can't help them later, so this
 * command gives each one their Safe and attaches the intents, through the same
 * locked, idempotent path settlement uses. It makes no network call.
 *
 * Run by hand, once, after the owner is first configured, and again whenever
 * that configuration was missing while payments settled. Nothing runs it on a timer.
 *
 *   python3 scripts/resource-guard.py --max-gib 4 --node-old-space-mib 2048 \
 *     --timeout 600 --log "$PWD/.tmp/member-wallet-catch-up.log" -- \
 *     node --import tsx scripts/member-wallet-catch-up.ts --confirm-member-wallet-catch-up
 */
export const CATCH_UP_CONFIRMATION = "--confirm-member-wallet-catch-up";
/** Each pass handles a bounded number of members; this bounds one run. */
export const MAX_CATCH_UP_PASSES = 20;

export type CatchUpRun = { moved: number; members: number; passes: number; more: boolean };

export async function runMemberWalletCatchUp(
  argv: readonly string[],
  {
    configured,
    catchUp,
    log
  }: {
    configured: boolean;
    catchUp: () => Promise<CatchUpResult>;
    log: (line: string) => void;
  }
): Promise<CatchUpRun> {
  if (argv.length !== 1 || argv[0] !== CATCH_UP_CONFIRMATION)
    throw new Error(`Explicit confirmation required: pass ${CATCH_UP_CONFIRMATION}.`);
  if (!configured)
    throw new Error(
      "Member wallets are not configured: set MEMBER_WALLET_OWNER_ADDRESS and MEMBER_WALLET_LOCK_ADDRESS first."
    );
  const run: CatchUpRun = { moved: 0, members: 0, passes: 0, more: false };
  while (run.passes < MAX_CATCH_UP_PASSES) {
    const pass = await catchUp();
    run.passes++;
    run.moved += pass.moved;
    run.members += pass.members;
    run.more = pass.more;
    // Held intents stay awaiting; a pass that attaches nothing would only repeat itself.
    if (!pass.more || pass.moved === 0) break;
  }
  log(`${run.moved} Signet intents attached for ${run.members} members in ${run.passes} passes.`);
  if (run.more)
    log("More members are still awaiting a wallet (held, or beyond this run's bound). Run the command again later.");
  return run;
}

async function main() {
  const argv = process.argv.slice(2);
  const { loadEnvConfig } = await import("@next/env");
  loadEnvConfig(process.cwd());
  const { loadWalletConfig } = await import("../src/lib/member-auth/wallet/config");
  let configured = false;
  try {
    configured = loadWalletConfig() !== null;
  } catch {
    throw new Error("Member wallet configuration is invalid. Check MEMBER_WALLET_OWNER_ADDRESS, MEMBER_WALLET_LOCK_ADDRESS and MEMBER_WALLET_CHAIN_ID.");
  }
  // Refuse before connecting to the database.
  const refused = async () => {
    throw new Error("unreachable");
  };
  if (argv.length !== 1 || argv[0] !== CATCH_UP_CONFIRMATION || !configured) {
    await runMemberWalletCatchUp(argv, { configured, catchUp: refused, log: console.log });
    return;
  }
  const { catchUpKeyGrantTargets } = await import("../src/lib/commerce/keys/member-wallet");
  const { getPayload } = await import("../src/payload");
  const payload = await getPayload();
  try {
    await runMemberWalletCatchUp(argv, {
      configured,
      catchUp: () => catchUpKeyGrantTargets({ payload }),
      log: console.log
    });
  } finally {
    await payload.destroy();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().then(
    () => process.exit(0),
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : "Member wallet catch-up failed.");
      process.exit(1);
    }
  );
}
