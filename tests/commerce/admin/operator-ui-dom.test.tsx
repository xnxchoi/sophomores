import { NextIntlClientProvider } from "next-intl";
import { messagesByLocale } from "@/i18n/messages";
import type { ReactNode } from "react";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import { registerHooks } from "node:module";
import { isValidElement, type FunctionComponent } from "react";
import type { UIFieldServerProps } from "payload";

let OperatorDocument: typeof import("../../fixtures/commerce-operator-payload").OperatorDocument;
let OperatorModified: typeof import("../../fixtures/commerce-operator-payload").OperatorModified;
let OperationPanel: typeof import("../../../src/lib/payload/admin/commerce/operation-panel").OperationPanel;
let EventManifest: typeof import("../../../src/lib/payload/admin/commerce/event-manifest").EventManifest;
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
      if (specifier === "@payloadcms/ui" && context.parentURL && new URL(context.parentURL).pathname.includes("/lib/payload/admin/commerce/")) return { url: new URL("../../fixtures/commerce-operator-payload.tsx", import.meta.url).href, shortCircuit: true };
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (/\.(?:css|scss)$/.test(url)) return { format: "commonjs", source: "module.exports = {};", shortCircuit: true };
      return nextLoad(url, context);
    }
  });
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/admin", pretendToBeVisual: true });
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Element", "Node", "MutationObserver", "getComputedStyle", "sessionStorage"]) {
    install(key, key === "window" ? dom.window : key === "getComputedStyle" ? dom.window.getComputedStyle.bind(dom.window) : dom.window[key as keyof Window]);
  }
  install("IS_REACT_ACT_ENVIRONMENT", true);
  ui = await import("@testing-library/react/pure");
  ({ OperatorDocument, OperatorModified } = await import("../../fixtures/commerce-operator-payload"));
  ({ OperationPanel } = await import("../../../src/lib/payload/admin/commerce/operation-panel"));
  ({ EventManifest } = await import("../../../src/lib/payload/admin/commerce/event-manifest"));
});
afterEach(() => { ui.cleanup(); sessionStorage.clear(); });
after(() => {
  dom.window.close();
  hooks.deregister();
  for (const [key, descriptor] of original) descriptor ? Object.defineProperty(globalThis, key, descriptor) : Reflect.deleteProperty(globalThis, key);
});
const admission = { id: "admission-1", unit: 1, status: "checked-in", claimedAccount: "customer-1", guestName: "Synthetic guest" };
function panel(data = admission, modified = false, setData = (_data: Record<string, unknown>) => {}) {
  return <OperatorModified value={modified}><OperatorDocument value={{ id: String(data.id), data, setData }}><OperationPanel kind="admission" operatorID="operator-1" /></OperatorDocument></OperatorModified>;
}
test("dirty document blocks mutation", () => {
  const calls: unknown[] = [];
  install("fetch", (...args: unknown[]) => { calls.push(args); throw Error("unexpected"); });
  renderWithMessages(panel(admission, true));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Redeem one Part I drink" }));
  assert.equal(calls.length, 0);
});
test("uncertain redemption retries exact token across remount and refreshes only canonical data", async () => {
  const bodies: Record<string, unknown>[] = [];
  let mode = "unknown";
  const saved: Record<string, unknown>[] = [];
  install("fetch", async (_path: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      bodies.push(JSON.parse(String(init.body)));
      if (mode === "unknown") throw Error("private failure");
      return Response.json({ ordinal: 1 });
    }
    return Response.json({ ...admission, checkedInAt: "canonical" });
  });
  const first = renderWithMessages(panel(admission, false, (data) => saved.push(data)));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Redeem one Part I drink" }));
  await ui.waitFor(() => assert.match(ui.screen.getByRole("status").textContent!, /Outcome not confirmed/));
  assert.equal(saved.length, 0);
  assert.doesNotMatch(sessionStorage.getItem(sessionStorage.key(0)!)!, /Synthetic|customer/);
  first.unmount(); mode = "success";
  renderWithMessages(panel(admission, false, (data) => saved.push(data)));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Redeem one Part I drink" }));
  await ui.waitFor(() => assert.equal(saved.length, 1));
  assert.equal(bodies.length, 2);
  assert.deepEqual(bodies[0], bodies[1]);
  assert.equal(saved[0].checkedInAt, "canonical");
  assert.ok(ui.screen.getByRole("button", { name: "Prepare next drink" }));
});
test("malformed acknowledgement never updates server-owned fields", async () => {
  const saved: unknown[] = [];
  install("fetch", async () => Response.json({ ordinal: 5 }));
  renderWithMessages(panel(admission, false, (data) => saved.push(data)));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Redeem one Part I drink" }));
  await ui.waitFor(() => assert.match(ui.screen.getByRole("status").textContent!, /Outcome not confirmed/));
  assert.equal(saved.length, 0);
});
test("synchronous pending guard blocks duplicate clicks and late receipt cannot update a new document", async () => {
  let resolve!: (response: Response) => void;
  let posts = 0;
  const saved: unknown[] = [];
  install("fetch", async (_path: string, init?: RequestInit) => {
    if (init?.method === "POST") { posts++; return new Promise<Response>((done) => { resolve = done; }); }
    return Response.json(admission);
  });
  const view = renderWithMessages(panel(admission, false, (data) => saved.push(data)));
  const button = ui.screen.getByRole("button", { name: "Redeem one Part I drink" });
  ui.fireEvent.click(button); ui.fireEvent.click(button);
  assert.equal(posts, 1);
  view.rerender(panel({ ...admission, id: "admission-2" }, false, (data) => saved.push(data)));
  await ui.act(async () => resolve(Response.json({ ordinal: 1 })));
  assert.equal(saved.length, 0);
  assert.equal(ui.screen.queryByText("Operation recorded. Saved snapshot refreshed; reload editor fields.") !== null, false);
});
test("acknowledged operation with failed canonical refresh blocks further mutations", async () => {
  let posts = 0;
  install("fetch", async (_path: string, init?: RequestInit) => {
    if (init?.method === "POST") { posts++; return Response.json({ ordinal: 1 }); }
    return Response.json({}, { status: 503 });
  });
  renderWithMessages(panel());
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Redeem one Part I drink" }));
  await ui.waitFor(() => assert.match(ui.screen.getByRole("status").textContent!, /Reload this document/));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Redeem shared transfer" }));
  assert.equal(posts, 1);
  assert.equal(ui.screen.queryByRole("button", { name: "Retry exact operation" }) !== null, false);
});
test("storage unavailable refuses redemption before network", async () => {
  let calls = 0;
  install("sessionStorage", { getItem() { throw Error("blocked"); }, clear() {} });
  install("fetch", async () => { calls++; return Response.json({ ordinal: 1 }); });
  renderWithMessages(panel()); ui.fireEvent.click(ui.screen.getByRole("button", { name: "Redeem one Part I drink" }));
  await ui.waitFor(() => assert.match(ui.screen.getByRole("status").textContent!, /No operation was sent/));
  assert.equal(calls, 0);
  install("sessionStorage", dom.window.sessionStorage);
});
test("manifest uses bounded pages and explicit refresh", async () => {
  const calls: string[] = [];
  install("fetch", async (path: string) => { calls.push(path); const page = Number(new URL(path, "http://localhost").searchParams.get("page")); return Response.json({ docs: page === 1 ? [{ admissionID: "admission/1", name: "Synthetic guest", checkedIn: true, transferRedeemed: false, reviewRequired: false, registered: true, transferEligible: true }] : [], page, totalDocs: 101, hasNextPage: page === 1 }); });
  renderWithMessages(<OperatorDocument value={{ id: "event-1", data: {}, setData() {} }}><EventManifest /></OperatorDocument>);
  await ui.waitFor(() => assert.ok(ui.screen.queryByText(/Page 1/)));
  assert.equal(ui.screen.getByRole("link", { name: "admission/1" }).getAttribute("href"), "/admin/collections/commerce-admissions/admission%2F1");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Next" }));
  await ui.waitFor(() => assert.ok(ui.screen.queryByText(/Page 2/)));
  assert.equal(calls.length, 2);
  assert.equal((ui.screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled, true);
});
test("parsed return rejection permits review-detail correction without changing units or action", async () => {
  const bodies: Record<string, unknown>[] = [];
  install("fetch", async (_path: string, init?: RequestInit) => { bodies.push(JSON.parse(String(init?.body))); return Response.json({ error: "Commerce operation could not be completed" }, { status: 400 }); });
  renderWithMessages(<OperatorDocument value={{ id: "order-1", data: { commerceVersion: "commerce-v1", commerceSnapshot: { quantity: 2 }, fulfillment: { status: "delivered" } }, setData() {} }}><OperationPanel kind="order" operatorID="operator-1" /></OperatorDocument>);
  ui.fireEvent.click(ui.screen.getByRole("checkbox", { name: "Unit 2" }));
  ui.fireEvent.change(ui.screen.getByLabelText("Physical return evidence reference"), { target: { value: "evidence-1" } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Accept physical return" }));
  await ui.waitFor(() => assert.equal(ui.screen.queryByRole("button", { name: "Correct return review details" }) !== null, true));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Correct return review details" }));
  assert.equal((ui.screen.getByRole("checkbox", { name: "Unit 1" }) as HTMLInputElement).disabled, true);
  assert.equal((ui.screen.getByRole("checkbox", { name: "Unit 2" }) as HTMLInputElement).disabled, true);
  assert.equal((ui.screen.getByRole("button", { name: "Mark return-requested" }) as HTMLButtonElement).disabled, true);
  assert.equal((ui.screen.getByRole("checkbox", { name: /I manually reviewed/ }) as HTMLInputElement).disabled, false);
  ui.fireEvent.click(ui.screen.getByRole("checkbox", { name: /I manually reviewed/ }));
  ui.fireEvent.change(ui.screen.getByLabelText("Physical return evidence reference"), { target: { value: "reviewed-evidence" } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Accept physical return" }));
  await ui.waitFor(() => assert.equal(bodies.length, 2));
  assert.deepEqual(bodies[1], { action: "accept-unit-return", orderID: "order-1", units: [2], evidenceID: "reviewed-evidence", usedBenefitsReviewed: true });
  assert.doesNotMatch(document.body.textContent!, /No operation was sent/);
});
test("redemption rejection retains exact replay lock and persisted UUID", async () => {
  const bodies: Record<string, unknown>[] = [];
  install("fetch", async (_path: string, init?: RequestInit) => { bodies.push(JSON.parse(String(init?.body))); return Response.json({ error: "Commerce operation could not be completed" }, { status: 400 }); });
  renderWithMessages(panel());
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Redeem one Part I drink" }));
  await ui.waitFor(() => assert.match(ui.screen.getByRole("status").textContent!, /Outcome not confirmed/));
  assert.equal(ui.screen.queryByRole("button", { name: "Correct return review details" }) !== null, false);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Retry exact operation" }));
  await ui.waitFor(() => assert.equal(bodies.length, 2));
  assert.equal(bodies[0].actionID, bodies[1].actionID);
});
test("malformed rejection retains exact retry lock", async () => {
  install("fetch", async () => Response.json({ error: "unexpected", extra: true }, { status: 400 }));
  renderWithMessages(panel()); ui.fireEvent.click(ui.screen.getByRole("button", { name: "Redeem one Part I drink" }));
  await ui.waitFor(() => assert.match(ui.screen.getByRole("status").textContent!, /Outcome not confirmed/));
  assert.equal(ui.screen.queryByRole("button", { name: "Correct return review details" }) !== null, false);
});
test("order shipment sends explicit carrier and tracking through command endpoint", async () => {
  const bodies: Record<string, unknown>[] = [];
  const order = { id: "order-1", commerceVersion: "commerce-v1", commerceSnapshot: { quantity: 2 }, fulfillment: { status: "packed" } };
  install("fetch", async (_path: string, init?: RequestInit) => {
    if (init?.method === "POST") { bodies.push(JSON.parse(String(init.body))); return Response.json({ success: true }); }
    return Response.json({ ...order, fulfillment: { status: "shipped" } });
  });
  renderWithMessages(<OperatorDocument value={{ id: order.id, data: order, setData() {} }}><OperationPanel kind="order" operatorID="operator-1" /></OperatorDocument>);
  assert.equal((ui.screen.getByRole("button", { name: "Mark shipped" }) as HTMLButtonElement).disabled, true);
  ui.fireEvent.change(ui.screen.getByLabelText("Carrier"), { target: { value: "Synthetic carrier" } });
  ui.fireEvent.change(ui.screen.getByLabelText("Tracking number"), { target: { value: "TRACK-1" } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Mark shipped" }));
  await ui.waitFor(() => assert.match(ui.screen.getByRole("status").textContent!, /Saved snapshot refreshed/));
  assert.equal(bodies.length, 1);
  assert.equal(bodies[0].action, "fulfillment");
  assert.equal(bodies[0].status, "shipped");
  assert.equal(bodies[0].carrier, "Synthetic carrier");
  assert.equal(bodies[0].trackingNumber, "TRACK-1");
  assert.match(String(bodies[0].actionID), /^[a-f0-9-]{36}$/);
});
test("physical return sends only selected purchased units and final disposition requires review", async () => {
  const bodies: Record<string, unknown>[] = [];
  const order = { id: "order-1", commerceVersion: "commerce-v1", commerceSnapshot: { quantity: 2 }, fulfillment: { status: "delivered" } };
  install("fetch", async (_path: string, init?: RequestInit) => {
    if (init?.method === "POST") { const command = JSON.parse(String(init.body)); bodies.push(command); return Response.json(command.action === "accept-unit-return" ? { newlyAcceptedUnits: [2] } : { disposedUnits: [2] }); }
    return Response.json(order);
  });
  renderWithMessages(<OperatorDocument value={{ id: order.id, data: order, setData() {} }}><OperationPanel kind="order" operatorID="operator-1" /></OperatorDocument>);
  assert.equal(ui.screen.queryByRole("checkbox", { name: "Unit 3" }) !== null, false);
  ui.fireEvent.click(ui.screen.getByRole("checkbox", { name: "Unit 2" }));
  ui.fireEvent.change(ui.screen.getByLabelText("Physical return evidence reference"), { target: { value: "evidence-2" } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Accept physical return" }));
  await ui.waitFor(() => assert.match(ui.screen.getByRole("status").textContent!, /Saved snapshot refreshed/));
  assert.deepEqual(bodies[0], { action: "accept-unit-return", orderID: "order-1", units: [2], evidenceID: "evidence-2", usedBenefitsReviewed: false });
  const confirm = ui.screen.getByRole("button", { name: "Confirm final disposition" }) as HTMLButtonElement;
  assert.equal(confirm.disabled, true);
  ui.fireEvent.click(confirm); assert.equal(bodies.length, 1);
  ui.fireEvent.click(ui.screen.getByRole("checkbox", { name: /I inspected units 2 and approve irreversible do-not-restock/ }));
  ui.fireEvent.click(confirm);
  await ui.waitFor(() => assert.equal(bodies.length, 2));
  assert.deepEqual(bodies[1], { action: "return-disposition", orderID: "order-1", units: [2], disposition: "do-not-restock" });
});
test("legacy orders offer no mutation controls", () => {
  renderWithMessages(<OperatorDocument value={{ id: "legacy-1", data: { commerceVersion: "legacy" }, setData() {} }}><OperationPanel kind="order" operatorID="operator-1" /></OperatorDocument>);
  assert.match(document.body.textContent!, /Historical orders are immutable/);
  assert.equal(ui.screen.queryByRole("button", { name: /Mark |Accept physical return|Confirm final disposition/ }) !== null, false);
});
test("same-page manifest refresh preserves the visible table while loading", async () => {
  let finish!: (value: Response) => void;
  let calls = 0;
  const receipt = { docs: [{ admissionID: "admission-1", name: "Synthetic guest", checkedIn: true, transferRedeemed: false, reviewRequired: false, registered: true, transferEligible: true }], page: 1, totalDocs: 1, hasNextPage: false };
  install("fetch", async () => ++calls === 1 ? Response.json(receipt) : new Promise<Response>((resolve) => { finish = resolve; }));
  renderWithMessages(<OperatorDocument value={{ id: "event-1", data: {}, setData() {} }}><EventManifest /></OperatorDocument>);
  await ui.waitFor(() => assert.equal(ui.screen.queryByRole("table") !== null, true));
  const table = ui.screen.getByRole("table");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Refresh manifest" }));
  assert.equal(ui.screen.queryByRole("table") === table, true);
  assert.equal(ui.screen.queryByText("Synthetic guest") !== null, true);
  await ui.act(async () => finish(Response.json(receipt)));
});
test("server UI fields reject serialized or non-superadmin identities and pass only opaque operator ID", async () => {
  const { OrderOperationsField, AdmissionOperationsField, EventManifestField } = await import("../../../src/lib/payload/admin/commerce/fields");
  // These exports are function components; Payload's field type also permits classes.
  const fields = [OrderOperationsField, AdmissionOperationsField, EventManifestField] as FunctionComponent<UIFieldServerProps>[];
  for (const user of [null, { id: "operator-1", collection: "admins", role: "admin" }, { id: "operator-1", collection: "admins", role: "editor", _strategy: "staff-better-auth" }, { id: "customer-1", collection: "users", role: "admin", _strategy: "staff-better-auth" }]) {
    const props = { req: { user } } as unknown as UIFieldServerProps;
    for (const Field of fields) assert.equal((await Field(props)) === null, true);
  }
  const props = { req: { user: { id: "operator-1", collection: "admins", role: "admin", _strategy: "staff-better-auth", email: "private@example.test" } } } as unknown as UIFieldServerProps;
  const result = await (OrderOperationsField as FunctionComponent<UIFieldServerProps>)(props);
  assert.equal(isValidElement(result), true);
  if (!isValidElement<{ operatorID: string; kind: string }>(result)) throw Error("Expected operator component");
  assert.deepEqual(result.props, { kind: "order", operatorID: "operator-1" });
});
test("fourth acknowledged drink cannot prepare a fifth but shared transfer remains usable", async () => {
  const bodies: Record<string, unknown>[] = [];
  install("fetch", async (_path: string, init?: RequestInit) => {
    if (init?.method === "POST") { const command = JSON.parse(String(init.body)); bodies.push(command); return Response.json({ ordinal: command.kind === "part-i-drink" ? 4 : 1 }); }
    return Response.json(admission);
  });
  renderWithMessages(panel());
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Redeem one Part I drink" }));
  await ui.waitFor(() => assert.match(ui.screen.getByRole("status").textContent!, /Saved snapshot refreshed/));
  const persisted = sessionStorage.getItem("commerce-operation:operator-1:admission-1:part-i-drink");
  assert.equal(ui.screen.queryByRole("button", { name: "Prepare next drink" }) !== null, false);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Continue admission operations" }));
  assert.equal((ui.screen.getByRole("button", { name: "Redeem one Part I drink" }) as HTMLButtonElement).disabled, true);
  assert.equal((ui.screen.getByRole("button", { name: "Redeem shared transfer" }) as HTMLButtonElement).disabled, false);
  assert.equal(sessionStorage.getItem("commerce-operation:operator-1:admission-1:part-i-drink"), persisted);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Redeem shared transfer" }));
  await ui.waitFor(() => assert.equal(bodies.length, 2));
  assert.equal(bodies[1].kind, "shared-transfer");
  await ui.waitFor(() => {
    assert.match(ui.screen.getByRole("status").textContent!, /Operation recorded\. Saved snapshot refreshed/);
    assert.equal((ui.screen.getByRole("button", { name: "Continue admission operations" }) as HTMLButtonElement).disabled, false);
  });
});
test("saved editor reload is explicit and unavailable while document edits or an operation are pending", async () => {
  sessionStorage.setItem("commerce-operation:operator-1:admission-1:part-i-drink", "pending-token");
  const dirty = renderWithMessages(panel(admission, true));
  assert.equal((ui.screen.getByRole("button", { name: "Reload saved editor" }) as HTMLButtonElement).disabled, true);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Reload saved editor" }));
  assert.equal(sessionStorage.getItem("commerce-operation:operator-1:admission-1:part-i-drink"), "pending-token");
  dirty.unmount(); sessionStorage.clear();
  let finish!: (response: Response) => void;
  install("fetch", async (_path: string, init?: RequestInit) => init?.method === "POST" ? new Promise<Response>((resolve) => { finish = resolve; }) : Response.json(admission));
  renderWithMessages(panel());
  assert.equal((ui.screen.getByRole("button", { name: "Reload saved editor" }) as HTMLButtonElement).disabled, false);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Redeem one Part I drink" }));
  assert.equal((ui.screen.getByRole("button", { name: "Reload saved editor" }) as HTMLButtonElement).disabled, true);
  await ui.act(async () => finish(Response.json({ ordinal: 1 })));
  await ui.waitFor(() => assert.match(ui.screen.getByRole("status").textContent!, /Saved snapshot refreshed/));
});
test("manifest timeout releases refresh controls and permits a retry", async (context) => {
  const deadlines: number[] = [];
  context.mock.method(AbortSignal, "timeout", (milliseconds: number) => {
    deadlines.push(milliseconds);
    return AbortSignal.abort(new DOMException("Synthetic timeout", "TimeoutError"));
  });
  install("fetch", async (_path: string, init?: RequestInit) => {
    if (init?.signal?.aborted) throw init.signal.reason;
    return Response.json({ docs: [], page: 1, totalDocs: 0, hasNextPage: false });
  });
  renderWithMessages(<OperatorDocument value={{ id: "event-1", data: {}, setData() {} }}><EventManifest /></OperatorDocument>);
  await ui.waitFor(() => assert.equal((ui.screen.getByRole("button", { name: "Refresh manifest" }) as HTMLButtonElement).disabled, false));
  assert.deepEqual(deadlines, [15_000]);
  assert.equal(ui.screen.getByRole("status").textContent?.includes("Manifest unavailable"), true);
});
test("changing return units clears the previous used-benefit review", () => {
  const order = { id: "order-1", commerceVersion: "commerce-v1", commerceSnapshot: { quantity: 2 }, fulfillment: { status: "delivered" } };
  renderWithMessages(<OperatorDocument value={{ id: order.id, data: order, setData() {} }}><OperationPanel kind="order" operatorID="operator-1" /></OperatorDocument>);
  const review = ui.screen.getByRole("checkbox", { name: /I manually reviewed/ }) as HTMLInputElement;
  ui.fireEvent.click(ui.screen.getByRole("checkbox", { name: "Unit 1" }));
  ui.fireEvent.click(review);
  assert.equal(review.checked, true);
  ui.fireEvent.click(ui.screen.getByRole("checkbox", { name: "Unit 2" }));
  assert.equal(review.checked, false);
});
test("a failed later manifest page keeps Previous available", async () => {
  install("fetch", async (path: string) => {
    if (String(path).endsWith("page=2")) throw new Error("Synthetic page failure");
    return Response.json({ docs: [], page: 1, totalDocs: 101, hasNextPage: true });
  });
  renderWithMessages(<OperatorDocument value={{ id: "event-1", data: {}, setData() {} }}><EventManifest /></OperatorDocument>);
  await ui.waitFor(() => assert.equal((ui.screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled, false));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Next" }));
  await ui.waitFor(() => assert.equal(ui.screen.getByRole("status").textContent?.includes("Manifest unavailable"), true));
  const previous = ui.screen.queryByRole("button", { name: "Previous" }) as HTMLButtonElement | null;
  assert.equal(previous !== null, true);
  assert.equal(previous?.disabled, false);
  ui.fireEvent.click(previous!);
  await ui.waitFor(() => assert.equal(ui.screen.getByText("Page 1 · 101 admissions") !== null, true));
});

function Messages({ children }: { children: ReactNode }) {
  return <NextIntlClientProvider locale="en" timeZone="Asia/Seoul" messages={messagesByLocale.en}>{children}</NextIntlClientProvider>;
}
function renderWithMessages(node: ReactNode) {
  return ui.render(node, { wrapper: Messages });
}
