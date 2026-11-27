import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { setupCartDom } from "../../fixtures/commerce/cart-dom";

// The stack's removal baseline (Review-B HOLD on 62bad1b8c): does it work? A focus or restore recheck of the shop's
// viewer (the source going null, then back, with the same viewer or another) never animates a removal; a real fall to 0
// for the same viewer does. The sources are the ones shop-home builds: "lines", "browser:<member>", "browser:signed-out",
// or null while the viewer is unknown.
let env: Awaited<ReturnType<typeof setupCartDom>>;
let useStackRemoval: typeof import("../../../src/components/commerce/shop/use-stack-removal").useStackRemoval;

before(async () => {
  env = await setupCartDom();
  useStackRemoval = (await import("../../../src/components/commerce/shop/use-stack-removal")).useStackRemoval;
});
after(async () => { await env.restore(); });

type State = { cartMode: boolean; stageIndex: number; stageID: string | undefined; count: number; source: string | null };
const stage = (count: number, source: string | null): State => ({ cartMode: false, stageIndex: 0, stageID: "e1", count, source });
function run(...states: State[]) {
  const hook = env.ui.renderHook((props: State) => useStackRemoval(props), { initialProps: states[0] });
  for (const next of states.slice(1)) hook.rerender(next);
  const trigger = hook.result.current.trigger;
  hook.unmount();
  return trigger;
}

test("a silent focus recheck with the same viewer: the count drops while unknown, comes back, and nothing animates", () => {
  assert.equal(run(stage(1, "browser:u1"), stage(0, null), stage(1, "browser:u1")), 0);
});

test("a restore that lands on another viewer reseeds its own count and never animates", () => {
  assert.equal(run(stage(1, "browser:u1"), stage(0, null), stage(0, "browser:u2")), 0);
  assert.equal(run(stage(1, "browser:u1"), stage(0, null), stage(0, "browser:signed-out")), 0);
});

test("an actual removal by the same viewer animates once", () => {
  assert.equal(run(stage(1, "browser:u1"), stage(0, "browser:u1")), 1);
  assert.equal(run(stage(1, "browser:signed-out"), stage(0, "browser:signed-out")), 1);
});

test("the baseline is not restored across an unknown gap: a removal after a recheck needs a count seen after it", () => {
  // Seen 1 for u1, unknown, then u1 answers 0 (removed elsewhere while unknown): no animation, the stale 1 is gone.
  assert.equal(run(stage(1, "browser:u1"), stage(0, null), stage(0, "browser:u1")), 0);
  // Then a fresh 1, then a real removal: one animation.
  assert.equal(run(stage(1, "browser:u1"), stage(0, null), stage(1, "browser:u1"), stage(0, "browser:u1")), 1);
});
