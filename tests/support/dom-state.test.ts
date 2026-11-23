import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { JSDOM } from "jsdom";
import { untilAsserted, untilDomState } from "./dom-state";

// The bounded state wait used by the jsdom suites: it settles on the real state, sees non-DOM changes, judges the
// deadline only after React's scheduler has had a turn, rejects with the last diagnostic, and releases everything.
let dom: JSDOM;
const saved = new Map<string, PropertyDescriptor | undefined>();
const ui = { getConfig: () => ({ asyncWrapper: (cb: () => Promise<unknown>) => cb() }) };

before(() => {
  dom = new JSDOM("<!doctype html><html><body><div id=root></div></body></html>");
  for (const key of ["document", "MutationObserver"]) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: dom.window[key as "document"] });
  }
});
after(() => {
  for (const [key, descriptor] of saved) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  dom.window.close();
});

const root = () => document.getElementById("root")!;

test("settles on the DOM mutation that reaches the state", async () => {
  root().textContent = "";
  setTimeout(() => { root().textContent = "ready"; }, 5);
  await untilDomState(ui, () => root().textContent === "ready", { pollMs: 60_000 });
});

test("sees a change with no DOM effect through its poll", async () => {
  const calls: string[] = [];
  setTimeout(() => calls.push("sent"), 5);
  assert.deepEqual(await untilAsserted(ui, () => { assert.equal(calls.length, 1); return calls[0]; }, { pollMs: 5 }), "sent");
});

test("a state committed in the same pass as the deadline is still seen (the waitFor race)", async () => {
  // A component timer due with the deadline schedules a render for the check phase, as React's scheduler does.
  root().textContent = "";
  setTimeout(() => setImmediate(() => { root().textContent = "committed"; }), 20);
  await untilDomState(ui, () => root().textContent === "committed", { deadlineMs: 20, pollMs: 60_000 });
});

test("a state that never arrives rejects with the last diagnostic and releases its observer, listeners and timers", async () => {
  let checks = 0;
  await assert.rejects(untilAsserted(ui, () => { checks++; assert.equal(root().textContent, "never", "the awaited text"); }, { deadlineMs: 30, pollMs: 5 }),
    (error: Error) => {
      assert.match(error.message, /State not reached within 30 ms/);
      assert.match(error.message, /the awaited text/);
      return true;
    });
  const settled = checks;
  root().textContent = "after";
  document.dispatchEvent(new dom.window.Event("focusin"));
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(checks, settled, "no mutation, event or poll checks after the wait settled");
});

test("a predicate that throws rejects with its error", async () => {
  let armed = false;
  setTimeout(() => { armed = true; root().textContent = "boom"; }, 5);
  await assert.rejects(untilDomState(ui, () => { if (armed) throw new TypeError("broken predicate"); return false; }, { deadlineMs: 5_000 }),
    /broken predicate/);
});
