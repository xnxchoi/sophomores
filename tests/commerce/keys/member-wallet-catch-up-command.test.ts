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
      return results.shift() ?? { moved: 0, members: 0, more: false, cursor: undefined };
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

test("it carries the cursor across passes, keeps going past a cohort that attached nothing, and is bounded", async () => {
  const seen: (string | undefined)[] = [];
  const passes: CatchUpResult[] = [
    { moved: 0, members: 2, more: true, cursor: "m2" },
    { moved: 3, members: 1, more: true, cursor: "m3" },
    { moved: 1, members: 1, more: false, cursor: "m4" }
  ];
  const lines: string[] = [];
  const result = await runMemberWalletCatchUp([CATCH_UP_CONFIRMATION], {
    configured: true,
    catchUp: async (after) => {
      seen.push(after);
      return passes.shift()!;
    },
    log: (line) => lines.push(line)
  });
  assert.deepEqual(seen, [undefined, "m2", "m3"], "each pass starts after the last member of the one before");
  assert.deepEqual(result, { moved: 4, members: 4, passes: 3, more: false });
  assert.match(lines.join("\n"), /4 Signet intents attached; 4 members checked/);

  const stalled = sweep(Array.from({ length: 50 }, () => ({ moved: 0, members: 1, more: true, cursor: "same" })));
  const stopped = await runMemberWalletCatchUp([CATCH_UP_CONFIRMATION], { configured: true, catchUp: stalled.catchUp, log: quiet });
  assert.equal(stalled.calls.length, 2, "a cursor that doesn't move ends the run instead of looping");
  assert.equal(stopped.more, true);

  let next = 0;
  const busy = sweep(Array.from({ length: 50 }, () => ({ moved: 1, members: 1, more: true, cursor: `m${next++}` })));
  const bounded = await runMemberWalletCatchUp([CATCH_UP_CONFIRMATION], { configured: true, catchUp: busy.catchUp, log: quiet });
  assert.equal(busy.calls.length, MAX_CATCH_UP_PASSES);
  assert.equal(bounded.more, true, "a bounded run says more remain instead of stopping silently");
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
