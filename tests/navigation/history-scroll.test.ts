import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  createHistoryScroll,
  putScroll,
  restoreScroll,
  RESTORE_FRAMES,
  routedAddress,
  type RestoreWorld
} from "../../src/providers/Navigation/history-scroll";

// Back/Forward positions per history entry (S6). The transition provider records on scroll, keeps the
// position being left at a link's leave, and restores on popstate. These tests model the browser (session
// history with Navigation API entry keys, a router that commits late, a Lenis that caches its limit); real
// traversal in a browser is checked live.

// ---- A model of the browser -------------------------------------------------------------------------

/** Session history as the browser keeps it: every push gets a new entry key, a replace keeps it. */
function session(url: string) {
  let next = 0;
  const entries = [{ key: `e${next++}`, url, state: {} as Record<string, unknown> }];
  let index = 0;
  return {
    get current() {
      return entries[index];
    },
    push(state: Record<string, unknown>, url: string) {
      entries.splice(index + 1);
      entries.push({ key: `e${next++}`, url, state });
      index = entries.length - 1;
    },
    go(delta: number) {
      index += delta;
    }
  };
}

/** A page, a router that commits when told, a scroller and a frame queue. */
function world(options: { height: number; viewport?: number; key: () => string | null }) {
  const page = { height: options.height, viewport: options.viewport ?? 800, y: 0, committed: null as string | null };
  const queue = new Map<number, () => void>();
  let ids = 0;
  const puts: number[] = [];
  const w: RestoreWorld = {
    currentKey: options.key,
    committed: () => page.committed,
    height: () => page.height,
    viewport: () => page.viewport,
    scrollY: () => page.y,
    put: (top) => {
      puts.push(top);
      page.y = Math.min(top, page.height - page.viewport);
    },
    frame: (callback) => {
      queue.set(++ids, callback);
      return ids;
    },
    cancel: (id) => void queue.delete(id)
  };
  const tick = (n = 1) => {
    for (let i = 0; i < n; i++) {
      const due = [...queue.values()];
      queue.clear();
      due.forEach((callback) => callback());
    }
  };
  return { page, w, puts, tick };
}

// ---- Review-B 1: every push is its own entry --------------------------------------------------------

test("a same-page hash push that copies history.state still gets its own entry, so Back restores the position before it", () => {
  const history = session("/");
  const scroll = createHistoryScroll();
  history.current.state = { __NA: true, legacyScrollKey: "k1" };
  scroll.record(history.current.key, 1800);
  // use-home-navigation: pushState(history.state, "", "#hero"), the state copied as is.
  history.push({ ...history.current.state }, "/#hero");
  assert.equal(history.current.state.legacyScrollKey, "k1"); // a key kept in the state would be shared
  scroll.record(history.current.key, 0); // the hero, scrolled to on the new entry
  history.go(-1);
  assert.equal(scroll.pop(history.current.key), 1800);
});

// ---- Review-B 2: wait for the committed address, never the popstate tick ----------------------------

test("Back between search variants of one path waits for the router to commit the target", () => {
  const history = session("/shop?sort=price");
  history.push({}, "/shop?sort=new");
  history.go(-1);
  const { page, w, puts, tick } = world({ height: 900, key: () => history.current.key });
  page.committed = routedAddress("/shop", "?sort=new"); // still the outgoing route
  let done = 0;
  restoreScroll(w, history.current.key, 2400, routedAddress("/shop", "?sort=price"), () => done++);
  assert.deepEqual(puts, [], "nothing in the popstate tick");
  tick(5);
  assert.deepEqual(puts, [], "nothing while the outgoing route is committed, though the path matches");
  page.committed = routedAddress("/shop", "?sort=price");
  page.height = 4000; // the incoming content
  tick(1);
  assert.deepEqual(puts, [], "the incoming page must hold its height for a frame");
  tick(1);
  assert.deepEqual(puts, [2400]);
  tick(1);
  assert.equal(done, 1);
  assert.equal(page.y, 2400);
});

test("a hash-only step has nothing to commit, and still restores on a later frame", () => {
  const history = session("/help");
  history.push({}, "/help#returns");
  history.go(-1);
  const { page, w, puts, tick } = world({ height: 3000, key: () => history.current.key });
  page.committed = routedAddress("/help", "");
  restoreScroll(w, history.current.key, 1200, routedAddress("/help", ""), () => {});
  assert.deepEqual(puts, []);
  tick(3);
  assert.deepEqual(puts, [1200]);
});

test("an address that never commits scrolls nothing and ends once", () => {
  const { page, w, puts, tick } = world({ height: 4000, key: () => "e0" });
  page.committed = "/elsewhere";
  let done = 0;
  restoreScroll(w, "e0", 900, "/essays", () => done++);
  tick(RESTORE_FRAMES + 40);
  assert.deepEqual(puts, []);
  assert.equal(done, 1);
});

test("a newer step or push ends the restore without scrolling", () => {
  let key = "e1";
  const { page, w, puts, tick } = world({ height: 4000, key: () => key });
  page.committed = "/a";
  let done = 0;
  restoreScroll(w, "e1", 900, "/a", () => done++);
  key = "e2";
  tick(3);
  assert.deepEqual(puts, []);
  assert.equal(done, 1);
});

test("a page that stays short gets what room there is after the frame budget", () => {
  const { page, w, puts, tick } = world({ height: 1500, key: () => "e0" });
  page.committed = "/a";
  restoreScroll(w, "e0", 3000, "/a", () => {});
  tick(RESTORE_FRAMES - 1);
  assert.deepEqual(puts, []);
  tick(2);
  assert.deepEqual(puts, [700]);
});

// ---- Review-B 3: the scroller's cached limit, and reading the position back -------------------------

/** Lenis as installed: scrollTo clamps to the limit measured at the last resize. */
function lenis(page: { height: number; viewport: number; y: number }) {
  let limit = page.height - page.viewport;
  const calls: string[] = [];
  return {
    calls,
    resize() {
      calls.push("resize");
      limit = page.height - page.viewport;
    },
    scrollTo(top: number) {
      calls.push(`scrollTo ${top}`);
      page.y = Math.max(0, Math.min(top, limit));
    }
  };
}

test("the scroller is measured before the forced scroll, so a page that just grew is not clamped", () => {
  const page = { height: 900, viewport: 800, y: 0 };
  const smooth = lenis(page);
  page.height = 5000; // grew since the last resize, which is debounced
  putScroll(smooth, 3000, () => assert.fail("Lenis owns the scroll"));
  assert.deepEqual(smooth.calls, ["resize", "scrollTo 3000"]);
  assert.equal(page.y, 3000);
  const native: number[] = [];
  putScroll(undefined, 40, (top) => native.push(top));
  assert.deepEqual(native, [40]);
});

test("a clamped position is read back on the next frame and applied again", () => {
  const { page, w, puts, tick } = world({ height: 4000, key: () => "e0" });
  page.committed = "/a";
  let clamps = 1;
  w.put = (top) => {
    puts.push(top);
    page.y = clamps-- > 0 ? 100 : top; // the first apply is clamped
  };
  let done = 0;
  restoreScroll(w, "e0", 2000, "/a", () => done++);
  tick(2);
  assert.deepEqual(puts, [2000]);
  assert.equal(done, 0, "not done before the position is read back");
  tick(1);
  assert.deepEqual(puts, [2000, 2000]);
  tick(1);
  assert.equal(done, 1);
  assert.equal(page.y, 2000);
});

// ---- The record --------------------------------------------------------------------------------------

test("addresses compare the same whatever their encoding or search serialisation", () => {
  assert.equal(routedAddress("/setlists/%EC%84%9C%EC%9A%B8", "?a=1&b=x%20y"), routedAddress("/setlists/서울", "?a=1&b=x+y"));
  assert.equal(routedAddress("/a", ""), "/a");
  assert.notEqual(routedAddress("/shop", "?sort=new"), routedAddress("/shop", "?sort=price"));
  assert.equal(routedAddress("/%E0%A4%A", ""), "/%E0%A4%A"); // malformed: as written
});

test("Back returns to where the page was left, though the leave resets the scroll first", () => {
  const scroll = createHistoryScroll();
  scroll.record("essays", 4274);
  scroll.leave("essays", 4274);
  scroll.record("essays", 0); // the leave's reset to the top, before the address changes
  scroll.resume(); // the new entry is committed
  scroll.record("help", 0);
  assert.equal(scroll.pop("essays"), 4274);
});

test("rapid Back, Back does not overwrite the entry passed through", () => {
  const scroll = createHistoryScroll();
  for (const [key, y] of [["a", 100], ["b", 200], ["c", 300]] as const) scroll.record(key, y);
  scroll.pop("b");
  scroll.record("b", 300); // c's position, still showing
  scroll.pop("a"); // a second Back before the first restore finished
  scroll.record("a", 300);
  scroll.resume();
  assert.equal(scroll.pop("b"), 200);
  scroll.resume();
  assert.equal(scroll.pop("a"), 100);
});

test("an entry without a key records nothing", () => {
  const scroll = createHistoryScroll();
  scroll.record(null, 500);
  scroll.leave(null, 500);
  assert.deepEqual(scroll.dump(), []);
  assert.equal(scroll.pop(null), null);
});

test("positions survive a reload through the session copy, and junk is ignored", () => {
  const scroll = createHistoryScroll();
  scroll.record("essays", 1234.6);
  const copy = createHistoryScroll();
  copy.load(JSON.parse(JSON.stringify(scroll.dump())));
  copy.load([["bad"], [1, 2], "x", ["nan", Number.NaN]]);
  copy.load(null);
  assert.equal(copy.pop("essays"), 1235);
  assert.equal(copy.pop("nan"), null);
});

test("it keeps the latest 100 entries", () => {
  const scroll = createHistoryScroll();
  for (let i = 0; i < 105; i++) scroll.record(`k${i}`, i);
  assert.equal(scroll.dump().length, 100);
  assert.equal(scroll.pop("k0"), null);
  assert.equal(scroll.pop("k104"), 104);
});

// ---- Without the Navigation API (Review-B on v2) ---------------------------------------------------------

test("without the Navigation API the leave does not reset before the push, so the browser records the real offset", () => {
  const provider = readFileSync(new URL("../../src/providers/TransitionProvider.tsx", import.meta.url), "utf8");
  const exfil = provider.slice(provider.indexOf("const completeExfil = useCallback"));
  const gate = exfil.indexOf("if (!entryKey()) return;");
  const reset = exfil.indexOf("window.scroll(0, 0);");
  assert.ok(gate > 0 && reset > gate, "the no-API gate comes before the leave's reset");
  // The entry's reset is not gated: the new page still starts at the top.
  const entry = provider.slice(provider.indexOf("const completeEntry = useCallback"), provider.indexOf("const completeExfil = useCallback"));
  assert.doesNotMatch(entry, /entryKey\(\)/);
  assert.match(entry, /window\.scroll\(0, 0\)/);
});
