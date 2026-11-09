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
const disabled = { emailOtp: false, magicLink: false, google: false, passkey: false };
const harness = {
  config: config as PayloadMemberConfig | null,
  error: null as unknown,
  events: [] as string[],
  flags: Object.freeze({ emailOtp: true, magicLink: true, google: false, passkey: true }),
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
        return { url: moduleUrl(`export const loadPayloadMemberConfig=()=>${state}.loadConfig(); export const configuredMemberCapabilities=(config)=>${state}.project(config);`), shortCircuit: true };
      }
      if (/\/app\/\(site\)\/(?:account(?:\/continue)?|tickets)\/page\.tsx$/.test(parent)) {
        if (parent.endsWith("/tickets/page.tsx") && specifier === "../shop/page") return { url: moduleUrl("export default function ShopPage(){return null;}"), shortCircuit: true };
        if (specifier === "next/server") return { url: moduleUrl(`export async function connection(){${state}.events.push("connection"); await ${state}.connect();}`), shortCircuit: true };
        // Importing the request API is safe; disabled checkout must not call it.
        if (parent.endsWith("/tickets/page.tsx") && specifier === "next/headers") return { url: moduleUrl(`export async function headers(){${state}.events.push("headers"); return new Headers();}`), shortCircuit: true };
        if (specifier.endsWith("public-capabilities.server")) return { url: moduleUrl(`export const loadPublicMemberCapabilities=()=>${state}.loadFlags();`), shortCircuit: true };
        if (specifier.endsWith("ticket-account-entry")) return { url: moduleUrl("export function TicketAccountEntry(){return null;}"), shortCircuit: true };
        if (specifier.endsWith("ticket-selection")) return { url: moduleUrl("export function TicketSelection(){return null;}"), shortCircuit: true };
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
  pages.push(
    { name: "account", render: (await import("@/app/(site)/account/page")).default, component: "TicketAccountEntry" },
    { name: "continuation", render: (await import("@/app/(site)/account/continue/page")).default, component: "TicketAccountEntry", flow: "login" }
  );
  renderTickets = (await import("@/app/(site)/tickets/page")).default;
  assert.deepEqual(harness.events, [], "module loading must not read runtime config");
});

after(() => {
  hooks?.deregister();
  if (previous) Object.defineProperty(globalThis, key, previous);
  else Reflect.deleteProperty(globalThis, key);
});

test("server boundary returns fresh validated public flags without creating runtime services", () => {
  assert.equal(serverOnlyImports, 1, "public configuration stays behind the server-only import guard");
  harness.events = []; harness.error = null; harness.config = config;
  assert.deepEqual(readPublic(), { emailOtp: true, magicLink: true, google: false, passkey: true });
  harness.config = Object.freeze({ ...config, google: true, emailDelivery: false });
  assert.deepEqual(readPublic(), { emailOtp: false, magicLink: false, google: true, passkey: true });
  assert.deepEqual(harness.events, ["config", "config"]);
});

test("disabled membership remains closed without emitting an error", (t) => {
  harness.config = null; harness.error = null;
  const errorLog = t.mock.method(console, "error", () => undefined);
  assert.deepEqual(readPublic(), disabled);
  assert.equal(errorLog.mock.callCount(), 0);
});

test("invalid configuration fails closed with only a sanitized static diagnostic", (t) => {
  harness.error = new Error("private synthetic config: postgres://private:token@localhost/secret");
  const errorLog = t.mock.method(console, "error", () => undefined);
  try {
    const flags = readPublic();
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
