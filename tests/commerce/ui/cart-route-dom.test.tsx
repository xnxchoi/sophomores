import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { useEffect, useRef, useState } from "react";
import { setupCartDom } from "../../fixtures/commerce/cart-dom";
import type { CartConstants, CartMotion, CartPhase, CartTiming } from "../../../src/components/commerce/shop/use-cart-mode";

// The in-place cart's address and its direct entry (Review-B, 28 Nov): does it work? ShopHome's scene can't mount here, so
// this drives the two hooks it uses with a stand-in cart whose motions only change phase: an open runs "toCart" until
// settled, a close runs "toBrowse" with the mode still on until it finishes (as useCartMode does).
let env: Awaited<ReturnType<typeof setupCartDom>>;
let useCartRoute: typeof import("../../../src/components/commerce/shop/use-cart-route").useCartRoute;
let useCartMode: typeof import("../../../src/components/commerce/shop/use-cart-mode").useCartMode;

before(async () => {
  env = await setupCartDom();
  useCartRoute = (await import("../../../src/components/commerce/shop/use-cart-route")).useCartRoute;
  useCartMode = (await import("../../../src/components/commerce/shop/use-cart-mode")).useCartMode;
});
afterEach(() => { env.ui.cleanup(); env.dom.window.history.replaceState(null, "", "/shop/cart"); });
after(async () => { await env.restore(); });

const path = () => env.dom.window.location.pathname;
/** A Back or Forward: the address moves, then the browser's popstate. */
function traverse(to: string) {
  env.ui.act(() => {
    env.dom.window.history.replaceState(null, "", to);
    env.dom.window.dispatchEvent(new env.dom.window.PopStateEvent("popstate"));
  });
}
function escape() {
  const event = new env.dom.window.KeyboardEvent("keydown", { key: "Escape", cancelable: true });
  env.ui.act(() => { env.dom.window.dispatchEvent(event); });
  return event.defaultPrevented;
}

function useStandIn(start: { cartMode: boolean }) {
  const [state, setState] = useState<{ cartMode: boolean; phase: CartPhase }>({ cartMode: start.cartMode, phase: "idle" });
  const modeRef = useRef(start.cartMode);
  const calls = useRef<string[]>([]);
  const route = useCartRoute({ enabled: true, cart: { ...state, modeRef }, detailOpen: false,
    open: () => { calls.current.push("open"); modeRef.current = true; setState({ cartMode: true, phase: "toCart" }); },
    close: () => { calls.current.push("close"); setState((now) => ({ ...now, phase: "toBrowse" })); } });
  /** The running motion reaches its end. */
  const settle = () => setState((now) => {
    if (now.phase === "toBrowse") { modeRef.current = false; return { cartMode: false, phase: "idle" }; }
    return { ...now, phase: "idle" };
  });
  return { route, state, calls: calls.current, settle };
}
function mount(start: { cartMode: boolean }, at: string) {
  env.dom.window.history.replaceState(null, "", at);
  const hook = env.ui.renderHook(() => useStandIn(start));
  const settle = () => env.ui.act(() => hook.result.current.settle());
  /** At rest, the cart and its address agree. */
  const agrees = () => {
    const { state } = hook.result.current;
    assert.equal(state.phase, "idle");
    assert.equal(state.cartMode, path() === "/shop/cart", `cart ${state.cartMode ? "on" : "off"} at ${path()}`);
  };
  return { hook, settle, agrees, calls: () => hook.result.current.calls };
}
function clickCartLink() {
  const link = env.dom.window.document.createElement("a");
  link.href = "/shop/cart"; env.dom.window.document.body.append(link);
  env.ui.act(() => { link.click(); });
  link.remove();
}

test("a cart link on the shelf opens it in place on a shallow push, and Escape closes it back to where it came from", () => {
  const shop = mount({ cartMode: false }, "/shop");
  clickCartLink();
  assert.equal(path(), "/shop/cart");
  assert.deepEqual(shop.calls(), ["open"]);
  shop.settle(); shop.agrees();
  assert.equal(escape(), true);
  assert.equal(path(), "/shop");
  shop.settle(); shop.agrees();
  assert.deepEqual(shop.calls(), ["open", "close"]);
  assert.equal(escape(), false, "Escape is the page's again once the cart is closed");
});

test("rapid: Back while it is still opening closes it in place, with no push, and it rests closed on /shop", () => {
  const shop = mount({ cartMode: false }, "/shop");
  clickCartLink();
  traverse("/shop");
  assert.deepEqual(shop.calls(), ["open", "close"]);
  assert.equal(path(), "/shop");
  shop.settle(); shop.agrees();
});

test("rapid: Forward while it is closing is held, then the cart reopens when the close settles", () => {
  const shop = mount({ cartMode: true }, "/shop/cart");
  assert.equal(escape(), true);
  assert.equal(path(), "/shop");
  traverse("/shop/cart");
  assert.deepEqual(shop.calls(), ["close"], "nothing acts in the middle of the close");
  shop.settle();
  assert.deepEqual(shop.calls(), ["close", "open"], "the address decides once the motion is done");
  shop.settle(); shop.agrees();
});

test("rapid: a second Back or Escape during the close does nothing more", () => {
  const shop = mount({ cartMode: true }, "/shop/cart");
  traverse("/shop");
  traverse("/shop");
  escape();
  assert.deepEqual(shop.calls(), ["close"]);
  shop.settle(); shop.agrees();
});

test("rapid open/close/Back/Forward in a row settles with the cart matching its address", () => {
  const shop = mount({ cartMode: false }, "/shop");
  clickCartLink();               // opening
  escape();                      // close mid-open: pushes /shop
  traverse("/shop/cart");        // Forward during the close: held
  shop.settle();                 // close done: the address reopens it
  traverse("/shop");             // Back while reopening: closes in place
  shop.settle();
  shop.agrees();
  assert.deepEqual(shop.calls(), ["open", "close", "open", "close"]);
});

test("the listeners use the latest commit's motions, never an earlier render's", () => {
  const seen: string[] = [];
  env.dom.window.history.replaceState(null, "", "/shop/cart");
  const hook = env.ui.renderHook(({ v }: { v: number }) => {
    const modeRef = useRef(true);
    return useCartRoute({ enabled: true, cart: { cartMode: true, phase: "idle", modeRef }, detailOpen: false,
      open: () => seen.push("open " + v), close: () => seen.push("close " + v) });
  }, { initialProps: { v: 0 } });
  hook.rerender({ v: 1 });
  traverse("/shop");
  assert.deepEqual(seen, ["close 1"]);
});

// Direct entry (useCartMode's initialOpen): the first render is the cart's, and its open frame is written at commit,
// before any passive effect (so before the first paint).
const timing = {} as CartTiming, k = {} as CartConstants;
test("direct /shop/cart starts open from the route: no browse frame first", () => {
  const order: string[] = [], frames: CartMotion[] = [], firstRender: boolean[] = [];
  env.ui.renderHook(() => {
    const cart = useCartMode({ initialOpen: true, timing, k, coverReady: { current: new Set() },
      onFrame: (frame) => { frames.push(frame); order.push("frame"); } });
    if (firstRender.length === 0) firstRender.push(cart.cartMode && cart.panelOpen && cart.layoutBlend === 1 && cart.nonCartSlide === 1);
    useEffect(() => { order.push("passive"); }, []);
    return cart;
  });
  assert.deepEqual(firstRender, [true], "the first render is already open");
  assert.equal(order[0], "frame", "the open frame lands before any passive effect");
  assert.equal(frames.length, 1);
  assert.deepEqual({ panel: frames[0].panel, layout: frames[0].layout, page: frames[0].pageOpacity, backdrop: frames[0].backdropOpacity, active: frames[0].active },
    { panel: 1, layout: 1, page: 0, backdrop: 1, active: false });
});

test("loaded on the shop, the cart mode starts closed and writes no frame", () => {
  const frames: CartMotion[] = [];
  const hook = env.ui.renderHook(() => useCartMode({ timing, k, coverReady: { current: new Set() }, onFrame: (frame) => { frames.push(frame); } }));
  assert.equal(hook.result.current.cartMode, false);
  assert.equal(hook.result.current.modeRef.current, false);
  assert.equal(frames.length, 0);
});
