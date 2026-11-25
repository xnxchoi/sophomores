import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { JSDOM } from "jsdom";

// Review-B S: a book sound waiting on Howler's audio context must not start once the shop has gone. Runs the installed
// Howler against a fake AudioContext (and fake XHR), so Howler's own play/lock/resume code is what's exercised.

const starts: unknown[] = [];
class Param { value = 1; setValueAtTime(value: number) { this.value = value; } setTargetAtTime() {} cancelScheduledValues() {} }
class Node { connect<T>(node: T) { return node; } disconnect() {} }
class Gain extends Node { gain = new Param(); }
class Source extends Node {
  buffer: unknown = null; loop = false; playbackRate = new Param(); onended: unknown = null;
  start() { starts.push(this.buffer); } stop() {}
}
class FakeContext {
  state = "running"; currentTime = 0; sampleRate = 48000; destination = new Node();
  resume(): Promise<void> { this.state = "running"; return Promise.resolve(); }
  suspend(): Promise<void> { this.state = "suspended"; return Promise.resolve(); }
  createGain() { return new Gain(); }
  createBufferSource() { return new Source(); }
  createBiquadFilter() { return Object.assign(new Node(), { type: "", frequency: new Param(), Q: new Param() }); }
  createBuffer(channels: number, length: number, sampleRate: number) {
    return { numberOfChannels: channels, length, sampleRate, duration: length / sampleRate, getChannelData: () => new Float32Array(length) };
  }
  // Two parameters, so Howler takes its callback path.
  decodeAudioData(_data: ArrayBuffer, ok: (buffer: unknown) => void) { ok({ ...this.createBuffer(2, 9600, 48000), decoded: true }); }
}
class FakeXHR {
  status = 0; response: ArrayBuffer | null = null; responseType = ""; withCredentials = false; onload: (() => void) | null = null; onerror: (() => void) | null = null;
  open() {} setRequestHeader() {}
  send() { setTimeout(() => { this.status = 200; this.response = new ArrayBuffer(8); this.onload?.(); }, 0); }
}
class FakeAudio { muted = false; canPlayType() { return "probably"; } }

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let sounds: typeof import("../../../src/components/commerce/shop/use-book-sounds");
let howler: typeof import("howler");
const previous = new Map<string, PropertyDescriptor | undefined>();
const unlockListeners: ((event: { isTrusted: boolean }) => void)[] = [];
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const played = () => starts.filter((buffer) => (buffer as { decoded?: boolean } | null)?.decoded).length;

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/shop", pretendToBeVisual: true });
  const add = dom.window.addEventListener.bind(dom.window);
  dom.window.addEventListener = ((type: string, listener: never, options?: never) => {
    if (type === "pointerdown") unlockListeners.push(listener);
    return add(type, listener, options);
  }) as typeof dom.window.addEventListener;
  const values: Record<string, unknown> = {
    window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, Event: dom.window.Event,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window), cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    AudioContext: FakeContext, XMLHttpRequest: FakeXHR, Audio: FakeAudio, IS_REACT_ACT_ENVIRONMENT: true
  };
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  howler = await import("howler");
  // No 30 s auto-suspend timer keeping the test alive; the suspended state is set by hand below.
  howler.Howler.autoSuspend = false;
  ui = await import("@testing-library/react/pure");
  sounds = await import("../../../src/components/commerce/shop/use-book-sounds");
});
after(() => {
  ui.cleanup(); dom.window.close();
  for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
});

test("the first trusted input unlocks, and a turn plays at once on a running context", async () => {
  const { unmount } = ui.renderHook(() => sounds.useBookSounds(true));
  sounds.bookSound.turn("forward", 0);
  assert.equal(played(), 0, "nothing plays before the first input");
  unlockListeners.at(-1)?.({ isTrusted: false });
  sounds.bookSound.turn("forward", 0); await wait(30);
  assert.equal(played(), 0, "an untrusted input doesn't unlock");
  unlockListeners.at(-1)?.({ isTrusted: true });
  await wait(30);
  sounds.bookSound.turn("forward", 0);
  assert.equal(played(), 1);
  unmount();
});

test("a turn waiting on a suspended context never starts once the shop has gone", async () => {
  const { unmount } = ui.renderHook(() => sounds.useBookSounds(true));
  await wait(30);
  const context = howler.Howler.ctx as unknown as FakeContext, state = howler.Howler as unknown as { state: string };
  // Howler after its quiet-time suspend: the context and Howler's own state are suspended; the resume is held.
  context.state = "suspended"; state.state = "suspended";
  let release = () => {};
  context.resume = () => new Promise<void>((resolve) => { release = () => { context.state = "running"; resolve(); }; });
  const before = played();
  sounds.bookSound.turn("forward", 0);
  await wait(50);
  assert.equal(played(), before, "not started while the context resumes");
  unmount();
  release();
  await wait(150);
  assert.equal(state.state, "running", "the resume completed");
  assert.equal(played(), before, "no clip starts after the shop has gone");
});
