import { NextIntlClientProvider } from "next-intl";
import { messagesByLocale } from "@/i18n/messages";
import type { ReactNode } from "react";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import { registerHooks } from "node:module";

let DoorConsole: typeof import("../../../src/payload/admin/door/door-console").DoorConsole;
let hooks: ReturnType<typeof registerHooks>;
let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
const original = new Map<string, PropertyDescriptor | undefined>();
function install(name: string, value: unknown) {
  if (!original.has(name)) original.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
}
before(async () => {
  hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "@payloadcms/ui" && context.parentURL && new URL(context.parentURL).pathname.includes("/payload/admin/door/")) return { url: new URL("../../fixtures/commerce-operator-payload.tsx", import.meta.url).href, shortCircuit: true };
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (/\.(?:css|scss)$/.test(url)) return { format: "commonjs", source: "module.exports = {};", shortCircuit: true };
      return nextLoad(url, context);
    },
  });
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/admin/door", pretendToBeVisual: true });
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLSelectElement", "Element", "Node", "MutationObserver", "getComputedStyle"]) {
    install(key, key === "window" ? dom.window : key === "getComputedStyle" ? dom.window.getComputedStyle.bind(dom.window) : dom.window[key as keyof Window]);
  }
  install("IS_REACT_ACT_ENVIRONMENT", true);
  ui = await import("@testing-library/react/pure");
  ({ DoorConsole } = await import("../../../src/payload/admin/door/door-console"));
});
afterEach(() => ui.cleanup());
after(() => {
  dom.window.close();
  hooks.deregister();
  for (const [key, descriptor] of original) descriptor ? Object.defineProperty(globalThis, key, descriptor) : Reflect.deleteProperty(globalThis, key);
});

const events = [{ id: "event-a", name: "Event A" }, { id: "event-b", name: "Event B" }];
const guest = { admissionID: "admission-1", name: "Jun Lee", kind: "guest" as const };
function render(node: ReactNode) {
  return ui.render(node, { wrapper: ({ children }) => <NextIntlClientProvider locale="en" timeZone="Asia/Seoul" messages={messagesByLocale.en}>{children}</NextIntlClientProvider> });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
async function scan(value: string) {
  ui.fireEvent.change(ui.screen.getByLabelText("Ticket link"), { target: { value } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Check in" }));
}

test("the event picker is locked while a check-in is in flight", async () => {
  const pending = deferred<Response>();
  install("fetch", async (path: string) => String(path).includes("/check-in") ? pending.promise : Response.json({ checkedIn: 0, total: 1 }));
  render(<DoorConsole allowed events={events} />);
  await scan("https://app.unlock-protocol.com/verification?data=x&sig=0x00");
  assert.equal((ui.screen.getByLabelText("Event") as HTMLSelectElement).disabled, true);
  await ui.act(async () => pending.resolve(Response.json({ result: { outcome: "admitted", checkedInAt: new Date().toISOString(), guest, justAdmitted: false }, count: { checkedIn: 1, total: 1 } })));
  await ui.screen.findByText("Admitted");
  assert.equal((ui.screen.getByLabelText("Event") as HTMLSelectElement).disabled, false);
});

test("a failed name search shows an inline error with a retry, never 'no matches'", async () => {
  let searches = 0;
  install("fetch", async (path: string) => {
    if (String(path).includes("/search")) { searches++; return searches === 1 ? new Response("nope", { status: 500 }) : Response.json({ results: [] }); }
    return Response.json({ checkedIn: 0, total: 1 });
  });
  render(<DoorConsole allowed events={events} />);
  ui.fireEvent.change(ui.screen.getByLabelText("Guest or member name"), { target: { value: "Jun" } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Search" }));
  await ui.screen.findByText("Search didn't go through. Check the connection and try again.");
  assert.equal(ui.screen.queryByText(/No one at this event matches/), null);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Try again" }));
  await ui.screen.findByText(/No one at this event matches/);
  assert.equal(searches, 2);
});

test("every door control has a 48 px minimum in CSS pixels, not rem", () => {
  install("fetch", async () => Response.json({ checkedIn: 0, total: 1 }));
  const { container } = render(<DoorConsole allowed events={events} />);
  const controls = [...container.querySelectorAll("button, input, select")];
  assert.ok(controls.length >= 5);
  for (const control of controls) {
    if (control.className.includes("staff:hidden")) continue;
    assert.match(control.className, /staff:min-h-\[48px\]/, control.outerHTML.slice(0, 80));
    assert.doesNotMatch(control.className, /staff:min-h-12\b/);
  }
});
