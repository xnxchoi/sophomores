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
  go("/essays"); // Back before the curtain finishes: popstate fires once the URL has changed
  scroll.pop(); // the router enters the restored entry
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
  go("/essays");
  scroll.pop();
  assert.equal(scroll.current(leave), false, "the leave's continuation must not navigate");
});

// v9 rev 4.2 (Review-B): next-transition-router 0.2.11 only ends a leave when the pathname changes, so a
// Back to the same pathname (an earlier #hash entry) can't supersede the link: the link's page still loads
// and starts at the top, and the router is free for the next click.
test("Back to the same pathname during a link's leave lets the link finish", () => {
  go("/terms#policy-section-1");
  const scroll = createEntryScroll();
  const leave = scroll.push();
  go("/terms"); // Back to the earlier entry of the same page
  scroll.pop();
  assert.equal(scroll.current(leave), true, "the leave must go on, or the router stays leaving");
  go("/essays"); // the link's push
  scroll.settle(lenis);
  assert.equal(resets, 1, "the link's page starts at the top");
});

test("Back puts the page back where it was left once its route arrives, and a saved 0 counts (row-6 live FAIL)", async () => {
  // The Navigation API: the entry showing, and a navigate event fired before each entry change.
  const nav = Object.assign(new dom.window.EventTarget(), { currentEntry: { key: "help" } });
  globalValue("navigation", nav);
  let y = 0;
  let height = 2000;
  Object.defineProperty(dom.window, "scrollY", { configurable: true, get: () => y });
  Object.defineProperty(dom.window, "innerHeight", { configurable: true, value: 900 });
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, get: () => height });
  const put: number[] = [];
  const smooth = { scrollTo: (top: number | HTMLElement) => { if (typeof top === "number") { put.push(top); y = top; } }, resize: () => {} };
  const frames = (n: number) => new Promise<void>((resolve) => { let i = 0; const f = () => (++i >= n ? resolve() : dom.window.requestAnimationFrame(f)); dom.window.requestAnimationFrame(f); });
  const scroll = createEntryScroll();
  const stop = scroll.listen();
  const step = (key: string, path: string) => {
    nav.dispatchEvent(Object.assign(new dom.window.Event("navigate"), { navigationType: "push" })); // fires before the entry changes
    nav.currentEntry = { key };
    go(path);
  };
  try {
    go("/help");
    scroll.arrived("/help", smooth);
    y = 700;
    step("terms", "/terms"); // a link: /help is left at 700
    height = 900; // the router commits /terms; its page mounts fixed and viewport-high
    scroll.arrived("/terms", smooth);
    y = 0;
    step("help", "/help"); // an ordinary Back, router idle: /terms is left at 0
    scroll.pop();
    scroll.arrived("/help", smooth); // the router commits /help, still one viewport high
    await frames(2);
    assert.deepEqual(put, [], "nothing is put back while the page has no room");
    height = 2000; // back in flow
    await frames(10);
    assert.deepEqual(put, [700]);
    step("terms", "/terms"); // Forward: /terms was left at 0, a real place
    scroll.pop();
    height = 2000;
    scroll.arrived("/terms", smooth);
    y = 450; // whatever the browser left it at
    await frames(10);
    assert.equal(put.at(-1), 0);
  } finally {
    stop();
    Reflect.deleteProperty(dom.window, "scrollY");
    Reflect.deleteProperty(dom.window, "innerHeight");
    Reflect.deleteProperty(document.documentElement, "scrollHeight");
  }
});

// Review-B rev 2 LOWs: the pending restore belongs to its own route commit, and the reader can drop it first.
function backFromTermsToHelp() {
  const nav = Object.assign(new dom.window.EventTarget(), { currentEntry: { key: "help" } });
  globalValue("navigation", nav);
  let y = 0;
  Object.defineProperty(dom.window, "scrollY", { configurable: true, get: () => y });
  Object.defineProperty(dom.window, "innerHeight", { configurable: true, value: 900 });
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, get: () => 2000 });
  const put: number[] = [];
  const smooth = { scrollTo: (top: number | HTMLElement) => { if (typeof top === "number") { put.push(top); y = top; } }, resize: () => {} };
  const scroll = createEntryScroll();
  const stop = scroll.listen();
  const step = (key: string, path: string) => {
    nav.dispatchEvent(Object.assign(new dom.window.Event("navigate"), { navigationType: "push" }));
    nav.currentEntry = { key };
    go(path);
  };
  go("/help");
  scroll.arrived("/help", smooth);
  y = 700;
  step("terms", "/terms"); // a link: /help left at 700
  scroll.arrived("/terms", smooth);
  y = 0;
  step("help", "/help"); // Back
  scroll.pop();
  const done = () => {
    stop();
    Reflect.deleteProperty(dom.window, "scrollY");
    Reflect.deleteProperty(dom.window, "innerHeight");
    Reflect.deleteProperty(document.documentElement, "scrollHeight");
  };
  return { scroll, smooth, put, done };
}
const frames = (n: number) =>
  new Promise<void>((resolve) => {
    let i = 0;
    const next = () => (++i >= n ? resolve() : dom.window.requestAnimationFrame(next));
    dom.window.requestAnimationFrame(next);
  });

test("only the destination's own commit puts a Back entry back; an earlier commit or a rerun doesn't use it up", async () => {
  const { scroll, smooth, put, done } = backFromTermsToHelp();
  try {
    scroll.arrived("/terms", smooth); // the outgoing route's effect again (a new Lenis, a late flush)
    await frames(10);
    assert.deepEqual(put, [], "nothing restores against the outgoing page");
    scroll.arrived("/help", smooth); // the destination commits
    await frames(10);
    assert.deepEqual(put, [700]);
  } finally {
    done();
  }
});

test("the reader's own scroll before the destination commits drops the pending restore", async () => {
  const { scroll, smooth, put, done } = backFromTermsToHelp();
  try {
    window.dispatchEvent(new dom.window.Event("wheel"));
    scroll.arrived("/help", smooth);
    await frames(10);
    assert.deepEqual(put, [], "no jump after the reader scrolled");
  } finally {
    done();
  }
});

test("a quick Back then Forward during a curtain lands Forward where it was left, nothing left pending (Review-B rev 3, rev 7)", async () => {
  const nav = Object.assign(new dom.window.EventTarget(), { currentEntry: { key: "help" } });
  globalValue("navigation", nav);
  let y = 0;
  Object.defineProperty(dom.window, "scrollY", { configurable: true, get: () => y });
  Object.defineProperty(dom.window, "innerHeight", { configurable: true, value: 900 });
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, get: () => 2000 });
  const put: number[] = [];
  const smooth = { scrollTo: (top: number | HTMLElement) => { if (typeof top === "number") { put.push(top); y = top; } }, resize: () => {} };
  const scroll = createEntryScroll();
  const stop = scroll.listen();
  const step = (key: string, path: string) => {
    nav.dispatchEvent(Object.assign(new dom.window.Event("navigate"), { navigationType: "push" }));
    nav.currentEntry = { key };
    go(path);
  };
  try {
    go("/help");
    scroll.arrived("/help", smooth);
    y = 700;
    step("terms", "/terms"); // a link: /help left at 700
    scroll.arrived("/terms", smooth);
    y = 250;
    const leave = scroll.push(); // a link's curtain starts on /terms
    // Chrome's order for a history step: navigate(traverse), Next's synchronous commit, its replaceState
    // (navigate replace, old scroll still showing), then popstate (rev 6 live).
    const traverse = (key: string, path: string) => {
      nav.dispatchEvent(Object.assign(new dom.window.Event("navigate"), { navigationType: "traverse" }));
      nav.currentEntry = { key };
      go(path);
      scroll.arrived(path, smooth);
      nav.dispatchEvent(Object.assign(new dom.window.Event("navigate"), { navigationType: "replace" }));
      y = 0; // the remounted page starts at the top
      scroll.pop();
    };
    traverse("help", "/help"); // Back mid-curtain
    traverse("terms", "/terms"); // Forward before any frame: back on the leave's own pathname
    assert.equal(scroll.current(leave), false, "the generation rule is unchanged: the Back still fenced the push");
    await frames(10);
    assert.deepEqual(put, [250], "Forward puts /terms back where it was left (rev 7), not at the top");
    scroll.arrived("/help", smooth); // a late /help commit
    await frames(10);
    assert.deepEqual(put, [250], "nothing from the Back is left pending");
    scroll.settle(smooth); // the router's enter completes the leave
    assert.deepEqual(put, [250], "settle on a traversal doesn't reset the place");
  } finally {
    stop();
    Reflect.deleteProperty(dom.window, "scrollY");
    Reflect.deleteProperty(dom.window, "innerHeight");
    Reflect.deleteProperty(document.documentElement, "scrollHeight");
  }
});

test("an idle Back from a #hash entry to the same page leaves the browser's own restore alone (Review-B rev 7)", async () => {
  const nav = Object.assign(new dom.window.EventTarget(), { currentEntry: { key: "terms" } });
  globalValue("navigation", nav);
  let y = 0;
  Object.defineProperty(dom.window, "scrollY", { configurable: true, get: () => y });
  Object.defineProperty(dom.window, "innerHeight", { configurable: true, value: 900 });
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, get: () => 2400 });
  const put: number[] = [];
  const smooth = { scrollTo: (top: number | HTMLElement) => { if (typeof top === "number") { put.push(top); y = top; } }, resize: () => {} };
  const scroll = createEntryScroll();
  const stop = scroll.listen();
  const navigate = (navigationType: string, to?: string) =>
    nav.dispatchEvent(Object.assign(new dom.window.Event("navigate"), { navigationType, destination: to ? { url: "http://localhost" + to } : undefined }));
  try {
    go("/terms");
    scroll.arrived("/terms", smooth); // /terms committed for this entry
    y = 120;
    navigate("push", "/terms#policy-section-2"); // a #hash link: same pathname, no commit
    nav.currentEntry = { key: "terms-hash" };
    go("/terms#policy-section-2");
    y = 931;
    navigate("traverse", "/terms"); // an idle Back to the entry before the jump
    nav.currentEntry = { key: "terms" };
    go("/terms");
    navigate("replace", "/terms");
    scroll.pop(); // the browser hasn't put its own place back yet
    await frames(10);
    assert.deepEqual(put, [], "no app restore on a same-path step");
  } finally {
    stop();
    Reflect.deleteProperty(dom.window, "scrollY");
    Reflect.deleteProperty(dom.window, "innerHeight");
    Reflect.deleteProperty(document.documentElement, "scrollHeight");
  }
});

test("Back between two distinct encoded routes is a cross-path step and restores (Review-B rev 8)", async () => {
  const nav = Object.assign(new dom.window.EventTarget(), { currentEntry: { key: "a" } });
  globalValue("navigation", nav);
  let y = 0;
  Object.defineProperty(dom.window, "scrollY", { configurable: true, get: () => y });
  Object.defineProperty(dom.window, "innerHeight", { configurable: true, value: 900 });
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, get: () => 2400 });
  const put: number[] = [];
  const smooth = { scrollTo: (top: number | HTMLElement) => { if (typeof top === "number") { put.push(top); y = top; } }, resize: () => {} };
  const scroll = createEntryScroll();
  const stop = scroll.listen();
  const navigate = (navigationType: string, to: string) =>
    nav.dispatchEvent(Object.assign(new dom.window.Event("navigate"), { navigationType, destination: { url: "http://localhost" + to } }));
  // Next decodes each segment once: these are the slugs "a/b" and "a%2Fb", two different essays.
  const first = "/essays/a%2Fb";
  const second = "/essays/a%252Fb";
  try {
    go(first);
    scroll.arrived(first, smooth);
    y = 600;
    navigate("push", second); // a link to the other essay: the first is left at 600
    nav.currentEntry = { key: "b" };
    go(second);
    scroll.arrived(second, smooth);
    y = 0;
    navigate("traverse", first); // Back, in Chrome's order
    nav.currentEntry = { key: "a" };
    go(first);
    scroll.arrived(first, smooth);
    navigate("replace", first);
    scroll.pop();
    await frames(10);
    assert.deepEqual(put, [600], "the first essay comes back where it was left");
  } finally {
    stop();
    Reflect.deleteProperty(dom.window, "scrollY");
    Reflect.deleteProperty(dom.window, "innerHeight");
    Reflect.deleteProperty(document.documentElement, "scrollHeight");
  }
});
