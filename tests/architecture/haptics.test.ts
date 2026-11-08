import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { attachHaptics } from "@/lib/haptics";

class ElementStub extends EventTarget {
  tagName: string;
  parentElement: ElementStub | null = null;
  children: ElementStub[] = [];
  attributes = new Map<string, string>();
  disabled = false;
  tabIndex = 0;
  type = "";
  style = {
    position: "",
    cssText: "",
    setProperty() {},
  };

  constructor(tagName = "button") {
    super();
    this.tagName = tagName.toUpperCase();
  }

  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  removeAttribute(name: string) { this.attributes.delete(name); }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  matches() { return this.disabled || this.getAttribute("aria-disabled") === "true"; }
  querySelector(selector: string): ElementStub | null {
    const key = selector.includes("data-haptic-trigger") ? "data-haptic-trigger" : "switch";
    for (const child of this.children) {
      if (child.attributes.has(key)) return child;
      const found = child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }
  append(child: ElementStub) {
    child.remove();
    child.parentElement = this;
    this.children = [...this.children, child];
  }
  insertAdjacentElement(_position: string, child: ElementStub) { this.append(child); }
  remove() {
    if (!this.parentElement) return;
    this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }
}

const originalGlobals = new Map<string, PropertyDescriptor | undefined>();
function setGlobal(name: string, value: unknown) {
  if (!originalGlobals.has(name)) originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { configurable: true, value });
}

function browser(ios = false, vibrate?: (pattern: number) => boolean) {
  setGlobal("window", {});
  setGlobal("document", { createElement: (tag: string) => new ElementStub(tag) });
  setGlobal("getComputedStyle", (element: ElementStub) => ({ position: element.style.position || "static" }));
  setGlobal("navigator", { userAgent: ios ? "iPhone" : "Android", platform: ios ? "iPhone" : "Linux", maxTouchPoints: 1, vibrate });
}

function tap(element: ElementStub, trusted = true) {
  const event = new Event("click", { cancelable: true, bubbles: true });
  Object.defineProperty(event, "isTrusted", { value: trusted });
  element.dispatchEvent(event);
  return event;
}

afterEach(() => {
  for (const [name, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
  originalGlobals.clear();
});

test("haptics attachment is safe without browser globals or a mounted element", () => {
  assert.equal(attachHaptics(null), undefined);
  assert.equal(attachHaptics(new ElementStub() as unknown as HTMLElement), undefined);
});

test("native taps vibrate once and detach cleanly; synthetic and disabled taps do not", () => {
  const patterns: number[] = [];
  browser(false, (pattern) => { patterns.push(pattern); return true; });
  const button = new ElementStub();
  const cleanup = attachHaptics(button as unknown as HTMLElement);
  tap(button);
  tap(button, false);
  button.disabled = true;
  tap(button);
  button.disabled = false;
  button.setAttribute("aria-disabled", "true");
  tap(button);
  assert.deepEqual(patterns, [8]);
  cleanup?.();
  button.setAttribute("aria-disabled", "false");
  tap(button);
  assert.deepEqual(patterns, [8]);
});

test("unsupported browsers do not add a pretend haptics overlay", () => {
  browser();
  const button = new ElementStub();
  attachHaptics(button as unknown as HTMLElement)?.();
  assert.equal(button.children.length, 0);
});

test("iOS uses an off-finger switch label, no vibration API, and reversible positioning", async () => {
  browser(true, () => { assert.fail("iOS must not use navigator.vibrate"); });
  const button = new ElementStub();
  const cleanup = attachHaptics(button as unknown as HTMLElement);
  for (let attempt = 0; attempt < 100 && !button.querySelector("[data-haptic-trigger]"); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const label = button.querySelector("[data-haptic-trigger]")!;
  assert.equal(label.tagName, "LABEL");
  assert.equal(label.getAttribute("aria-hidden"), "true");
  const input = label.querySelector("[switch]")!;
  assert.equal(input.tabIndex, -1);
  const style = input.style as { cssText: string; visibility?: string };
  assert.ok(style.cssText.includes("visibility:hidden") || style.visibility === "hidden");
  assert.equal(button.style.position, "relative");
  button.disabled = true;
  assert.equal(tap(label).defaultPrevented, true);
  cleanup?.();
  cleanup?.();
  assert.equal(button.children.length, 0);
  assert.equal(button.style.position, "");
});

test("duplicate attachment never creates duplicate native vibration handlers", () => {
  let pulses = 0;
  browser(false, () => { pulses += 1; return true; });
  const button = new ElementStub();
  const first = attachHaptics(button as unknown as HTMLElement);
  const second = attachHaptics(button as unknown as HTMLElement);
  tap(button);
  assert.equal(pulses, 1);
  second?.();
  first?.();
  tap(button);
  assert.equal(pulses, 1);
});

test("a denied native vibration API cannot break the primary button action", () => {
  browser(false, () => { throw new Error("Blocked by browser"); });
  const button = new ElementStub();
  let actions = 0;
  button.addEventListener("click", () => { actions += 1; });
  const cleanup = attachHaptics(button as unknown as HTMLElement);
  assert.doesNotThrow(() => tap(button));
  assert.equal(actions, 1);
  cleanup?.();
});

test("iOS unmount before the import resolves cannot leave an orphan overlay", async () => {
  browser(true);
  const button = new ElementStub();
  attachHaptics(button as unknown as HTMLElement)?.();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(button.children.length, 0);
  assert.equal(button.style.position, "");
});

test("iOS cleanup preserves authored position and never removes an existing bridge", async () => {
  browser(true);
  const button = new ElementStub();
  button.style.position = "static";
  const cleanup = attachHaptics(button as unknown as HTMLElement);
  for (let attempt = 0; attempt < 100 && !button.querySelector("[data-haptic-trigger]"); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  cleanup?.();
  assert.equal(button.style.position, "static");

  const existing = new ElementStub("label");
  existing.setAttribute("data-haptic-trigger", "");
  button.append(existing);
  const detachExisting = attachHaptics(button as unknown as HTMLElement);
  await new Promise((resolve) => setTimeout(resolve, 20));
  detachExisting?.();
  assert.equal(button.children[0], existing);
});
