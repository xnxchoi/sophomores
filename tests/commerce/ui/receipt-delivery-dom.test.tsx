import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { EnglishMessages } from "../../fixtures/english-messages";

test("receipt delivery starts blank, clears on hide, and cannot reuse a late read after account change or BFCache return", async (t) => {
  const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost", pretendToBeVisual: true });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const key of ["window", "document", "HTMLElement", "Element", "Node", "MutationObserver", "IS_REACT_ACT_ENVIRONMENT"]) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: key === "window" ? dom.window :
      key === "IS_REACT_ACT_ENVIRONMENT" ? true : dom.window[key as keyof typeof dom.window] });
  }
  const ui = await import("@testing-library/react/pure");
  t.after(() => {
    ui.cleanup();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    dom.window.close();
  });
  const { ReceiptDelivery } = await import("@/components/commerce/receipt-delivery");
  const calls: { init?: RequestInit; resolve: (response: Response) => void }[] = [];
  t.mock.method(globalThis, "fetch", (_url: string, init?: RequestInit) =>
    new Promise<Response>((resolve) => { calls.push({ init, resolve }); }));
  const id = "915de316-e98d-4ca7-9d32-f5cb6785daf0";
  const address = { country: "KR", recipientName: "Fixture recipient", phone: "01012345678", postalCode: "12345", addressLine1: "Fixture road" };
  const { container } = ui.render(<EnglishMessages><ReceiptDelivery orderID={id} principal="users:buyer" /></EnglishMessages>);
  const privateTextPresent = () => [address.phone, address.addressLine1, address.recipientName].some(text => container.textContent?.includes(text));
  assert.equal(privateTextPresent(), false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init?.cache, "no-store");
  await ui.act(async () => { calls[0].resolve(Response.json({ address })); });
  assert.equal(privateTextPresent(), true);
  const visibility = (state: string) => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
    document.dispatchEvent(new dom.window.Event("visibilitychange"));
  };
  await ui.act(async () => { visibility("hidden"); });
  assert.equal(privateTextPresent(), false);
  await ui.act(async () => { visibility("visible"); });
  assert.equal(calls.length, 2);
  await ui.act(async () => { window.dispatchEvent(new dom.window.Event("pagehide")); });
  assert.equal(calls[1].init?.signal?.aborted, true);
  await ui.act(async () => {
    window.dispatchEvent(new dom.window.PageTransitionEvent("pageshow", { persisted: true }));
    calls[1].resolve(Response.json({ address }));
  });
  assert.equal(calls.length, 3);
  assert.equal(privateTextPresent(), false);
  await ui.act(async () => { calls[2].resolve(new Response(null, { status: 403 })); });
  assert.equal(privateTextPresent(), false);
  await ui.act(async () => { window.dispatchEvent(new dom.window.Event("focus")); });
  assert.equal(calls.length, 4);
  await ui.act(async () => { calls[3].resolve(Response.json({ address })); });
  assert.equal(privateTextPresent(), true, "a fresh authorized response restores delivery");
  await ui.act(async () => { window.dispatchEvent(new dom.window.Event("blur")); });
  assert.equal(privateTextPresent(), false, "switching windows clears delivery even without a visibility event");
});
