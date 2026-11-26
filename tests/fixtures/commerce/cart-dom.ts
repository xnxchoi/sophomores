// Test-only DOM setup for the cart's state tests: JSDOM globals, and the ecommerce plugin's client hooks replaced by
// tests/fixtures/commerce/fake-ecommerce.ts so a test drives the member's cart directly.
import { registerHooks } from "node:module";
import { JSDOM } from "jsdom";

const fake = new URL("./fake-ecommerce.ts", import.meta.url).href;

export async function setupCartDom() {
  const hook = registerHooks({
    resolve(specifier, context, next) {
      if (specifier === "@payloadcms/plugin-ecommerce/client/react") return { url: fake, shortCircuit: true };
      return next(specifier, context);
    },
  });
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", { url: "http://localhost/shop/cart", pretendToBeVisual: true });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const key of ["window", "self", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLButtonElement", "Element", "Node",
    "MutationObserver", "Event", "KeyboardEvent", "StorageEvent", "getComputedStyle", "history", "location", "localStorage", "customElements",
    "IS_REACT_ACT_ENVIRONMENT"]) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    const value = key === "window" || key === "self" ? dom.window : key === "IS_REACT_ACT_ENVIRONMENT" ? true : dom.window[key as keyof typeof dom.window];
    Object.defineProperty(globalThis, key, { value: key === "getComputedStyle" && typeof value === "function" ? value.bind(dom.window) : value,
      configurable: true, writable: true });
  }
  Object.defineProperty(dom.window, "matchMedia", { configurable: true, value: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) });
  const ui = await import("@testing-library/react/pure");
  ui.configure({ getElementError: (message) => new Error(message ?? "Element not found") });
  const ecommerce = await import(fake) as typeof import("./fake-ecommerce");
  return {
    dom, ui, ecommerce,
    /** Lets unmounted animation cleanup (NumberFlow, Motion) settle before the browser globals go, as the member-auth DOM tests do. */
    async restore() {
      await new Promise((resolve) => setTimeout(resolve, 250));
      dom.window.close();
      for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
      hook.deregister();
    },
  };
}
