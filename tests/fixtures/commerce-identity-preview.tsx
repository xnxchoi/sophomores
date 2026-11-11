// Local synthetic identity characterization: actual boundary and actual provider.
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { EcommerceProvider, useEcommerce } from "@payloadcms/plugin-ecommerce/client/react";
import { CommerceIdentityBoundary } from "@/components/commerce/checkout";
import { EnglishMessages } from "./english-messages";

type OwnMode = "normal" | "403" | "429" | "401" | "anonymous" | "malformed" | "transport" | "abort" | "body-transport" | "body-abort" | "invalid-json";
type ProviderMode = "normal" | "http-503" | "anonymous" | "wrong";
const counts = { ownReads: 0, providerReads: 0, cartReads: 0, addressReads: 0, blocked: 0 };
let ownMode: OwnMode = "normal";
let providerMode: ProviderMode = new URLSearchParams(location.search).get("initial") === "no-user" ? "anonymous" : "normal";
let account = "synthetic-account-A";
let observedProviderAccount: string | undefined;
let refreshProvider: () => Promise<void> = async () => { throw new Error("Synthetic provider is not mounted"); };
const refreshCounts = () => window.dispatchEvent(new Event("identity-fixture-counts"));
type BodyObservation = {
  originalScenario: OwnMode; capturedScenario: OwnMode; phase: "awaiting" | "consumed" | "rejected";
  currentScenario?: OwnMode; deliveredName?: string; deliveredConstructor?: string;
  instanceOfError?: boolean; instanceOfDOMException?: boolean; sameAsStreamReason?: boolean; bodyUsed: boolean;
};
let bodyObservation: BodyObservation | undefined;
function observeNativeBody(response: Response, originalScenario: OwnMode, capturedScenario: OwnMode, streamReason?: unknown): Response {
  const captured = { originalScenario, capturedScenario };
  bodyObservation = { ...captured, phase: "awaiting", bodyUsed: response.bodyUsed };
  refreshCounts();
  const nativeText = response.text.bind(response);
  // Diagnostic only: invoke the actual native body consumer, return its exact
  // body on success, and rethrow the identical rejection value. No body/message logging.
  response.text = async () => {
    let body: string;
    try {
      body = await nativeText();
    } catch (error) {
      bodyObservation = {
        ...captured, currentScenario: ownMode, phase: "rejected", bodyUsed: response.bodyUsed,
        deliveredName: error !== null && typeof error === "object" && "name" in error && typeof error.name === "string" ? error.name : "(none)",
        deliveredConstructor: error !== null && typeof error === "object" && typeof error.constructor === "function" ? error.constructor.name : "(none)",
        instanceOfError: error instanceof Error, instanceOfDOMException: error instanceof DOMException, sameAsStreamReason: error === streamReason,
      };
      refreshCounts();
      throw error;
    }
    bodyObservation = { ...captured, currentScenario: ownMode, phase: "consumed", bodyUsed: response.bodyUsed };
    refreshCounts();
    return body;
  };
  return response;
}
window.fetch = async (input, options) => {
  const url = new URL(input instanceof Request ? input.url : String(input), location.origin);
  const method = options?.method ?? (input instanceof Request ? input.method : "GET");
  if (url.origin !== location.origin || method !== "GET") { counts.blocked++; refreshCounts(); throw new Error("Only synthetic own-account GET reads are allowed"); }
  if (url.pathname === "/api/users/me") {
    const originalScenario = ownMode;
    const provider = url.searchParams.has("select[cart]");
    if (provider) counts.providerReads++; else counts.ownReads++;
    refreshCounts();
    if (!provider) {
      if (ownMode === "transport") throw new TypeError("Synthetic transport failure");
      if (ownMode === "abort") throw new DOMException("Synthetic aborted read", "AbortError");
      if (ownMode === "body-transport" || ownMode === "body-abort") {
        const capturedScenario = ownMode;
        const error = capturedScenario === "body-abort" ? new DOMException("Synthetic body abort", "AbortError") : new TypeError("Synthetic body transport failure");
        // No prefetch: pull occurs only when the native body is consumed, after
        // fetch has fulfilled with successful headers. No timer or parser stub.
        return observeNativeBody(new Response(new ReadableStream({ pull(controller) { controller.error(error); } }, { highWaterMark: 0 }), { status: 200, headers: { "Content-Type": "application/json" } }), originalScenario, capturedScenario, error);
      }
      if (ownMode === "invalid-json") {
        const capturedScenario = ownMode;
        return observeNativeBody(new Response("not-json", { status: 200, headers: { "Content-Type": "application/json" } }), originalScenario, capturedScenario);
      }
      if (["401", "403", "429"].includes(ownMode)) return Response.json({ user: null }, { status: Number(ownMode) });
      if (ownMode === "anonymous") return Response.json({ user: null });
      if (ownMode === "malformed") return Response.json({ user: { unexpected: true } });
    } else {
      if (providerMode === "http-503") return Response.json({ error: "Synthetic provider synchronization failure" }, { status: 503 });
      if (providerMode === "anonymous") return Response.json({ user: null });
    }
    return Response.json({ user: { id: provider && providerMode === "wrong" ? "synthetic-account-C" : account, cart: { docs: [] } } });
  }
  if (url.pathname === "/api/addresses") { counts.addressReads++; refreshCounts(); return Response.json({ docs: [] }); }
  if (url.pathname === "/api/carts/synthetic-cart") { counts.cartReads++; refreshCounts(); return Response.json({ id: "synthetic-cart", currency: "KRW", items: [] }); }
  counts.blocked++; refreshCounts(); throw new Error("Outbound, auth, claim and payment work is forbidden in this fixture");
};

function ScenarioButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="min-h-12 rounded-xl border border-neutral-600 px-4 py-2 text-left text-sm hover:bg-neutral-800">{children}</button>;
}
function PrivateAddress() {
  const [value, setValue] = useState("");
  return <label className="block space-y-3"><span className="text-sm">Synthetic delivery address</span><input aria-label="Synthetic delivery address" value={value} onChange={(event) => setValue(event.target.value)} className="min-h-12 w-full rounded-xl border border-neutral-600 bg-neutral-950 px-4 text-base" /></label>;
}
function Readout() {
  const { user, onLogin } = useEcommerce();
  const [revision, setRevision] = useState(0);
  useEffect(() => { observedProviderAccount = user?.id == null ? undefined : String(user.id); refreshProvider = onLogin; }, [onLogin, user?.id]);
  const [boundary, setBoundary] = useState("Checking");
  useEffect(() => {
    const count = () => setRevision((value) => value + 1);
    const observe = () => {
      const surface = document.querySelector<HTMLElement>("[data-commerce-identity-state]");
      const next = surface ? `${surface.dataset.commerceIdentityState} / ${surface.hidden ? "blocked" : "visible"}` : "Not mounted";
      setBoundary((previous) => previous === next ? previous : next);
    };
    const observer = new MutationObserver(observe);
    observer.observe(document.getElementById("identity-fixture-boundary")!, { attributes: true, childList: true, subtree: true });
    window.addEventListener("identity-fixture-counts", count); observe();
    return () => { observer.disconnect(); window.removeEventListener("identity-fixture-counts", count); };
  }, []);
  return <div className="space-y-2 text-xs leading-5 text-neutral-400" aria-label="Synthetic identity evidence" data-revision={revision}>
    <p>Boundary: <output aria-label="Boundary state">{boundary}</output></p>
    <p>Provider: <output aria-label="Provider identity">{user?.id ?? "no user"}</output></p>
    <p>Reads: own {counts.ownReads}, provider {counts.providerReads}, cart {counts.cartReads}, addresses {counts.addressReads}; blocked outbound {counts.blocked}</p>
    <section aria-label="Native body diagnostic" className="space-y-1 border-t border-neutral-700 pt-3">
      <p>Requested scenario: <output aria-label="Original body scenario">{bodyObservation?.originalScenario ?? "(none)"}</output>; captured response: <output aria-label="Captured body scenario">{bodyObservation?.capturedScenario ?? "(none)"}</output>; at delivery: <output aria-label="Body scenario at delivery">{bodyObservation?.currentScenario ?? "(pending)"}</output>; current requested mode: <output aria-label="Current requested scenario">{ownMode}</output></p>
      <p>Native body phase: <output aria-label="Native body phase">{bodyObservation?.phase ?? "(none)"}</output>; bodyUsed: <output aria-label="Native body used">{String(bodyObservation?.bodyUsed ?? false)}</output></p>
      <p>Delivered name: <output aria-label="Delivered body error name">{bodyObservation?.deliveredName ?? "(none)"}</output>; constructor: <output aria-label="Delivered body error constructor">{bodyObservation?.deliveredConstructor ?? "(none)"}</output></p>
      <p>instanceof Error: <output aria-label="Delivered body error instanceof Error">{String(bodyObservation?.instanceOfError ?? false)}</output>; instanceof DOMException: <output aria-label="Delivered body error instanceof DOMException">{String(bodyObservation?.instanceOfDOMException ?? false)}</output>; identical stream reason: <output aria-label="Delivered body error identity">{String(bodyObservation?.sameAsStreamReason ?? false)}</output></p>
      <p>No error messages, body content, credentials or tokens are recorded. Scenario labels do not classify the delivered native error.</p>
    </section>
  </div>;
}
function Preview() {
  const [expired, setExpired] = useState(0);
  const onSessionExpired = useCallback(() => setExpired((value) => value + 1), []);
  const scenario = (own: OwnMode, provider: ProviderMode = "normal", changeAccount = false) => {
    ownMode = own; providerMode = provider;
    if (changeAccount) account = observedProviderAccount === "synthetic-account-A" ? "synthetic-account-B" : "synthetic-account-A";
    window.dispatchEvent(new Event("focus"));
  };
  const externalProviderSwitch = (failure: OwnMode) => {
    ownMode = failure; providerMode = "normal";
    account = observedProviderAccount === "synthetic-account-A" ? "synthetic-account-B" : "synthetic-account-A";
    void refreshProvider().catch(() => { counts.blocked++; refreshCounts(); console.error("Synthetic provider switch failed"); });
  };
  return <EnglishMessages><EcommerceProvider customersSlug="users" debug={false} enableVariants={false} syncLocalStorage={false}
    currenciesConfig={{ defaultCurrency: "KRW", supportedCurrencies: [{ code: "KRW", decimals: 0, label: "Korean Won", symbol: "₩" }] }} paymentMethods={[]}>
    <main className="min-h-screen bg-neutral-950 px-5 py-8 font-sans text-neutral-100">
      <div className="mx-auto max-w-2xl space-y-7">
        <header className="space-y-3"><h1 className="text-2xl font-medium">Checkout identity fixture</h1><p className="text-sm leading-6 text-neutral-400">Actual identity boundary and ecommerce provider; all identities and reads are synthetic. No real authentication, storage drafts, claims, payment or provider acceptance.</p></header>
        <section aria-label="Identity scenarios" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ScenarioButton onClick={() => scenario("normal")}>Same account / resume matching provider</ScenarioButton>
          <ScenarioButton onClick={() => scenario("normal", "normal", true)}>Switch account</ScenarioButton>
          <ScenarioButton onClick={() => scenario("403")}>403 forbidden</ScenarioButton>
          <ScenarioButton onClick={() => scenario("429")}>429 rate limited</ScenarioButton>
          <ScenarioButton onClick={() => scenario("401")}>401 authentication required</ScenarioButton>
          <ScenarioButton onClick={() => scenario("anonymous")}>Valid anonymous receipt</ScenarioButton>
          <ScenarioButton onClick={() => scenario("malformed")}>Malformed own receipt</ScenarioButton>
          <ScenarioButton onClick={() => scenario("transport")}>Transport failure</ScenarioButton>
          <ScenarioButton onClick={() => scenario("abort")}>Aborted own read</ScenarioButton>
          <ScenarioButton onClick={() => scenario("body-transport")}>Successful headers / body transport failure</ScenarioButton>
          <ScenarioButton onClick={() => scenario("body-abort")}>Successful headers / body abort</ScenarioButton>
          <ScenarioButton onClick={() => scenario("invalid-json")}>Successful body / invalid JSON</ScenarioButton>
          <ScenarioButton onClick={() => scenario("normal", "anonymous", true)}>Sync fulfills without user</ScenarioButton>
          <ScenarioButton onClick={() => scenario("normal", "wrong", true)}>Sync fulfills with wrong user</ScenarioButton>
          <ScenarioButton onClick={() => scenario("normal", "http-503", true)}>Provider lookup HTTP503</ScenarioButton>
          <ScenarioButton onClick={() => externalProviderSwitch("403")}>External provider switch + 403</ScenarioButton>
          <ScenarioButton onClick={() => externalProviderSwitch("malformed")}>External provider switch + malformed read</ScenarioButton>
          <ScenarioButton onClick={() => externalProviderSwitch("transport")}>External provider switch + transport failure</ScenarioButton>
        </section>
        <section aria-label="Actual protected commerce surface" className="rounded-2xl border border-neutral-700 p-5" id="identity-fixture-boundary">
          <CommerceIdentityBoundary verified onSessionExpired={onSessionExpired}><PrivateAddress /></CommerceIdentityBoundary>
        </section>
        <Readout />
        <p className="text-xs text-neutral-400">Inline authentication requests: <output aria-label="Authentication request count">{expired}</output>. This fixture does not replace or exercise the real account flow.</p>
        <nav className="flex flex-wrap gap-5 text-sm"><ScenarioButton onClick={() => window.location.assign(new URL("/review", window.location.origin).href)}>Reset synthetic fixture</ScenarioButton><ScenarioButton onClick={() => window.location.assign(new URL("/review?initial=no-user", window.location.origin).href)}>Initial provider has no user</ScenarioButton></nav>
      </div>
    </main>
  </EcommerceProvider></EnglishMessages>;
}
createRoot(document.getElementById("root")!).render(<Preview />);
