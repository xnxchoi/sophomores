import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { JSDOM } from "jsdom";

// v9 rev 3 (Review-B): narrow "does it work" checks for where a page change leaves the scroll.
let dom: JSDOM;
let createEntryScroll: typeof import("../../src/providers/Navigation/entry-scroll").createEntryScroll;
const previous = new Map<string, PropertyDescriptor | undefined>();
let resets = 0;
const landed: string[] = [];
const lenis = {
  scrollTo: (target: number | HTMLElement) => {
    if (typeof target === "number") resets++;
    else landed.push(target.id);
  }
};

function globalValue(key: string, value: unknown) {
  if (!previous.has(key))
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true
  });
}

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/help",
    pretendToBeVisual: true
  });
  for (const key of ["window", "document", "MutationObserver", "HTMLElement"])
    globalValue(key, dom.window[key as keyof typeof dom.window]);
  dom.window.scroll = () => {};
  ({ createEntryScroll } =
    await import("../../src/providers/Navigation/entry-scroll"));
});

beforeEach(() => {
  resets = 0;
  landed.length = 0;
  document.body.innerHTML = "";
});

after(() => {
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  dom.window.close();
});

const go = (path: string) =>
  dom.reconfigure({ url: "http://localhost" + path });
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("a link's page starts at the top", () => {
  const scroll = createEntryScroll();
  scroll.push();
  go("/terms");
  scroll.settle(lenis);
  assert.equal(resets, 1);
});

test("Back during the curtain keeps the restored place", () => {
  const scroll = createEntryScroll();
  scroll.push(); // the link's leave starts
  scroll.pop(); // Back before the curtain finishes: the router enters the restored entry
  go("/essays");
  scroll.settle(lenis);
  assert.equal(resets, 0);
});

test("a #hash target that streams in after the entry is landed on, with no reset meanwhile", async () => {
  const scroll = createEntryScroll();
  scroll.push();
  go("/terms#policy-section-2");
  scroll.settle(lenis);
  assert.equal(resets, 0);
  assert.equal(landed.length, 0);
  const section = document.createElement("section");
  section.id = "policy-section-2";
  document.body.append(section);
  await tick();
  assert.deepEqual(landed, ["policy-section-2"]);
  assert.equal(resets, 0);
});

test("a malformed fragment doesn't throw and starts at the top", () => {
  const scroll = createEntryScroll();
  scroll.push();
  go("/help#%");
  assert.doesNotThrow(() => scroll.settle(lenis));
  assert.equal(resets, 1);
});

test("Lenis measures the grown page before landing on a target that streamed in", async () => {
  const calls: string[] = [];
  const measuring = {
    resize: () => calls.push("resize"),
    scrollTo: (target: number | HTMLElement) => calls.push(typeof target === "number" ? "top" : "land")
  };
  const scroll = createEntryScroll();
  scroll.push();
  go("/terms#policy-section-3");
  scroll.settle(measuring);
  const section = document.createElement("section");
  section.id = "policy-section-3";
  document.body.append(section);
  await tick();
  assert.deepEqual(calls, ["resize", "land"]);
});

test("Back during a link's leave cancels the link's delayed push", () => {
  const scroll = createEntryScroll();
  const leave = scroll.push();
  assert.equal(scroll.current(leave), true);
  scroll.pop();
  assert.equal(scroll.current(leave), false, "the leave's continuation must not navigate");
});
