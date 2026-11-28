import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { useEffect, useMemo, useRef } from "react";
import { setupCartDom } from "../../fixtures/commerce/cart-dom";
import type { CartConstants, CartMotion, CartTiming } from "../../../src/components/commerce/shop/use-cart-mode";
import type { BookDetailSource } from "../../../src/components/commerce/shop/use-book-detail";
import type { SceneCatalogue, SceneHub, SceneRouter } from "../../../src/components/commerce/shop/stripe-scene";

// The in-place cart's address and its direct entry (Review-B HOLDs on 2f3c63d2): does it work? ShopHome's scene can't
// mount here, so this composes the real writers in ShopHome's order: the details' hook (its scene-shift writer), the
// cart mode (its frame writes the cart's −20vw shift while the cart is on) and the cart's address controller, over a
// stand-in scene hub. The motions run on a fake frame clock; Back and Forward are the browser's own history traversal.
let env: Awaited<ReturnType<typeof setupCartDom>>;
let useCartRoute: typeof import("../../../src/components/commerce/shop/use-cart-route").useCartRoute;
let useCartMode: typeof import("../../../src/components/commerce/shop/use-cart-mode").useCartMode;
let useBookDetail: typeof import("../../../src/components/commerce/shop/use-book-detail").useBookDetail;

// The frame clock: requestAnimationFrame and performance.now, advanced by run().
let now = 0, nextFrame = 0, frames = new Map<number, (time: number) => void>();
const savedFrame = Object.getOwnPropertyDescriptor(globalThis, "requestAnimationFrame");
const savedCancel = Object.getOwnPropertyDescriptor(globalThis, "cancelAnimationFrame");
before(async () => {
  env = await setupCartDom();
  Object.defineProperty(globalThis, "requestAnimationFrame", { configurable: true, writable: true,
    value: (callback: (time: number) => void) => { frames.set(++nextFrame, callback); return nextFrame; } });
  Object.defineProperty(globalThis, "cancelAnimationFrame", { configurable: true, writable: true, value: (id: number) => { frames.delete(id); } });
  Object.defineProperty(performance, "now", { configurable: true, value: () => now });
  useCartRoute = (await import("../../../src/components/commerce/shop/use-cart-route")).useCartRoute;
  useCartMode = (await import("../../../src/components/commerce/shop/use-cart-mode")).useCartMode;
  useBookDetail = (await import("../../../src/components/commerce/shop/use-book-detail")).useBookDetail;
});
afterEach(() => { env.ui.cleanup(); frames = new Map(); env.dom.window.history.replaceState(null, "", "/shop/cart"); });
after(async () => {
  for (const [key, saved] of [["requestAnimationFrame", savedFrame], ["cancelAnimationFrame", savedCancel]] as const) {
    if (saved) Object.defineProperty(globalThis, key, saved); else Reflect.deleteProperty(globalThis, key);
  }
  Reflect.deleteProperty(performance, "now");
  await env.restore();
});
function run(ms: number) {
  env.ui.act(() => {
    for (const end = now + ms; now < end;) {
      now += 16;
      const due = frames; frames = new Map();
      for (const callback of due.values()) callback(now);
    }
  });
}

// Stand-ins for the vendored timing (module 60444) and curves (72646): a 1 s open, a 1 s close.
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const timing = { m: { bookSettled: 0 }, B: () => { throw new Error("no entry clock here"); }, W: () => { throw new Error("no entry clock here"); },
  s: (ms: number) => { const x = clamp(ms / 1000); return { panel: x, page: x, bookSlide: x, nonCartSlide: x, layout: x, shelfSlide: null, done: ms >= 1000 }; },
  k: () => null, t: () => [] } as unknown as CartTiming;
const k = { $: 800, p: 1000, A: 1000, o: 1000, F: 800, X: 500, g: 0, a: 1000, _: 500, O: 500, j: clamp, T: clamp, B: clamp } as CartConstants;
const catalogue = { J: 0, K: 0, t: 0 } as unknown as SceneCatalogue;
const router = { _: { current: {} }, v: () => () => undefined } as unknown as SceneRouter;
function sceneHub() {
  const refs: Record<string | symbol, { current: unknown }> = {};
  return new Proxy(refs, { get: (target, key) => (target[key] ??= { current: undefined }) }) as unknown as SceneHub & Record<string, { current: unknown }>;
}

/** ShopHome's cart wiring, in its order, over a stand-in hub. */
function useShop(direct: boolean) {
  const hub = useMemo(sceneHub, []);
  const cartOn = useRef(direct);
  const source = useRef<BookDetailSource>({ rawProgress: () => 0, hrefOf: () => null, home: "/shop", placeOf: () => 0, shelfAt: () => null,
    pin: () => undefined, unpin: () => undefined, pagesOpen: () => false, cartHoldsShift: () => cartOn.current });
  const detail = useBookDetail(hub, catalogue, router, { P: 0, i: 0 }, source);
  const cart = useCartMode({ initialOpen: direct, timing, k, coverReady: { current: new Set() },
    onFrame: (frame) => { if (frame.active || cartOn.current) hub.detailCanvasShiftVwLiveRef.current = -20 * frame.bookSlide; } });
  useEffect(() => { cartOn.current = cart.cartMode; }, [cart.cartMode]);
  const counts = useRef({ opens: 0, closes: 0 });
  const route = useCartRoute({ enabled: true, cart, detailOpen: detail.open != null,
    open: () => { cartOn.current = true; const accepted = cart.toggle({ entry: null }); if (accepted) counts.current.opens += 1; return accepted; },
    close: () => { const accepted = cart.toggle({}); if (accepted) counts.current.closes += 1; return accepted; } });
  return { hub, cart, route, counts: counts.current };
}
const path = () => env.dom.window.location.pathname;
const entries = () => env.dom.window.history.length;
function mount(direct: boolean, at: string) {
  env.dom.window.history.replaceState(null, "", at);
  const hook = env.ui.renderHook(() => useShop(direct));
  const shop = () => hook.result.current;
  /** At rest, the cart and its address agree. */
  const agrees = () => {
    assert.equal(shop().cart.phase, "idle");
    assert.equal(shop().cart.cartMode, path() === "/shop/cart", `cart ${shop().cart.cartMode ? "on" : "off"} at ${path()}`);
  };
  return { hook, shop, agrees };
}
function escape() {
  const event = new env.dom.window.KeyboardEvent("keydown", { key: "Escape", cancelable: true });
  env.dom.window.dispatchEvent(event);
  return event.defaultPrevented;
}
function cartLink() {
  const link = env.dom.window.document.createElement("a");
  link.href = "/shop/cart"; env.dom.window.document.body.append(link);
  return { click: () => link.click(), remove: () => link.remove() };
}
/** The browser's own Back (-1) or Forward (1), and its popstate. */
async function traverse(step: -1 | 1) {
  const fired = new Promise<boolean>((resolve) => {
    env.dom.window.addEventListener("popstate", () => resolve(true), { once: true });
    setTimeout(() => resolve(false), 500);
  });
  await env.ui.act(async () => {
    if (step < 0) env.dom.window.history.back(); else env.dom.window.history.forward();
    assert.equal(await fired, true, "the traversal fired popstate");
  });
}

test("direct /shop/cart: the cart's −20vw shift holds over the details' first write, and on later renders", () => {
  const view = mount(true, "/shop/cart");
  assert.equal(view.shop().cart.cartMode, true);
  assert.equal(view.shop().hub.detailCanvasShiftVwLiveRef.current, -20);
  view.hook.rerender();
  assert.equal(view.shop().hub.detailCanvasShiftVwLiveRef.current, -20);
});

test("control: loaded on the shop, the details own the shift (0) and the cart is closed", () => {
  const view = mount(false, "/shop");
  assert.equal(view.shop().cart.cartMode, false);
  assert.equal(view.shop().hub.detailCanvasShiftVwLiveRef.current === 0, true);
});

test("two Escapes before React commits: one close, one history entry, no restart", () => {
  const view = mount(true, "/shop/cart");
  const base = entries();
  env.ui.act(() => { assert.equal(escape(), true); escape(); });
  assert.equal(view.shop().counts.closes, 1);
  assert.equal(entries(), base + 1);
  assert.equal(path(), "/shop");
  run(1100);
  view.agrees();
  assert.equal(view.shop().hub.detailCanvasShiftVwLiveRef.current === 0, true, "the close brings the shift back");
});

test("the back control twice before React commits: one close, one history entry", () => {
  const view = mount(true, "/shop/cart");
  const base = entries();
  env.ui.act(() => { view.shop().route.closeCart(); view.shop().route.closeCart(); });
  assert.equal(view.shop().counts.closes, 1);
  assert.equal(entries(), base + 1);
  run(1100);
  view.agrees();
});

test("two clicks on a cart link before React commits: one open, one history entry", () => {
  const view = mount(false, "/shop");
  const base = entries(), link = cartLink();
  env.ui.act(() => { link.click(); link.click(); });
  link.remove();
  assert.equal(view.shop().counts.opens, 1, "the second click is refused, not navigated");
  assert.equal(entries(), base + 1);
  assert.equal(path(), "/shop/cart");
  run(1100);
  view.agrees();
});

test("Back and Forward through history close and reopen it in place, adding no entries", async () => {
  const view = mount(false, "/shop");
  const link = cartLink();
  env.ui.act(() => link.click());
  link.remove();
  run(1100); view.agrees();
  const base = entries();
  await traverse(-1);
  assert.equal(path(), "/shop");
  assert.equal(view.shop().counts.closes, 1);
  run(1100); view.agrees();
  await traverse(1);
  assert.equal(path(), "/shop/cart");
  assert.equal(view.shop().counts.opens, 2);
  run(1100); view.agrees();
  assert.equal(entries(), base, "traversal adds no entries");
});

test("Back while it is still opening closes it in place, with no push", async () => {
  const view = mount(false, "/shop");
  const link = cartLink();
  env.ui.act(() => link.click());
  link.remove();
  const base = entries();
  run(200);
  await traverse(-1);
  assert.equal(view.shop().counts.closes, 1);
  assert.equal(entries(), base);
  run(1100); view.agrees();
});

test("Back onto /shop/cart while it is closing is held, then the cart reopens when the close settles", async () => {
  const view = mount(true, "/shop/cart");
  env.ui.act(() => { escape(); });
  const base = entries();
  assert.equal(path(), "/shop");
  run(200);
  await traverse(-1);
  assert.equal(path(), "/shop/cart");
  assert.equal(view.shop().counts.opens, 0, "nothing acts in the middle of the close");
  run(1100);
  assert.equal(view.shop().counts.opens, 1, "the address decides once the close is done");
  run(1100); view.agrees();
  assert.equal(entries(), base);
});

// Direct entry (useCartMode's initialOpen): the first render is the cart's, and its open frame is written at commit,
// before any passive effect (so before the first paint).
test("direct /shop/cart starts open from the route: no browse frame first", () => {
  const order: string[] = [], written: CartMotion[] = [], firstRender: boolean[] = [];
  env.ui.renderHook(() => {
    const cart = useCartMode({ initialOpen: true, timing, k, coverReady: { current: new Set() },
      onFrame: (frame) => { written.push(frame); order.push("frame"); } });
    if (firstRender.length === 0) firstRender.push(cart.cartMode && cart.panelOpen && cart.layoutBlend === 1 && cart.nonCartSlide === 1);
    useEffect(() => { order.push("passive"); }, []);
    return cart;
  });
  assert.deepEqual(firstRender, [true], "the first render is already open");
  assert.equal(order[0], "frame", "the open frame lands before any passive effect");
  assert.equal(written.length, 1);
  assert.deepEqual({ panel: written[0].panel, layout: written[0].layout, page: written[0].pageOpacity, backdrop: written[0].backdropOpacity, active: written[0].active },
    { panel: 1, layout: 1, page: 0, backdrop: 1, active: false });
});

test("a close is refused while one is under way, before and after React commits", () => {
  const hook = env.ui.renderHook(() => useCartMode({ initialOpen: true, timing, k, coverReady: { current: new Set() }, onFrame: () => undefined }));
  let first = false, second = true;
  env.ui.act(() => { first = hook.result.current.toggle({}); second = hook.result.current.toggle({}); });
  assert.equal(first, true);
  assert.equal(second, false);
  assert.equal(hook.result.current.phaseRef.current, "toBrowse");
  assert.equal(hook.result.current.toggle({}), false);
  run(1100);
  assert.equal(hook.result.current.cartMode, false);
  assert.equal(hook.result.current.phaseRef.current, "idle");
});
