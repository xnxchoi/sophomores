import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { CatchUpResult } from "@/lib/commerce/keys/member-wallet";
import {
  CATCH_UP_CONFIRMATION,
  MAX_CATCH_UP_PASSES,
  runMemberWalletCatchUp
} from "../../../scripts/member-wallet-catch-up";

// Round 5 (Opus 3): members who paid before the custody owner was configured
// get their wallet only from the catch-up sweep. This command is the one
// production caller: run by hand, never on a schedule.

function sweep(results: CatchUpResult[]) {
  const calls: number[] = [];
  return {
    calls,
    catchUp: async () => {
      calls.push(1);
      return results.shift() ?? { moved: 0, members: 0, more: false };
    }
  };
}
const quiet = () => {};

test("it runs only when explicitly confirmed and only when member wallets are configured", async () => {
  const s = sweep([{ moved: 1, members: 1, more: false }]);
  for (const argv of [[], ["--confirm"], [CATCH_UP_CONFIRMATION, "--extra"]])
    await assert.rejects(
      runMemberWalletCatchUp(argv, {
        configured: true,
        catchUp: s.catchUp,
        log: quiet
      }),
      /confirmation/i
    );
  await assert.rejects(
    runMemberWalletCatchUp([CATCH_UP_CONFIRMATION], {
      configured: false,
      catchUp: s.catchUp,
      log: quiet
    }),
    /MEMBER_WALLET_OWNER_ADDRESS/
  );
  assert.equal(
    s.calls.length,
    0,
    "nothing is swept without confirmation and configuration"
  );
});

test("it keeps sweeping while members remain and stops when a pass makes no progress", async () => {
  const s = sweep([
    { moved: 3, members: 2, more: true },
    { moved: 1, members: 1, more: false }
  ]);
  const lines: string[] = [];
  const result = await runMemberWalletCatchUp([CATCH_UP_CONFIRMATION], {
    configured: true,
    catchUp: s.catchUp,
    log: (line) => lines.push(line)
  });
  assert.deepEqual(result, { moved: 4, members: 3, passes: 2, more: false });
  assert.match(
    lines.join("\n"),
    /4 Signet intents attached; 3 members checked/
  );

  const stuck = sweep(
    Array.from({ length: 50 }, () => ({ moved: 0, members: 5, more: true }))
  );
  const held = await runMemberWalletCatchUp([CATCH_UP_CONFIRMATION], {
    configured: true,
    catchUp: stuck.catchUp,
    log: quiet
  });
  assert.equal(
    stuck.calls.length,
    1,
    "a pass that attaches nothing ends the run instead of repeating it"
  );
  assert.equal(held.more, true);

  const busy = sweep(
    Array.from({ length: 50 }, () => ({ moved: 1, members: 1, more: true }))
  );
  const bounded = await runMemberWalletCatchUp([CATCH_UP_CONFIRMATION], {
    configured: true,
    catchUp: busy.catchUp,
    log: quiet
  });
  assert.equal(busy.calls.length, MAX_CATCH_UP_PASSES);
  assert.equal(
    bounded.more,
    true,
    "a bounded run says more remain instead of stopping silently"
  );
});

test("a second run after everything is attached changes nothing", async () => {
  const s = sweep([
    { moved: 2, members: 2, more: false },
    { moved: 0, members: 0, more: false }
  ]);
  const options = { configured: true, catchUp: s.catchUp, log: quiet };
  assert.equal(
    (await runMemberWalletCatchUp([CATCH_UP_CONFIRMATION], options)).moved,
    2
  );
  assert.deepEqual(
    await runMemberWalletCatchUp([CATCH_UP_CONFIRMATION], options),
    { moved: 0, members: 0, passes: 1, more: false }
  );
});

test("the command calls the real sweep and has no scheduler", () => {
  const source = readFileSync("scripts/member-wallet-catch-up.ts", "utf8");
  assert.match(source, /catchUpKeyGrantTargets\(/);
  assert.doesNotMatch(source, /setInterval|setTimeout|cron|schedule/i);
});
