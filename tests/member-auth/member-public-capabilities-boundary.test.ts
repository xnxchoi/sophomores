import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { registerHooks } from "node:module";
import type { ReactElement, ReactNode } from "react";
import { Children, isValidElement } from "react";
import type { MemberCapabilities } from "@/lib/member-auth/contracts";
import { configuredMemberCapabilities, type PayloadMemberConfig } from "@/lib/member-auth/payload-config";

const config: PayloadMemberConfig = Object.freeze({
  origin: "http://localhost:3000", databaseUrl: "postgres://fixture:synthetic@localhost:4141/sopho",
  secret: "a".repeat(64), verificationSecret: "b".repeat(64), emailDelivery: true, google: false
});
const disabled = { emailOtp: false, magicLink: false, google: false, apple: false, kakao: false, passkey: false };
const harness = {
  config: config as PayloadMemberConfig | null,
  error: null as unknown,
  events: [] as string[],
  flags: Object.freeze({ emailOtp: true, magicLink: true, google: false, apple: false, kakao: false, passkey: true }),
  connect: async () => {},
  project: configuredMemberCapabilities,
  loadConfig() {
    this.events.push("config");
    if (this.error) throw this.error;
    return this.config;
  },
  loadFlags() { this.events.push("flags"); return this.flags; }
};
const key = "__sphmrsPublicCapabilitiesTest";
const previous = Object.getOwnPropertyDescriptor(globalThis, key);
let hooks: ReturnType<typeof registerHooks>;
let serverOnlyImports = 0;
let readPublic: typeof import("@/lib/member-auth/public-capabilities.server").loadPublicMemberCapabilities;
const pages: Array<{ name: string; render: () => Promise<ReactElement>; component: string; flow?: "login" }> = [];
let renderTickets: () => ReactElement;
let renderLegacyPayment: typeof import("@/app/(site)/tickets/payment/page").default;
const moduleUrl = (source: string) => `data:text/javascript,${encodeURIComponent(source)}`;
const state = `globalThis.${key}`;

before(async () => {
  Object.defineProperty(globalThis, key, { value: harness, configurable: true });
  hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      const parent = context.parentURL ?? "";
      if (specifier === "server-only") {
        serverOnlyImports++;
        return { url: moduleUrl("export {};"), shortCircuit: true };
      }
      if (parent.endsWith("/public-capabilities.server.ts") && specifier === "./payload-config") {
        return { url: moduleUrl(`export const loadPayloadMemberConfig=()=>${state}.loadConfig(); export const configuredMemberCapabilities=(config)=>${state}.project(config); export const resolveMemberCapabilities=(config)=>Promise.resolve(${state}.project(config));`), shortCircuit: true };
      }
      if (/\/app\/\(site\)\/(?:account(?:\/continue)?|tickets)\/page\.tsx$/.test(parent)) {
        if (parent.endsWith("/tickets/page.tsx") && specifier === "../shop/page") return { url: moduleUrl("export default function ShopPage(){return null;}"), shortCircuit: true };
        if (specifier === "next/server") return { url: moduleUrl(`export async function connection(){${state}.events.push("connection"); await ${state}.connect();}`), shortCircuit: true };
        // A signed-out /account redirects to /sign-in (owner, 24 Nov); these tests render the signed-in account.
        if (parent.endsWith("/account/page.tsx") && specifier === "@/lib/auth/server") return { url: moduleUrl("export async function currentUser(){return {id:\"member\"};}"), shortCircuit: true };
        if (/\/account(?:\/continue)?\/page\.tsx$/.test(parent) && specifier === "next/navigation") return { url: moduleUrl("export function redirect(){throw new Error(\"Unexpected redirect\");}"), shortCircuit: true };
        // Importing the request API is safe; disabled checkout must not call it.
        if (parent.endsWith("/tickets/page.tsx") && specifier === "next/headers") return { url: moduleUrl(`export async function headers(){${state}.events.push("headers"); return new Headers();}`), shortCircuit: true };
        if (specifier.endsWith("public-capabilities.server")) return { url: moduleUrl(`export const loadPublicMemberCapabilities=()=>${state}.loadFlags();`), shortCircuit: true };
        if (specifier.endsWith("ticket-account-entry")) return { url: moduleUrl("export function TicketAccountEntry(){return null;}"), shortCircuit: true };
        if (specifier.endsWith("ticket-selection")) return { url: moduleUrl("export function TicketSelection(){return null;}"), shortCircuit: true };
      }
      if (parent.endsWith("/tickets/payment/page.tsx")) {
        if (specifier === "next/server") return { url: moduleUrl(`export async function connection(){${state}.events.push("connection");}`), shortCircuit: true };
        if (specifier === "@payload-config") return { url: moduleUrl("export default {};"), shortCircuit: true };
        if (specifier === "payload") return { url: moduleUrl(`export async function getPayload(){${state}.events.push("payload"); return {};}`), shortCircuit: true };
        if (specifier === "@/lib/commerce/catalogue") return { url: moduleUrl("export async function loadPublishedCommerceDisclosure(){return null;}"), shortCircuit: true };
        if (specifier.endsWith("/business-info")) return { url: moduleUrl("export function parseBusinessInformation(){return {facts:true};} export async function loadBusinessInformation(){return {facts:true};}"), shortCircuit: true };
        if (specifier.endsWith("/seller-disclosure")) return { url: moduleUrl("export function SellerDisclosure(){return null;}"), shortCircuit: true };
        if (specifier.endsWith("/portone-payment-result")) return { url: moduleUrl("export function PortOnePaymentResult(){return null;}"), shortCircuit: true };
      }
      if (specifier === "pg" || /payload-runtime|next\/headers/.test(specifier)) {
        throw new Error("Bootstrap must not load database or session modules.");
      }
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url.startsWith("data:text/javascript,")) {
        return { format: "module", source: decodeURIComponent(url.slice("data:text/javascript,".length)), shortCircuit: true };
      }
      return nextLoad(url, context);
    }
  });
  readPublic = (await import("@/lib/member-auth/public-capabilities.server")).loadPublicMemberCapabilities;
  const renderAccount = (await import("@/app/(site)/account/page")).default;
  pages.push(
    {
      name: "account",
      render: () => renderAccount({ searchParams: Promise.resolve({}) }),
      component: "TicketAccountEntry"
    },
    { name: "continuation", render: ((page) => () => page({ searchParams: Promise.resolve({}) }))((await import("@/app/(site)/account/continue/page")).default), component: "TicketAccountEntry", flow: "login" }
  );
  renderTickets = (await import("@/app/(site)/tickets/page")).default;
  renderLegacyPayment = (await import("@/app/(site)/tickets/payment/page")).default;
  assert.deepEqual(harness.events, [], "module loading must not read runtime config");
});

test("the review profile selects a settled notice before capabilities or payment are loaded", async (t) => {
  t.mock.method(harness, "connect", async () => {});
  const original = process.env.NEXT_PUBLIC_SERVER_URL;
  process.env.NEXT_PUBLIC_SERVER_URL = "https://preview.sophomores.co";
  try {
    const payment = () => renderLegacyPayment({ searchParams: Promise.resolve({ paymentId: "fixture-charge" }) });
    for (const [render, kind] of [...pages.map(({ render }) => [render, "account"] as const), [payment, "payment"] as const]) {
      harness.events = [];
      const result = await render();
      assert.ok(typeof result.type === "function" && result.type.name === "ReviewCustomerNoticePage");
      assert.deepEqual(result.props, { kind });
      assert.deepEqual(harness.events, ["connection"]);
    }
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SERVER_URL;
    else process.env.NEXT_PUBLIC_SERVER_URL = original;
  }
});

after(() => {
  hooks?.deregister();
  if (previous) Object.defineProperty(globalThis, key, previous);
  else Reflect.deleteProperty(globalThis, key);
});

test("server boundary returns fresh validated public flags without creating runtime services", async () => {
  assert.equal(serverOnlyImports, 1, "public configuration stays behind the server-only import guard");
  harness.events = []; harness.error = null; harness.config = config;
  assert.deepEqual(await readPublic(), { emailOtp: true, magicLink: true, google: false, apple: false, kakao: false, passkey: true });
  harness.config = Object.freeze({ ...config, google: true, emailDelivery: false });
  assert.deepEqual(await readPublic(), { emailOtp: false, magicLink: false, google: true, apple: false, kakao: false, passkey: true });
  assert.deepEqual(harness.events, ["config", "config"]);
});

test("disabled membership remains closed without emitting an error", async (t) => {
  harness.config = null; harness.error = null;
  const errorLog = t.mock.method(console, "error", () => undefined);
  assert.deepEqual(await readPublic(), disabled);
  assert.equal(errorLog.mock.callCount(), 0);
});

test("invalid configuration fails closed with only a sanitized static diagnostic", async (t) => {
  harness.error = new Error("private synthetic config: postgres://private:token@localhost/secret");
  const errorLog = t.mock.method(console, "error", () => undefined);
  try {
    const flags = await readPublic();
    assert.deepEqual(flags, disabled);
    assert.ok(Object.isFrozen(flags));
    assert.deepEqual(errorLog.mock.calls.map((call) => call.arguments), [["Member sign-in options are unavailable."]]);
    assert.doesNotMatch(JSON.stringify(flags), /private|token|secret|origin|databaseUrl/);
  } finally { harness.error = null; }
});

test("tickets delegates capabilities and request ownership to the canonical shop page", () => {
  harness.events = [];
  const result = renderTickets();
  assert.ok(typeof result.type === "function" && result.type.name === "ShopPage");
  assert.deepEqual(result.props, {});
  assert.deepEqual(harness.events, []);
});

for (const name of ["account", "continuation"]) {
  test(`${name} awaits the request boundary before projecting props`, async () => {
    const page = pages.find((candidate) => candidate.name === name)!;
    harness.events = [];
    let release!: () => void;
    harness.connect = () => new Promise<void>((resolve) => { release = resolve; });
    const rendering = page.render();
    assert.deepEqual(harness.events, ["connection"]);
    release();
    const result = await rendering;
    assert.deepEqual(harness.events, ["connection", "flags"]);
    // Ticket selection now shares a fragment with the seller disclosure. Inspect
    // the actual account/selection element rather than mistaking the wrapper for it.
    const candidates = [result, ...Children.toArray((result.props as { children?: ReactNode }).children)];
    const entry = candidates.find((candidate) => isValidElement(candidate)
      && typeof candidate.type === "function" && candidate.type.name === page.component);
    assert.ok(isValidElement(entry), `Expected the actual ${page.component} mount`);
    const props = entry.props as { initialCapabilities: Readonly<MemberCapabilities>; initialFlow?: "login" };
    assert.ok(props.initialCapabilities === harness.flags);
    assert.equal(props.initialFlow, page.flow);
    assert.ok(typeof entry.type === "function" && entry.type.name === page.component);
    assert.doesNotMatch(JSON.stringify(props), /secret|databaseUrl|verificationSecret|synthetic/);
  });
}
