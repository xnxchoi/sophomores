import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, before, beforeEach, test, type TestContext } from "node:test";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import type { PortOneCatalogue, PortOneConfig, ReviewedTestChannel } from "@/lib/tickets/portone/config";

const reviewedPair = Object.freeze({
  storeId: "store-cb510f04-39fc-487a-ab60-3bba06344687",
  channelKey: "channel-key-23c1cd59-1efd-42b7-b3ec-192f1c7bd221"
});
const config = Object.freeze({
  ...reviewedPair, origin: "http://localhost:3000", localKpnTestCheckout: true
});
// Synthetic test data only: this is not an operator catalogue or public offer.
const catalogue: PortOneCatalogue = Object.freeze({
  orderName: "Synthetic page fixture", unitAmount: 1234, currency: "KRW",
  maximumQuantity: 2, saleStartsAt: "2040-01-01T00:00:00.000Z", saleEndsAt: "2040-01-02T00:00:00.000Z"
});
const capabilities = Object.freeze({ emailOtp: false, magicLink: false, google: false, passkey: false });
const disclosure = Object.freeze({ fixture: "unpublished" });
const key = "__sphmrsLocalKpnPageTest";
const previous = Object.getOwnPropertyDescriptor(globalThis, key);
let harness: {
  config: Pick<PortOneConfig, "origin" | "storeId" | "channelKey" | "localKpnTestCheckout"> | null;
  catalogue: PortOneCatalogue | null;
  published: boolean;
  requestHeaders: Headers;
  headerError: boolean;
  events: string[];
};
let setReviewed: (value: ReviewedTestChannel | null) => void;
let hooks: ReturnType<typeof registerHooks>;
let renderPage: () => Promise<ReactElement>;
const state = `globalThis.${key}`;
const moduleUrl = (source: string) => `data:text/javascript,${encodeURIComponent(source)}`;

before(async () => {
  Object.defineProperty(globalThis, key, { configurable: true, get: () => ({
    ...harness, capabilities, disclosure, reviewedPair,
    setReviewed: (setter: typeof setReviewed) => { setReviewed = setter; },
    event: (name: string) => harness.events.push(name)
  }) });
  hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (context.parentURL?.endsWith("/app/(site)/tickets/page.tsx")) {
        let source: string | undefined;
        if (specifier === "next/server") source = `export async function connection(){${state}.event('connection');}`;
        if (specifier === "next/headers") source = `export async function headers(){${state}.event('headers'); if (${state}.headerError) throw new Error('Synthetic headers failure'); return ${state}.requestHeaders;}`;
        if (specifier.endsWith("/portone/config")) source = `
          export const loadPortOneConfig=()=>${state}.config;
          export const loadPortOneCatalogue=()=>${state}.catalogue;
          export let reviewedTestChannel=${state}.reviewedPair;
          ${state}.setReviewed(value=>{reviewedTestChannel=value;});`;
        if (specifier.endsWith("public-capabilities.server")) source = `export const loadPublicMemberCapabilities=()=>${state}.capabilities;`;
        if (specifier.endsWith("/commerce/disclosures")) source = `export const commerceDisclosure=${state}.disclosure; export const publishedCommerceDisclosureSchema={safeParse:()=>({success:${state}.published})};`;
        if (specifier.endsWith("ticket-selection")) source = "export function TicketSelection(){return null;}";
        if (specifier.endsWith("seller-disclosure")) source = "export function SellerDisclosure(){return null;}";
        if (source !== undefined) return { url: moduleUrl(source), shortCircuit: true };
      }
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url.startsWith("data:text/javascript,")) return {
        format: "module", source: decodeURIComponent(url.slice("data:text/javascript,".length)), shortCircuit: true
      };
      return nextLoad(url, context);
    }
  });
  renderPage = (await import("@/app/(site)/tickets/page")).default;
});

beforeEach((t) => {
  harness = {
    config, catalogue, published: false, requestHeaders: new Headers({ host: "localhost:3000" }),
    headerError: false, events: []
  };
  setReviewed(reviewedPair);
  (t as TestContext).mock.method(Date, "now", () => Date.parse("2040-01-01T12:00:00.000Z"));
});

after(() => {
  hooks?.deregister();
  if (previous) Object.defineProperty(globalThis, key, previous);
  else Reflect.deleteProperty(globalThis, key);
});

async function selectionProps() {
  const page = await renderPage();
  const elements = Children.toArray((page.props as { children?: ReactNode }).children);
  const selection = elements.find((element) => isValidElement(element)
    && typeof element.type === "function" && element.type.name === "TicketSelection");
  const seller = elements.find((element) => isValidElement(element)
    && typeof element.type === "function" && element.type.name === "SellerDisclosure");
  assert.ok(isValidElement(selection));
  assert.ok(isValidElement(seller));
  assert.deepEqual(seller.props, { className: "bg-neutral-950 text-neutral-100" });
  const props = selection.props as {
    checkoutReady: boolean; checkoutCatalogue: PortOneCatalogue | null; initialCapabilities: typeof capabilities
  };
  assert.equal(props.initialCapabilities === capabilities, true);
  assert.equal(harness.events[0], "connection");
  return props;
}

test("unpublished checkout accepts only the server-derived local flag and direct canonical Host", async () => {
  const props = await selectionProps();
  assert.equal(props.checkoutReady, true);
  assert.equal(props.checkoutCatalogue === catalogue, true);
  assert.deepEqual(harness.events, ["connection", "headers"]);
  assert.deepEqual(disclosure, { fixture: "unpublished" });
});

test("local checkout stays off by default even on the canonical host", async () => {
  harness = { ...harness, config: { ...config, localKpnTestCheckout: false } };
  assert.equal((await selectionProps()).checkoutReady, false);
  assert.deepEqual(harness.events, ["connection"]);
});

for (const [name, requestHeaders] of [
  ["wrong host", { host: "outside.example:3000" }],
  ["wrong port", { host: "localhost:4000" }],
  ["different loopback host", { host: "127.0.0.1:3000" }],
  ["missing host", {}],
  ["forwarded host only", { "x-forwarded-host": "localhost:3000", forwarded: "host=localhost:3000;proto=http" }],
  ["spoofed forwarded host", { host: "outside.example", "x-forwarded-host": "localhost:3000" }]
] as const) {
  test(`local checkout rejects ${name}`, async () => {
    harness = { ...harness, requestHeaders: new Headers(Object.entries(requestHeaders)) };
    assert.equal((await selectionProps()).checkoutReady, false);
  });
}

test("local checkout still requires an exact reviewed test pair", async () => {
  harness = { ...harness, config: { ...config, channelKey: "unreviewed-channel" } };
  assert.equal((await selectionProps()).checkoutReady, false);
  harness = { ...harness, config: { ...config, storeId: "store-other" } };
  assert.equal((await selectionProps()).checkoutReady, false);
  harness = { ...harness, config };
  setReviewed(null);
  assert.equal((await selectionProps()).checkoutReady, false);
});

test("local checkout still requires configuration and a catalogue", async () => {
  harness = { ...harness, catalogue: null };
  assert.equal((await selectionProps()).checkoutReady, false);
  harness = { ...harness, config: null, catalogue };
  assert.equal((await selectionProps()).checkoutReady, false);
});

for (const [name, now, ready] of [
  ["before sale", "2039-12-31T23:59:59.999Z", false],
  ["sale start", catalogue.saleStartsAt, true],
  ["sale end", catalogue.saleEndsAt, false],
  ["after sale", "2040-01-03T00:00:00.000Z", false]
] as const) {
  test(`local checkout preserves the ${name} boundary`, async (t) => {
    t.mock.method(Date, "now", () => Date.parse(now));
    assert.equal((await selectionProps()).checkoutReady, ready);
  });
}

test("header-read failure is closed with a sanitized diagnostic", async (t) => {
  harness = { ...harness, headerError: true };
  const log = t.mock.method(console, "error", () => undefined);
  assert.equal((await selectionProps()).checkoutReady, false);
  assert.deepEqual(log.mock.calls.map((call) => call.arguments), [["Ticket payment configuration is unavailable."]]);
});

test("published checkout preserves its existing normal path without a local flag or Host", async () => {
  harness = {
    ...harness, published: true, config: { ...config, localKpnTestCheckout: false }, requestHeaders: new Headers()
  };
  assert.equal((await selectionProps()).checkoutReady, true);
  assert.deepEqual(harness.events, ["connection"]);
  setReviewed(null);
  assert.equal((await selectionProps()).checkoutReady, false);
});
