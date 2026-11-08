import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import type { PaymentRequest, PaymentResponse } from "@portone/browser-sdk/v2";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Checkout: typeof import("@/components/tickets/portone-checkout").PortOneCheckoutButton;
let Result: typeof import("@/components/tickets/portone-payment-result").PortOnePaymentResult;
let sessionStorageDescriptor: PropertyDescriptor;
const previous = new Map<string, PropertyDescriptor | undefined>();
const prepared = { success: true, data: { storeId: "store-test", channelKey: "channel-key-test", paymentId: "payment-test-1", orderName: "Test admission", totalAmount: 12000, currency: "KRW", redirectUrl: "http://localhost/tickets/payment", customer: { customerId: "member-test", email: "verified@example.com" }, recovered: false } };
const response: PaymentResponse = { transactionType: "PAYMENT", txId: "tx-test", paymentId: "payment-test-1" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/tickets" });
  Object.defineProperty(dom.window.navigator, "locks", { configurable: true, value: { request: async (_name: string, _options: unknown, callback: (lock: object) => Promise<unknown>) => callback({}) } });
  sessionStorageDescriptor = Object.getOwnPropertyDescriptor(dom.window, "sessionStorage")!;
  for (const key of ["window", "document", "navigator", "HTMLElement", "Node", "MutationObserver", "Event"]) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: key === "window" ? dom.window : dom.window[key as keyof typeof dom.window] });
  }
  previous.set("IS_REACT_ACT_ENVIRONMENT", Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT"));
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, writable: true, value: true });
  ui = await import("@testing-library/react/pure");
  Checkout = (await import("@/components/tickets/portone-checkout")).PortOneCheckoutButton;
  Result = (await import("@/components/tickets/portone-payment-result")).PortOnePaymentResult;
});
afterEach(() => { ui.cleanup(); Object.defineProperty(dom.window, "sessionStorage", sessionStorageDescriptor); dom.window.sessionStorage.clear(); });
after(() => {
  dom.window.close();
  for (const [key, value] of previous) {
    if (value) Object.defineProperty(globalThis, key, value);
    else Reflect.deleteProperty(globalThis, key);
  }
});

test("checkout defaults closed and invalid quantity never prepares", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => json(prepared));
  const view = ui.render(<Checkout quantity={1} />);
  assert.equal((ui.screen.getByRole("button") as HTMLButtonElement).disabled, true);
  view.rerender(<Checkout quantity={0} disabled={false} />);
  assert.equal((ui.screen.getByRole("button") as HTMLButtonElement).disabled, true);
  assert.equal(fetch.mock.callCount(), 0);
});

test("a retained known reference bypasses the unavailable-offer fallback for status-only navigation", async (t) => {
  dom.window.sessionStorage.setItem("sphmrs.portone-checkout.v1", JSON.stringify({ schemaVersion: 1,
    attemptId: "a08df457-9d8c-4c67-adbd-1934a851a70f", quantity: 2,
    order: { paymentId: "payment-test-1", quantity: 2, totalAmount: 12000, currency: "KRW" } }));
  const fetch = t.mock.method(globalThis, "fetch", async () => json(prepared));
  const urls: string[] = [];
  let sdkCalls = 0;
  ui.render(<Checkout quantity={0} disabled recoveryDisabled={false} unavailableFallback={<button disabled>No current offer</button>}
    onNavigate={(url) => urls.push(url)} requestPayment={async () => { sdkCalls++; return response; }} />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Check payment status" }));
  assert.deepEqual(urls, ["/tickets/payment?paymentId=payment-test-1"]);
  assert.equal(ui.screen.queryByRole("button", { name: "No current offer" }), null);
  assert.equal(fetch.mock.callCount(), 0);
  assert.equal(sdkCalls, 0);
});

test("retained unknown-reference recovery uses its auth gate rather than new-checkout availability", async (t) => {
  const key = "sphmrs.portone-checkout.v1";
  const record = { schemaVersion: 1, attemptId: "a08df457-9d8c-4c67-adbd-1934a851a70f", quantity: 2 };
  dom.window.sessionStorage.setItem(key, JSON.stringify(record));
  const fetch = t.mock.method(globalThis, "fetch", async () => json({ ...prepared, data: { ...prepared.data, recovered: true } }));
  let sdkCalls = 0;
  const requestPayment = async () => { sdkCalls++; return response; };
  const view = ui.render(<Checkout quantity={0} disabled recoveryDisabled requestPayment={requestPayment} />);
  assert.equal((ui.screen.getByRole("button") as HTMLButtonElement).disabled, true);
  ui.fireEvent.click(ui.screen.getByRole("button"));
  assert.equal(fetch.mock.callCount(), 0);
  view.rerender(<Checkout quantity={0} disabled recoveryDisabled={false} requestPayment={requestPayment} />);
  const recover = ui.screen.getByRole("button", { name: "Recover checkout" }) as HTMLButtonElement;
  assert.equal(recover.disabled, false);
  ui.fireEvent.click(recover);
  await ui.screen.findByRole("button", { name: "Check payment status" });
  assert.deepEqual(JSON.parse(String(fetch.mock.calls[0].arguments[1]?.body)), { attemptId: record.attemptId, quantity: 2 });
  assert.deepEqual(JSON.parse(dom.window.sessionStorage.getItem(key)!), { ...record,
    order: { paymentId: "payment-test-1", quantity: 2, totalAmount: 12000, currency: "KRW" } });
  assert.equal(sdkCalls, 0);
});

test("rejected retained unknown-reference recovery preserves the ambiguous attempt without opening payment", async (t) => {
  const key = "sphmrs.portone-checkout.v1";
  const record = JSON.stringify({ schemaVersion: 1, attemptId: "a08df457-9d8c-4c67-adbd-1934a851a70f", quantity: 2 });
  dom.window.sessionStorage.setItem(key, record);
  const fetch = t.mock.method(globalThis, "fetch", async () => json({ success: false }, 403));
  let sdkCalls = 0;
  ui.render(<Checkout quantity={1} disabled recoveryDisabled={false} requestPayment={async () => { sdkCalls++; return response; }} />);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Recover checkout" }));
  await ui.screen.findByRole("alert");
  assert.equal(dom.window.sessionStorage.getItem(key), record);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(sdkCalls, 0);
  assert.equal(ui.screen.queryByRole("button", { name: "Check payment status" }), null);
});

test("unknown-reference recovery still fails closed when durable storage cannot be rewritten", async (t) => {
  const key = "sphmrs.portone-checkout.v1";
  const record = JSON.stringify({ schemaVersion: 1, attemptId: "a08df457-9d8c-4c67-adbd-1934a851a70f", quantity: 2 });
  dom.window.sessionStorage.setItem(key, record);
  t.mock.method(Object.getPrototypeOf(dom.window.sessionStorage) as Storage, "setItem", () => { throw new Error("storage quota"); });
  const fetch = t.mock.method(globalThis, "fetch", async () => json(prepared));
  ui.render(<Checkout quantity={1} disabled recoveryDisabled={false} />);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Recover checkout" }));
  await ui.screen.findByRole("alert");
  assert.equal((ui.screen.getByRole("button") as HTMLButtonElement).disabled, true);
  assert.equal(dom.window.sessionStorage.getItem(key), record);
  assert.equal(fetch.mock.callCount(), 0);
});

test("prepare sends quantity and durable attempt only and direct SDK receives charge fields then fixed confirmation URL", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => json(prepared));
  const calls: PaymentRequest[] = [];
  const navigations: string[] = [];
  ui.render(<Checkout quantity={2} disabled={false} requestPayment={async (request) => { calls.push(request); return response; }} onNavigate={(url) => navigations.push(url)} />);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Pay by card" }));
  await ui.waitFor(() => assert.equal(navigations.length, 1));
  assert.equal(fetch.mock.calls[0].arguments[0], "/api/payments/portone/prepare");
  const init = fetch.mock.calls[0].arguments[1] as RequestInit;
  const body = JSON.parse(init.body as string) as Record<string, unknown>;
  assert.deepEqual(Object.keys(body).sort(), ["attemptId", "quantity"]);
  assert.equal(body.quantity, 2);
  assert.match(String(body.attemptId), /^[0-9a-f-]{36}$/i);
  assert.equal(init.credentials, "same-origin");
  assert.ok(init.signal instanceof AbortSignal);
  const { recovered: _recovered, ...paymentRequest } = prepared.data;
  assert.equal(_recovered, false);
  assert.deepEqual(calls[0], { ...paymentRequest, payMethod: "CARD" });
  assert.equal(navigations[0], "/tickets/payment?paymentId=payment-test-1");
  assert.ok(ui.screen.queryByText(/payment confirmed/i) === null);
});

test("malformed preparation never reaches SDK", async (t) => {
  let calls = 0;
  for (const data of [{ ...prepared.data, totalAmount: -1 }, { ...prepared.data, totalAmount: 1.5 }, { ...prepared.data, paymentId: "" }, { ...prepared.data, redirectUrl: "https://other.example/tickets/payment" }, { ...prepared.data, redirectUrl: "http://localhost/tickets/payment?next=other" }, { ...prepared.data, customer: { customerId: "", phoneNumber: "invented" } }]) {
    t.mock.method(globalThis, "fetch", async () => json({ success: true, data }));
    const view = ui.render(<Checkout quantity={1} disabled={false} requestPayment={async () => { calls++; return response; }} />);
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Pay by card" }));
    await ui.screen.findByRole("alert");
    assert.equal(calls, 0);
    view.unmount();
    dom.window.sessionStorage.clear();
  }
});

test("server customer fields are explicitly allowlisted for the direct SDK", async (t) => {
  t.mock.method(globalThis, "fetch", async () => json({ ...prepared, data: { ...prepared.data, customer: { ...prepared.data.customer, fullName: "Verified member", phoneNumber: "unapproved", address: "unapproved" }, noticeUrls: ["https://unapproved.example"] } }));
  const calls: PaymentRequest[] = [];
  ui.render(<Checkout quantity={1} disabled={false} requestPayment={async (request) => { calls.push(request); return undefined; }} />);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Pay by card" }));
  await ui.screen.findByRole("button", { name: "Check payment status" });
  assert.deepEqual(calls[0].customer, { ...prepared.data.customer, fullName: "Verified member" });
  assert.equal(calls[0].noticeUrls, undefined);
});

test("cancelled, missing, mismatched and thrown SDK results retain order and do not create another charge", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => json(prepared));
  for (const outcome of [undefined, { ...response, code: "PAY_PROCESS_CANCELED" }, { ...response, paymentId: "other-payment" }, new Error("provider failure")]) {
    let sdkCalls = 0;
    const urls: string[] = [];
    const view = ui.render(<Checkout quantity={1} disabled={false} requestPayment={async () => { sdkCalls++; if (outcome instanceof Error) throw outcome; return outcome; }} onNavigate={(url) => urls.push(url)} />);
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Pay by card" }));
    const check = await ui.screen.findByRole("button", { name: "Check payment status" });
    assert.equal(urls.length, 0);
    ui.fireEvent.click(check);
    assert.deepEqual(urls, ["/tickets/payment?paymentId=payment-test-1"]);
    assert.equal(sdkCalls, 1);
    view.unmount();
    dom.window.sessionStorage.clear();
  }
  assert.equal(fetch.mock.callCount(), 4);
});

test("an unresolved order retains its original quantity and authoritative total while parent selection changes", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => json(prepared));
  const busy: boolean[] = [];
  const requestPayment = async () => undefined;
  const onBusyChange = (value: boolean) => busy.push(value);
  const view = ui.render(<Checkout quantity={2} disabled={false} onBusyChange={onBusyChange} requestPayment={requestPayment} onNavigate={() => {}} />);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Pay by card" }));
  await ui.screen.findByRole("button", { name: "Check payment status" });
  assert.ok(ui.screen.queryByText("2 tickets · ₩12,000") !== null);
  assert.deepEqual(busy, [true, true]);
  view.rerender(<Checkout quantity={5} disabled={false} onBusyChange={onBusyChange} requestPayment={requestPayment} onNavigate={() => {}} />);
  assert.ok(ui.screen.queryByText("2 tickets · ₩12,000") !== null);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Check payment status" }));
  assert.equal(fetch.mock.callCount(), 1);
  assert.deepEqual(busy, [true, true]);
  view.unmount();
  assert.deepEqual(busy, [true, true, false]);
});

test("an uncertain SDK outcome restores keyboard focus to its retained recovery action", async (t) => {
  t.mock.method(globalThis, "fetch", async () => json(prepared));
  let done!: (value: undefined) => void;
  ui.render(<Checkout quantity={1} disabled={false} requestPayment={() => new Promise((resolve) => { done = resolve; })} />);
  const pay = ui.screen.getByRole("button", { name: "Pay by card" }) as HTMLButtonElement;
  pay.focus();
  ui.fireEvent.click(pay);
  await ui.waitFor(() => assert.ok(done));
  const previousTabIndex = document.body.getAttribute("tabindex");
  t.after(() => {
    if (previousTabIndex === null) document.body.removeAttribute("tabindex");
    else document.body.setAttribute("tabindex", previousTabIndex);
  });
  // Chrome drops disabled-button focus; JSDOM needs an explicit body focus target.
  document.body.setAttribute("tabindex", "-1");
  document.body.focus();
  assert.ok(document.activeElement === document.body);
  await ui.act(async () => { done(undefined); });
  const recovery = ui.screen.getByRole("button", { name: "Check payment status" });
  assert.ok(document.activeElement === recovery);
});

test("checkout recovery never steals focus moved to another control", async (t) => {
  t.mock.method(globalThis, "fetch", async () => json(prepared));
  let done!: (value: undefined) => void;
  ui.render(<><Checkout quantity={1} disabled={false} requestPayment={() => new Promise((resolve) => { done = resolve; })} /><button type="button">Other action</button></>);
  const pay = ui.screen.getByRole("button", { name: "Pay by card" }) as HTMLButtonElement;
  pay.focus();
  ui.fireEvent.click(pay);
  await ui.waitFor(() => assert.ok(done));
  const other = ui.screen.getByRole("button", { name: "Other action" }) as HTMLButtonElement;
  other.focus();
  await ui.act(async () => { done(undefined); });
  assert.ok(ui.screen.queryByRole("button", { name: "Check payment status" }) !== null);
  assert.ok(document.activeElement === other);
});

test("pending checkout blocks repeat activation and unmount suppresses late SDK and navigation", async (t) => {
  let done!: (value: Response) => void;
  const fetch = t.mock.method(globalThis, "fetch", () => new Promise<Response>((resolve) => { done = resolve; }));
  let sdkCalls = 0;
  let navigations = 0;
  const busy: boolean[] = [];
  const view = ui.render(<Checkout quantity={1} disabled={false} onBusyChange={(value) => busy.push(value)} requestPayment={async () => { sdkCalls++; return response; }} onNavigate={() => { navigations++; }} />);
  const button = ui.screen.getByRole("button", { name: "Pay by card" });
  ui.fireEvent.click(button); ui.fireEvent.click(button);
  assert.equal(fetch.mock.callCount(), 1);
  view.unmount();
  await ui.act(async () => { done(json(prepared)); });
  assert.equal(sdkCalls, 0);
  assert.equal(navigations, 0);
  assert.deepEqual(busy, [true, false]);
});

test("unmount after SDK opens suppresses its late successful result", async (t) => {
  t.mock.method(globalThis, "fetch", async () => json(prepared));
  let done!: (value: PaymentResponse) => void;
  let navigations = 0;
  const view = ui.render(<Checkout quantity={1} disabled={false} requestPayment={() => new Promise((resolve) => { done = resolve; })} onNavigate={() => { navigations++; }} />);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Pay by card" }));
  await ui.waitFor(() => assert.ok(done));
  view.unmount();
  await ui.act(async () => { done(response); });
  assert.equal(navigations, 0);
});

test("result requires a valid ID and never trusts missing redirect status", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => json({ success: true, data: { orderId: "payment-test-1", status: "paid" } }));
  const view = ui.render(<Result paymentId={null} />);
  assert.ok(ui.screen.getByText("No payment reference was provided."));
  assert.equal(fetch.mock.callCount(), 0);
  view.rerender(<Result paymentId="bad/id" />);
  assert.equal(fetch.mock.callCount(), 0);
});

test("result confirms only a matching authoritative paid response", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => json({ success: true, data: { orderId: "payment-test-1", status: "paid" } }));
  ui.render(<Result paymentId="payment-test-1" />);
  await ui.screen.findByText("Payment confirmed");
  const init = fetch.mock.calls[0].arguments[1] as RequestInit;
  assert.equal(fetch.mock.calls[0].arguments[0], "/api/payments/portone/complete");
  assert.deepEqual(JSON.parse(init.body as string), { paymentId: "payment-test-1" });
  assert.equal(init.credentials, "same-origin");
  assert.ok(init.signal instanceof AbortSignal);
  assert.ok(ui.screen.queryByText(/ticket issued/i) === null);
});

test("changing payment references A to B to A never resurrects the old paid result", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (_input: RequestInfo | URL, init?: RequestInit) => ++calls === 1
    ? json({ success: true, data: { orderId: "payment-A", status: "paid" } })
    : new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (signal?.aborted) reject(signal.reason);
      else signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
    }));
  const view = ui.render(<Result paymentId="payment-A" />);
  await ui.screen.findByText("Payment confirmed");
  view.rerender(<Result paymentId="payment-B" />);
  assert.ok(ui.screen.queryByText("Payment confirmed") === null);
  view.rerender(<Result paymentId="payment-A" />);
  assert.ok(ui.screen.queryByText("Payment confirmed") === null);
  assert.ok(ui.screen.getByText("Checking payment…"));
  assert.equal(calls, 3);
});

test("failed or mismatched completion remains retryable without browser-paid claims", async (t) => {
  let attempt = 0;
  t.mock.method(globalThis, "fetch", async () => ++attempt === 1 ? json({ success: true, data: { orderId: "other-payment", status: "paid" } }) : json({ success: true, data: { orderId: "payment-test-1", status: "pending" } }));
  ui.render(<Result paymentId="payment-test-1" />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Check again" }));
  await ui.screen.findByText("Payment pending");
  assert.ok(ui.screen.queryByText("Payment confirmed") === null);
  assert.equal(attempt, 2);
});

test("authoritative cancelled and refunded results are terminal payment states, never paid", async (t) => {
  for (const status of ["cancelled", "refunded"] as const) {
    t.mock.method(globalThis, "fetch", async () => json({ success: true, data: { orderId: "payment-test-1", status } }));
    const view = ui.render(<Result paymentId="payment-test-1" />);
    await ui.screen.findByText(status === "cancelled" ? "Payment cancelled" : "Payment refunded");
    assert.ok(ui.screen.queryByText("Payment confirmed") === null);
    assert.ok(ui.screen.queryByRole("button", { name: "Check again" }) === null);
    view.unmount();
  }
});

test("completion HTTP failure and late unmounted results do not confirm", async (t) => {
  t.mock.method(globalThis, "fetch", async () => json({ success: false }, 503));
  const view = ui.render(<Result paymentId="payment-test-1" />);
  await ui.screen.findByRole("button", { name: "Check again" });
  assert.ok(ui.screen.queryByText("Payment confirmed") === null);
  view.unmount();
  let done!: (value: Response) => void;
  t.mock.method(globalThis, "fetch", () => new Promise<Response>((resolve) => { done = resolve; }));
  const late = ui.render(<Result paymentId="payment-test-1" />);
  late.unmount();
  await ui.act(async () => { done(json({ success: true, data: { orderId: "payment-test-1", status: "paid" } })); });
  assert.ok(ui.screen.queryByText("Payment confirmed") === null);
});

test("a lost prepare response persists one attempt and recovers it across remount without opening the SDK", async (t) => {
  const bodies: Record<string, unknown>[] = [];
  let sdkCalls = 0;
  const fetch = t.mock.method(globalThis, "fetch", async (_input: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    if (bodies.length === 1) throw new Error("response lost after order creation");
    return json(prepared);
  });
  const requestPayment = async () => { sdkCalls++; return response; };
  const first = ui.render(<Checkout quantity={2} disabled={false} requestPayment={requestPayment} />);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Pay by card" }));
  await ui.screen.findByRole("alert");
  assert.equal(typeof bodies[0].attemptId, "string");
  assert.match(String(bodies[0].attemptId), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  first.unmount();
  const locks: { busy: boolean; quantity?: number }[] = [];
  ui.render(<Checkout quantity={2} disabled={false} requestPayment={requestPayment}
    onBusyChange={(busy, quantity) => locks.push({ busy, quantity })} />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Recover checkout" }));
  await ui.screen.findByRole("button", { name: "Check payment status" });
  assert.deepEqual(bodies[1], bodies[0]);
  assert.equal(fetch.mock.callCount(), 2);
  assert.equal(sdkCalls, 0);
  assert.ok(locks.some((entry) => entry.busy && entry.quantity === 2));
});

test("a known payment survives remount and reports its original quantity without preparing or launching twice", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => json(prepared));
  let sdkCalls = 0;
  const requestPayment = async () => { sdkCalls++; return undefined; };
  const first = ui.render(<Checkout quantity={2} disabled={false} requestPayment={requestPayment} />);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Pay by card" }));
  await ui.screen.findByRole("button", { name: "Check payment status" });
  first.unmount();
  const urls: string[] = [];
  const locks: { busy: boolean; quantity?: number }[] = [];
  ui.render(<Checkout quantity={5} disabled={false} requestPayment={requestPayment} onNavigate={(url) => urls.push(url)}
    onBusyChange={(busy, quantity) => locks.push({ busy, quantity })} />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Check payment status" }));
  assert.deepEqual(urls, ["/tickets/payment?paymentId=payment-test-1"]);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(sdkCalls, 1);
  assert.ok(locks.some((entry) => entry.busy && entry.quantity === 2));
  assert.ok(ui.screen.queryByText("2 tickets · ₩12,000") !== null);
});

test("unavailable durable storage prevents any preparation or SDK request", async (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(dom.window, "sessionStorage")!;
  t.after(() => Object.defineProperty(dom.window, "sessionStorage", descriptor));
  Object.defineProperty(dom.window, "sessionStorage", { configurable: true, get() { throw new Error("storage unavailable"); } });
  const fetch = t.mock.method(globalThis, "fetch", async () => json(prepared));
  let sdkCalls = 0;
  ui.render(<Checkout quantity={1} disabled={false} requestPayment={async () => { sdkCalls++; return response; }} />);
  const button = ui.screen.getByRole("button") as HTMLButtonElement;
  assert.equal(button.disabled, true);
  ui.fireEvent.click(button);
  assert.equal(fetch.mock.callCount(), 0);
  assert.equal(sdkCalls, 0);
});

test("held payment is a non-paid review state with no payment retry action", async (t) => {
  t.mock.method(globalThis, "fetch", async () => json({ success: true, data: { orderId: "payment-test-1", status: "held" } }));
  ui.render(<Result paymentId="payment-test-1" />);
  await ui.screen.findByRole("heading", { name: "Payment needs review" });
  assert.ok(ui.screen.queryByText("Payment confirmed") === null);
  assert.ok(ui.screen.queryByRole("button", { name: "Check again" }) === null);
  assert.ok(ui.screen.queryByRole("button", { name: "Pay by card" }) === null);
});

test("server recovered preparation never opens the SDK even when the client believed it was fresh", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => json({ success: true, data: { ...prepared.data, recovered: true } }));
  let sdkCalls = 0;
  ui.render(<Checkout quantity={2} disabled={false} requestPayment={async () => { sdkCalls++; return response; }} />);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Pay by card" }));
  await ui.screen.findByRole("button", { name: "Check payment status" });
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(sdkCalls, 0);
});

test("only a matching authoritative terminal result retires the persisted checkout intent", async (t) => {
  const key = "sphmrs.portone-checkout.v1";
  const record = JSON.stringify({ schemaVersion: 1, attemptId: "a08df457-9d8c-4c67-adbd-1934a851a70f", quantity: 2,
    order: { paymentId: "payment-test-1", quantity: 2, totalAmount: 12000, currency: "KRW" } });
  const states = { paid: "Payment confirmed", cancelled: "Payment cancelled", refunded: "Payment refunded", held: "Payment needs review", pending: "Payment pending" };
  for (const [status, heading] of Object.entries(states)) {
    dom.window.sessionStorage.setItem(key, record);
    t.mock.method(globalThis, "fetch", async () => json({ success: true, data: { orderId: "payment-test-1", status } }));
    const view = ui.render(<Result paymentId="payment-test-1" />);
    await ui.screen.findByRole("heading", { name: heading });
    assert.equal(dom.window.sessionStorage.getItem(key), ["paid", "cancelled", "refunded"].includes(status) ? null : record);
    view.unmount();
  }
  dom.window.sessionStorage.setItem(key, record);
  t.mock.method(globalThis, "fetch", async () => json({ success: true, data: { orderId: "other-payment", status: "paid" } }));
  ui.render(<Result paymentId="other-payment" />);
  await ui.screen.findByRole("heading", { name: "Payment confirmed" });
  assert.equal(dom.window.sessionStorage.getItem(key), record);
});

test("an initial intent write failure prevents preparation and SDK requests", async (t) => {
  t.mock.method(Object.getPrototypeOf(dom.window.sessionStorage) as Storage, "setItem", () => { throw new Error("storage quota"); });
  const fetch = t.mock.method(globalThis, "fetch", async () => json(prepared));
  let sdkCalls = 0;
  ui.render(<Checkout quantity={2} disabled={false} requestPayment={async () => { sdkCalls++; return response; }} />);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Pay by card" }));
  await ui.screen.findByRole("alert");
  assert.equal(fetch.mock.callCount(), 0);
  assert.equal(sdkCalls, 0);
  assert.equal((ui.screen.getByRole("button") as HTMLButtonElement).disabled, true);
});

test("a prepared reference write failure preserves the first attempt and never opens the SDK on recovery", async (t) => {
  const storage = Object.getPrototypeOf(dom.window.sessionStorage) as Storage;
  const setItem = storage.setItem;
  let writes = 0;
  t.mock.method(storage, "setItem", function (this: Storage, key: string, value: string) {
    if (++writes === 2) throw new Error("reference persistence failed");
    return setItem.call(this, key, value);
  });
  const bodies: Record<string, unknown>[] = [];
  t.mock.method(globalThis, "fetch", async (_input: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return json(prepared);
  });
  let sdkCalls = 0;
  const requestPayment = async () => { sdkCalls++; return response; };
  const first = ui.render(<Checkout quantity={2} disabled={false} requestPayment={requestPayment} />);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Pay by card" }));
  await ui.screen.findByRole("button", { name: "Check payment status" });
  assert.equal(sdkCalls, 0);
  const raw = dom.window.sessionStorage.getItem("sphmrs.portone-checkout.v1");
  assert.ok(raw !== null);
  const saved = JSON.parse(raw) as Record<string, unknown>;
  assert.equal(saved.attemptId, bodies[0].attemptId);
  assert.equal(saved.order, undefined);
  first.unmount();
  ui.render(<Checkout quantity={2} disabled={false} requestPayment={requestPayment} />);
  ui.fireEvent.click(await ui.screen.findByRole("button", { name: "Recover checkout" }));
  await ui.screen.findByRole("button", { name: "Check payment status" });
  assert.deepEqual(bodies[1], bodies[0]);
  assert.equal(sdkCalls, 0);
});

test("a terminal result preserves malformed or inconsistent matching intent records", async (t) => {
  const key = "sphmrs.portone-checkout.v1";
  const record = { schemaVersion: 1, attemptId: "a08df457-9d8c-4c67-adbd-1934a851a70f", quantity: 2,
    order: { paymentId: "payment-test-1", quantity: 2, totalAmount: 12000, currency: "KRW" } };
  const { attemptId: _attemptId, ...withoutAttempt } = record;
  const { quantity: _quantity, ...withoutQuantity } = record;
  const { totalAmount: _amount, ...withoutAmount } = record.order;
  assert.ok(_attemptId && _quantity && _amount);
  t.mock.method(globalThis, "fetch", async () => json({ success: true, data: { orderId: "payment-test-1", status: "paid" } }));
  for (const candidate of [withoutAttempt, withoutQuantity, { ...record, order: withoutAmount },
    { ...record, order: { ...record.order, quantity: 1 } }]) {
    const raw = JSON.stringify(candidate);
    dom.window.sessionStorage.setItem(key, raw);
    const view = ui.render(<Result paymentId="payment-test-1" />);
    await ui.screen.findByRole("heading", { name: "Payment confirmed" });
    assert.equal(dom.window.sessionStorage.getItem(key), raw);
    view.unmount();
  }
});

test("corrupt oversized and inconsistent intent restore fails closed without overwriting it", async (t) => {
  const key = "sphmrs.portone-checkout.v1";
  const fetch = t.mock.method(globalThis, "fetch", async () => json(prepared));
  let sdkCalls = 0;
  const inconsistent = JSON.stringify({ schemaVersion: 1, attemptId: "a08df457-9d8c-4c67-adbd-1934a851a70f", quantity: 2,
    order: { paymentId: "payment-test-1", quantity: 1, totalAmount: 12000, currency: "KRW" } });
  for (const raw of ["not-json", "x".repeat(2049), inconsistent]) {
    dom.window.sessionStorage.setItem(key, raw);
    const view = ui.render(<Checkout quantity={2} disabled={false} requestPayment={async () => { sdkCalls++; return response; }} />);
    assert.equal((ui.screen.getByRole("button") as HTMLButtonElement).disabled, true);
    assert.equal(dom.window.sessionStorage.getItem(key), raw);
    view.unmount();
    dom.window.sessionStorage.clear();
  }
  assert.equal(fetch.mock.callCount(), 0);
  assert.equal(sdkCalls, 0);
});

const resumeId = "91b6495b-479b-4306-98f1-83b729807aea";
const resumeRecord = { schemaVersion: 1, attemptId: "a08df457-9d8c-4c67-adbd-1934a851a70f", quantity: 2,
  order: { paymentId: resumeId, quantity: 2, totalAmount: 12000, currency: "KRW" } };

test("explicit resume rechecks original attempt inside nonqueued lock and keeps same payment identity", async (t) => {
  dom.window.sessionStorage.setItem("sphmrs.portone-checkout.v1", JSON.stringify(resumeRecord));
  const requests: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: Parameters<typeof globalThis.fetch>[0], init?: Parameters<typeof globalThis.fetch>[1]) => {
    requests.push(String(input));
    if (String(input).endsWith("/complete")) return json({ success: true, data: { orderId: resumeId, status: "pending" } });
    assert.deepEqual(JSON.parse(String(init?.body)), { paymentId: resumeId, attemptId: resumeRecord.attemptId });
    const request = { ...prepared.data };
    Reflect.deleteProperty(request, "recovered");
    return json({ success: true, data: { outcome: "resumable", request: { ...request, paymentId: resumeId } } });
  });
  const calls: PaymentRequest[] = [];
  ui.render(<Result paymentId={resumeId} requestPayment={async (request) => { calls.push(request); return undefined; }} />);
  await ui.screen.findByText("Payment pending");
  assert.equal(calls.length, 0);
  assert.equal(requests.length, 1);
  const resume = ui.screen.getByRole("button", { name: "Resume payment" });
  ui.fireEvent.click(resume); ui.fireEvent.click(resume);
  await ui.screen.findByText("Payment has not been confirmed. Check its status.");
  assert.ok(ui.screen.queryByRole("alert") === null);
  assert.equal(ui.screen.getByRole("status").textContent, "Payment has not been confirmed. Check its status.");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].paymentId, resumeId);
  assert.equal(requests.length, 2);
  assert.equal(dom.window.sessionStorage.getItem("sphmrs.portone-checkout.v1"), JSON.stringify(resumeRecord));
});

test("resume rejects status-only, wrong quote, unknown fields and absent original attempt", async (t) => {
  const request = { ...prepared.data };
  Reflect.deleteProperty(request, "recovered");
  for (const data of [{ outcome: "status-only" }, { outcome: "resumable", request: { ...request, paymentId: resumeId, totalAmount: 1 } },
    { outcome: "resumable", request: { ...request, paymentId: resumeId, recovered: false } }]) {
    dom.window.sessionStorage.setItem("sphmrs.portone-checkout.v1", JSON.stringify(resumeRecord));
    t.mock.method(globalThis, "fetch", async (input: Parameters<typeof globalThis.fetch>[0]) => String(input).endsWith("/complete")
      ? json({ success: true, data: { orderId: resumeId, status: "pending" } }) : json({ success: true, data }));
    let calls = 0;
    const view = ui.render(<Result paymentId={resumeId} requestPayment={async () => { calls++; return undefined; }} />);
    await ui.screen.findByText("Payment pending");
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Resume payment" }));
    await ui.screen.findByText("Payment has not been confirmed. Check its status.");
    assert.equal(calls, 0);
    view.unmount();
  }
  dom.window.sessionStorage.clear();
  ui.render(<Result paymentId={resumeId} />);
  await ui.screen.findByText("Payment pending");
  assert.equal(ui.screen.queryByRole("button", { name: "Resume payment" }), null);
});

test("resume fails closed without Web Locks or when another tab owns the payment lock", async (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(dom.window.navigator, "locks")!;
  t.after(() => Object.defineProperty(dom.window.navigator, "locks", descriptor));
  for (const locks of [undefined, { request: async (name: string, options: unknown, callback: (lock: null) => unknown) => {
    assert.equal(name, `sphmrs.portone-payment:${resumeId}`);
    assert.deepEqual(options, { mode: "exclusive", ifAvailable: true });
    return callback(null);
  } }]) {
    Object.defineProperty(dom.window.navigator, "locks", { configurable: true, value: locks });
    dom.window.sessionStorage.setItem("sphmrs.portone-checkout.v1", JSON.stringify(resumeRecord));
    const fetch = t.mock.method(globalThis, "fetch", async () => json({ success: true, data: { orderId: resumeId, status: "pending" } }));
    let calls = 0;
    const view = ui.render(<Result paymentId={resumeId} requestPayment={async () => { calls++; return undefined; }} />);
    await ui.screen.findByText("Payment pending");
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Resume payment" }));
    await ui.screen.findByText("Payment has not been confirmed. Check its status.");
    assert.equal(fetch.mock.callCount(), 1);
    assert.equal(calls, 0);
    view.unmount();
  }
});

test("unavailable or mismatched resume responses preserve context and never navigate", async (t) => {
  const request = { ...prepared.data };
  Reflect.deleteProperty(request, "recovered");
  for (const response of [json({}, 503), json({ success: true, data: { outcome: "resumable", request: { ...request, paymentId: "91b6495b-479b-4306-98f1-83b729807aeb" } } }),
    json({ success: true, data: { outcome: "resumable", request: { ...request, paymentId: resumeId, currency: "USD" } } }),
    json({ success: true, data: { outcome: "resumable", request: { ...request, paymentId: resumeId, redirectUrl: "https://wrong.example/tickets/payment" } } })]) {
    const raw = JSON.stringify(resumeRecord);
    dom.window.sessionStorage.setItem("sphmrs.portone-checkout.v1", raw);
    t.mock.method(globalThis, "fetch", async (input: Parameters<typeof globalThis.fetch>[0]) => String(input).endsWith("/complete")
      ? json({ success: true, data: { orderId: resumeId, status: "pending" } }) : response);
    let calls = 0;
    const view = ui.render(<Result paymentId={resumeId} requestPayment={async () => { calls++; return undefined; }} onNavigate={() => { throw new Error("Must not navigate"); }} />);
    await ui.screen.findByText("Payment pending");
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Resume payment" }));
    await ui.screen.findByText("Payment has not been confirmed. Check its status.");
    assert.equal(calls, 0);
    assert.equal(dom.window.sessionStorage.getItem("sphmrs.portone-checkout.v1"), raw);
    view.unmount();
  }
});

test("cooperating result callers cannot launch concurrently and the lock spans the SDK", async (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(dom.window.navigator, "locks")!;
  t.after(() => Object.defineProperty(dom.window.navigator, "locks", descriptor));
  let held = false;
  Object.defineProperty(dom.window.navigator, "locks", { configurable: true, value: {
    request: async (_name: string, _options: unknown, callback: (lock: object | null) => Promise<unknown>) => {
      if (held) return callback(null);
      held = true;
      try { return await callback({}); } finally { held = false; }
    },
  } });
  dom.window.sessionStorage.setItem("sphmrs.portone-checkout.v1", JSON.stringify(resumeRecord));
  const request = { ...prepared.data };
  Reflect.deleteProperty(request, "recovered");
  t.mock.method(globalThis, "fetch", async (input: Parameters<typeof globalThis.fetch>[0]) => String(input).endsWith("/complete")
    ? json({ success: true, data: { orderId: resumeId, status: "pending" } })
    : json({ success: true, data: { outcome: "resumable", request: { ...request, paymentId: resumeId } } }));
  let finish!: (value: undefined) => void;
  let calls = 0;
  const sdk = async () => { calls++; return new Promise<undefined>((resolve) => { finish = resolve; }); };
  ui.render(<><Result paymentId={resumeId} requestPayment={sdk} /><Result paymentId={resumeId} requestPayment={sdk} /></>);
  await ui.waitFor(() => assert.equal(ui.screen.getAllByText("Payment pending").length, 2));
  const buttons = ui.screen.getAllByRole("button", { name: "Resume payment" });
  ui.fireEvent.click(buttons[0]);
  await ui.waitFor(() => assert.equal(calls, 1));
  assert.equal(held, true);
  ui.fireEvent.click(buttons[1]);
  await ui.screen.findByText("Payment has not been confirmed. Check its status.");
  assert.equal(calls, 1);
  await ui.act(async () => finish(undefined));
  assert.equal(held, false);
});

test("unmount while resume checks prevents a late SDK launch", async (t) => {
  dom.window.sessionStorage.setItem("sphmrs.portone-checkout.v1", JSON.stringify(resumeRecord));
  let finish!: (value: Response) => void;
  t.mock.method(globalThis, "fetch", async (input: Parameters<typeof globalThis.fetch>[0]) => String(input).endsWith("/complete")
    ? json({ success: true, data: { orderId: resumeId, status: "pending" } })
    : new Promise<Response>((resolve) => { finish = resolve; }));
  let calls = 0;
  const view = ui.render(<Result paymentId={resumeId} requestPayment={async () => { calls++; return undefined; }} />);
  await ui.screen.findByText("Payment pending");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Resume payment" }));
  await ui.waitFor(() => assert.ok(finish));
  view.unmount();
  const request = { ...prepared.data };
  Reflect.deleteProperty(request, "recovered");
  await ui.act(async () => finish(json({ success: true, data: { outcome: "resumable", request: { ...request, paymentId: resumeId } } })));
  assert.equal(calls, 0);
});

test("unsupported lock attempts do not leave the synchronous click latch stuck", async (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(dom.window.navigator, "locks")!;
  t.after(() => Object.defineProperty(dom.window.navigator, "locks", descriptor));
  Object.defineProperty(dom.window.navigator, "locks", { configurable: true, value: undefined });
  dom.window.sessionStorage.setItem("sphmrs.portone-checkout.v1", JSON.stringify(resumeRecord));
  let resumed = 0;
  const request = { ...prepared.data };
  Reflect.deleteProperty(request, "recovered");
  t.mock.method(globalThis, "fetch", async (input: Parameters<typeof globalThis.fetch>[0]) => String(input).endsWith("/complete")
    ? json({ success: true, data: { orderId: resumeId, status: "pending" } })
    : json({ success: true, data: { outcome: "resumable", request: { ...request, paymentId: resumeId } } }));
  ui.render(<Result paymentId={resumeId} requestPayment={async () => { resumed++; return undefined; }} />);
  await ui.screen.findByText("Payment pending");
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Resume payment" }));
  await ui.screen.findByText("Payment has not been confirmed. Check its status.");
  Object.defineProperty(dom.window.navigator, "locks", descriptor);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Resume payment" }));
  await ui.waitFor(() => assert.equal(resumed, 1));
});

test("storage denied after status resolution cannot launch or erase the retained intent", async (t) => {
  dom.window.sessionStorage.setItem("sphmrs.portone-checkout.v1", JSON.stringify(resumeRecord));
  const fetch = t.mock.method(globalThis, "fetch", async () => json({ success: true, data: { orderId: resumeId, status: "pending" } }));
  let calls = 0;
  ui.render(<Result paymentId={resumeId} requestPayment={async () => { calls++; return undefined; }} />);
  await ui.screen.findByText("Payment pending");
  Object.defineProperty(dom.window, "sessionStorage", { configurable: true, get() { throw new Error("denied"); } });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Resume payment" }));
  await ui.screen.findByText("Payment has not been confirmed. Check its status.");
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(calls, 0);
});

test("status refresh retains the same disabled resume control until a terminal result", async (t) => {
  dom.window.sessionStorage.setItem("sphmrs.portone-checkout.v1", JSON.stringify(resumeRecord));
  let finish!: (value: Response) => void;
  let checks = 0;
  t.mock.method(globalThis, "fetch", async () => ++checks === 1
    ? json({ success: true, data: { orderId: resumeId, status: "pending" } })
    : new Promise<Response>((resolve) => { finish = resolve; }));
  ui.render(<Result paymentId={resumeId} />);
  await ui.screen.findByText("Payment pending");
  const resume = ui.screen.getByRole("button", { name: "Resume payment" });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Check again" }));
  assert.ok(ui.screen.queryByRole("button", { name: "Resume payment" }) === resume);
  assert.equal((resume as HTMLButtonElement).disabled, true);
  await ui.waitFor(() => assert.ok(finish));
  await ui.act(async () => finish(json({ success: true, data: { orderId: resumeId, status: "paid" } })));
  assert.ok(ui.screen.queryByRole("button", { name: "Resume payment" }) === null);
});
