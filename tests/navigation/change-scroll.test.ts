import assert from "node:assert/strict";
import { test } from "node:test";
import { createChangeScroll } from "../../src/providers/Navigation/change-scroll";

// Every ordering of one page change's two halves (exfil = end of leave, entry) with an optional
// Back/Forward step (pop) at each point. Expected: either half may reset the scroll only if no pop arrived
// while that change was still pending; a pop after both settled is ordinary history.

type Step = "pop" | "exfil" | "entry";
function run(steps: Step[]) {
  const change = createChangeScroll();
  change.leave();
  const resets: Partial<Record<"exfil" | "entry", boolean>> = {};
  for (const step of steps) {
    if (step === "pop") change.pop();
    else resets[step] = change[step]();
  }
  return resets;
}

test("no Back: both halves reset, in either order", () => {
  assert.deepEqual(run(["exfil", "entry"]), { exfil: true, entry: true });
  assert.deepEqual(run(["entry", "exfil"]), { exfil: true, entry: true });
});

test("Back before either half finishes: neither resets", () => {
  assert.deepEqual(run(["pop", "exfil", "entry"]), { exfil: false, entry: false });
  assert.deepEqual(run(["pop", "entry", "exfil"]), { exfil: false, entry: false });
});

test("Back between the halves: the later half does not reset", () => {
  assert.deepEqual(run(["exfil", "pop", "entry"]), { exfil: true, entry: false });
  // LOST_PRODUCT: entry first, then a late Back, then the pending leave (Undine S4 v3 MEDIUM).
  assert.deepEqual(run(["entry", "pop", "exfil"]), { exfil: false, entry: true });
});

test("Back after both halves settled is ordinary history and does not leak into the next change", () => {
  const change = createChangeScroll();
  change.leave();
  change.exfil();
  change.entry();
  change.pop();
  change.leave();
  assert.equal(change.exfil(), true);
  assert.equal(change.entry(), true);
});

test("a new change clears an earlier change's Back", () => {
  const change = createChangeScroll();
  change.leave();
  change.pop();
  change.leave();
  assert.equal(change.exfil(), true);
  assert.equal(change.entry(), true);
});
