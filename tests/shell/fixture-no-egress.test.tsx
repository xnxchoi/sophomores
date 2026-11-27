import assert from "node:assert/strict";
import { test } from "node:test";
import { EnglishMessages } from "../fixtures/english-messages";
import { MemberAuthProviders } from "../member-auth/fixtures/providers";

// Control (Review-B, 27 Nov): a render through the site test fixtures makes no request. The site's DeviceProvider once
// ran Thumbmark, whose sampled logging posted to api.thumbmarkjs.com (removed, owner, 27 Nov); Math.random() = 0 keeps
// any such sampling switched on, so a returning call would fail here.
test("the site test fixtures render core Button and Link without any network request", async () => {
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/help", pretendToBeVisual: true });
  const requests: string[] = [];
  const saved = new Map<string, PropertyDescriptor | undefined>();
  const replace = (key: string, value: unknown) => {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  };
  for (const key of ["window", "self", "document", "navigator", "HTMLElement", "Element", "Node", "MutationObserver", "Event", "sessionStorage", "localStorage"]) {
    replace(key, key === "window" || key === "self" ? dom.window : (dom.window as never as Record<string, unknown>)[key]);
  }
  replace("IS_REACT_ACT_ENVIRONMENT", true);
  const record = (input: unknown) => { requests.push(String(input instanceof URL ? input.href : (input as { url?: string })?.url ?? input)); };
  replace("fetch", async (input: unknown) => { record(input); throw new Error("network blocked in tests"); });
  replace("XMLHttpRequest", class { open(_method: string, url: string) { record(url); } send() {} setRequestHeader() {} });
  dom.window.navigator.sendBeacon = (url: string | URL) => { record(url); return false; };
  const random = Math.random;
  Math.random = () => 0;
  const ui = await import("@testing-library/react/pure");
  const { Button } = await import("@/components/core/Button");
  const { Link } = await import("@/components/core/Link/Link");
  try {
    for (const Wrapper of [EnglishMessages, MemberAuthProviders]) {
      ui.render(<Wrapper><Button variant="bare">Go</Button><Link href="/help/shipping">Shipping</Link></Wrapper>);
      await ui.act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
      ui.cleanup();
    }
    assert.deepEqual(requests, [], "no request leaves a fixture render");
  } finally {
    Math.random = random;
    ui.cleanup();
    dom.window.close();
    for (const [key, value] of saved) { if (value) Object.defineProperty(globalThis, key, value); else Reflect.deleteProperty(globalThis, key); }
  }
});
