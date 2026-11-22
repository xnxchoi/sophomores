import { EnglishMessages } from "../../fixtures/english-messages";
import { registerHooks } from "node:module";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { JSDOM } from "jsdom";

// Owner (rev 5): the step bar animates only from the previous step to the new one, sets its first value without animating,
// and goes back down when a step goes back. Never through 0. Rev 6: one mounted bar for the whole checkout (CheckoutProgress);
// the account → account-check → checkout path through that one node is covered in payment-dom.test.tsx.
let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let CheckoutSteps: typeof import("../../../src/components/commerce/checkout").CheckoutSteps;
const previous = new Map<string, PropertyDescriptor | undefined>();
function globalValue(key: string, value: unknown) {
  if (!previous.has(key))
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true
  });
}
let cssHook: ReturnType<typeof registerHooks>;
before(async () => {
  cssHook = registerHooks({
    load(url, context, next) {
      if (url.endsWith(".module.css"))
        return {
          format: "module",
          source: "export default {};",
          shortCircuit: true
        };
      return next(url, context);
    }
  });
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/shop/checkout",
    pretendToBeVisual: true
  });
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "Element",
    "Node",
    "MutationObserver",
    "Event"
  ]) {
    globalValue(
      key,
      key === "window" ? dom.window : dom.window[key as keyof typeof dom.window]
    );
  }
  globalValue("self", dom.window);
  globalValue("getComputedStyle", dom.window.getComputedStyle.bind(dom.window));
  globalValue(
    "requestAnimationFrame",
    dom.window.requestAnimationFrame.bind(dom.window)
  );
  globalValue(
    "cancelAnimationFrame",
    dom.window.cancelAnimationFrame.bind(dom.window)
  );
  globalValue("IS_REACT_ACT_ENVIRONMENT", true);
  ui = await import("@testing-library/react/pure");
  ({ CheckoutSteps } =
    await import("../../../src/components/commerce/checkout"));
});
after(() => {
  ui?.cleanup();
  cssHook?.deregister();
  dom.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

/** The fill's offset in percent: -100 is an empty bar, 0 a full one. Steps sit at 1/4, 2/4 and 3/4. */
function offset(fill: HTMLElement) {
  const match = /translateX\((-?[\d.]+)%\)/.exec(fill.style.transform);
  return match ? Number(match[1]) : -100;
}
function fillOf(container: HTMLElement) {
  const fill = container.querySelector<HTMLElement>(
    '[role="progressbar"] > div:last-child > span'
  );
  assert.ok(fill, "progress fill is rendered");
  return fill;
}
/** Records every offset the fill takes while the spring runs. */
async function settle(fill: HTMLElement) {
  const seen = [offset(fill)];
  const observer = new dom.window.MutationObserver(() =>
    seen.push(offset(fill))
  );
  observer.observe(fill, { attributes: true, attributeFilter: ["style"] });
  await ui.act(() => new Promise((resolve) => setTimeout(resolve, 1500)));
  observer.disconnect();
  seen.push(offset(fill));
  return seen;
}

test("step bar starts without animating, moves only between neighbouring steps and never passes through 0", async () => {
  // First mount ever: the bar is already at Delivery, with no run up from empty.
  const first = ui.render(
    <EnglishMessages>
      <CheckoutSteps current={1} />
    </EnglishMessages>
  );
  const fill = fillOf(first.container);
  assert.equal(offset(fill), -50);
  assert.deepEqual([...new Set(await settle(fill))], [-50]);

  // Delivery → Payment on the same bar: it moves from 2/4 to 3/4 and never dips below where it started.
  first.rerender(
    <EnglishMessages>
      <CheckoutSteps current={2} />
    </EnglishMessages>
  );
  const forward = await settle(fill);
  assert.ok(
    Math.min(...forward) >= -50.5,
    "forward step never drops toward 0: " + Math.min(...forward)
  );
  assert.ok(Math.abs(forward.at(-1)! - -25) < 0.5, "lands on Payment");
  assert.match(first.container.textContent ?? "", /Step 3 of 3: Payment/);

  // Going back on the same mounted bar: it moves down from Payment to Delivery, never through 0.
  first.rerender(
    <EnglishMessages>
      <CheckoutSteps current={1} />
    </EnglishMessages>
  );
  const backward = await settle(fill);
  assert.ok(
    Math.min(...backward) >= -50.5,
    "going back never passes through 0: " + Math.min(...backward)
  );
  assert.ok(Math.abs(backward.at(-1)! - -50) < 0.5, "lands on Delivery");
  first.unmount();
});
